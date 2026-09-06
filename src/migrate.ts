import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { PaintValidationError, migrateV1ToV2Document } from "./validate-document.ts";

function printUsage(): void {
  console.log(`使い方: bun run src/migrate.ts -- --input <旧JSON(v1)> --output <新JSON(v2)>

version 1 の旧ドキュメントを version 2（作業フェーズ付き）へ移行します。
旧図形はすべて線画（lineart）として取り込み、現在フェーズも線画からやり直します。
例: bun run src/migrate.ts -- --input examples/hello-v1.json --output out/hello-v2.json`);
}

function parseArgs(args: readonly string[]): { input: string; output: string } | null {
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
      "--input <旧JSON> と --output <新JSON> の両方を指定してください。",
    );
  }
  return { input, output };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function run(argv: readonly string[]): Promise<void> {
  let options: { input: string; output: string } | null;
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
    document = migrateV1ToV2Document(parsed);
  } catch (error) {
    console.error(`移行に失敗しました: ${toErrorMessage(error)}`);
    process.exitCode = 1;
    return;
  }
  try {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, `${JSON.stringify(document, null, 2)}\n`, "utf-8");
  } catch (error) {
    console.error(
      `出力ファイルに書き込めませんでした (${toErrorMessage(error)})。出力先のパスと書き込み権限を確認してください。`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `移行しました: ${options.output} （図形${String(document.shapes.length)}件を線画として取り込み、現在フェーズはlineartです）`,
  );
}

const invokedDirectly =
  typeof process.argv[1] === "string" && process.argv[1].endsWith("migrate.ts");
if (invokedDirectly) {
  await run(process.argv.slice(2));
}
