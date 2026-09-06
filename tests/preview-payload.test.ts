import { describe, expect, test } from "bun:test";
import { buildDocumentPayload, hashString } from "../src/preview-payload.ts";

describe("buildDocumentPayload", () => {
  test("正常なDSLは描画用ドキュメントと原文を返す", () => {
    const raw = JSON.stringify({
      version: 2,
      canvas: { width: 64, height: 48, background: "#ffffff" },
      phase: "base",
      shapes: [{ kind: "rect", phase: "base", x: 1, y: 2, width: 10, height: 20, fill: "#ff0000" }],
    });
    const payload = buildDocumentPayload(raw);
    expect(payload.ok).toBe(true);
    if (payload.ok) {
      expect(payload.document.shapes).toHaveLength(1);
      expect(payload.raw).toBe(raw);
      expect(payload.hash).toBe(hashString(raw));
    }
  });

  test("壊れたJSONでも例外にせずエラー表示用ペイロードを返す", () => {
    const payload = buildDocumentPayload("{壊れたJSON");
    expect(payload.ok).toBe(false);
    if (!payload.ok) {
      expect(payload.error).toMatch(/JSON/);
      expect(payload.raw).toBe("{壊れたJSON");
    }
  });

  test("検証NGのDSLは次の行動が分かるエラーを返す", () => {
    const payload = buildDocumentPayload(
      JSON.stringify({
        version: 2,
        canvas: { width: 10, height: 10, background: "red" },
        phase: "lineart",
        shapes: [],
      }),
    );
    expect(payload.ok).toBe(false);
    if (!payload.ok) {
      expect(payload.error).toMatch(/検証/);
    }
  });

  test("同じ入力は同じハッシュ、変更後は変わる", () => {
    expect(hashString("a")).toBe(hashString("a"));
    expect(hashString("a")).not.toBe(hashString("b"));
  });
});
