import type { PaintPhase } from "./paint-phase.ts";
export const PAINT_DOCUMENT_VERSION = 3 as const;
export const MAX_CANVAS_SIZE = 4096;
export const MAX_SHAPES = 10000;
export const MAX_PATH_POINTS = 10000;
/** ネイティブ描画のfloat演算を安全な範囲に保つ座標・寸法・変形値の上限。 */
export const MAX_GEOMETRY_VALUE = 1000000;
export interface PaintCanvas {
  width: number;
  height: number;
  background: string;
}
export interface GradientStop {
  offset: number;
  color: string;
}
export type PaintFill =
  | string
  | { kind: "linear"; x1: number; y1: number; x2: number; y2: number; stops: GradientStop[] }
  | { kind: "radial"; cx: number; cy: number; r: number; stops: GradientStop[] };
export interface ShapeOptions {
  phase: PaintPhase;
  opacity?: number;
  id?: string;
  group?: string;
  layer?: number;
  hidden?: boolean;
  clip?: string;
  transform?: [number, number, number, number, number, number];
}
export interface RectShape extends ShapeOptions {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: PaintFill;
}
export interface CircleShape extends ShapeOptions {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
  fill: PaintFill;
}
export interface LineShape extends ShapeOptions {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}
export interface PathPoint {
  x: number;
  y: number;
}
export interface PathShape extends ShapeOptions {
  kind: "path";
  points: PathPoint[];
  stroke: string;
  strokeWidth: number;
  fill?: PaintFill;
}
export interface CurveShape extends ShapeOptions {
  kind: "curve";
  d: string;
  stroke: string;
  strokeWidth: number;
  fill?: PaintFill;
}
export type PaintShape = RectShape | CircleShape | LineShape | PathShape | CurveShape;
export interface PaintDocument {
  version: typeof PAINT_DOCUMENT_VERSION;
  canvas: PaintCanvas;
  /** 作業ガイド。描画順や編集可否は制限しない。 */ phase: PaintPhase;
  shapes: PaintShape[];
}
