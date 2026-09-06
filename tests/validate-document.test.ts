import { describe, expect, test } from "bun:test";
import { parsePaintDocument } from "../src/validate-document.ts";

describe("parsePaintDocument", () => {
  test("最小の正常ドキュメントを受け付ける", () => {
    const document = parsePaintDocument({
      version: 1,
      canvas: { width: 64, height: 48, background: "#ffffff" },
      shapes: [],
    });
    expect(document.canvas.width).toBe(64);
    expect(document.shapes).toHaveLength(0);
  });

  test("3種の図形を受け付ける", () => {
    const document = parsePaintDocument({
      version: 1,
      canvas: { width: 100, height: 100, background: "#000000" },
      shapes: [
        { kind: "rect", x: 1, y: 2, width: 10, height: 20, fill: "#ff0000" },
        { kind: "circle", cx: 50, cy: 50, r: 10, fill: "#00ff00" },
        { kind: "line", x1: 0, y1: 0, x2: 10, y2: 10, stroke: "#0000ff", strokeWidth: 2 },
      ],
    });
    expect(document.shapes).toHaveLength(3);
  });

  test("pathとopacityを受け付ける", () => {
    const document = parsePaintDocument({
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
          opacity: 0.5,
        },
      ],
    });
    expect(document.shapes).toHaveLength(1);
    const shape = document.shapes[0];
    expect(shape?.kind).toBe("path");
    expect(shape?.opacity).toBe(0.5);
  });

  test("負の幅・高さのrectはPNGとSVGの不一致を防ぐため拒否する", () => {
    expect(() =>
      parsePaintDocument({
        version: 1,
        canvas: { width: 32, height: 32, background: "#ffffff" },
        shapes: [{ kind: "rect", x: 20, y: 20, width: -10, height: 5, fill: "#ff0000" }],
      }),
    ).toThrow(/0以上/);
  });

  test("1点以下のpathと範囲外のopacityを拒否する", () => {
    const canvas = { width: 32, height: 32, background: "#ffffff" };
    expect(() =>
      parsePaintDocument({
        version: 1,
        canvas,
        shapes: [{ kind: "path", points: [{ x: 0, y: 0 }], stroke: "#000", strokeWidth: 2 }],
      }),
    ).toThrow(/2〜/);
    expect(() =>
      parsePaintDocument({
        version: 1,
        canvas,
        shapes: [{ kind: "rect", x: 0, y: 0, width: 4, height: 4, fill: "#fff", opacity: 2 }],
      }),
    ).toThrow(/0〜1/);
  });

  test("version不一致は旧データとして拒否する", () => {
    expect(() =>
      parsePaintDocument({
        version: 2,
        canvas: { width: 10, height: 10, background: "#ffffff" },
        shapes: [],
      }),
    ).toThrow(/version/);
  });

  test("不正な色は次の行動が分かるエラーにする", () => {
    expect(() =>
      parsePaintDocument({
        version: 1,
        canvas: { width: 10, height: 10, background: "red" },
        shapes: [],
      }),
    ).toThrow(/#RGB/);
  });

  test("未知の図形種別を拒否する", () => {
    expect(() =>
      parsePaintDocument({
        version: 1,
        canvas: { width: 10, height: 10, background: "#ffffff" },
        shapes: [{ kind: "star" }],
      }),
    ).toThrow(/rect.*circle.*line.*path/);
  });
});
