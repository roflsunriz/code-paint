import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

describe("bundled entrypoints", () => {
  test("ビルドしたCLI・移行・プレビューが直接起動する", async () => {
    await mkdir("out", { recursive: true });
    const directory = await mkdtemp(join(process.cwd(), "out", "entry-check-"));
    try {
      const result = await Bun.build({
        entrypoints: ["src/cli.ts", "src/migrate.ts", "src/preview.ts"],
        outdir: directory,
        target: "bun",
        external: ["@napi-rs/canvas"],
      });
      expect(result.success).toBe(true);
      for (const entry of ["cli", "migrate", "preview"]) {
        const child = Bun.spawn([process.execPath, join(directory, `${entry}.js`), "--help"], {
          stdout: "pipe",
          stderr: "pipe",
        });
        expect(await new Response(child.stdout).text()).toContain("使い方");
        expect(await child.exited).toBe(0);
      }
      const old = join(directory, "old.json");
      const migrated = join(directory, "new.json");
      await writeFile(
        old,
        JSON.stringify({
          version: 2,
          canvas: { width: 24, height: 24, background: "#ffffff" },
          phase: "base",
          shapes: [],
        }),
      );
      const migration = Bun.spawn(
        [process.execPath, join(directory, "migrate.js"), "--input", old, "--output", migrated],
        { stdout: "ignore", stderr: "pipe" },
      );
      expect(await migration.exited).toBe(0);
      const png = join(directory, "paint.png");
      const painting = Bun.spawn(
        [process.execPath, join(directory, "cli.js"), "--input", migrated, "--output", png],
        { stdout: "ignore", stderr: "pipe" },
      );
      expect(await painting.exited).toBe(0);
      expect(Array.from((await readFile(png)).subarray(0, 8))).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
