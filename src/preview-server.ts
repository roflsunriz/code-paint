import { readFile } from "node:fs/promises";
import { buildDocumentPayload, type DocumentPayload } from "./preview-payload.ts";
import { buildPreviewHtml } from "./preview-page.ts";

export interface PreviewServerOptions {
  inputPath: string;
  port: number;
  hostname?: string;
}

export interface PreviewServer {
  port: number;
  stop: () => void;
}

async function readPayload(inputPath: string): Promise<DocumentPayload> {
  let raw: string;
  try {
    raw = await readFile(inputPath, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      hash: "no-file",
      error: `入力ファイルを読めませんでした: ${inputPath}（${message}）。パスとファイルの有無を確認してください。`,
      raw: "",
    };
  }
  return buildDocumentPayload(raw);
}

export function startPreviewServer(options: PreviewServerOptions): PreviewServer {
  const hostname = options.hostname ?? "127.0.0.1";
  const server = Bun.serve({
    hostname,
    port: options.port,
    fetch: (request: Request): Response | Promise<Response> => {
      const url = new URL(request.url);
      if (url.pathname === "/document") {
        return readPayload(options.inputPath).then(
          (payload) =>
            new Response(JSON.stringify(payload), {
              headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "no-store",
              },
            }),
        );
      }
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return new Response(buildPreviewHtml(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("見つかりません。/ を開いてください。", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    },
  });
  const assignedPort = server.port;
  if (assignedPort === undefined) {
    throw new Error(
      "プレビューサーバのポートを確定できませんでした。--port を変えて再試行してください。",
    );
  }
  return {
    port: assignedPort,
    stop: (): void => {
      void server.stop();
    },
  };
}
