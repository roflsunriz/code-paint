import {
  MAX_CANVAS_SIZE,
  MAX_PATH_POINTS,
  MAX_SHAPES,
  PAINT_DOCUMENT_VERSION,
  type PaintCanvas,
  type PaintDocument,
  type PaintShape,
  type PathShape,
} from "./paint-document.ts";
import { PaintValidationError } from "./paint-error.ts";
import {
  PAINT_PHASE_ORDER,
  parsePaintPhase,
  workflowOrderLabel,
  type PaintPhase,
} from "./paint-phase.ts";

export { PaintValidationError } from "./paint-error.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new PaintValidationError(path, "数値を指定してください。JSONの型を確認してください。");
  }
  return value;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new PaintValidationError(path, "文字列を指定してください。JSONの型を確認してください。");
  }
  return value;
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function assertColor(value: unknown, path: string): string {
  const color = asString(value, path);
  if (!HEX_COLOR_PATTERN.test(color)) {
    throw new PaintValidationError(
      path,
      "色は #RGB / #RRGGBB / #RRGGBBAA 形式の16進数で指定してください（例: #ff0000）。",
    );
  }
  return color;
}

function assertDimension(value: unknown, path: string): number {
  const size = asNumber(value, path);
  if (!Number.isInteger(size) || size < 1 || size > MAX_CANVAS_SIZE) {
    throw new PaintValidationError(
      path,
      `1〜${String(MAX_CANVAS_SIZE)} の整数で指定してください。`,
    );
  }
  return size;
}

function assertFiniteNumber(value: unknown, path: string): number {
  const num = asNumber(value, path);
  if (!Number.isFinite(num)) {
    throw new PaintValidationError(path, "有限の数値を指定してください。");
  }
  return num;
}

function parseOpacity(value: unknown, path: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const opacity = asNumber(value, path);
  if (opacity < 0 || opacity > 1) {
    throw new PaintValidationError(path, "不透明度は0〜1の数値で指定してください（省略時は1）。");
  }
  return opacity;
}

function withOpacity(shape: PaintShape, value: Record<string, unknown>, path: string): PaintShape {
  const opacity = parseOpacity(value["opacity"], `${path}.opacity`);
  if (opacity !== undefined) {
    shape.opacity = opacity;
  }
  return shape;
}

function parseCanvas(value: unknown): PaintCanvas {
  if (!isRecord(value)) {
    throw new PaintValidationError("canvas", "canvasオブジェクトが必要です。");
  }
  return {
    width: assertDimension(value["width"], "canvas.width"),
    height: assertDimension(value["height"], "canvas.height"),
    background: assertColor(value["background"], "canvas.background"),
  };
}

export function parsePaintShape(value: unknown, index: number): PaintShape {
  return parseShape(value, index);
}

function parseShapePhase(value: Record<string, unknown>, path: string): PaintPhase {
  if (value["phase"] === undefined) {
    throw new PaintValidationError(
      `${path}.phase`,
      `作業フェーズを指定してください（${workflowOrderLabel()}）。`,
    );
  }
  return parsePaintPhase(value["phase"], `${path}.phase`);
}

