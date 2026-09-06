import { createCanvas } from "@napi-rs/canvas";
import { MAX_SHAPES, type PaintDocument, type RectShape } from "./paint-document.ts";
import { PaintValidationError } from "./paint-error.ts";
import { sortShapesByDisplayOrder } from "./paint-phase.ts";
import { assertColor } from "./validate-document.ts";

export interface BucketFillRequest {
  x: number;
  y: number;
  fill: string;
  tolerance?: number | undefined;
}

const DEFAULT_TOLERANCE = 16;
const MAX_TOLERANCE = 255;

function parseHexColor(color: string): { r: number; g: number; b: number } {
  let hex = color.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => `${c}${c}`)
      .join("");
  }
  const alphaStripped = hex.length === 8 ? hex.slice(0, 6) : hex;
  const value = Number.parseInt(alphaStripped, 16);
  return {
    r: Math.floor(value / 65536) % 256,
    g: Math.floor(value / 256) % 256,
    b: value % 256,
  };
}

function renderToPixels(document: PaintDocument): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const canvas = createCanvas(document.canvas.width, document.canvas.height);
  const context = canvas.getContext("2d");
  context.fillStyle = document.canvas.background;
  context.fillRect(0, 0, document.canvas.width, document.canvas.height);
  for (const shape of sortShapesByDisplayOrder(document.shapes)) {
    context.save();
    if (shape.opacity !== undefined) {
      context.globalAlpha = shape.opacity;
    }
    switch (shape.kind) {
      case "rect": {
        context.fillStyle = shape.fill;
        context.fillRect(shape.x, shape.y, shape.width, shape.height);
        break;
      }
      case "circle": {
        context.fillStyle = shape.fill;
        context.beginPath();
        context.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        context.fill();
        break;
      }
      case "line": {
        context.strokeStyle = shape.stroke;
        context.lineWidth = shape.strokeWidth;
        context.beginPath();
        context.moveTo(shape.x1, shape.y1);
        context.lineTo(shape.x2, shape.y2);
        context.stroke();
        break;
      }
      case "path": {
        context.strokeStyle = shape.stroke;
        context.lineWidth = shape.strokeWidth;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        const first = shape.points[0];
        if (first !== undefined) {
          context.moveTo(first.x, first.y);
          for (const point of shape.points.slice(1)) {
            context.lineTo(point.x, point.y);
          }
        }
        if (shape.fill !== undefined) {
          context.fillStyle = shape.fill;
          context.fill();
        }
        context.stroke();
        break;
      }
    }
    context.restore();
  }
  const image = context.getImageData(0, 0, document.canvas.width, document.canvas.height);
  return { data: image.data, width: image.width, height: image.height };
}

function parseBucketRequest(
  document: PaintDocument,
  request: BucketFillRequest,
): {
  x: number;
  y: number;
  fill: string;
  tolerance: number;
} {
  if (document.phase !== "base") {
    throw new PaintValidationError(
      "phase",
      "バケツ塗りは作業フェーズがバケツ塗り（base）のときだけ実行できます。線画の後にフェーズを base へ進めてください。",
    );
  }
  const { x, y, fill, tolerance } = request;
  if (!Number.isInteger(x) || x < 0 || x >= document.canvas.width) {
    throw new PaintValidationError(
      "x",
      `0〜${String(document.canvas.width - 1)} の整数で指定してください。線画で囲まれた内側の座標を選んでください。`,
    );
  }
  if (!Number.isInteger(y) || y < 0 || y >= document.canvas.height) {
    throw new PaintValidationError(
      "y",
      `0〜${String(document.canvas.height - 1)} の整数で指定してください。線画で囲まれた内側の座標を選んでください。`,
    );
  }
  const parsedFill = assertColor(fill, "fill");
  const parsedTolerance = tolerance ?? DEFAULT_TOLERANCE;
  if (
    typeof parsedTolerance !== "number" ||
    Number.isNaN(parsedTolerance) ||
    !Number.isInteger(parsedTolerance) ||
    parsedTolerance < 0 ||
    parsedTolerance > MAX_TOLERANCE
  ) {
    throw new PaintValidationError(
      "tolerance",
      `0〜${String(MAX_TOLERANCE)} の整数で指定してください（省略時は${String(DEFAULT_TOLERANCE)}）。`,
    );
  }
  return { x, y, fill: parsedFill, tolerance: parsedTolerance };
}

