import { PaintValidationError } from "./paint-error.ts";
import { MAX_PATH_POINTS, MAX_GEOMETRY_VALUE } from "./paint-document.ts";
/** SVG絶対座標 M/L/Q/C/Z のみ。各命令の座標数と有限性を確認する。 */
export function assertCurvePath(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 1000000) {
    throw new PaintValidationError(
      path,
      "曲線は100万文字以内の M/L/Q/C/Z 絶対座標パスで指定してください。",
    );
  }
  const tokens = value.match(/[MLQCZ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const remainder = value.replace(/[MLQCZ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g, "");
  if (!/^[\s,]*$/.test(remainder) || tokens[0] !== "M") {
    throw new PaintValidationError(
      path,
      "パスは M で開始し、絶対座標 M/L/Q/C/Z と数値だけで指定してください。",
    );
  }
  const counts: Record<string, number> = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
  let index = 0;
  let segments = 0;
  while (index < tokens.length) {
    const command = tokens[index++] ?? "";
    const count = counts[command];
    if (count === undefined)
      throw new PaintValidationError(path, "座標の前に M/L/Q/C/Z 命令が必要です。");
    if (count === 0) {
      segments += 1;
      continue;
    }
    let groups = 0;
    while (index < tokens.length && counts[tokens[index] ?? ""] === undefined) {
      for (let n = 0; n < count; n += 1) {
        const token = tokens[index++];
        if (token === undefined || counts[token] !== undefined || !Number.isFinite(Number(token))) {
          throw new PaintValidationError(
            path,
            "パス命令の座標数が不足しているか、有限の数値ではありません。",
          );
        }
        if (Math.abs(Number(token)) > MAX_GEOMETRY_VALUE) {
          throw new PaintValidationError(
            path,
            `パス座標の絶対値は ${String(MAX_GEOMETRY_VALUE)} 以下で指定してください。`,
          );
        }
      }
      groups += 1;
      segments += 1;
    }
    if (groups === 0) throw new PaintValidationError(path, "パス命令の座標がありません。");
  }
  if (segments > MAX_PATH_POINTS)
    throw new PaintValidationError(path, `パス命令は最大 ${String(MAX_PATH_POINTS)} 個です。`);
  return value;
}
