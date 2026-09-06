import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import type { PaintDocument } from "../src/paint-document.ts";
import { renderDocumentToSvg } from "../src/render-svg.ts";
import { parsePaintDocument } from "../src/validate-document.ts";

const SAMPLE: PaintDocument = {
  version: 1,
  canvas: { width: 320, height: 200, background: "#ffffff" },
  shapes: [
    { kind: "rect", x: 20, y: 30, width: 120, height: 80, fill: "#ff0000" },
    { kind: "circle", cx: 220, cy: 100, r: 48, fill: "#0000ff" },
    {
      kind: "line",
      x1: 20,
      y1: 170,
      x2: 300,
      y2: 170,
      stroke: "#000000",
      strokeWidth: 4,
    },
  ],
};

describe("renderDocumentToSvg", () => {
  test("3種の図形と背景をSVG要素へ写像する", () => {
    const svg = renderDocumentToSvg(SAMPLE);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="320" height="200" viewBox="0 0 320 200"');
    expect(svg).toContain('<rect x="0" y="0" width="320" height="200" fill="#ffffff"/>');
    expect(svg).toContain('<rect x="20" y="30" width="120" height="80" fill="#ff0000"/>');
    expect(svg).toContain('<circle cx="220" cy="100" r="48" fill="#0000ff"/>');
    expect(svg).toContain(
      '<line x1="20" y1="170" x2="300" y2="170" stroke="#000000" stroke-width="4"/>',
    );
  });

  test("同一入力からは常に同一文字列を返す（厳密比較可能）", () => {
    expect(renderDocumentToSvg(SAMPLE)).toBe(renderDocumentToSvg(SAMPLE));
  });

  test("pathとopacityを写像する", () => {
    const document: PaintDocument = {
      version: 1,
      canvas: { width: 100, height: 100, background: "#ffffff" },
      shapes: [
        {
          kind: "path",
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
            { x: 20, y: 0 },
          ],
          stroke: "#000000",
          strokeWidth: 3,
          fill: "#ff0000",
          opacity: 0.5,
        },
      ],
    };
    const svg = renderDocumentToSvg(document);
    expect(svg).toContain(
      '<path d="M0 0 L10 10 L20 0" fill="#ff0000" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>',
    );
  });

  test("実サンプルとPNG描画が同じ図形件数・寸法を表す", async () => {
    const raw = await readFile("examples/hello.json", "utf-8");
    const document = parsePaintDocument(JSON.parse(raw) as unknown);
    const svg = renderDocumentToSvg(document);
    expect(svg).toContain(`width="${String(document.canvas.width)}"`);
    expect(svg).toContain(`height="${String(document.canvas.height)}"`);
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('fill="#0000ff"');
    expect(svg).toContain('stroke="#000000"');
  });
});
