import { createCanvas } from "@napi-rs/canvas";
import type { PaintDocument } from "./paint-document.ts";

export function renderDocumentToPng(document: PaintDocument): Buffer {
  const canvas = createCanvas(document.canvas.width, document.canvas.height);
  const context = canvas.getContext("2d");

  context.fillStyle = document.canvas.background;
  context.fillRect(0, 0, document.canvas.width, document.canvas.height);

  for (const shape of document.shapes) {
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
    }
  }

  return Buffer.from(canvas.toBuffer("image/png"));
}
