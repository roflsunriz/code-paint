import { afterEach, describe, expect, test } from "bun:test";
import { buildPreviewHtml } from "../src/preview-page.ts";
import { startPreviewServer, type PreviewServer } from "../src/preview-server.ts";

let server: PreviewServer | undefined;

afterEach(() => {
  server?.stop();
  server = undefined;
});

describe("preview-server", () => {
  test("トップページにキャンバスと命令表示の目印がある", async () => {
    server = startPreviewServer({ inputPath: "examples/hello.json", port: 0 });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('data-testid="paint-canvas"');
    expect(html).toContain('data-testid="command-json"');
    expect(html).toContain('data-testid="shape-list"');
    expect(html).toContain('data-testid="preview-status"');
  });

  test("/document は検証済みドキュメントと原文ハッシュを返す", async () => {
    server = startPreviewServer({ inputPath: "examples/hello.json", port: 0 });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/document`);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; raw: string };
    expect(payload.ok).toBe(true);
    expect(payload.raw).toContain("rect");
  });

  test("存在しない入力でもサーバは落ちずエラー表示用ペイロードを返す", async () => {
    server = startPreviewServer({
      inputPath: "examples/存在しない.json",
      port: 0,
    });
    const response = await fetch(`http://127.0.0.1:${String(server.port)}/document`);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; error: string };
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatch(/読めません/);
  });
});

describe("preview-page", () => {
  test("3種の図形の描画分岐を含み、ポーリングで自動更新する", () => {
    const html = buildPreviewHtml();
    expect(html).toContain("rect");
    expect(html).toContain("circle");
    expect(html).toContain("setInterval");
    expect(html).toContain("/document");
  });
});
