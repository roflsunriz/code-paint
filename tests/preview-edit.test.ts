import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { PaintDocument, PaintShape } from "../src/paint-document.ts";
import { startPreviewServer, type PreviewServer } from "../src/preview-server.ts";

let server: PreviewServer | undefined;
let workdir = "";
let inputPath = "";
const rect = (id?: string, group?: string): PaintShape => ({
  kind: "rect",
  phase: "base",
  x: 4,
  y: 4,
  width: 8,
  height: 8,
  fill: "#ff0000",
  ...(id === undefined ? {} : { id }),
  ...(group === undefined ? {} : { group }),
});
const empty: PaintDocument = {
  version: 3,
  phase: "lineart",
  canvas: { width: 32, height: 24, background: "#ffffff" },
  shapes: [],
};

async function setup(shapes: PaintShape[] = []): Promise<void> {
  workdir = await mkdtemp(join(tmpdir(), "paint-edit-"));
  inputPath = join(workdir, "document.json");
  await writeFile(inputPath, JSON.stringify({ ...empty, shapes }));
  server = startPreviewServer({ inputPath, port: 0 });
}
function request(
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`http://127.0.0.1:${String(server?.port)}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function saved(): Promise<PaintDocument> {
  return JSON.parse(await readFile(inputPath, "utf-8")) as PaintDocument;
}
async function history(): Promise<{ canUndo: boolean; canRedo: boolean }> {
  return (await (await request("/history")).json()) as { canUndo: boolean; canRedo: boolean };
}

afterEach(async () => {
  server?.stop();
  server = undefined;
  if (workdir) await rm(workdir, { recursive: true, force: true });
  workdir = "";
});

describe("preview editing", () => {
  test("IDなし入力もプレビューで安定IDを持ち、追加時に予約IDを避け永続化する", async () => {
    await setup([rect(), rect("shape-1")]);
    const payload = (await (await request("/document")).json()) as { document: PaintDocument };
    expect(payload.document.shapes.map((shape) => shape.id)).toEqual(["shape-2", "shape-1"]);
    expect((await saved()).shapes[0]?.id).toBeUndefined();
    expect((await request("/shapes", "POST", { shapes: [rect(), rect("shape-3")] })).status).toBe(
      200,
    );
    const ids = (await saved()).shapes.map((shape) => shape.id);
    expect(ids.slice(0, 2)).toEqual(["shape-2", "shape-1"]);
    expect(ids[2]).toMatch(/^shape-[0-9a-f-]{36}$/);
    expect(ids[3]).toBe("shape-3");
    expect(new Set(ids).size).toBe(4);
  });
  test("削除したIDを自動採番で再利用せず古いPATCHは別の図形を変更しない", async () => {
    await setup([rect()]);
    const payload = (await (await request("/document")).json()) as { document: PaintDocument };
    const oldId = payload.document.shapes[0]?.id ?? "";
    expect(oldId).toBe("shape-1");
    expect((await request(`/shapes/${oldId}`, "DELETE")).status).toBe(200);
    expect((await request("/shapes", "POST", { shape: rect() })).status).toBe(200);
    const firstId = (await saved()).shapes[0]?.id ?? "";
    expect(firstId).not.toBe(oldId);
    expect((await request(`/shapes/${oldId}`, "PATCH", { x: 19 })).status).toBe(404);
    expect((await saved()).shapes[0]).toMatchObject({ id: firstId, x: 4 });
    expect((await request(`/shapes/${firstId}`, "DELETE")).status).toBe(200);
    await request("/shapes", "POST", { shape: rect() });
    expect((await saved()).shapes[0]?.id).not.toBe(firstId);
    expect((await request(`/shapes/${firstId}`, "PATCH", { x: 19 })).status).toBe(404);
  });
  test("同時20追記を取りこぼさず全IDが一意で不完全JSONを公開しない", async () => {
    await setup();
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        request("/shapes", "POST", { shape: { ...rect(), x: index } }),
      ),
    );
    expect(results.map((result) => result.status)).toEqual(Array.from({ length: 20 }, () => 200));
    const document = await saved();
    expect(document.shapes).toHaveLength(20);
    expect(new Set(document.shapes.map((shape) => shape.id)).size).toBe(20);
    expect(
      document.shapes.map((shape) => (shape.kind === "rect" ? shape.x : -1)).sort((a, b) => a - b),
    ).toEqual(Array.from({ length: 20 }, (_, index) => index));
    expect(await readdir(workdir)).toEqual(["document.json"]);
  });
  test("図形の局所修正・削除とundo/redoで座標と安定IDを復元する", async () => {
    await setup([rect("eye", "face"), rect("hair")]);
    expect((await request("/shapes/eye", "PATCH", { x: 11, opacity: 0.5 })).status).toBe(200);
    expect((await saved()).shapes[0]).toMatchObject({ id: "eye", x: 11, opacity: 0.5 });
    expect((await request("/shapes/eye", "DELETE")).status).toBe(200);
    expect((await saved()).shapes.map((shape) => shape.id)).toEqual(["hair"]);
    expect((await request("/undo", "POST")).status).toBe(200);
    expect((await saved()).shapes[0]).toMatchObject({ id: "eye", x: 11, opacity: 0.5 });
    expect((await request("/undo", "POST")).status).toBe(200);
    expect((await saved()).shapes[0]).toEqual(rect("eye", "face"));
    expect((await request("/redo", "POST")).status).toBe(200);
    expect((await saved()).shapes[0]).toMatchObject({ x: 11, opacity: 0.5 });
    expect((await request("/shapes/eye", "PATCH", { opacity: null })).status).toBe(200);
    expect((await saved()).shapes[0]?.opacity).toBeUndefined();
    expect((await history()).canRedo).toBe(false);
  });
  test("グループだけの移動・表示切替・削除をまとめてundoできる", async () => {
    await setup([rect("left", "eyes"), rect("right", "eyes"), rect("hair", "hair")]);
    const transform = [1, 0, 0, 1, 2, -3];
    expect(
      (await request("/groups/eyes", "PATCH", { transform, hidden: true, layer: 8 })).status,
    ).toBe(200);
    const document = await saved();
    expect(document.shapes[0]).toMatchObject({ transform, hidden: true, layer: 8 });
    expect(document.shapes[1]).toMatchObject({ transform, hidden: true, layer: 8 });
    expect(document.shapes[2]).toEqual(rect("hair", "hair"));
    expect((await request("/groups/eyes", "DELETE")).status).toBe(200);
    expect((await saved()).shapes).toHaveLength(1);
    await request("/undo", "POST");
    expect((await saved()).shapes).toEqual(document.shapes);
  });
  test("不正更新と存在しないIDはファイルと履歴を変えない", async () => {
    await setup([rect("eye")]);
    const original = await readFile(inputPath, "utf-8");
    for (const patch of [
      { width: -1 },
      { fill: "red" },
      { id: "new" },
      { unknown: 2 },
      {},
      { transform: [1, 2] },
    ]) {
      expect((await request("/shapes/eye", "PATCH", patch)).status).toBe(400);
      expect(await readFile(inputPath, "utf-8")).toBe(original);
    }
    expect((await request("/shapes/missing", "DELETE")).status).toBe(404);
    expect((await request("/shapes", "POST", { shape: rect("eye") })).status).toBe(400);
    expect(
      (await request("/document", "PUT", { ...empty, canvas: { ...empty.canvas, width: -1 } }))
        .status,
    ).toBe(400);
    expect(await readFile(inputPath, "utf-8")).toBe(original);
    expect(await history()).toMatchObject({ canUndo: false, canRedo: false });
  });
  test("一括更新に不正図形が混ざっても部分保存されない", async () => {
    await setup([
      rect("one", "mix"),
      {
        kind: "circle",
        phase: "base",
        id: "two",
        group: "mix",
        cx: 10,
        cy: 10,
        r: 2,
        fill: "#000000",
      },
    ]);
    const original = await readFile(inputPath, "utf-8");
    expect((await request("/groups/mix", "PATCH", { width: 20 })).status).toBe(400);
    expect(await readFile(inputPath, "utf-8")).toBe(original);
  });
  test("全体置換と全消去もundo対象で工程を戻しても絵を消さない", async () => {
    await setup([rect("eye")]);
    expect((await request("/phase", "POST", { phase: "background" })).status).toBe(200);
    expect((await request("/phase", "POST", { phase: "lineart" })).status).toBe(200);
    expect((await saved()).shapes).toEqual([rect("eye")]);
    expect(
      (
        await request("/document", "PUT", {
          ...empty,
          canvas: { ...empty.canvas, width: 48 },
          shapes: [rect("new")],
        })
      ).status,
    ).toBe(200);
    expect((await saved()).canvas.width).toBe(48);
    expect((await request("/shapes", "DELETE")).status).toBe(200);
    expect((await saved()).shapes).toEqual([]);
    await request("/undo", "POST");
    expect((await saved()).shapes[0]?.id).toBe("new");
    await request("/undo", "POST");
    expect((await saved()).canvas.width).toBe(32);
    expect((await saved()).shapes[0]?.id).toBe("eye");
  });
  test("外部保存とサーバ再起動後に古い履歴で絵を上書きしない", async () => {
    await setup([rect("eye")]);
    await request("/shapes/eye", "PATCH", { x: 12 });
    expect((await history()).canUndo).toBe(true);
    const external = JSON.stringify({ ...empty, shapes: [rect("external")] });
    await writeFile(inputPath, external);
    expect(await history()).toMatchObject({ canUndo: false, canRedo: false });
    expect((await request("/undo", "POST")).status).toBe(409);
    expect(await readFile(inputPath, "utf-8")).toBe(external);
    await request("/shapes/external", "PATCH", { x: 9 });
    server?.stop();
    server = startPreviewServer({ inputPath, port: 0 });
    expect((await history()).canUndo).toBe(false);
  });
  test("壊れた外部保存はエラーになり履歴がリセットされ、修復後に再編集できる", async () => {
    await setup([rect("eye")]);
    await request("/shapes/eye", "PATCH", { x: 12 });
    await writeFile(inputPath, "{broken");
    expect((await request("/shapes/eye", "DELETE")).status).toBe(400);
    expect((await request("/render.png")).status).toBe(400);
    expect(await readFile(inputPath, "utf-8")).toBe("{broken");
    expect((await history()).canUndo).toBe(false);
    await writeFile(inputPath, JSON.stringify({ ...empty, shapes: [rect("repaired")] }));
    expect((await request("/shapes/repaired", "PATCH", { x: 10 })).status).toBe(200);
    expect((await saved()).shapes[0]).toMatchObject({ id: "repaired", x: 10 });
  });
  test("別Originやcross-siteの書込を拒否し同一OriginとCLIを受け付ける", async () => {
    await setup();
    const original = await readFile(inputPath, "utf-8");
    for (const headers of [
      { origin: "https://evil.example" },
      { origin: "null" },
      { "sec-fetch-site": "cross-site" },
    ]) {
      expect((await request("/shapes", "POST", { shape: rect() }, headers)).status).toBe(403);
    }
    expect(await readFile(inputPath, "utf-8")).toBe(original);
    expect(
      (
        await request(
          "/shapes",
          "POST",
          { shape: rect() },
          { origin: `http://127.0.0.1:${String(server?.port)}` },
        )
      ).status,
    ).toBe(200);
    expect((await request("/shapes", "POST", { shape: rect() })).status).toBe(200);
  });
  test("バケツ塗りのグループ・層・IDが保存されundoで一括復元する", async () => {
    await setup();
    await request("/phase", "POST", { phase: "base" });
    expect(
      (
        await request("/bucket", "POST", {
          x: 0,
          y: 0,
          fill: "#00ff00",
          layer: -10,
          group: "paint",
        })
      ).status,
    ).toBe(200);
    const document = await saved();
    expect(document.shapes).toHaveLength(24);
    expect(
      document.shapes.every(
        (shape) => shape.layer === -10 && shape.group === "paint" && shape.id !== undefined,
      ),
    ).toBe(true);
    await request("/undo", "POST");
    expect((await saved()).shapes).toHaveLength(0);
  });
});

