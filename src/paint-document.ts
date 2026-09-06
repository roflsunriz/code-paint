import type { PaintPhase } from "./paint-phase.ts";

export const PAINT_DOCUMENT_VERSION = 2 as const;

export const MAX_CANVAS_SIZE = 4096;
export const MAX_SHAPES = 10000;
export const MAX_PATH_POINTS = 10000;

export interface PaintCanvas {
  width: number;
  height: number;
  background: string;
}

export interface RectShape {
  kind: "rect";
  phase: PaintPhase;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  opacity?: number;
}

export interface CircleShape {
  kind: "circle";
  phase: PaintPhase;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  opacity?: number;
}

export interface LineShape {
  kind: "line";
  phase: PaintPhase;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
}

export interface PathPoint {
  x: number;
  y: number;
}

export interface PathShape {
  kind: "path";
  phase: PaintPhase;
  points: PathPoint[];
  stroke: string;
  strokeWidth: number;
  fill?: string;
  opacity?: number;
}

export type PaintShape = RectShape | CircleShape | LineShape | PathShape;

export interface PaintDocument {
  version: typeof PAINT_DOCUMENT_VERSION;
  canvas: PaintCanvas;
  /** 現在の作業フェーズ。これより先のフェーズの図形は持てない。 */
  phase: PaintPhase;
  shapes: PaintShape[];
}
