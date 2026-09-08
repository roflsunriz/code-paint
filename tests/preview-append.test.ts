import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPreviewHtml, PREVIEW_MAX_LIST_ITEMS } from "../src/preview-page.ts";
import { startPreviewServer, type PreviewServer } from "../src/preview-server.ts";
import { parsePaintShape } from "../src/validate-document.ts";

let server: PreviewServer | undefined;
const workdir = join(tmpdir(), "code-paint-preview-append");
const inputPath = join(workdir, "doc.json");
const referencePath = join(workdir, "ref.png");

const baseDocument = {
  version: 3,
  canvas: { width: 64, height: 48, background: "#ffffff" },
  phase: "lineart",
  shapes: [{ kind: "rect", phase: "lineart", x: 1, y: 2, width: 10, height: 20, fill: "#ff0000" }],
};

async function setupInput(document: unknown = baseDocument): Promise<void> {
  await mkdir(workdir, { recursive: true });
  await writeFile(inputPath, JSON.stringify(document, null, 2), "utf-8");
}

afterEach(async () => {
  server?.stop();
  server = undefined;
  await rm(workdir, { recursive: true, force: true });
});

describe("preview append api", () => {
  test("POST /shapes で単発の図形を追記して積み重ねる", async () => {
    await setupInput();
    server = startPreviewServer({ inputPath, port: 0 });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/shapes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shape: { kind: "circle", phase: "lineart", cx: 10, cy: 10, r: 5, fill: "#0000ff" },
      }),
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as { ok: boolean; added: number; total: number };
    expect(result.ok).toBe(true);
    expect(result.added).toBe(1);
    expect(result.total).toBe(2);
    const raw = await readFile(inputPath, "utf-8");
    expect(raw).toContain("circle");
    const documentResponse = await fetch(`http://127.0.0.1:${String(server.port)}/document`);
    const payload = (await documentResponse.json()) as {
      ok: boolean;
      document: { shapes: unknown[] };
    };
    expect(payload.ok).toBe(true);
    expect(payload.document.shapes).toHaveLength(2);
  });

  test("POST /shapes で複数の図形をまとめて追記できる", async () => {
    await setupInput({ ...baseDocument, shapes: [] });
    server = startPreviewServer({ inputPath, port: 0 });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/shapes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shapes: [
          { kind: "rect", phase: "lineart", x: 0, y: 0, width: 5, height: 5, fill: "#ff0000" },
          { kind: "rect", phase: "lineart", x: 5, y: 5, width: 5, height: 5, fill: "#00ff00" },
        ],
      }),
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as { ok: boolean; total: number };
    expect(result.ok).toBe(true);
    expect(result.total).toBe(2);
  });

  test("現在と異なるフェーズの図形も追記して自由に加筆できる", async () => {
    await setupInput();
    server = startPreviewServer({ inputPath, port: 0 });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/shapes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shape: { kind: "rect", phase: "base", x: 0, y: 0, width: 4, height: 4, fill: "#ff0000" },
      }),
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as { ok: boolean; error: string };
    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ ok: true, added: 1, total: 2 });
    const raw = await readFile(inputPath, "utf-8");
    const parsed = JSON.parse(raw) as { shapes: unknown[] };
    expect(parsed.shapes).toHaveLength(2);
  });

  test("不正な図形の追記は400で拒否し既存の入力を壊さない", async () => {
    await setupInput();
    server = startPreviewServer({ inputPath, port: 0 });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/shapes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shape: { kind: "rect", phase: "lineart", x: 0, y: 0 } }),
    });
    expect(response.status).toBe(400);
    const result = (await response.json()) as { ok: boolean; error: string };
    expect(result.ok).toBe(false);
    const raw = await readFile(inputPath, "utf-8");
    const parsed = JSON.parse(raw) as { shapes: unknown[] };
    expect(parsed.shapes).toHaveLength(1);
  });

  test("DELETE /shapes で図形を全消去しフェーズを線画に戻す", async () => {
    await setupInput({ ...baseDocument, phase: "base" });
    server = startPreviewServer({ inputPath, port: 0 });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/shapes`, {
      method: "DELETE",
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as { ok: boolean; total: number; phase: string };
    expect(result.ok).toBe(true);
    expect(result.total).toBe(0);
    expect(result.phase).toBe("lineart");
    const raw = await readFile(inputPath, "utf-8");
    const parsed = JSON.parse(raw) as { shapes: unknown[]; phase: string };
    expect(parsed.shapes).toHaveLength(0);
    expect(parsed.phase).toBe("lineart");
  });

  test("POST /phase で自由に作業工程を切り替えられる", async () => {
    await setupInput();
    server = startPreviewServer({ inputPath, port: 0 });
    const okResponse = await fetch(`http://127.0.0.1:${String(server.port)}/phase`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phase: "base" }),
    });
    expect(okResponse.status).toBe(200);
    const skipResponse = await fetch(`http://127.0.0.1:${String(server.port)}/phase`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phase: "reflection" }),
    });
    expect(skipResponse.status).toBe(200);
    const skipResult = (await skipResponse.json()) as { ok: boolean; error: string };
    expect(skipResult.ok).toBe(true);
    expect(skipResult).toMatchObject({ phase: "reflection", total: 1 });
  });

  test("POST /bucket はbase相でのみ塗りつぶしrectを展開する", async () => {
    await setupInput({
      version: 3,
      canvas: { width: 16, height: 16, background: "#ffffff" },
      phase: "base",
      shapes: [],
    });
    server = startPreviewServer({ inputPath, port: 0 });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/bucket`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ x: 8, y: 8, fill: "#ff0000" }),
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as { ok: boolean; added: number; total: number };
    expect(result.ok).toBe(true);
    expect(result.added).toBe(16);
    expect(result.total).toBe(16);
  });

  test("POST /bucket は線画フェーズでは拒否される", async () => {
    await setupInput();
    server = startPreviewServer({ inputPath, port: 0 });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/bucket`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ x: 2, y: 2, fill: "#ff0000" }),
    });
    expect(response.status).toBe(400);
  });
});