describe("preview crop", () => {
  test("最新PNGと拡大cropが指定寸法・座標の画素を返す", async () => {
    await setup([rect("block")]);
    let response = await request("/render.png?x=4&y=4&width=8&height=8&scale=3");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const image = await loadImage(bytes);
    expect([image.width, image.height]).toEqual([24, 24]);
    const canvas = createCanvas(24, 24);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    expect(Array.from(context.getImageData(12, 12, 1, 1).data)).toEqual([255, 0, 0, 255]);
    await request("/shapes/block", "PATCH", { fill: "#0000ff" });
    response = await request("/render.png");
    const latest = await loadImage(Buffer.from(await response.arrayBuffer()));
    expect([latest.width, latest.height]).toEqual([32, 24]);
    context.drawImage(latest, 0, 0);
    expect(Array.from(context.getImageData(8, 8, 1, 1).data)).toEqual([0, 0, 255, 255]);
  });
  test("不正crop、非有限・巨大倍率、未知・重複パラメータを拒否する", async () => {
    await setup();
    for (const query of [
      "x=-1",
      "x=32",
      "y=24",
      "width=0",
      "height=25",
      "width=1.5",
      "scale=0",
      "scale=9",
      "scale=Infinity",
      "scale=NaN",
      "scale=",
      "x=0&x=1",
      "unknown=1",
    ]) {
      const response = await request(`/render.png?${query}`);
      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain("application/json");
    }
    await request("/document", "PUT", { ...empty, canvas: { ...empty.canvas, width: 4096 } });
    expect((await request("/render.png?scale=1.00001")).status).toBe(400);
  });
});
