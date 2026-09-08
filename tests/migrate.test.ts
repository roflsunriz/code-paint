import { describe, expect, test } from "bun:test";
import { migrateToCurrentDocument, parsePaintDocument } from "../src/validate-document.ts";
import { renderDocumentToPng } from "../src/render-document.ts";

describe("migrateToCurrentDocument", () => {
  test("旧形式で無視されたv3属性を有効化せず旧表示を保持する", () => {
    const shape = {
      kind: "rect" as const,
      phase: "base" as const,
      x: 1,
      y: 1,
      width: 12,
      height: 12,
      fill: "#f00",
      opacity: 0.7,
    };
    const canvas = { width: 32, height: 32, background: "#fff" };
    const migrated = migrateToCurrentDocument({
      version: 2,
      canvas,
      phase: "base" as const,
      shapes: [
        {
          ...shape,
          hidden: true,
          transform: [1, 0, 0, 1, 20, 0],
          clip: "M0 0 L1 0 L1 1 Z",
          layer: -50,
          group: "ignored",
          id: "ignored",
        },
      ],
    });
    const expected = parsePaintDocument({
      version: 3,
      canvas,
      phase: "base" as const,
      shapes: [shape],
    });
    expect(renderDocumentToPng(migrated)).toEqual(renderDocumentToPng(expected));
    expect(migrated.shapes[0]).toEqual({ ...shape, id: "shape-1", layer: 1 });
  });
  test("旧形式にはないgradientとcurveを移行として受け付けない", () => {
    const base = {
      version: 2,
      canvas: { width: 32, height: 32, background: "#fff" },
      phase: "base" as const,
    };
    expect(() =>
      migrateToCurrentDocument({
        ...base,
        shapes: [
          {
            kind: "rect" as const,
            phase: "base" as const,
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            fill: {
              kind: "linear",
              x1: 0,
              y1: 0,
              x2: 10,
              y2: 0,
              stops: [
                { offset: 0, color: "#000" },
                { offset: 1, color: "#fff" },
              ],
            },
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      migrateToCurrentDocument({
        ...base,
        shapes: [
          {
            kind: "curve",
            phase: "base" as const,
            d: "M0 0 L10 10",
            stroke: "#000",
            strokeWidth: 1,
          },
        ],
      }),
    ).toThrow(/旧形式/);
  });
  test("v1図形を線画として取り込みフェーズを線画に戻す", () => {
    const document = migrateToCurrentDocument({
      version: 1,
      canvas: { width: 32, height: 32, background: "#ffffff" },
      shapes: [{ kind: "rect" as const, x: 1, y: 1, width: 4, height: 4, fill: "#ff0000" }],
    });
    expect(document.version).toBe(3);
    expect(document.phase).toBe("lineart");
    expect(document.shapes).toHaveLength(1);
    expect(document.shapes[0]?.phase).toBe("lineart");
    expect(() => parsePaintDocument(document)).not.toThrow();
  });

  test("v3入力の再移行を拒否する", () => {
    expect(() =>
      migrateToCurrentDocument({
        version: 3,
        canvas: { width: 8, height: 8, background: "#ffffff" },
        phase: "lineart",
        shapes: [],
      }),
    ).toThrow(/version 1/);
  });
});
