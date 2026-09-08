import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli.ts";

describe("cli --svg", () => {
  const workdir = join(tmpdir(), "code-paint-cli-svg");
  const previousExitCode: string | number | null | undefined = process.exitCode;

  afterEach(async () => {
    process.exitCode = previousExitCode;
    await rm(workdir, { recursive: true, force: true });
  });

  test("PNGと同一内容のSVGテキストを出力する", async () => {
    const pngPath = join(workdir, "hello.png");
    const svgPath = join(workdir, "hello.svg");
    await mkdir(workdir, { recursive: true });
    await run(["--input", "examples/hello.json", "--output", pngPath, "--svg", svgPath]);
    expect(process.exitCode ?? null).toBe(previousExitCode ?? null);
    const svg = await readFile(svgPath, "utf-8");
    expect(svg).toContain("<svg");
    expect(svg).toContain('<rect x="20" y="30" width="120" height="80" fill="#ff0000"/>');
    expect(svg).toContain('<circle cx="220" cy="100" r="48" fill="#0000ff"/>');
  });

  test("--svg 省略時は従来通りPNGのみ出力する", async () => {
    const pngPath = join(workdir, "only.png");
    await mkdir(workdir, { recursive: true });
    await run(["--input", "examples/hello.json", "--output", pngPath]);
    expect(process.exitCode ?? null).toBe(previousExitCode ?? null);
    const png = await readFile(pngPath);
    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  test("局所PNGをベクターから拡大し、SVGは全体を保存する", async () => {
    const pngPath = join(workdir, "detail.png");
    const svgPath = join(workdir, "whole.svg");
    await mkdir(workdir, { recursive: true });
    await run([
      "--input",
      "examples/hello.json",
      "--output",
      pngPath,
      "--crop",
      "20,30,120,80",
      "--scale",
      "3",
      "--svg",
      svgPath,
    ]);
    const png = await readFile(pngPath);
    expect(png.readUInt32BE(16)).toBe(360);
    expect(png.readUInt32BE(20)).toBe(240);
    expect(await readFile(svgPath, "utf-8")).toContain('viewBox="0 0 320 200"');
  });

  test("空の座標や領域外の切り抜きを拒否し、出力を作らない", async () => {
    await mkdir(workdir, { recursive: true });
    for (const crop of ["0,,10,10", "310,190,20,20"]) {
      const pngPath = join(workdir, "invalid.png");
      await run(["--input", "examples/hello.json", "--output", pngPath, "--crop", crop]);
      expect(process.exitCode).toBe(1);
      expect(await Bun.file(pngPath).exists()).toBe(false);
      process.exitCode = 0;
    }
  });

  test("出力先に書けない場合はスタックでなく案内付きで終了する", async () => {
    await mkdir(workdir, { recursive: true });
    const blocker = join(workdir, "blocker");
    await writeFile(blocker, "file", "utf-8");
    await run(["--input", "examples/hello.json", "--output", join(blocker, "out.png")]);
    expect(process.exitCode).toBe(1);
    // Bunでは process.exitCode = undefined で終了コードが戻らないため、0で明示的に戻す。
    process.exitCode = 0;
  });
});
