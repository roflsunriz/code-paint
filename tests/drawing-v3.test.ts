import { describe, expect, test } from "bun:test";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  parsePaintDocument,
  parsePaintShape,
  migrateToCurrentDocument,
} from "../src/validate-document.ts";
import { renderDocumentToCanvas, renderDocumentToPng } from "../src/render-document.ts";
import { renderDocumentToSvg } from "../src/render-svg.ts";
import { bucketFillToRects } from "../src/bucket-fill.ts";
import type { PaintDocument, CurveShape } from "../src/paint-document.ts";
const curve: CurveShape = {
  kind: "curve",
  phase: "base",
  d: "M2 2 L30 2 L30 30 L2 30 Z",
  fill: "#ff0000",
  stroke: "#000000",
  strokeWidth: 0,
};
function doc(shapes: unknown[]): PaintDocument {
  return parsePaintDocument({
    version: 3,
    canvas: { width: 64, height: 64, background: "#ffffff" },
    phase: "lineart",
    shapes,
  });
}
function pixel(document: PaintDocument, x: number, y: number): number[] {
  return [...renderDocumentToCanvas(document).getContext("2d").getImageData(x, y, 1, 1).data];
}
describe("v3 drawing", () => {
  test("巨大な有限座標はネイティブ描画へ渡さず検証で拒否する", () => {
    const stops = [
      { offset: 0, color: "#000" },
      { offset: 1, color: "#fff" },
    ];
    const invalid = [
      { ...curve, d: "M0 0 L1e300 10" },
      { ...curve, clip: "M0 0 L-1000001 10 Z" },
      { ...curve, strokeWidth: 1000001 },
      { ...curve, transform: [1e300, 0, 0, 1, 0, 0] },
      { ...curve, transform: [1, 0, 0, 1, -1000001, 0] },
      { ...curve, fill: { kind: "linear", x1: 0, y1: 0, x2: 1e300, y2: 0, stops } },
      { ...curve, fill: { kind: "radial", cx: 0, cy: 0, r: 1e300, stops } },
      { kind: "rect", phase: "base", x: 1e300, y: 0, width: 10, height: 10, fill: "#000" },
      { kind: "circle", phase: "base", cx: 0, cy: 0, r: 1e300, fill: "#000" },
      {
        kind: "path",
        phase: "base",
        points: [
          { x: 0, y: 0 },
          { x: 1e300, y: 0 },
        ],
        stroke: "#000",
        strokeWidth: 1,
      },
    ];
    for (const shape of invalid) expect(() => parsePaintShape(shape, 0)).toThrow(/1000000/);
    const boundary = doc([
      { ...curve, fill: { kind: "linear", x1: 0, y1: 0, x2: 1000000, y2: 0, stops } },
    ]);
    expect(() => renderDocumentToPng(boundary)).not.toThrow();
    expect(() =>
      parsePaintShape({ ...curve, d: "M-1000000 0 L1000000 0 L0 0.0001 Z" }, 0),
    ).not.toThrow();
  });
  test("半透明のfillとstrokeの重なりもSVGとPNGで一致する", async () => {
    const document = doc([
      {
        ...curve,
        d: "M10 10 L40 10 L40 40 L10 40 Z",
        fill: "#ff000080",
        stroke: "#0000ff80",
        strokeWidth: 8,
        opacity: 0.5,
      },
    ]);
    const image = await loadImage(Buffer.from(renderDocumentToSvg(document)));
    const svg = createCanvas(64, 64).getContext("2d");
    svg.drawImage(image, 0, 0);
    for (const [x, y] of [
      [12, 20],
      [20, 20],
    ]) {
      const a = pixel(document, x ?? 0, y ?? 0);
      const b = svg.getImageData(x ?? 0, y ?? 0, 1, 1).data;
      for (let i = 0; i < 4; i++)
        expect(Math.abs((a[i] ?? 0) - (b[i] ?? 0))).toBeLessThanOrEqual(2);
    }
  });
  test("bucketは透明度境界を越えて塗らない", () => {
    const document = doc([
      { kind: "rect", phase: "base", x: 0, y: 0, width: 32, height: 64, fill: "#000" },
    ]);
    document.canvas.background = "#00000000";
    const rects = bucketFillToRects(document, { x: 5, y: 5, fill: "#fff", tolerance: 0 });
    expect(rects).toHaveLength(64);
    expect(rects.every((r) => r.x === 0 && r.width === 32)).toBe(true);
  });
  test("絶対曲線と編集属性を検証し、不正入力を拒否する", () => {
    const shape: CurveShape = {
      ...curve,
      id: "eye",
      group: "face",
      layer: -5,
      hidden: false,
      clip: "M0 0 Q10 0 10 10 C10 20 0 20 0 10 Z",
      transform: [1, 0, 0, 1, 5, 5],
    };
    expect(parsePaintShape(shape, 0)).toEqual(shape);
    for (const invalid of [
      "M0",
      "L0 0",
      "M0 0 Q1 2 3",
      "M0 0 C1 2 3 4 5",
      "M0 0 A2 2 0 0 0 4 4",
      "M0 0 L1e999 2",
      "M0 0<script/>",
      "M0 0 L",
    ]) {
      expect(() => parsePaintShape({ ...curve, d: invalid }, 0)).toThrow();
    }
    for (const invalid of [
      { transform: [1, 2] },
      { transform: [1, 0, 0, 1, Infinity, 0] },
      { layer: NaN },
      { hidden: 1 },
      { opacity: NaN },
      { id: "" },
      { strokeWidth: -1 },
      { clip: "m0 0" },
    ])
      expect(() => parsePaintShape({ ...curve, ...invalid }, 0)).toThrow();
    expect(() =>
      doc([
        { ...curve, id: "duplicate" },
        { ...curve, id: "duplicate" },
      ]),
    ).toThrow(/重複/);
    expect(parsePaintShape(curve, 0).id).toBeUndefined();
    expect(() => parsePaintDocument({ version: 2 })).toThrow(/移行/);
  });
  test("グラデーションの順序・色・座標を検証する", () => {
    const linear = {
      kind: "linear",
      x1: 0,
      y1: 0,
      x2: 30,
      y2: 0,
      stops: [
        { offset: 0, color: "#ff0000" },
        { offset: 1, color: "#0000ff00" },
      ],
    };
    expect(parsePaintShape({ ...curve, fill: linear }, 0)).toMatchObject({ fill: linear });
    for (const fill of [
      { ...linear, x2: 0 },
      { ...linear, x1: Infinity },
      { ...linear, stops: [] },
      {
        ...linear,
        stops: [
          { offset: 1, color: "#fff" },
          { offset: 0, color: "#000" },
        ],
      },
      {
        ...linear,
        stops: [
          { offset: 0, color: "red" },
          { offset: 1, color: "#000" },
        ],
      },
      { kind: "radial", cx: 0, cy: 0, r: 0, stops: linear.stops },
    ])
      expect(() => parsePaintShape({ ...curve, fill }, 0)).toThrow();
  });
  test("layerはphaseより優先し同値は配列順、hiddenと変形クリップが描画に作用する", () => {
    const document = doc([
      { ...curve, phase: "lineart", layer: 0, fill: "#0000ff" },
      { ...curve, layer: 1, clip: "M0 0 L10 0 L10 32 L0 32 Z", transform: [1, 0, 0, 1, 20, 20] },
      { ...curve, layer: 2, hidden: true, fill: "#00ff00" },
    ]);
    expect(pixel(document, 5, 5)).toEqual([0, 0, 255, 255]);
    expect(pixel(document, 25, 25)).toEqual([255, 0, 0, 255]);
    expect(pixel(document, 35, 25)).toEqual([255, 255, 255, 255]);
    expect(
      pixel(
        doc([
          { ...curve, layer: 2 },
          { ...curve, layer: 2, fill: "#00ff00" },
        ]),
        5,
        5,
      ),
    ).toEqual([0, 255, 0, 255]);
  });
  test("PNGとSVGは曲線・グラデーション・変形クリップの内部画素が一致する", async () => {
    const document = doc([
      {
        ...curve,
        d: "M0 0 Q32 0 32 32 C32 48 0 48 0 32 Z",
        fill: {
          kind: "linear",
          x1: 0,
          y1: 0,
          x2: 32,
          y2: 0,
          stops: [
            { offset: 0, color: "#ff0000" },
            { offset: 1, color: "#0000ff" },
          ],
        },
        clip: "M0 0 L24 0 L24 64 L0 64 Z",
        transform: [1, 0, 0, 1, 10, 5],
      },
      {
        ...curve,
        layer: 6,
        d: "M35 35 L60 35 L60 60 L35 60 Z",
        fill: {
          kind: "radial",
          cx: 46,
          cy: 46,
          r: 15,
          stops: [
            { offset: 0, color: "#00ff00" },
            { offset: 1, color: "#00ff0000" },
          ],
        },
      },
    ]);
    const image = await loadImage(Buffer.from(renderDocumentToSvg(document)));
    const svg = createCanvas(64, 64).getContext("2d");
    svg.drawImage(image, 0, 0);
    const png = renderDocumentToCanvas(document).getContext("2d");
    for (const [x, y] of [
      [15, 15],
      [25, 25],
      [35, 25],
      [46, 46],
      [50, 50],
    ]) {
      const a = png.getImageData(x ?? 0, y ?? 0, 1, 1).data;
      const b = svg.getImageData(x ?? 0, y ?? 0, 1, 1).data;
      for (let i = 0; i < 4; i++)
        expect(Math.abs((a[i] ?? 0) - (b[i] ?? 0))).toBeLessThanOrEqual(3);
    }
  });
  test("cropとscaleは座標を合わせて曲線を再描画し境界違反を拒否する", () => {
    const document = doc([curve]);
    const canvas = renderDocumentToCanvas(document, {
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      scale: 4,
    });
    expect(canvas.width).toBe(80);
    expect(canvas.height).toBe(80);
    expect([...canvas.getContext("2d").getImageData(5, 5, 1, 1).data]).toEqual([255, 0, 0, 255]);
    for (const options of [
      { x: -1 },
      { x: 60, width: 10 },
      { scale: Infinity },
      { scale: 0 },
      { scale: 100 },
      { width: 0 },
    ])
      expect(() => renderDocumentToCanvas(document, options)).toThrow();
  });
  test("移行はv2の層順の見た目と安定IDを保存する", () => {
    const shapes = [
      { kind: "rect", phase: "lineart", x: 0, y: 0, width: 32, height: 32, fill: "#f00" },
      { kind: "rect", phase: "base", x: 0, y: 0, width: 64, height: 64, fill: "#00f" },
    ];
    const current = doc(shapes);
    const old = { ...current, version: 2, shapes };
    const migrated = migrateToCurrentDocument(old);
    expect(renderDocumentToPng(migrated)).toEqual(renderDocumentToPng(current));
    expect(migrated.shapes.map((s) => s.id)).toEqual(["shape-1", "shape-2"]);
    expect(migrated.shapes.map((s) => s.layer)).toEqual([4, 1]);
    expect(migrateToCurrentDocument(old)).toEqual(migrated);
  });
  test("bucketは曲線・変形・hiddenを含む共通描画結果を参照する", () => {
    const document = doc([
      { ...curve, fill: "#000", transform: [1, 0, 0, 1, 20, 0] },
      { ...curve, hidden: true },
    ]);
    const rects = bucketFillToRects(document, { x: 25, y: 10, fill: "#00ff00", tolerance: 0 });
    expect(rects.every((r) => r.x >= 22 && r.x + r.width <= 50 && r.y >= 2 && r.y < 30)).toBe(true);
    expect(rects.length).toBe(28);
  });
});