function parseShape(value: unknown, index: number): PaintShape {
  const path = `shapes[${String(index)}]`;
  if (!isRecord(value)) {
    throw new PaintValidationError(path, "図形オブジェクトが必要です。");
  }
  const kind = value["kind"];
  if (kind === "rect") {
    const width = assertFiniteNumber(value["width"], `${path}.width`);
    const height = assertFiniteNumber(value["height"], `${path}.height`);
    if (width < 0 || height < 0) {
      throw new PaintValidationError(
        path,
        "rectの幅と高さは0以上で指定してください。負の値はPNGとSVGで描画結果が一致しないため受け付けません。",
      );
    }
    const shape: PaintShape = {
      kind: "rect",
      phase: parseShapePhase(value, path),
      x: assertFiniteNumber(value["x"], `${path}.x`),
      y: assertFiniteNumber(value["y"], `${path}.y`),
      width,
      height,
      fill: assertColor(value["fill"], `${path}.fill`),
    };
    return withOpacity(shape, value, path);
  }
  if (kind === "circle") {
    const r = assertFiniteNumber(value["r"], `${path}.r`);
    if (r <= 0) {
      throw new PaintValidationError(`${path}.r`, "半径は0より大きい数値で指定してください。");
    }
    const shape: PaintShape = {
      kind: "circle",
      phase: parseShapePhase(value, path),
      cx: assertFiniteNumber(value["cx"], `${path}.cx`),
      cy: assertFiniteNumber(value["cy"], `${path}.cy`),
      r,
      fill: assertColor(value["fill"], `${path}.fill`),
    };
    return withOpacity(shape, value, path);
  }
  if (kind === "line") {
    const strokeWidth = assertFiniteNumber(value["strokeWidth"], `${path}.strokeWidth`);
    if (strokeWidth <= 0) {
      throw new PaintValidationError(
        `${path}.strokeWidth`,
        "線幅は0より大きい数値で指定してください。",
      );
    }
    const shape: PaintShape = {
      kind: "line",
      phase: parseShapePhase(value, path),
      x1: assertFiniteNumber(value["x1"], `${path}.x1`),
      y1: assertFiniteNumber(value["y1"], `${path}.y1`),
      x2: assertFiniteNumber(value["x2"], `${path}.x2`),
      y2: assertFiniteNumber(value["y2"], `${path}.y2`),
      stroke: assertColor(value["stroke"], `${path}.stroke`),
      strokeWidth,
    };
    return withOpacity(shape, value, path);
  }
  if (kind === "path") {
    const pointsValue = value["points"];
    if (!Array.isArray(pointsValue)) {
      throw new PaintValidationError(
        `${path}.points`,
        "points は2点以上の座標配列で指定してください。",
      );
    }
    if (pointsValue.length < 2 || pointsValue.length > MAX_PATH_POINTS) {
      throw new PaintValidationError(
        `${path}.points`,
        `points は2〜${String(MAX_PATH_POINTS)}点で指定してください。`,
      );
    }
    const points = pointsValue.map((item: unknown, pointIndex: number) => {
      const pointPath = `${path}.points[${String(pointIndex)}]`;
      if (!isRecord(item)) {
        throw new PaintValidationError(pointPath, "点は { x, y } で指定してください。");
      }
      return {
        x: assertFiniteNumber(item["x"], `${pointPath}.x`),
        y: assertFiniteNumber(item["y"], `${pointPath}.y`),
      };
    });
    const strokeWidth = assertFiniteNumber(value["strokeWidth"], `${path}.strokeWidth`);
    if (strokeWidth <= 0) {
      throw new PaintValidationError(
        `${path}.strokeWidth`,
        "線幅は0より大きい数値で指定してください。",
      );
    }
    const fillValue = value["fill"];
    const fill = fillValue === undefined ? undefined : assertColor(fillValue, `${path}.fill`);
    const shape: PathShape = {
      kind: "path",
      phase: parseShapePhase(value, path),
      points,
      stroke: assertColor(value["stroke"], `${path}.stroke`),
      strokeWidth,
      ...(fill === undefined ? {} : { fill }),
    };
    return withOpacity(shape, value, path);
  }
  throw new PaintValidationError(
    `${path}.kind`,
    '図形種別は "rect" / "circle" / "line" / "path" のいずれかで指定してください。',
  );
}

