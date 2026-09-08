import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { renderDocumentToPng } from "./render-document.ts";
import { renderDocumentToSvg } from "./render-svg.ts";
import { PaintValidationError, parsePaintDocument } from "./validate-document.ts";

interface CliOptions {
  input: string;
  output: string;
  svg: string | undefined;
  region: { x?: number; y?: number; width?: number; height?: number; scale?: number };
}

function printUsage(): void {
  console.log(`使い方: bun run src/cli.ts -- --input <入力JSON> --output <出力PNG> [--svg <出力SVG>] [--crop x,y,width,height] [--scale 倍率]

JSON DSLで記述したイラストをヘッドレスでPNGへ変換します。
--svg を付けると、画像を見られないエージェント向けに同一内容のSVGテキストも出力します。
--crop と --scale はPNGの局所拡大用です。曲線から再描画するため、元PNGの引き伸ばしにはなりません。SVGは常にドキュメント全体を保存します。
例: bun run src/cli.ts -- --input examples/hello.json --output out/hello.png --svg out/hello.svg`);
}

function parseArgs(args: readonly string[]): CliOptions | null {
  let input: string | undefined;
  let output: string | undefined;
  let svg: string | undefined;
  const region: CliOptions["region"] = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      break;
    }
    if (arg === "--input") {
      input = args[index + 1];
      index += 1;
    } else if (arg === "--output") {
      output = args[index + 1];
      index += 1;
    } else if (arg === "--svg") {
      svg = args[index + 1];
      index += 1;
    } else if (arg === "--crop") {
      const fields = args[index + 1]?.split(",");
      const values = fields?.map(Number);
      if (
        values === undefined ||
        values.length !== 4 ||
        fields?.some((part) => !part.trim()) ||
        !values.every(Number.isFinite)
      ) {
        throw new PaintValidationError(
          "args",
          "--crop は x,y,width,height の4つの数値で指定してください。",
        );
      }
      const [x, y, width, height] = values;
      Object.assign(region, { x, y, width, height });
      index += 1;
    } else if (arg === "--scale") {
      const value = Number(args[index + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new PaintValidationError(
          "args",
          "--scale は0より大きい有限の倍率で指定してください。",
        );
      }
      region.scale = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      return null;
    } else {
      throw new PaintValidationError(
        "args",
        `不明な引数 "${arg}" です。--help で使い方を確認してください。`,
      );
    }
  }
  if (input === undefined || output === undefined) {
    throw new PaintValidationError(
      "args",
      "--input <入力JSON> と --output <出力PNG> の両方を指定してください。",
    );
  }
  return { input, output, svg, region };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function run(argv: readonly string[]): Promise<void> {
  let options: CliOptions | null;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`引数エラー: ${toErrorMessage(error)}`);
    printUsage();
    process.exitCode = 1;
    return;
  }
  if (options === null) {
    printUsage();
    return;
  }

  let raw: string;
  try {
    raw = await readFile(options.input, "utf-8");
  } catch (error) {
    console.error(`入力ファイルを読めませんでした: ${options.input} (${toErrorMessage(error)})`);
    process.exitCode = 1;
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    console.error(`JSONの解析に失敗しました: ${options.input} (${toErrorMessage(error)})`);
    process.exitCode = 1;
    return;
  }

  let document;
  try {
    document = parsePaintDocument(parsed);
  } catch (error) {
    console.error(`入力の検証に失敗しました: ${toErrorMessage(error)}`);
    process.exitCode = 1;
    return;
  }

  let png: Buffer;
  try {
    png = renderDocumentToPng(document, options.region);
  } catch (error) {
    console.error(
      `描画に失敗しました (${toErrorMessage(error)})。切り抜き範囲と倍率を確認してください。`,
    );
    process.exitCode = 1;
    return;
  }
  try {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, png);
    if (options.svg !== undefined) {
      await mkdir(dirname(options.svg), { recursive: true });
      await writeFile(options.svg, renderDocumentToSvg(document), "utf-8");
    }
  } catch (error) {
    console.error(
      `出力ファイルに書き込めませんでした (${toErrorMessage(error)})。出力先のパスと書き込み権限を確認してください。`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `出力しました: ${options.output} (PNG ${String(png.readUInt32BE(16))}x${String(png.readUInt32BE(20))}, 図形${String(document.shapes.length)}件)`,
  );
}

if (import.meta.main) {
  await run(process.argv.slice(2));
}
