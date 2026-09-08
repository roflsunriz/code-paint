import { readFile, rename, rm, writeFile } from "node:fs/promises";
import type { PaintDocument } from "./paint-document.ts";
import { buildDocumentPayload, type DocumentPayload } from "./preview-payload.ts";
import { parsePaintDocument } from "./validate-document.ts";

export class PreviewEditError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** IDなしの外部JSONにも同じ順序でIDを与える。既存IDを先に予約し衝突を防ぐ。 */
export function assignShapeIds(document: PaintDocument, fresh = false): PaintDocument {
  const used = new Set(
    document.shapes.flatMap((shape) => (shape.id === undefined ? [] : [shape.id])),
  );
  let sequence = 1;
  return {
    ...document,
    shapes: document.shapes.map((shape) => {
      if (shape.id !== undefined) return shape;
      while (used.has(`shape-${String(sequence)}`)) sequence += 1;
      let id = fresh ? `shape-${crypto.randomUUID()}` : `shape-${String(sequence)}`;
      while (used.has(id)) id = `shape-${crypto.randomUUID()}`;
      used.add(id);
      sequence += 1;
      return { ...shape, id };
    }),
  };
}

const MAX_HISTORY_ENTRIES = 100;
const MAX_HISTORY_BYTES = 32 * 1024 * 1024;
const serialize = (document: PaintDocument): string => `${JSON.stringify(document, null, 2)}\n`;

/** セッション内の編集を直列化し、外部保存で履歴を破棄する。 */
export class PreviewStore {
  private queue: Promise<unknown> = Promise.resolve();
  private observedRaw: string | undefined;
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  constructor(private readonly inputPath: string) {}

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async read(): Promise<DocumentPayload> {
    let raw: string;
    try {
      raw = await readFile(this.inputPath, "utf-8");
    } catch {
      this.undoStack = [];
      this.redoStack = [];
      this.observedRaw = undefined;
      return {
        ok: false,
        hash: "no-file",
        raw: "",
        error: "入力ファイルを読めませんでした。パスとファイルの有無を確認してください。",
      };
    }
    if (this.observedRaw !== undefined && this.observedRaw !== raw) {
      this.undoStack = [];
      this.redoStack = [];
    }
    this.observedRaw = raw;
    const payload = buildDocumentPayload(raw);
    return payload.ok ? { ...payload, document: assignShapeIds(payload.document) } : payload;
  }

  payload(): Promise<DocumentPayload> {
    return this.exclusive(() => this.read());
  }

  history(): Promise<{ canUndo: boolean; canRedo: boolean; scope: string }> {
    return this.exclusive(async () => {
      await this.read();
      return {
        canUndo: this.undoStack.length > 0,
        canRedo: this.redoStack.length > 0,
        scope: "session",
      };
    });
  }

  private limitHistory(): void {
    // 巨大な絵のスナップショットでセッションのメモリを使い切らない。
    let bytes = this.undoStack
      .concat(this.redoStack)
      .reduce((sum, raw) => sum + Buffer.byteLength(raw), 0);
    while (
      this.undoStack.length + this.redoStack.length > MAX_HISTORY_ENTRIES ||
      bytes > MAX_HISTORY_BYTES
    ) {
      const removed = this.undoStack.length > 0 ? this.undoStack.shift() : this.redoStack.shift();
      if (removed === undefined) break;
      bytes -= Buffer.byteLength(removed);
    }
  }

  private async save(document: PaintDocument, expectedRaw: string): Promise<void> {
    const raw = serialize(document);
    const temporaryPath = `${this.inputPath}.${crypto.randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, raw, { encoding: "utf-8", flag: "wx" });
      if ((await readFile(this.inputPath, "utf-8")) !== expectedRaw) {
        await this.read();
        throw new PreviewEditError(
          "編集中に入力ファイルが外部で保存されました。最新の絵を確認して再実行してください。",
          409,
        );
      }
      await rename(temporaryPath, this.inputPath);
      this.observedRaw = raw;
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  update(operation: (document: PaintDocument) => PaintDocument): Promise<PaintDocument> {
    return this.exclusive(async () => {
      const payload = await this.read();
      if (!payload.ok) throw new PreviewEditError(payload.error);
      const next = assignShapeIds(parsePaintDocument(operation(payload.document)), true);
      if (serialize(next) === serialize(payload.document)) return next;
      await this.save(next, payload.raw);
      this.undoStack.push(serialize(payload.document));
      this.redoStack = [];
      this.limitHistory();
      return next;
    });
  }

  restore(direction: "undo" | "redo"): Promise<PaintDocument> {
    return this.exclusive(async () => {
      const payload = await this.read();
      if (!payload.ok) throw new PreviewEditError(payload.error);
      const source = direction === "undo" ? this.undoStack : this.redoStack;
      const destination = direction === "undo" ? this.redoStack : this.undoStack;
      const raw = source.at(-1);
      if (raw === undefined)
        throw new PreviewEditError(
          "戻せる履歴がありません。履歴はこのサーバの起動中のみ有効で、外部保存時にリセットされます。",
          409,
        );
      const next = assignShapeIds(parsePaintDocument(JSON.parse(raw) as unknown));
      await this.save(next, payload.raw);
      source.pop();
      destination.push(serialize(payload.document));
      this.limitHistory();
      return next;
    });
  }
}
