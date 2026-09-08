import { readFile } from "node:fs/promises";
import { buildPreviewHtml } from "./preview-page.ts";
import { renderDocumentToSvg } from "./render-svg.ts";
import type { PaintDocument, PaintShape } from "./paint-document.ts";
import { parsePaintDocument, parsePaintShape } from "./validate-document.ts";
import { parsePaintPhase } from "./paint-phase.ts";
import { bucketFillToRects } from "./bucket-fill.ts";
import { PreviewEditError, PreviewStore } from "./preview-store.ts";
import { renderPreviewPng } from "./preview-render.ts";

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

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function recordBody(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PreviewEditError("JSONオブジェクトで指定してください。");
  }
  return body as Record<string, unknown>;
}

function extractShapes(body: unknown): unknown[] {
  const record = recordBody(body);
  if (Object.keys(record).length !== 1)
    throw new PreviewEditError(
      '追記は {"shape": {...}} または {"shapes": [...]} で指定してください。',
    );
  if (record["shape"] !== undefined) return [record["shape"]];
  if (Array.isArray(record["shapes"]) && record["shapes"].length > 0) return record["shapes"];
  throw new PreviewEditError(
    '追記は {"shape": {...}} または1件以上の {"shapes": [...]} で指定してください。',
  );
}

const COMMON_PATCH_KEYS = ["phase", "group", "layer", "hidden", "clip", "transform", "opacity"];
const SHAPE_PATCH_KEYS: Record<PaintShape["kind"], string[]> = {
  rect: ["x", "y", "width", "height", "fill"],
  circle: ["cx", "cy", "r", "fill"],
  line: ["x1", "y1", "x2", "y2", "stroke", "strokeWidth"],
  path: ["points", "stroke", "strokeWidth", "fill"],
  curve: ["d", "stroke", "strokeWidth", "fill"],
};
const REMOVABLE_PATCH_KEYS = new Set([
  "group",
  "layer",
  "hidden",
  "clip",
  "transform",
  "opacity",
  "fill",
  "stroke",
  "strokeWidth",
]);

function patchShape(shape: PaintShape, patch: Record<string, unknown>, index: number): PaintShape {
  const allowed = new Set([...COMMON_PATCH_KEYS, ...SHAPE_PATCH_KEYS[shape.kind]]);
  const next: Record<string, unknown> = { ...shape };
  for (const [key, value] of Object.entries(patch)) {
    if (!allowed.has(key))
      throw new PreviewEditError(`変更できない項目です: ${key}。idとkindは変更できません。`);
    if (value === null && REMOVABLE_PATCH_KEYS.has(key)) next[key] = undefined;
    else next[key] = value;
  }
  return parsePaintShape(next, index);
}

function editSelection(
  document: PaintDocument,
  selection: "id" | "group",
  value: string,
  patch: Record<string, unknown> | null,
): PaintDocument {
  if (!document.shapes.some((shape) => shape[selection] === value))
    throw new PreviewEditError(
      "指定した図形またはグループがありません。最新の一覧を確認してください。",
      404,
    );
  if (patch !== null && Object.keys(patch).length === 0)
    throw new PreviewEditError("変更する項目を1件以上指定してください。");
  return {
    ...document,
    shapes:
      patch === null
        ? document.shapes.filter((shape) => shape[selection] !== value)
        : document.shapes.map((shape, index) =>
            shape[selection] === value ? patchShape(shape, patch, index) : shape,
          ),
  };
}

function contentTypeForReference(path: string): string {
  const extension = path.toLowerCase().split(".").at(-1);
  return (
    (
      {
        svg: "image/svg+xml",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
      } as Record<string, string>
    )[extension ?? ""] ?? "image/png"
  );
}

async function serveReference(referencePath: string | undefined): Promise<Response> {
  if (!referencePath)
    return jsonResponse(
      {
        ok: false,
        error: "リファレンス画像が未設定です。--reference <画像パス> を付けて起動してください。",
      },
      404,
    );
  try {
    return new Response(await readFile(referencePath), {
      headers: {
        "content-type": contentTypeForReference(referencePath),
        "cache-control": "no-store",
      },
    });
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "リファレンス画像を読めませんでした。パスとファイルを確認してください。",
      },
      404,
    );
  }
}

