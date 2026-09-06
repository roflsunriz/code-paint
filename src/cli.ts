import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { renderDocumentToPng } from "./render-document.ts";
import { PaintValidationError, parsePaintDocument } from "./validate-document.ts";

interface CliOptions {
  input: string;
  output: string;
}

function printUsage(): void {
  console.log(`使い方: bun run src/cli.ts -- --input <入力JSON> --output <出力PNG>

JSON DSLで記述したイラストをヘッドレスでPNGへ変換します。
例: bun run src/cli.ts -- --input examples/hello.json --output out/hello.png`);
}

function parseArgs(args: readonly string[]): CliOptions | null {
  let input: string | undefined;
  let output: string | undefined;
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
  return { input, output };
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

  const png = renderDocumentToPng(document);
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, png);
  console.log(
    `出力しました: ${options.output} (${String(document.canvas.width)}x${String(document.canvas.height)}, 図形${String(document.shapes.length)}件)`,
  );
}

const invokedDirectly = typeof process.argv[1] === "string" && process.argv[1].endsWith("cli.ts");
if (invokedDirectly) {
  await run(process.argv.slice(2));
}
