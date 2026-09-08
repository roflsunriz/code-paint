import { PaintValidationError } from "./validate-document.ts";
import { startPreviewServer } from "./preview-server.ts";

interface PreviewCliOptions {
  input: string;
  port: number;
  reference: string | undefined;
}

const DEFAULT_PORT = 8901;

function printUsage(): void {
  console.log(`使い方: bun run src/preview.ts -- --input <入力JSON> [--port ${String(DEFAULT_PORT)}] [--reference <画像パス>]

ブラウザで開くプレビュー用サーバを起動します。
例: bun run src/preview.ts -- --input examples/hello.json --port ${String(DEFAULT_PORT)}
リファレンス画像を付ける例: bun run src/preview.ts -- --input examples/hello.json --reference reference/miku.png
起動後に http://localhost:${String(DEFAULT_PORT)}/ を開くと、キャンバスと受け取った命令が見られます。`);
}

function parseArgs(args: readonly string[]): PreviewCliOptions | null {
  let input: string | undefined;
  let port: number = DEFAULT_PORT;
  let reference: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      break;
    }
    if (arg === "--input") {
      input = args[index + 1];
      index += 1;
    } else if (arg === "--port") {
      const raw = args[index + 1];
      index += 1;
      const parsed = raw === undefined ? Number.NaN : Number(raw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        throw new PaintValidationError("args", "--port には 1〜65535 の整数を指定してください。");
      }
      port = parsed;
    } else if (arg === "--reference") {
      reference = args[index + 1];
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
  if (input === undefined) {
    throw new PaintValidationError("args", "--input <入力JSON> を指定してください。");
  }
  return { input, port, reference };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function run(argv: readonly string[]): Promise<void> {
  let options: PreviewCliOptions | null;
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
  let server;
  try {
    server = startPreviewServer({
      inputPath: options.input,
      port: options.port,
      referencePath: options.reference,
    });
  } catch (error) {
    console.error(
      `プレビューサーバを起動できませんでした (${toErrorMessage(error)})。--port を変えて再試行してください。`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `プレビューを開いてください: http://localhost:${String(server.port)}/ （入力: ${options.input}、終了は Ctrl+C）`,
  );
  const stop = (): void => {
    server.stop();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  await new Promise((): void => {});
}

if (import.meta.main) {
  await run(process.argv.slice(2));
}
