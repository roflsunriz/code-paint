import { describe, expect, test } from "bun:test";
import { bucketFillToRects } from "../src/bucket-fill.ts";
import type { PaintDocument } from "../src/paint-document.ts";

function emptyBaseDocument(width = 16, height = 16): PaintDocument {
  return {
    version: 2,
    canvas: { width, height, background: "#ffffff" },
    phase: "base",
    shapes: [],
  };
}

describe("bucketFillToRects", () => {
  test("空キャンバスの全面を高さ1のrect束へ展開する", () => {
    const rects = bucketFillToRects(emptyBaseDocument(8, 4), { x: 1, y: 1, fill: "#ff0000" });
    expect(rects).toHaveLength(4);
    expect(rects[0]).toMatchObject({
      kind: "rect",
      phase: "base",
      x: 0,
      y: 0,
      width: 8,
      height: 1,
    });
    for (const rect of rects) {
      expect(rect.fill).toBe("#ff0000");
    }
  });

  test("線画で囲まれた内側だけを塗る", () => {
    const document: PaintDocument = {
      ...emptyBaseDocument(10, 10),
      shapes: [
        { kind: "rect", phase: "lineart", x: 0, y: 0, width: 10, height: 1, fill: "#000000" },
        { kind: "rect", phase: "lineart", x: 0, y: 9, width: 10, height: 1, fill: "#000000" },
        { kind: "rect", phase: "lineart", x: 0, y: 0, width: 1, height: 10, fill: "#000000" },
        { kind: "rect", phase: "lineart", x: 9, y: 0, width: 1, height: 10, fill: "#000000" },
      ],
    };
    const rects = bucketFillToRects(document, { x: 5, y: 5, fill: "#00ff00" });
    expect(rects.length).toBeGreaterThan(0);
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(1);
      expect(rect.x + rect.width).toBeLessThanOrEqual(9);
      expect(rect.y).toBeGreaterThanOrEqual(1);
      expect(rect.y).toBeLessThanOrEqual(8);
    }
  });

  test("線画フェーズでは実行できない", () => {
    const document: PaintDocument = { ...emptyBaseDocument(), phase: "lineart" };
    expect(() => bucketFillToRects(document, { x: 1, y: 1, fill: "#ff0000" })).toThrow(
      /バケツ塗り/,
    );
  });

  test("同色への塗りつぶしと範囲外の種点を拒否する", () => {
    expect(() => bucketFillToRects(emptyBaseDocument(), { x: 1, y: 1, fill: "#ffffff" })).toThrow(
      /同色/,
    );
    expect(() =>
      bucketFillToRects(emptyBaseDocument(8, 8), { x: 99, y: 1, fill: "#ff0000" }),
    ).toThrow(/整数/);
  });

  test("同一入力は同一出力を返す", () => {
    const document = emptyBaseDocument(8, 8);
    const first = bucketFillToRects(document, { x: 2, y: 2, fill: "#123456" });
    const second = bucketFillToRects(document, { x: 2, y: 2, fill: "#123456" });
    expect(second).toEqual(first);
  });
});
