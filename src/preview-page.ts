export const PREVIEW_POLL_MS = 500;

export function buildPreviewHtml(): string {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>code-paint プレビュー</title>
<style>
  :root {
    color-scheme: light;
  }
  body {
    margin: 0;
    font-family: system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif;
    background: #f5f5f5;
    color: #222;
  }
  header {
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid #ddd;
  }
  header h1 {
    margin: 0;
    font-size: 18px;
  }
  header p {
    margin: 4px 0 0;
    font-size: 13px;
    color: #555;
  }
  main {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 16px;
    max-width: 1400px;
    margin: 0 auto;
    align-items: flex-start;
  }
  section {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 12px;
    min-width: min(320px, 100%);
  }
  section.canvas-panel {
    flex: 2 1 480px;
  }
  section.command-panel {
    flex: 1 1 320px;
  }
  canvas[data-testid="paint-canvas"] {
    display: block;
    max-width: 100%;
    height: auto;
    border: 1px solid #ccc;
    background: #fff;
  }
  pre[data-testid="command-json"] {
    max-height: 40vh;
    overflow: auto;
    background: #111;
    color: #eee;
    padding: 12px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
  }
  ol[data-testid="shape-list"] {
    margin: 8px 0;
    padding-left: 24px;
    font-size: 13px;
  }
  div[data-testid="preview-error"] {
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    background: #fdecea;
    border: 1px solid #e0a3a3;
    color: #8a1f1f;
    font-size: 13px;
  }
  div[data-testid="preview-error"][hidden] {
    display: none;
  }
  p[data-testid="preview-status"] {
    font-size: 13px;
    color: #555;
  }
</style>
</head>
<body>
<header>
  <h1>code-paint プレビュー</h1>
  <p>入力JSONの保存でキャンバスと命令表示が自動更新されます（約${String(PREVIEW_POLL_MS)}ms間隔で取得）。</p>
</header>
<main>
  <section class="canvas-panel" aria-label="キャンバス">
    <h2>キャンバス</h2>
    <canvas data-testid="paint-canvas" width="320" height="200"></canvas>
    <p data-testid="preview-status">読み込み中…</p>
    <div data-testid="preview-error" hidden></div>
  </section>
  <section class="command-panel" aria-label="受け取った命令">
    <h2>受け取った命令</h2>
    <ol data-testid="shape-list"></ol>
    <h3>JSON</h3>
    <pre data-testid="command-json">(読み込み中…)</pre>
  </section>
</main>
<script>
  (function () {
    var canvas = document.querySelector('[data-testid="paint-canvas"]');
    var statusEl = document.querySelector('[data-testid="preview-status"]');
    var errorEl = document.querySelector('[data-testid="preview-error"]');
    var jsonEl = document.querySelector('[data-testid="command-json"]');
    var shapeListEl = document.querySelector('[data-testid="shape-list"]');
    var lastHash = "";
    var POLL_MS = ${String(PREVIEW_POLL_MS)};

    function describeShape(shape, index) {
      if (shape.kind === "rect") {
        return "#" + index + " rect x=" + shape.x + " y=" + shape.y + " " + shape.width + "x" + shape.height + " " + shape.fill;
      }
      if (shape.kind === "circle") {
        return "#" + index + " circle cx=" + shape.cx + " cy=" + shape.cy + " r=" + shape.r + " " + shape.fill;
      }
      return "#" + index + " line (" + shape.x1 + "," + shape.y1 + ")-(" + shape.x2 + "," + shape.y2 + ") " + shape.stroke + " w=" + shape.strokeWidth;
    }

    function renderDocument(doc) {
      canvas.width = doc.canvas.width;
      canvas.height = doc.canvas.height;
      var ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.fillStyle = doc.canvas.background;
      ctx.fillRect(0, 0, doc.canvas.width, doc.canvas.height);
      for (var i = 0; i < doc.shapes.length; i += 1) {
        var shape = doc.shapes[i];
        if (shape.kind === "rect") {
          ctx.fillStyle = shape.fill;
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        } else if (shape.kind === "circle") {
          ctx.fillStyle = shape.fill;
          ctx.beginPath();
          ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape.kind === "line") {
          ctx.strokeStyle = shape.stroke;
          ctx.lineWidth = shape.strokeWidth;
          ctx.beginPath();
          ctx.moveTo(shape.x1, shape.y1);
          ctx.lineTo(shape.x2, shape.y2);
          ctx.stroke();
        }
      }
    }

    function updateShapeList(doc) {
      while (shapeListEl.firstChild) {
        shapeListEl.removeChild(shapeListEl.firstChild);
      }
      for (var i = 0; i < doc.shapes.length; i += 1) {
        var li = document.createElement("li");
        li.textContent = describeShape(doc.shapes[i], i);
        shapeListEl.appendChild(li);
      }
    }

    function poll() {
      fetch("/document", { cache: "no-store" })
        .then(function (res) {
          return res.json();
        })
        .then(function (payload) {
          jsonEl.textContent = payload.raw;
          if (payload.hash === lastHash) {
            return;
          }
          lastHash = payload.hash;
          if (payload.ok) {
            if (errorEl) {
              errorEl.hidden = true;
              errorEl.textContent = "";
            }
            renderDocument(payload.document);
            updateShapeList(payload.document);
            statusEl.textContent =
              "更新: " + new Date().toLocaleTimeString("ja-JP") +
              " / " + payload.document.canvas.width + "x" + payload.document.canvas.height +
              " / 図形" + payload.document.shapes.length + "件 / hash " + payload.hash;
          } else {
            if (errorEl) {
              errorEl.hidden = false;
              errorEl.textContent = payload.error;
            }
            statusEl.textContent = "エラー: 入力を修正すると自動で再表示します / hash " + payload.hash;
          }
        })
        .catch(function (err) {
          statusEl.textContent = "取得に失敗しました。再試行します: " + String(err);
        });
    }

    poll();
    setInterval(poll, POLL_MS);
  })();
</script>
</body>
</html>`;
}
