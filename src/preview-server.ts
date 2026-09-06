import { readFile, writeFile } from "node:fs/promises";
import { buildDocumentPayload, type DocumentPayload } from "./preview-payload.ts";
import { buildPreviewHtml } from "./preview-page.ts";
import { renderDocumentToSvg } from "./render-svg.ts";
import { MAX_SHAPES, type PaintDocument, type PaintShape } from "./paint-document.ts";
import { PaintValidationError, parsePaintShape } from "./validate-document.ts";
import { PAINT_PHASE_LABELS_JA, nextPaintPhase, parsePaintPhase } from "./paint-phase.ts";
import { bucketFillToRects } from "./bucket-fill.ts";

export interface PreviewServerOptions {
  inputPath: string;
  port: number;
  hostname?: string;
  referencePath?: string | undefined;
}

export interface PreviewServer {
  port: number;
  stop: () => void;
}

async function readPayload(inputPath: string): Promise<DocumentPayload> {
  let raw: string;
  try {
    raw = await readFile(inputPath, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      hash: "no-file",
      error: `入力ファイルを読めませんでした: ${inputPath}（${message}）。パスとファイルの有無を確認してください。`,
      raw: "",
    };
  }
  return buildDocumentPayload(raw);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function extractShapes(body: unknown): unknown[] {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PaintValidationError(
      "body",
      '追記する図形は {"shape": {...}} または {"shapes": [...]} のJSONで送ってください。',
    );
  }
  const record = body as Record<string, unknown>;
  if (record["shape"] !== undefined) {
    return [record["shape"]];
  }
  if (record["shapes"] !== undefined) {
    if (!Array.isArray(record["shapes"])) {
      throw new PaintValidationError(
        "shapes",
        "shapes は図形オブジェクトの配列で指定してください。",
      );
    }
    return record["shapes"];
  }
  throw new PaintValidationError(
    "body",
    '追記する図形は {"shape": {...}} または {"shapes": [...]} のJSONで送ってください。',
  );
}

function contentTypeForReference(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  return "image/png";
}

async function appendShapes(inputPath: string, body: unknown): Promise<Response> {
  let raw: string;
  try {
    raw = await readFile(inputPath, "utf-8");
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: `入力ファイルを読めませんでした: ${inputPath}（${toErrorMessage(error)}）。先に正しい入力JSONを用意してください。`,
      },
      400,
    );
  }
  const payload = buildDocumentPayload(raw);
  if (!payload.ok) {
    return jsonResponse(
      {
        ok: false,
        error: `現在の入力が不正なため追記できません。先に入力を修正してください（${payload.error}）。`,
      },
      400,
    );
  }
  let candidates: unknown[];
  try {
    candidates = extractShapes(body);
  } catch (error) {
    return jsonResponse({ ok: false, error: toErrorMessage(error) }, 400);
  }
  if (candidates.length === 0) {
    return jsonResponse(
      { ok: false, error: "追記する図形が空です。1件以上の図形を送ってください。" },
      400,
    );
  }
  if (payload.document.shapes.length + candidates.length > MAX_SHAPES) {
    return jsonResponse(
      {
        ok: false,
        error: `図形は最大 ${String(MAX_SHAPES)} 件までです。件数を減らしてください。`,
      },
      400,
    );
  }
  const validated: PaintShape[] = [];
  try {
    candidates.forEach((item, offset) => {
      validated.push(parsePaintShape(item, payload.document.shapes.length + offset));
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: toErrorMessage(error) }, 400);
  }
  const currentPhase = payload.document.phase;
  for (const shape of validated) {
    if (shape.phase !== currentPhase) {
      return jsonResponse(
        {
          ok: false,
          error: `現在の作業フェーズは${PAINT_PHASE_LABELS_JA[currentPhase]}（${currentPhase}）です。${PAINT_PHASE_LABELS_JA[currentPhase]}の図形のみ追記できます（送られた図形: ${shape.phase}）。次のフェーズへ進むには POST /phase で一段ずつ進めてください。順序は線画→バケツ塗り→影→反射→背景です。`,
        },
        400,
      );
    }
  }
  const next: PaintDocument = {
    ...payload.document,
    shapes: [...payload.document.shapes, ...validated],
  };
  try {
    await writeFile(inputPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  } catch (error) {
    return jsonResponse(
      { ok: false, error: `入力ファイルに書き込めませんでした（${toErrorMessage(error)}）。` },
      500,
    );
  }
  return jsonResponse({ ok: true, added: validated.length, total: next.shapes.length });
}

