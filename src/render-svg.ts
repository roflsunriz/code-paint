import type { PaintDocument, PaintShape, PaintFill } from "./paint-document.ts";
import { sortShapesByDisplayOrder } from "./paint-phase.ts";

function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function colorAttributes(name: string, color: string, opacity = 1): string {
  const alpha = /^#[0-9a-fA-F]{8}$/.test(color) ? Number.parseInt(color.slice(7), 16) / 255 : 1;
  const rgb = color.startsWith("#") && color.length === 9 ? color.slice(0, 7) : color;
  return `${name}="${rgb}"${alpha * opacity === 1 ? "" : ` ${name === "stop-color" ? "stop" : name}-opacity="${String(alpha * opacity)}"`}`;
}
function fillToSvg(fill: PaintFill | undefined, index: number, definitions: string[]): string {
  if (fill === undefined) return "none";
  if (typeof fill === "string") return fill;
  const id = `paint-gradient-${String(index)}`;
  const stops = fill.stops
    .map(
      (stop) =>
        `<stop offset="${String(stop.offset)}" ${colorAttributes("stop-color", stop.color)}/>`,
    )
    .join("");
  if (fill.kind === "linear")
    definitions.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${String(fill.x1)}" y1="${String(fill.y1)}" x2="${String(fill.x2)}" y2="${String(fill.y2)}">${stops}</linearGradient>`,
    );
  else
    definitions.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${String(fill.cx)}" cy="${String(fill.cy)}" r="${String(fill.r)}">${stops}</radialGradient>`,
    );
  return `url(#${id})`;
}
function shapeToSvg(shape: PaintShape, index: number, definitions: string[]): string {
  const fill = fillToSvg("fill" in shape ? shape.fill : undefined, index, definitions);
  const opacity = shape.opacity === undefined ? "" : ` opacity="${String(shape.opacity)}"`;
  let element: string;
  switch (shape.kind) {
    case "rect":
      element = `<rect x="${String(shape.x)}" y="${String(shape.y)}" width="${String(shape.width)}" height="${String(shape.height)}" ${colorAttributes("fill", fill)}${opacity}/>`;
      break;
    case "circle":
      element = `<circle cx="${String(shape.cx)}" cy="${String(shape.cy)}" r="${String(shape.r)}" ${colorAttributes("fill", fill)}${opacity}/>`;
      break;
    case "line":
      element = `<line x1="${String(shape.x1)}" y1="${String(shape.y1)}" x2="${String(shape.x2)}" y2="${String(shape.y2)}" ${colorAttributes("stroke", shape.stroke)} stroke-width="${String(shape.strokeWidth)}"${opacity}/>`;
      break;
    case "path":
    case "curve": {
      const d =
        shape.kind === "curve"
          ? shape.d
          : shape.points
              .map((point, i) => `${i === 0 ? "M" : "L"}${String(point.x)} ${String(point.y)}`)
              .join(" ");
      element = `<path d="${escape(d)}" ${colorAttributes("fill", fill, shape.opacity)} ${colorAttributes("stroke", shape.strokeWidth === 0 ? "none" : shape.stroke, shape.opacity)} stroke-width="${String(shape.strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    }
  }
  if (shape.clip !== undefined) {
    const id = `paint-clip-${String(index)}`;
    definitions.push(
      `<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${escape(shape.clip)}"/></clipPath>`,
    );
    element = `<g clip-path="url(#${id})">${element}</g>`;
  }
  if (shape.transform !== undefined)
    element = `<g transform="matrix(${shape.transform.map(String).join(" ")})">${element}</g>`;
  return element;
}
/** 同一座標系・安定したlayer順でPNGと対応する決定的SVGを返す。 */
export function renderDocumentToSvg(document: PaintDocument): string {
  const width = String(document.canvas.width);
  const height = String(document.canvas.height);
  const definitions: string[] = [];
  const shapes = sortShapesByDisplayOrder(document.shapes)
    .filter((shape) => shape.hidden !== true)
    .map((shape, index) => shapeToSvg(shape, index, definitions))
    .join("");
  const defs = definitions.length === 0 ? "" : `<defs>${definitions.join("")}</defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}<rect x="0" y="0" width="${width}" height="${height}" ${colorAttributes("fill", document.canvas.background)}/>${shapes}</svg>`;
}