describe("preview reference", () => {
  test("未設定時は /reference が404の案内JSONを返す", async () => {
    await setupInput();
    server = startPreviewServer({ inputPath, port: 0 });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/reference`);
    expect(response.status).toBe(404);
    const payload = (await response.json()) as { ok: boolean; error: string };
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatch(/リファレンス/);
  });

  test("設定時は /reference が画像バイトを返す", async () => {
    await setupInput();
    await mkdir(workdir, { recursive: true });
    await writeFile(referencePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    server = startPreviewServer({ inputPath, port: 0, referencePath });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/reference`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
  });

  test("画面にリファレンス表示の目印がある", () => {
    const html = buildPreviewHtml();
    expect(html).toContain('data-testid="reference-image"');
    expect(html).toContain('data-testid="reference-status"');
    expect(html).toContain("/reference");
  });
});

describe("preview command list", () => {
  test("命令欄は固定高スクロールで最新のみ表示し自動スクロールする", () => {
    const html = buildPreviewHtml();
    expect(html).toContain('data-testid="shape-scroll"');
    expect(html).toContain('data-testid="shape-count"');
    expect(html).toContain("height: 240px");
    expect(html).toContain("scrollTop");
    expect(html).toContain("scrollHeight");
    expect(html).toContain(String(PREVIEW_MAX_LIST_ITEMS));
  });

  test("画面にフェーズ表示の目印があり図形一覧にフェーズが出る", () => {
    const html = buildPreviewHtml();
    expect(html).toContain('data-testid="phase-badge"');
    expect(html).toContain('data-testid="phase-progress"');
    expect(html).toContain("POST /phase");
    expect(html).toContain("POST /bucket");
  });

  test("parsePaintShape で単発の図形を検証できる", () => {
    const shape = parsePaintShape(
      { kind: "circle", phase: "lineart", cx: 1, cy: 2, r: 3, fill: "#ff0000" },
      0,
    );
    expect(shape.kind).toBe("circle");
    expect(() => parsePaintShape({ kind: "unknown-kind", phase: "lineart" }, 0)).toThrow();
  });
});