async function advancePhase(inputPath: string, body: unknown): Promise<Response> {
  let raw: string;
  try {
    raw = await readFile(inputPath, "utf-8");
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: `入力ファイルを読めませんでした: ${inputPath}（${toErrorMessage(error)}）。`,
      },
      400,
    );
  }
  const payload = buildDocumentPayload(raw);
  if (!payload.ok) {
    return jsonResponse(
      {
        ok: false,
        error: `現在の入力が不正なためフェーズを進められません。先に入力を修正してください（${payload.error}）。`,
      },
      400,
    );
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonResponse(
      { ok: false, error: 'フェーズは {"phase": "base"} のJSONで送ってください。' },
      400,
    );
  }
  let requested: ReturnType<typeof parsePaintPhase>;
  try {
    requested = parsePaintPhase((body as Record<string, unknown>)["phase"], "phase");
  } catch (error) {
    return jsonResponse({ ok: false, error: toErrorMessage(error) }, 400);
  }
  const expected = nextPaintPhase(payload.document.phase);
  if (expected === null) {
    return jsonResponse(
      { ok: false, error: "最終フェーズ（background）まで到達済みです。これ以上進めません。" },
      400,
    );
  }
  if (requested !== expected) {
    return jsonResponse(
      {
        ok: false,
        error: `フェーズは一段ずつ進めます。次は${PAINT_PHASE_LABELS_JA[expected]}（${expected}）へ進めてください（現在: ${payload.document.phase}）。飛ばし・戻りはできません。`,
      },
      400,
    );
  }
  const next: PaintDocument = { ...payload.document, phase: requested };
  try {
    await writeFile(inputPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  } catch (error) {
    return jsonResponse(
      { ok: false, error: `入力ファイルに書き込めませんでした（${toErrorMessage(error)}）。` },
      500,
    );
  }
  return jsonResponse({ ok: true, phase: next.phase, total: next.shapes.length });
}

async function runBucketFill(inputPath: string, body: unknown): Promise<Response> {
  let raw: string;
  try {
    raw = await readFile(inputPath, "utf-8");
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: `入力ファイルを読めませんでした: ${inputPath}（${toErrorMessage(error)}）。`,
      },
      400,
    );
  }
  const payload = buildDocumentPayload(raw);
  if (!payload.ok) {
    return jsonResponse(
      {
        ok: false,
        error: `現在の入力が不正なためバケツ塗りできません（${payload.error}）。`,
      },
      400,
    );
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonResponse(
      {
        ok: false,
        error: 'バケツ塗りは {"x": 数字, "y": 数字, "fill": "#rrggbb"} のJSONで送ってください。',
      },
      400,
    );
  }
  const record = body as Record<string, unknown>;
  let rects;
  try {
    rects = bucketFillToRects(payload.document, {
      x: record["x"] as number,
      y: record["y"] as number,
      fill: record["fill"] as string,
      tolerance: record["tolerance"] as number | undefined,
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: toErrorMessage(error) }, 400);
  }
  const next: PaintDocument = {
    ...payload.document,
    shapes: [...payload.document.shapes, ...rects],
  };
  try {
    await writeFile(inputPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  } catch (error) {
    return jsonResponse(
      { ok: false, error: `入力ファイルに書き込めませんでした（${toErrorMessage(error)}）。` },
      500,
    );
  }
  return jsonResponse({ ok: true, added: rects.length, total: next.shapes.length });
}

async function clearShapes(inputPath: string): Promise<Response> {
  let raw: string;
  try {
    raw = await readFile(inputPath, "utf-8");
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: `入力ファイルを読めませんでした: ${inputPath}（${toErrorMessage(error)}）。`,
      },
      400,
    );
  }
  const payload = buildDocumentPayload(raw);
  if (!payload.ok) {
    return jsonResponse(
      { ok: false, error: `現在の入力が不正なため消去できません（${payload.error}）。` },
      400,
    );
  }
  const next: PaintDocument = { ...payload.document, shapes: [], phase: "lineart" };
  try {
    await writeFile(inputPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  } catch (error) {
    return jsonResponse(
      { ok: false, error: `入力ファイルに書き込めませんでした（${toErrorMessage(error)}）。` },
      500,
    );
  }
  return jsonResponse({ ok: true, total: 0, phase: next.phase });
}

