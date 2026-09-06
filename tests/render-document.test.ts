import { createCanvas, loadImage } from "@napi-rs/canvas";
import { describe, expect, test } from "bun:test";
import type { PaintDocument } from "../src/paint-document.ts";
import { renderDocumentToPng } from "../src/render-document.ts";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function readPixel(
  png: Buffer,
  x: number,
  y: number,
): Promise<[number, number, number, number]> {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const data = context.getImageData(x, y, 1, 1).data;
  return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, data[3] ?? 0];
}

describe("renderDocumentToPng", () => {
  test("PNGシグネチャを持つバイト列を返す", () => {
    const document: PaintDocument = {
      version: 1,
      canvas: { width: 16, height: 16, background: "#ffffff" },
      shapes: [],
    };
    const png = renderDocumentToPng(document);
    expect([...png.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
  });

  test("背景色と矩形がピクセルに反映される（退行防止）", async () => {
    const document: PaintDocument = {
      version: 1,
      canvas: { width: 32, height: 32, background: "#ffffff" },
      shapes: [{ kind: "rect", x: 0, y: 0, width: 16, height: 32, fill: "#ff0000" }],
    };
    const png = renderDocumentToPng(document);
    expect(await readPixel(png, 4, 16)).toEqual([255, 0, 0, 255]);
    expect(await readPixel(png, 24, 16)).toEqual([255, 255, 255, 255]);
  });

  test("pathの線がピクセルに反映される", async () => {
    const document: PaintDocument = {
      version: 1,
      canvas: { width: 32, height: 32, background: "#ffffff" },
      shapes: [
        {
          kind: "path",
          points: [
            { x: 2, y: 16 },
            { x: 30, y: 16 },
          ],
          stroke: "#0000ff",
          strokeWidth: 5,
        },
      ],
    };
    const png = renderDocumentToPng(document);
    expect(await readPixel(png, 16, 16)).toEqual([0, 0, 255, 255]);
    expect(await readPixel(png, 16, 2)).toEqual([255, 255, 255, 255]);
  });

  test("opacityは下地と混ざった色になる", async () => {
    const document: PaintDocument = {
      version: 1,
      canvas: { width: 32, height: 32, background: "#ffffff" },
      shapes: [{ kind: "rect", x: 0, y: 0, width: 32, height: 32, fill: "#ff0000", opacity: 0.5 }],
    };
    const png = renderDocumentToPng(document);
    const [r, g, b, a] = await readPixel(png, 16, 16);
    expect(r).toBe(255);
    expect(a).toBe(255);
    expect(g).toBeGreaterThan(100);
    expect(g).toBeLessThan(160);
    expect(b).toBeGreaterThan(100);
    expect(b).toBeLessThan(160);
  });
});
