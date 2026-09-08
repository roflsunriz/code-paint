import {
  MAX_CANVAS_SIZE,
  MAX_GEOMETRY_VALUE,
  MAX_PATH_POINTS,
  MAX_SHAPES,
  PAINT_DOCUMENT_VERSION,
  type PaintCanvas,
  type PaintDocument,
  type PaintShape,
  type PathShape,
  type PaintFill,
} from "./paint-document.ts";
import { PaintValidationError } from "./paint-error.ts";
import {
  DISPLAY_RANK,
  parsePaintPhase,
  workflowOrderLabel,
  type PaintPhase,
} from "./paint-phase.ts";

import { assertCurvePath } from "./curve-path.ts";
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
  if (Math.abs(num) > MAX_GEOMETRY_VALUE) {
    throw new PaintValidationError(
      path,
      `数値の絶対値は ${String(MAX_GEOMETRY_VALUE)} 以下で指定してください。`,
    );
  }
  return num;
}

function parseOpacity(value: unknown, path: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const opacity = asNumber(value, path);
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new PaintValidationError(path, "不透明度は0〜1の数値で指定してください（省略時は1）。");
  }
  return opacity;
}

function withOpacity(shape: PaintShape, value: Record<string, unknown>, path: string): PaintShape {
  const opacity = parseOpacity(value["opacity"], `${path}.opacity`);
  if (opacity !== undefined) {
    shape.opacity = opacity;
  }
  for (const key of ["id", "group"] as const) {
    if (value[key] !== undefined) {
      const name = asString(value[key], `${path}.${key}`);
      if (name.trim() === "" || name.length > 200)
        throw new PaintValidationError(`${path}.${key}`, "名前は1〜200文字で指定してください。");
      shape[key] = name;
    }
  }
  if (value["layer"] !== undefined)
    shape.layer = assertFiniteNumber(value["layer"], `${path}.layer`);
  if (value["hidden"] !== undefined) {
    if (typeof value["hidden"] !== "boolean")
      throw new PaintValidationError(`${path}.hidden`, "hidden は真偽値で指定してください。");
    shape.hidden = value["hidden"];
  }
  if (value["clip"] !== undefined) shape.clip = assertCurvePath(value["clip"], `${path}.clip`);
  if (value["transform"] !== undefined) {
    const transform = value["transform"];
    if (!Array.isArray(transform) || transform.length !== 6)
      throw new PaintValidationError(
        `${path}.transform`,
        "transform は有限数値6個の配列 [a,b,c,d,e,f] で指定してください。",
      );
    shape.transform = transform.map((n: unknown) => assertFiniteNumber(n, `${path}.transform`)) as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
  }
  return shape;
}

