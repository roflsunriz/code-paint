import { describe, expect, test } from "bun:test";
import { migrateV1ToV2Document, parsePaintDocument } from "../src/validate-document.ts";

describe("migrateV1ToV2Document", () => {
  test("v1図形を線画として取り込みフェーズを線画に戻す", () => {
    const document = migrateV1ToV2Document({
      version: 1,
      canvas: { width: 32, height: 32, background: "#ffffff" },
      shapes: [{ kind: "rect", x: 1, y: 1, width: 4, height: 4, fill: "#ff0000" }],
    });
    expect(document.version).toBe(2);
    expect(document.phase).toBe("lineart");
    expect(document.shapes).toHaveLength(1);
    expect(document.shapes[0]?.phase).toBe("lineart");
    expect(() => parsePaintDocument(document)).not.toThrow();
  });

  test("v2入力の移行を拒否する", () => {
    expect(() =>
      migrateV1ToV2Document({
        version: 2,
        canvas: { width: 8, height: 8, background: "#ffffff" },
        phase: "lineart",
        shapes: [],
      }),
    ).toThrow(/version 1/);
  });
});