function assertPhaseOrder(shapes: readonly PaintShape[], documentPhase: PaintPhase): void {
  const documentRank = PAINT_PHASE_ORDER[documentPhase];
  for (let index = 0; index < shapes.length; index += 1) {
    const shape = shapes[index];
    if (shape === undefined) {
      continue;
    }
    const rank = PAINT_PHASE_ORDER[shape.phase];
    if (rank > documentRank) {
      throw new PaintValidationError(
        `shapes[${String(index)}].phase`,
        `現在の作業フェーズを超えた図形は置けません（現在: ${documentPhase}、図形: ${shape.phase}）。先にフェーズを進めてください。順序は${workflowOrderLabel()}です。`,
      );
    }
    if (index > 0) {
      const previous = shapes[index - 1];
      if (previous !== undefined && PAINT_PHASE_ORDER[previous.phase] > rank) {
        throw new PaintValidationError(
          `shapes[${String(index)}].phase`,
          `図形は作業順（${workflowOrderLabel()}）に並べてください。前の図形が ${previous.phase} なのに ${shape.phase} に戻っています。`,
        );
      }
    }
  }
}

function parseDocumentPhase(value: unknown): PaintPhase {
  if (value === undefined) {
    throw new PaintValidationError(
      "phase",
      `現在の作業フェーズを指定してください（${workflowOrderLabel()}）。最初は "lineart" です。`,
    );
  }
  return parsePaintPhase(value, "phase");
}

export function parsePaintDocument(value: unknown): PaintDocument {
  if (!isRecord(value)) {
    throw new PaintValidationError("$", "描画ドキュメントはJSONオブジェクトで指定してください。");
  }
  if (value["version"] === 1) {
    throw new PaintValidationError(
      "version",
      "version 1 は旧形式です。bun run src/migrate.ts -- --input <旧JSON> --output <新JSON> で version 2（作業フェーズ付き）へ移行してください。",
    );
  }
  if (value["version"] !== PAINT_DOCUMENT_VERSION) {
    throw new PaintValidationError(
      "version",
      `version には ${String(PAINT_DOCUMENT_VERSION)} を指定してください。旧データは明示的マイグレーションの対象です。`,
    );
  }
  const shapesValue = value["shapes"];
  if (!Array.isArray(shapesValue)) {
    throw new PaintValidationError("shapes", "shapes は図形オブジェクトの配列で指定してください。");
  }
  if (shapesValue.length > MAX_SHAPES) {
    throw new PaintValidationError(
      "shapes",
      `図形は最大 ${String(MAX_SHAPES)} 件までです。件数を減らしてください。`,
    );
  }
  const phase = parseDocumentPhase(value["phase"]);
  const shapes = shapesValue.map((item: unknown, index: number) => parseShape(item, index));
  assertPhaseOrder(shapes, phase);
  return {
    version: PAINT_DOCUMENT_VERSION,
    canvas: parseCanvas(value["canvas"]),
    phase,
    shapes,
  };
}

/**
 * version 1 の旧ドキュメントを version 2 へ明示的に移行する。
 * 旧図形にフェーズ情報がないため、すべて線画として取り込み、
 * ドキュメントの現在フェーズも線画からやり直す。塗り以降の作業は
 * 移行後にフェーズを進めて追加し直す。
 */
export function migrateV1ToV2Document(value: unknown): PaintDocument {
  if (!isRecord(value)) {
    throw new PaintValidationError("$", "描画ドキュメントはJSONオブジェクトで指定してください。");
  }
  if (value["version"] !== 1) {
    throw new PaintValidationError(
      "version",
      "移行元は version 1 のJSONを指定してください。version 2 は移行不要です。",
    );
  }
  const canvas = parseCanvas(value["canvas"]);
  const shapesValue = value["shapes"];
  if (!Array.isArray(shapesValue)) {
    throw new PaintValidationError("shapes", "shapes は図形オブジェクトの配列で指定してください。");
  }
  if (shapesValue.length > MAX_SHAPES) {
    throw new PaintValidationError(
      "shapes",
      `図形は最大 ${String(MAX_SHAPES)} 件までです。件数を減らしてください。`,
    );
  }
  const shapes = shapesValue.map((item: unknown, index: number) => {
    const withoutPhase: unknown = isRecord(item) ? { ...item, phase: "lineart" } : item;
    return parseShape(withoutPhase, index);
  });
  return {
    version: PAINT_DOCUMENT_VERSION,
    canvas,
    phase: "lineart",
    shapes,
  };
}