function assertFill(value: unknown, path: string): PaintFill {
  if (!isRecord(value)) return assertColor(value, path);
  const stopsValue = value["stops"];
  if (!Array.isArray(stopsValue) || stopsValue.length < 2 || stopsValue.length > 64)
    throw new PaintValidationError(
      `${path}.stops`,
      "グラデーションは2〜64個の色を指定してください。",
    );
  let previous = -1;
  const stops = stopsValue.map((stop: unknown) => {
    if (!isRecord(stop))
      throw new PaintValidationError(`${path}.stops`, "色は {offset, color} で指定してください。");
    const offset = assertFiniteNumber(stop["offset"], `${path}.stops.offset`);
    if (offset < 0 || offset > 1 || offset < previous)
      throw new PaintValidationError(
        `${path}.stops.offset`,
        "offset は0〜1の昇順で指定してください。",
      );
    previous = offset;
    return { offset, color: assertColor(stop["color"], `${path}.stops.color`) };
  });
  if (value["kind"] === "linear") {
    const x1 = assertFiniteNumber(value["x1"], `${path}.x1`);
    const y1 = assertFiniteNumber(value["y1"], `${path}.y1`);
    const x2 = assertFiniteNumber(value["x2"], `${path}.x2`);
    const y2 = assertFiniteNumber(value["y2"], `${path}.y2`);
    if (x1 === x2 && y1 === y2)
      throw new PaintValidationError(
        path,
        "線形グラデーションの始点と終点は異なる座標にしてください。",
      );
    return { kind: "linear", x1, y1, x2, y2, stops };
  }
  if (value["kind"] === "radial") {
    const r = assertFiniteNumber(value["r"], `${path}.r`);
    if (r <= 0)
      throw new PaintValidationError(`${path}.r`, "半径は0より大きい数値で指定してください。");
    return {
      kind: "radial",
      cx: assertFiniteNumber(value["cx"], `${path}.cx`),
      cy: assertFiniteNumber(value["cy"], `${path}.cy`),
      r,
      stops,
    };
  }
  throw new PaintValidationError(
    path,
    "塗りは16進色か linear / radial グラデーションで指定してください。",
  );
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
  if (kind === "curve") {
    const strokeWidth = assertFiniteNumber(value["strokeWidth"], `${path}.strokeWidth`);
    if (strokeWidth < 0)
      throw new PaintValidationError(`${path}.strokeWidth`, "線幅は0以上で指定してください。");
    const fill =
      value["fill"] === undefined ? undefined : assertFill(value["fill"], `${path}.fill`);
    return withOpacity(
      {
        kind,
        phase: parseShapePhase(value, path),
        d: assertCurvePath(value["d"], `${path}.d`),
        stroke: assertColor(value["stroke"], `${path}.stroke`),
        strokeWidth,
        ...(fill === undefined ? {} : { fill }),
      },
      value,
      path,
    );
  }
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
      fill: assertFill(value["fill"], `${path}.fill`),
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
      fill: assertFill(value["fill"], `${path}.fill`),
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
    const fill = fillValue === undefined ? undefined : assertFill(fillValue, `${path}.fill`);
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
    '図形種別は "rect" / "circle" / "line" / "path" / "curve" のいずれかで指定してください。',
  );
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
  if (value["version"] === 1 || value["version"] === 2) {
    throw new PaintValidationError(
      "version",
      "version 1 / 2 は旧形式です。bun run src/migrate.ts -- --input <旧JSON> --output <新JSON> で version 3 へ移行してください。",
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
  const ids = new Set<string>();
  for (const shape of shapes) {
    if (shape.id !== undefined) {
      if (ids.has(shape.id))
        throw new PaintValidationError("shapes.id", `図形ID ${shape.id} が重複しています。`);
      ids.add(shape.id);
    }
  }
  return {
    version: PAINT_DOCUMENT_VERSION,
    canvas: parseCanvas(value["canvas"]),
    phase,
    shapes,
  };
}

/** 旧形式を明示移行。v2の表示順を固定layerに写し、v1は配列順を維持する。 */
export function migrateToCurrentDocument(value: unknown): PaintDocument {
  if (!isRecord(value))
    throw new PaintValidationError("$", "描画ドキュメントはJSONオブジェクトで指定してください。");
  if (value["version"] !== 1 && value["version"] !== 2)
    throw new PaintValidationError(
      "version",
      "移行元は version 1 / 2 を指定してください。version 3 は移行不要です。",
    );
  const oldVersion = value["version"];
  const shapesValue = value["shapes"];
  if (!Array.isArray(shapesValue))
    throw new PaintValidationError("shapes", "shapes は配列で指定してください。");
  const shapes = shapesValue.map((item: unknown, index: number) => {
    if (!isRecord(item))
      throw new PaintValidationError(`shapes[${String(index)}]`, "図形オブジェクトが必要です。");
    const phase =
      oldVersion === 1
        ? "lineart"
        : parsePaintPhase(item["phase"], `shapes[${String(index)}].phase`);
    // 旧validatorが無視していた属性を、新版の有効な属性として解釈しない。
    const legacyKeys: Record<string, readonly string[]> = {
      rect: ["x", "y", "width", "height", "fill"],
      circle: ["cx", "cy", "r", "fill"],
      line: ["x1", "y1", "x2", "y2", "stroke", "strokeWidth"],
      path: ["points", "stroke", "strokeWidth", "fill"],
    };
    const kind = asString(item["kind"], `shapes[${String(index)}].kind`);
    if (!Object.hasOwn(legacyKeys, kind)) {
      throw new PaintValidationError(
        `shapes[${String(index)}].kind`,
        "旧形式の図形は rect / circle / line / path のみです。",
      );
    }
    const geometry: Record<string, unknown> = { kind, opacity: item["opacity"] };
    for (const key of legacyKeys[kind] ?? []) {
      if (item[key] !== undefined)
        geometry[key] =
          key === "fill" ? assertColor(item[key], `shapes[${String(index)}].fill`) : item[key];
    }
    return {
      ...geometry,
      phase,
      layer: oldVersion === 1 ? 0 : DISPLAY_RANK[phase],
      id: `shape-${String(index + 1)}`,
    };
  });
  return parsePaintDocument({
    version: PAINT_DOCUMENT_VERSION,
    canvas: value["canvas"],
    phase: oldVersion === 1 ? "lineart" : value["phase"],
    shapes,
  });
}
