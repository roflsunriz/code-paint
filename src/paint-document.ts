export const PAINT_DOCUMENT_VERSION = 1 as const;

export const MAX_CANVAS_SIZE = 4096;
export const MAX_SHAPES = 10000;

export interface PaintCanvas {
  width: number;
  height: number;
  background: string;
}

export interface RectShape {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export interface CircleShape {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
  fill: string;
}

export interface LineShape {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}

export type PaintShape = RectShape | CircleShape | LineShape;

export interface PaintDocument {
  version: typeof PAINT_DOCUMENT_VERSION;
  canvas: PaintCanvas;
  shapes: PaintShape[];
}
