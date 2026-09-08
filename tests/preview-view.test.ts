import { describe, expect, test } from "bun:test";
import { Script } from "node:vm";
import { buildPreviewHtml } from "../src/preview-page.ts";
import {
  detailRenderUrl,
  fitReferenceCrop,
  normalizePreviewSettings,
  previewCanvasLayout,
  validateReferenceCrop,
} from "../src/preview-view.ts";
import { startPreviewServer } from "../src/preview-server.ts";

describe("reference comparison", () => {
  test("元画像の部分範囲を縦横比を保ち中央に収める", () => {
    const crop = validateReferenceCrop({ x: 985, y: 70, width: 225, height: 270 }, 1448, 1086);
    expect(fitReferenceCrop(crop, 900, 1080)).toEqual({ x: 0, y: 0, width: 900, height: 1080 });
    expect(fitReferenceCrop({ x: 10, y: 30, width: 100, height: 50 }, 300, 300)).toEqual({
      x: 0,
      y: 75,
      width: 300,
      height: 150,
    });
  });
  test("範囲外・空範囲・非数値は元画像を切り落として誤比較せず拒否する", () => {
    for (const crop of [
      { x: -1, y: 0, width: 1, height: 1 },
      { x: 0, y: 0, width: 0, height: 1 },
      { x: 99, y: 0, width: 2, height: 1 },
      { x: 0, y: 99, width: 1, height: 2 },
      { x: NaN, y: 0, width: 1, height: 1 },
      { x: 0, y: 0, width: Infinity, height: 1 },
    ])
      expect(() => validateReferenceCrop(crop, 100, 100)).toThrow();
    expect(validateReferenceCrop({ x: 0, y: 0, width: 100, height: 100 }, 100, 100).width).toBe(
      100,
    );
  });
  test("破損・旧表示設定を安全に初期化し、拡大と透明度は範囲内へ制限する", () => {
    expect(normalizePreviewSettings(null)).toEqual({
      zoom: 100,
      fit: true,
      mode: "side",
      opacity: 0.5,
      crop: null,
    });
    expect(
      normalizePreviewSettings({ zoom: Infinity, mode: "bad", opacity: NaN, crop: { x: 0 } }),
    ).toEqual(normalizePreviewSettings(null));
    expect(normalizePreviewSettings({ zoom: 900, opacity: -2, mode: "difference" })).toEqual({
      zoom: 400,
      fit: false,
      mode: "difference",
      opacity: 0,
      crop: null,
    });
    expect(
      normalizePreviewSettings({ zoom: 1, crop: { x: 1, y: 2, width: 3, height: 4 } }),
    ).toEqual({
      zoom: 25,
      fit: false,
      opacity: 0.5,
      mode: "side",
      crop: { x: 1, y: 2, width: 3, height: 4 },
    });
    expect(normalizePreviewSettings({ zoom: 35, fit: true }).fit).toBe(true);
    expect(normalizePreviewSettings({ zoom: 35, fit: false }).zoom).toBe(35);
  });
  test("自動fitは狭幅で25%未満へ縮小し、枠の縦横とリサイズへ追従する", () => {
    const narrow = previewCanvasLayout(900, 1080, 100, true, 180, 600);
    expect(narrow.zoom).toBe(20);
    expect(narrow.cssWidth).toBe(180);
    expect(narrow.cssHeight).toBe(216);
    expect(previewCanvasLayout(900, 1080, 100, true, 450, 600).zoom).toBe(50);
    expect(previewCanvasLayout(900, 1080, 100, true, 450, 270).zoom).toBe(25);
    expect(previewCanvasLayout(900, 1080, 35, false, 180, 600).cssWidth).toBe(315);
  });
  test("拡大時の描画解像度は表示倍率に追従し4096pxを超えない", () => {
    const expanded = previewCanvasLayout(900, 1080, 200, false, 300, 600);
    expect(expanded.rasterWidth).toBe(1800);
    expect(expanded.rasterHeight).toBe(2160);
    const capped = previewCanvasLayout(900, 1080, 400, false, 300, 600);
    expect(capped.rasterHeight).toBe(4096);
    expect(capped.rasterWidth).toBeLessThanOrEqual(4096);
    expect(capped.cssWidth).toBe(3600);
    expect(previewCanvasLayout(900, 1080, 100, false, 300, 600, 2).rasterWidth).toBe(1800);
  });
  test("局所PNGボタンが生成するURLを実APIが受理する（余分なhashを付けない）", async () => {
    const path = detailRenderUrl(1, 2, 10, 20, 2);
    expect([...new URL(path, "http://localhost").searchParams.keys()]).toEqual([
      "x",
      "y",
      "width",
      "height",
      "scale",
    ]);
    const server = startPreviewServer({ inputPath: "examples/hello.json", port: 0 });
    try {
      const response = await fetch("http://127.0.0.1:" + String(server.port) + path);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/png");
    } finally {
      server.stop();
    }
  });
  test("実際に配信するスクリプトは型注釈を含まない実行可能なJavaScript", () => {
    const html = buildPreviewHtml();
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    expect(script).toBeDefined();
    expect(() => new Script(script ?? "")).not.toThrow();
    for (const id of [
      "compare-mode",
      "canvas-zoom",
      "view-fit",
      "crop-form",
      "shape-save",
      "group-save",
      "undo",
      "redo",
      "detail-form",
      "inspector-tab-reference",
      "inspector-tab-layers",
      "inspector-tab-export",
    ])
      expect(html).toContain('data-testid="' + id + '"');
  });
  test("インスペクターの各タブが対応パネルを参照し、作品表示と命令ログを分離する", () => {
    const html = buildPreviewHtml();
    for (const name of ["reference", "layers", "export"]) {
      expect(html).toContain('aria-controls="panel-' + name + '"');
      expect(html).toContain('id="panel-' + name + '"');
      expect(html).toContain('aria-labelledby="tab-' + name + '"');
    }
    expect(html).toContain('data-testid="command-details"');
    expect(html).toContain('data-testid="shape-editor"');
    expect(html).toContain('data-testid="group-editor"');
  });
});
