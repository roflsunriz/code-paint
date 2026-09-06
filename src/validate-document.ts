import {
  MAX_CANVAS_SIZE,
  MAX_SHAPES,
  PAINT_DOCUMENT_VERSION,
  type PaintCanvas,
  type PaintDocument,
  type PaintShape,
} from "./paint-document.ts";

export class PaintValidationError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "PaintValidationError";
    this.path = path;
  }
}

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

function parseShape(value: unknown, index: number): PaintShape {
  const path = `shapes[${String(index)}]`;
  if (!isRecord(value)) {
    throw new PaintValidationError(path, "図形オブジェクトが必要です。");
  }
  const kind = value["kind"];
  if (kind === "rect") {
    return {
      kind: "rect",
      x: assertFiniteNumber(value["x"], `${path}.x`),
      y: assertFiniteNumber(value["y"], `${path}.y`),
      width: assertFiniteNumber(value["width"], `${path}.width`),
      height: assertFiniteNumber(value["height"], `${path}.height`),
      fill: assertColor(value["fill"], `${path}.fill`),
    };
  }
  if (kind === "circle") {
    const r = assertFiniteNumber(value["r"], `${path}.r`);
    if (r <= 0) {
      throw new PaintValidationError(`${path}.r`, "半径は0より大きい数値で指定してください。");
    }
    return {
      kind: "circle",
      cx: assertFiniteNumber(value["cx"], `${path}.cx`),
      cy: assertFiniteNumber(value["cy"], `${path}.cy`),
      r,
      fill: assertColor(value["fill"], `${path}.fill`),
    };
  }
  if (kind === "line") {
    const strokeWidth = assertFiniteNumber(value["strokeWidth"], `${path}.strokeWidth`);
    if (strokeWidth <= 0) {
      throw new PaintValidationError(
        `${path}.strokeWidth`,
        "線幅は0より大きい数値で指定してください。",
      );
    }
    return {
      kind: "line",
      x1: assertFiniteNumber(value["x1"], `${path}.x1`),
      y1: assertFiniteNumber(value["y1"], `${path}.y1`),
      x2: assertFiniteNumber(value["x2"], `${path}.x2`),
      y2: assertFiniteNumber(value["y2"], `${path}.y2`),
      stroke: assertColor(value["stroke"], `${path}.stroke`),
      strokeWidth,
    };
  }
  throw new PaintValidationError(
    `${path}.kind`,
    '図形種別は "rect" / "circle" / "line" のいずれかで指定してください。',
  );
}

export function parsePaintDocument(value: unknown): PaintDocument {
  if (!isRecord(value)) {
    throw new PaintValidationError("$", "描画ドキュメントはJSONオブジェクトで指定してください。");
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
  const shapes = shapesValue.map((item: unknown, index: number) => parseShape(item, index));
  return {
    version: PAINT_DOCUMENT_VERSION,
    canvas: parseCanvas(value["canvas"]),
    shapes,
  };
}