/**
 * ラスタのバケツ塗り結果をベクタのrect束へ展開する。
 * 現在の描画ビットマップから種点と同色の連続領域を4方向BFSで求め、
 * 行ごとの連続区間を高さ1のrect（phase: base）へ変換する。
 * rectのみで表現するためPNG/SVG/プレビューの描画一致が保たれる。
 * 決定的な走査順（行優先・左から右）のため同一入力は同一出力を返す。
 */
export function bucketFillToRects(
  document: PaintDocument,
  request: BucketFillRequest,
): RectShape[] {
  const seed = parseBucketRequest(document, request);
  const { data, width, height } = renderToPixels(document);
  const seedOffset = (seed.y * width + seed.x) * 4;
  const seedR = data[seedOffset] ?? 0;
  const seedG = data[seedOffset + 1] ?? 0;
  const seedB = data[seedOffset + 2] ?? 0;
  const fillRgb = parseHexColor(seed.fill);
  if (
    Math.abs(seedR - fillRgb.r) <= seed.tolerance &&
    Math.abs(seedG - fillRgb.g) <= seed.tolerance &&
    Math.abs(seedB - fillRgb.b) <= seed.tolerance
  ) {
    throw new PaintValidationError(
      "fill",
      "種点は既に指定色と同色です。別の色か別の座標を選んでください。",
    );
  }

  const visited = new Uint8Array(width * height);
  const mask = new Uint8Array(width * height);
  const stack: number[] = [seed.y * width + seed.x];
  visited[seed.y * width + seed.x] = 1;
  const matches = (offset: number): boolean =>
    Math.abs((data[offset] ?? 0) - seedR) <= seed.tolerance &&
    Math.abs((data[offset + 1] ?? 0) - seedG) <= seed.tolerance &&
    Math.abs((data[offset + 2] ?? 0) - seedB) <= seed.tolerance;

  while (stack.length > 0) {
    const current = stack.pop() as number;
    const cx = current % width;
    const cy = Math.floor(current / width);
    const pixelOffset = current * 4;
    if (!matches(pixelOffset)) {
      continue;
    }
    mask[current] = 1;
    if (cx > 0 && visited[current - 1] === 0) {
      visited[current - 1] = 1;
      stack.push(current - 1);
    }
    if (cx + 1 < width && visited[current + 1] === 0) {
      visited[current + 1] = 1;
      stack.push(current + 1);
    }
    if (cy > 0 && visited[current - width] === 0) {
      visited[current - width] = 1;
      stack.push(current - width);
    }
    if (cy + 1 < height && visited[current + width] === 0) {
      visited[current + width] = 1;
      stack.push(current + width);
    }
  }

  const rects: RectShape[] = [];
  for (let y = 0; y < height; y += 1) {
    let runStart = -1;
    for (let x = 0; x <= width; x += 1) {
      const filled = x < width && mask[y * width + x] === 1;
      if (filled && runStart < 0) {
        runStart = x;
      }
      if (!filled && runStart >= 0) {
        rects.push({
          kind: "rect",
          phase: "base",
          x: runStart,
          y,
          width: x - runStart,
          height: 1,
          fill: seed.fill,
        });
        runStart = -1;
      }
    }
  }
  if (rects.length === 0) {
    throw new PaintValidationError(
      "x",
      "塗りつぶせる領域がありません。線画で囲まれた領域の内側を指定してください。",
    );
  }
  if (document.shapes.length + rects.length > MAX_SHAPES) {
    throw new PaintValidationError(
      "shapes",
      `図形は最大 ${String(MAX_SHAPES)} 件までです。バケツ塗りの結果（${String(rects.length)}件）を追加すると上限を超えます。`,
    );
  }
  return rects;
}
