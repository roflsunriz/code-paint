import { createCanvas, Path2D, type SKRSContext2D } from "@napi-rs/canvas";
import type { PaintDocument, PaintFill } from "./paint-document.ts";
import { sortShapesByDisplayOrder } from "./paint-phase.ts";

function canvasFill(context: SKRSContext2D, fill: PaintFill) {
  if (typeof fill === "string") return fill;
  const gradient =
    fill.kind === "linear"
      ? context.createLinearGradient(fill.x1, fill.y1, fill.x2, fill.y2)
      : context.createRadialGradient(fill.cx, fill.cy, 0, fill.cx, fill.cy, fill.r);
  for (const stop of fill.stops) gradient.addColorStop(stop.offset, stop.color);
  return gradient;
}

export interface RenderRegion {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale?: number;
}
export function renderDocumentToCanvas(document: PaintDocument, region: RenderRegion = {}) {
  const scale = region.scale ?? 1;
  const width = region.width ?? document.canvas.width;
  const height = region.height ?? document.canvas.height;
  const x = region.x ?? 0;
  const y = region.y ?? 0;
  if (
    ![scale, width, height, x, y].every(Number.isFinite) ||
    scale <= 0 ||
    width <= 0 ||
    height <= 0 ||
    x < 0 ||
    y < 0 ||
    x + width > document.canvas.width ||
    y + height > document.canvas.height ||
    Math.ceil(width * scale) > 4096 ||
    Math.ceil(height * scale) > 4096
  )
    throw new RangeError(
      "描画領域はキャンバス内の正の寸法・倍率で、出力を4096px以内にしてください。",
    );
  const canvas = createCanvas(Math.ceil(width * scale), Math.ceil(height * scale));
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.translate(-x, -y);
  context.fillStyle = document.canvas.background;
  context.fillRect(0, 0, document.canvas.width, document.canvas.height);
  for (const shape of sortShapesByDisplayOrder(document.shapes)) {
    if (shape.hidden === true) continue;
    context.save();
    if (shape.transform !== undefined) context.transform(...shape.transform);
    if (shape.clip !== undefined) context.clip(new Path2D(shape.clip));
    if (shape.opacity !== undefined) context.globalAlpha = shape.opacity;
    switch (shape.kind) {
      case "rect":
        context.fillStyle = canvasFill(context, shape.fill);
        context.fillRect(shape.x, shape.y, shape.width, shape.height);
        break;
      case "circle":
        context.fillStyle = canvasFill(context, shape.fill);
        context.beginPath();
        context.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        context.fill();
        break;
      case "line":
        context.strokeStyle = shape.stroke;
        context.lineWidth = shape.strokeWidth;
        context.beginPath();
        context.moveTo(shape.x1, shape.y1);
        context.lineTo(shape.x2, shape.y2);
        context.stroke();
        break;
      case "path":
      case "curve": {
        const path = shape.kind === "curve" ? new Path2D(shape.d) : new Path2D();
        if (shape.kind === "path") {
          const first = shape.points[0];
          if (first !== undefined) path.moveTo(first.x, first.y);
          for (const point of shape.points.slice(1)) path.lineTo(point.x, point.y);
        }
        if (shape.fill !== undefined) {
          context.fillStyle = canvasFill(context, shape.fill);
          context.fill(path);
        }
        if (shape.strokeWidth > 0) {
          context.strokeStyle = shape.stroke;
          context.lineWidth = shape.strokeWidth;
          context.lineCap = "round";
          context.lineJoin = "round";
          context.stroke(path);
        }
        break;
      }
    }
    context.restore();
  }
  return canvas;
}
export function renderDocumentToPng(document: PaintDocument, region: RenderRegion = {}): Buffer {
  return Buffer.from(renderDocumentToCanvas(document, region).toBuffer("image/png"));
}