async function serveReference(referencePath: string | undefined): Promise<Response> {
  if (referencePath === undefined || referencePath === "") {
    return jsonResponse(
      {
        ok: false,
        error: "リファレンス画像が未設定です。--reference <画像パス> を付けて起動してください。",
      },
      404,
    );
  }
  try {
    const bytes = await readFile(referencePath);
    return new Response(bytes, {
      headers: {
        "content-type": contentTypeForReference(referencePath),
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: `リファレンス画像を読めませんでした: ${referencePath}（${toErrorMessage(error)}）。`,
      },
      404,
    );
  }
}

export function startPreviewServer(options: PreviewServerOptions): PreviewServer {
  const hostname = options.hostname ?? "127.0.0.1";
  const server = Bun.serve({
    hostname,
    port: options.port,
    fetch: (request: Request): Response | Promise<Response> => {
      const url = new URL(request.url);
      if (url.pathname === "/document") {
        return readPayload(options.inputPath).then(
          (payload) =>
            new Response(JSON.stringify(payload), {
              headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "no-store",
              },
            }),
        );
      }
      if (url.pathname === "/shapes" && request.method === "POST") {
        return request
          .json()
          .catch(
            () =>
              ({
                __invalidJson: true,
              }) as unknown,
          )
          .then((body: unknown) => {
            if (
              typeof body === "object" &&
              body !== null &&
              "__invalidJson" in (body as Record<string, unknown>)
            ) {
              return jsonResponse(
                { ok: false, error: "JSONの解析に失敗しました。JSONの構文を確認してください。" },
                400,
              );
            }
            return appendShapes(options.inputPath, body);
          });
      }
      if (url.pathname === "/shapes" && request.method === "DELETE") {
        return clearShapes(options.inputPath);
      }
      if (url.pathname === "/phase" && request.method === "POST") {
        return request
          .json()
          .catch(
            () =>
              ({
                __invalidJson: true,
              }) as unknown,
          )
          .then((body: unknown) => {
            if (
              typeof body === "object" &&
              body !== null &&
              "__invalidJson" in (body as Record<string, unknown>)
            ) {
              return jsonResponse(
                { ok: false, error: "JSONの解析に失敗しました。JSONの構文を確認してください。" },
                400,
              );
            }
            return advancePhase(options.inputPath, body);
          });
      }
      if (url.pathname === "/bucket" && request.method === "POST") {
        return request
          .json()
          .catch(
            () =>
              ({
                __invalidJson: true,
              }) as unknown,
          )
          .then((body: unknown) => {
            if (
              typeof body === "object" &&
              body !== null &&
              "__invalidJson" in (body as Record<string, unknown>)
            ) {
              return jsonResponse(
                { ok: false, error: "JSONの解析に失敗しました。JSONの構文を確認してください。" },
                400,
              );
            }
            return runBucketFill(options.inputPath, body);
          });
      }
      if (url.pathname === "/reference") {
        return serveReference(options.referencePath);
      }
      if (url.pathname === "/svg") {
        return readPayload(options.inputPath).then((payload) => {
          if (!payload.ok) {
            return new Response(JSON.stringify({ ok: false, error: payload.error }), {
              status: 400,
              headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "no-store",
              },
            });
          }
          return new Response(renderDocumentToSvg(payload.document), {
            headers: {
              "content-type": "image/svg+xml; charset=utf-8",
              "cache-control": "no-store",
            },
          });
        });
      }
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return new Response(buildPreviewHtml(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("見つかりません。/ を開いてください。", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    },
  });
  const assignedPort = server.port;
  if (assignedPort === undefined) {
    throw new Error(
      "プレビューサーバのポートを確定できませんでした。--port を変えて再試行してください。",
    );
  }
  return {
    port: assignedPort,
    stop: (): void => {
      void server.stop();
    },
  };
}
