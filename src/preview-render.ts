import type { PaintDocument } from "./paint-document.ts";
import { renderDocumentToCanvas } from "./render-document.ts";
import { PreviewEditError } from "./preview-store.ts";

/** cropは原画座標、scaleは出力倍率。原画から再描画してから切り出す。 */
export function renderPreviewPng(document: PaintDocument, params: URLSearchParams): Buffer {
  const allowed = new Set(["x", "y", "width", "height", "scale"]);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1) {
      throw new PreviewEditError(
        "画像の範囲は x, y, width, height, scale をそれぞれ1回だけ指定してください。",
      );
    }
  }
  const number = (key: string, fallback: number): number => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    if (raw.trim() === "" || !Number.isFinite(Number(raw)))
      throw new PreviewEditError(`${key} は有限の数値で指定してください。`);
    return Number(raw);
  };
  const x = number("x", 0);
  const y = number("y", 0);
  const width = number("width", document.canvas.width - x);
  const height = number("height", document.canvas.height - y);
  const scale = number("scale", 1);
  if (
    ![x, y, width, height].every(Number.isInteger) ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > document.canvas.width ||
    y + height > document.canvas.height
  ) {
    throw new PreviewEditError(
      "切り出し範囲はキャンバス内の整数座標と正の幅・高さで指定してください。",
    );
  }
  const outputWidth = Math.ceil(width * scale);
  const outputHeight = Math.ceil(height * scale);
  if (
    scale <= 0 ||
    scale > 8 ||
    outputWidth < 1 ||
    outputHeight < 1 ||
    outputWidth > 4096 ||
    outputHeight > 4096
  ) {
    throw new PreviewEditError(
      "scale は0より大きく8以下、出力は縦横1〜4096pxの範囲にしてください。",
    );
  }
  const canvas = renderDocumentToCanvas(document, { x, y, width, height, scale });
  return Buffer.from(canvas.toBuffer("image/png"));
}
