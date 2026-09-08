import { PaintValidationError } from "./paint-error.ts";

/**
 * 作業フェーズの定義。
 * 推奨作業順: lineart → base → shadow → reflection → background
 * 表示順（描画順）: background → base → shadow → reflection → lineart
 * layer省略時はフェーズ表示順を使う。編集の順序は制限しない。
 */
export const PAINT_PHASES = ["lineart", "base", "shadow", "reflection", "background"] as const;

export type PaintPhase = (typeof PAINT_PHASES)[number];

export const PAINT_PHASE_LABELS_JA: Record<PaintPhase, string> = {
  lineart: "線画",
  base: "バケツ塗り",
  shadow: "影",
  reflection: "反射",
  background: "背景",
};

export const PAINT_PHASE_ORDER: Record<PaintPhase, number> = {
  lineart: 0,
  base: 1,
  shadow: 2,
  reflection: 3,
  background: 4,
};

/** layer省略時の合成順。 */
export const PAINT_DISPLAY_ORDER: readonly PaintPhase[] = [
  "background",
  "base",
  "shadow",
  "reflection",
  "lineart",
];

export const DISPLAY_RANK: Record<PaintPhase, number> = {
  background: 0,
  base: 1,
  shadow: 2,
  reflection: 3,
  lineart: 4,
};

export function isPaintPhase(value: unknown): value is PaintPhase {
  return typeof value === "string" && (PAINT_PHASES as readonly string[]).includes(value);
}

export function parsePaintPhase(value: unknown, path: string): PaintPhase {
  if (!isPaintPhase(value)) {
    throw new PaintValidationError(
      path,
      "作業フェーズは lineart / base / shadow / reflection / background のいずれかで指定してください。",
    );
  }
  return value;
}

export function nextPaintPhase(phase: PaintPhase): PaintPhase | null {
  const index = PAINT_PHASE_ORDER[phase];
  const next = PAINT_PHASES[index + 1];
  return next ?? null;
}

/**
 * layerの昇順で安定ソートしたコピーを返す。省略時はフェーズ表示順位。
 * 同一layer内では元の配列順を保つ。
 */
export function sortShapesByDisplayOrder<T extends { phase: PaintPhase; layer?: number }>(
  shapes: readonly T[],
): T[] {
  return shapes
    .map((shape, index) => ({ shape, index }))
    .sort((a, b) => {
      const rank =
        (a.shape.layer ?? DISPLAY_RANK[a.shape.phase]) -
        (b.shape.layer ?? DISPLAY_RANK[b.shape.phase]);
      return rank !== 0 ? rank : a.index - b.index;
    })
    .map((entry) => entry.shape);
}

export function workflowOrderLabel(): string {
  return "線画→バケツ塗り→影→反射→背景";
}
