import type { PaintDocument } from "./paint-document.ts";
import { parsePaintDocument } from "./validate-document.ts";

export type DocumentPayload =
  | { ok: true; hash: string; document: PaintDocument; raw: string }
  | { ok: false; hash: string; error: string; raw: string };

export function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * プレビュー配信用のペイロードを作る純粋関数。
 * 不正入力でも例外にせず、画面へ表示できる形で返す。
 */
export function buildDocumentPayload(raw: string): DocumentPayload {
  const hash = hashString(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    return {
      ok: false,
      hash,
      error: `JSONの解析に失敗しました。JSONの構文を確認してください（${toErrorMessage(error)}）。`,
      raw,
    };
  }
  try {
    const document = parsePaintDocument(parsed);
    return { ok: true, hash, document, raw };
  } catch (error) {
    return {
      ok: false,
      hash,
      error: `入力の検証に失敗しました（${toErrorMessage(error)}）。`,
      raw,
    };
  }
}
