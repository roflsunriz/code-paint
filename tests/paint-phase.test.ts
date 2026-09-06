import { describe, expect, test } from "bun:test";
import { nextPaintPhase, parsePaintPhase, sortShapesByDisplayOrder } from "../src/paint-phase.ts";

describe("paint-phase", () => {
  test("作業フェーズを検証し日本語エラーにする", () => {
    expect(parsePaintPhase("lineart", "phase")).toBe("lineart");
    expect(parsePaintPhase("background", "phase")).toBe("background");
    expect(() => parsePaintPhase("unknown", "phase")).toThrow(/lineart/);
  });

  test("フェーズは一段ずつ進み最後は止まる", () => {
    expect(nextPaintPhase("lineart")).toBe("base");
    expect(nextPaintPhase("base")).toBe("shadow");
    expect(nextPaintPhase("shadow")).toBe("reflection");
    expect(nextPaintPhase("reflection")).toBe("background");
    expect(nextPaintPhase("background")).toBe(null);
  });

  test("表示順は背景を最背面に固定する", () => {
    const ordered = sortShapesByDisplayOrder([
      { phase: "lineart" as const, id: 0 },
      { phase: "base" as const, id: 1 },
      { phase: "background" as const, id: 2 },
      { phase: "shadow" as const, id: 3 },
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual([2, 1, 3, 0]);
  });
});