async function mutate(request: Request, url: URL, store: PreviewStore): Promise<Response> {
  // CLIにはOriginがない。ブラウザからの更新は同一Originのみを受け付ける。
  const origin = request.headers.get("origin");
  if (
    (origin !== null && origin !== url.origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "別のサイトからは絵を変更できません。プレビュー画面から操作してください。",
      },
      403,
    );
  }
  const selectionMatch = /^\/(shapes|groups)\/([^/]+)$/.exec(url.pathname);
  const isSelection =
    selectionMatch !== null && (request.method === "PATCH" || request.method === "DELETE");
  const isBodyRoute =
    (request.method === "POST" && ["/shapes", "/phase", "/bucket"].includes(url.pathname)) ||
    (request.method === "PUT" && url.pathname === "/document") ||
    (isSelection && request.method === "PATCH");
  let body: unknown;
  if (isBodyRoute) {
    try {
      body = (await request.json()) as unknown;
    } catch {
      throw new PreviewEditError("JSONの解析に失敗しました。JSONの構文を確認してください。");
    }
  }
  let added = 0;
  let document: PaintDocument;
  if (request.method === "POST" && (url.pathname === "/undo" || url.pathname === "/redo")) {
    document = await store.restore(url.pathname === "/undo" ? "undo" : "redo");
  } else if (request.method === "POST" && url.pathname === "/shapes") {
    const shapes = extractShapes(body).map((shape, index) => parsePaintShape(shape, index));
    added = shapes.length;
    document = await store.update((current) => ({
      ...current,
      shapes: [...current.shapes, ...shapes],
    }));
  } else if (request.method === "POST" && url.pathname === "/phase") {
    const phase = parsePaintPhase(recordBody(body)["phase"], "phase");
    document = await store.update((current) => ({ ...current, phase }));
  } else if (request.method === "POST" && url.pathname === "/bucket") {
    const record = recordBody(body);
    document = await store.update((current) => {
      const rects = bucketFillToRects(current, {
        x: record["x"] as number,
        y: record["y"] as number,
        fill: record["fill"] as string,
        tolerance: record["tolerance"] as number | undefined,
      });
      const shapes = rects.map((rect, index) =>
        parsePaintShape(
          {
            ...rect,
            ...(record["layer"] === undefined ? {} : { layer: record["layer"] }),
            ...(record["group"] === undefined ? {} : { group: record["group"] }),
          },
          index,
        ),
      );
      added = shapes.length;
      return { ...current, shapes: [...current.shapes, ...shapes] };
    });
  } else if (request.method === "DELETE" && url.pathname === "/shapes") {
    document = await store.update((current) => ({ ...current, phase: "lineart", shapes: [] }));
  } else if (request.method === "PUT" && url.pathname === "/document") {
    const replacement = parsePaintDocument(body);
    document = await store.update(() => replacement);
  } else if (isSelection) {
    const selection = selectionMatch[1] === "shapes" ? "id" : "group";
    const value = decodeURIComponent(selectionMatch[2] ?? "");
    const patch = request.method === "PATCH" ? recordBody(body) : null;
    document = await store.update((current) => editSelection(current, selection, value, patch));
  } else {
    return jsonResponse(
      { ok: false, error: "この操作は見つかりません。URLとHTTPメソッドを確認してください。" },
      404,
    );
  }
  return jsonResponse({
    ok: true,
    added,
    total: document.shapes.length,
    phase: document.phase,
    ids: added > 0 ? document.shapes.slice(-added).map((shape) => shape.id) : [],
  });
}

export function startPreviewServer(options: PreviewServerOptions): PreviewServer {
  const store = new PreviewStore(options.inputPath);
  const server = Bun.serve({
    hostname: options.hostname ?? "127.0.0.1",
    port: options.port,
    maxRequestBodySize: 32 * 1024 * 1024,
    fetch: async (request: Request): Promise<Response> => {
      try {
        const url = new URL(request.url);
        if (request.method !== "GET" && request.method !== "HEAD")
          return await mutate(request, url, store);
        if (url.pathname === "/document") return jsonResponse(await store.payload());
        if (url.pathname === "/history") return jsonResponse(await store.history());
        if (url.pathname === "/reference") return await serveReference(options.referencePath);
        if (url.pathname === "/svg" || url.pathname === "/render.png") {
          const payload = await store.payload();
          if (!payload.ok) return jsonResponse({ ok: false, error: payload.error }, 400);
          const png = url.pathname === "/render.png";
          return new Response(
            png
              ? new Uint8Array(renderPreviewPng(payload.document, url.searchParams))
              : renderDocumentToSvg(payload.document),
            {
              headers: {
                "content-type": png ? "image/png" : "image/svg+xml; charset=utf-8",
                "cache-control": "no-store",
              },
            },
          );
        }
        if (url.pathname === "/" || url.pathname === "/index.html")
          return new Response(buildPreviewHtml(), {
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        return jsonResponse({ ok: false, error: "見つかりません。/ を開いてください。" }, 404);
      } catch (error) {
        const status =
          error instanceof PreviewEditError
            ? error.status
            : error instanceof SyntaxError ||
                (error instanceof Error && error.name === "PaintValidationError") ||
                error instanceof URIError
              ? 400
              : 500;
        return jsonResponse(
          { ok: false, error: error instanceof Error ? error.message : String(error) },
          status,
        );
      }
    },
  });
  const assignedPort = server.port;
  if (assignedPort === undefined)
    throw new Error(
      "プレビューサーバのポートを確定できませんでした。--port を変えて再試行してください。",
    );
  return {
    port: assignedPort,
    stop: (): void => {
      void server.stop();
    },
  };
}
