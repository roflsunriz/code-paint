import type { PaintDocument, PaintShape } from "./paint-document.ts";

function shapeToSvg(shape: PaintShape): string {
  switch (shape.kind) {
    case "rect": {
      return `<rect x="${String(shape.x)}" y="${String(shape.y)}" width="${String(shape.width)}" height="${String(shape.height)}" fill="${shape.fill}"/>`;
    }
    case "circle": {
      return `<circle cx="${String(shape.cx)}" cy="${String(shape.cy)}" r="${String(shape.r)}" fill="${shape.fill}"/>`;
    }
    case "line": {
      return `<line x1="${String(shape.x1)}" y1="${String(shape.y1)}" x2="${String(shape.x2)}" y2="${String(shape.y2)}" stroke="${shape.stroke}" stroke-width="${String(shape.strokeWidth)}"/>`;
    }
  }
}

/**
 * 描画ドキュメントをSVGテキストへ変換する純粋関数。
 * PNG描画（render-document.ts）と同一の座標・色セマンティクスを持つ。
 * 出力は決定的で、同一入力からは常に同一文字列を返すため、
 * 画像を見られないエージェントでも厳密な文字列比較・diffで検証できる。
 * なお値は検証済み（数値・16進色）のみが入るため、追加のエスケープは不要。
 */
export function renderDocumentToSvg(document: PaintDocument): string {
  const width = String(document.canvas.width);
  const height = String(document.canvas.height);
  const shapes = document.shapes.map(shapeToSvg).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="${document.canvas.background}"/>${shapes}</svg>`;
}
