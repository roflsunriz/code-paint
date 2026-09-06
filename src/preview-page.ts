export const PREVIEW_POLL_MS = 500;

export const PREVIEW_MAX_LIST_ITEMS = 200;

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
    --bg: #edf0f5;
    --card: #ffffff;
    --line: #dfe4ec;
    --ink: #1f2733;
    --muted: #5f6b7d;
    --accent: #2563eb;
    --accent-soft: #e3edff;
    --ok: #177245;
    --ok-bg: #e5f5ec;
    --ng: #8a1f1f;
    --ng-bg: #fdecea;
    --code-bg: #141a24;
    --code-ink: #e8edf5;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    font-family: system-ui, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif;
    background: var(--bg);
    color: var(--ink);
  }
  header.topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(255, 255, 255, 0.96);
    border-bottom: 1px solid var(--line);
  }
  .topbar-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    max-width: 1280px;
    margin: 0 auto;
    padding: 12px 20px;
  }
  .brand h1 {
    margin: 0;
    font-size: 17px;
    letter-spacing: 0.02em;
  }
  .brand p {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--muted);
  }
  .status-pill {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 12px;
    font-weight: 600;
    max-width: 100%;
  }
  main.layout {
    display: grid;
    grid-template-columns: minmax(0, 8fr) minmax(300px, 5fr);
    gap: 16px;
    max-width: 1280px;
    margin: 0 auto;
    padding: 16px 20px 28px;
    align-items: start;
  }
  section.card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 1px 6px rgba(31, 39, 51, 0.07);
    min-width: 0;
  }
  section.card h2 {
    margin: 0;
    font-size: 15px;
  }
  section.card h3 {
    margin: 14px 0 6px;
    font-size: 13px;
    color: var(--muted);
  }
  .card-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }
  .count-badge {
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .canvas-frame {
    margin-top: 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background-color: #f7f9fc;
    background-image:
      linear-gradient(45deg, #e8edf4 25%, transparent 25%, transparent 75%, #e8edf4 75%),
      linear-gradient(45deg, #e8edf4 25%, transparent 25%, transparent 75%, #e8edf4 75%);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    padding: 12px;
    overflow: auto;
    max-height: min(72vh, 760px);
  }
  canvas[data-testid="paint-canvas"] {
    display: block;
    width: min(100%, 960px);
    height: auto;
    margin: 0 auto;
    border: 1px solid #b9c2d0;
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 2px 10px rgba(31, 39, 51, 0.16);
  }
  p[data-testid="preview-status"] {
    margin: 10px 0 0;
    font-size: 12px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }
  div[data-testid="preview-error"] {
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--ng-bg);
    border: 1px solid #e0a3a3;
    color: var(--ng);
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  div[data-testid="preview-error"][hidden] {
    display: none;
  }
  .ok-note {
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--ok-bg);
    border: 1px solid #9ed3b4;
    color: var(--ok);
    font-size: 12px;
  }
  .shape-scroll {
    height: 240px;
    overflow-y: auto;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fbfcfe;
    padding: 4px 0;
  }
  ol[data-testid="shape-list"] {
    margin: 0;
    padding: 4px 8px 4px 32px;
    font-size: 12px;
    line-height: 1.7;
    font-variant-numeric: tabular-nums;
  }
  ol[data-testid="shape-list"] li {
    overflow-wrap: anywhere;
    border-bottom: 1px dashed #e6ebf2;
  }
  ol[data-testid="shape-list"] li:last-child {
    border-bottom: none;
  }
  pre[data-testid="command-json"] {
    height: 240px;
    overflow: auto;
    background: var(--code-bg);
    color: var(--code-ink);
    padding: 12px;
    border-radius: 8px;
    font-size: 11px;
    line-height: 1.6;
    white-space: pre;
    margin: 0;
  }
  .reference-grid {
    display: grid;
    gap: 12px;
  }
  .reference-frame {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #f7f9fc;
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    max-height: 46vh;
    padding: 8px;
  }
  img[data-testid="reference-image"] {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    border: 1px solid #b9c2d0;
    background: #fff;
  }
  img[data-testid="reference-image"][hidden] {
    display: none;
  }
  p[data-testid="reference-status"] {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--muted);
  }
  code.inline {
    font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
    background: #eef2f8;
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 0 5px;
    font-size: 11px;
  }
  .hint {
    font-size: 12px;
    color: var(--muted);
    margin: 8px 0 0;
    line-height: 1.8;
  }
  @media (max-width: 900px) {
    main.layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .status-pill {
      margin-left: 0;
    }
  }
</style>
</head>
<body>
<header class="topbar">
  <div class="topbar-inner">
    <div class="brand">
      <h1>code-paint プレビュー</h1>
      <p>保存・追記で約${String(PREVIEW_POLL_MS)}ms間隔に自動更新されます。作業順は線画→バケツ塗り→影→反射→背景です。</p>
    </div>
    <span class="status-pill" data-testid="phase-badge">フェーズ: -</span>
    <span class="status-pill" data-testid="preview-status">読み込み中…</span>
  </div>
</header>
<main class="layout">
  <div class="reference-grid">
    <section class="card" aria-label="キャンバス">
      <div class="card-head">
        <h2>キャンバス</h2>
        <span class="count-badge" data-testid="shape-count">図形 - 件</span>
      </div>
      <div class="canvas-frame">
        <canvas data-testid="paint-canvas" width="320" height="200"></canvas>
      </div>
      <div class="ok-note" data-testid="preview-ok" hidden></div>
      <div data-testid="preview-error" hidden></div>
    </section>
    <section class="card" aria-label="リファレンス">
      <div class="card-head">
        <h2>リファレンス</h2>
      </div>
      <div class="reference-frame">
        <img data-testid="reference-image" src="/reference" alt="リファレンス画像" hidden />
      </div>
      <p data-testid="reference-status">確認中…</p>
      <p class="hint"><code class="inline">--reference &lt;画像&gt;</code> で起動するとここに表示され、エージェントは <code class="inline">/reference</code> から取得できます。</p>
    </section>
  </div>
  <section class="card" aria-label="受け取った命令">
    <div class="card-head">
      <h2>受け取った命令</h2>
      <span class="count-badge">最新${String(PREVIEW_MAX_LIST_ITEMS)}件のみ表示・自動スクロール</span>
    </div>
    <h3>図形一覧</h3>
    <div class="shape-scroll" data-testid="shape-scroll">
      <ol data-testid="shape-list"></ol>
    </div>
    <h3>JSON</h3>
    <pre data-testid="command-json">(読み込み中…)</pre>
    <p data-testid="phase-progress">作業順: 線画→バケツ塗り→影→反射→背景（現在: -）。背景は最後に作業しますが描画では最背面に合成されます。</p>
    <p class="hint">逐次追記は <code class="inline">POST /shapes</code>（単発 <code class="inline">{"shape": {...}}</code>／複数 <code class="inline">{"shapes": [...]}</code>、現在のフェーズの図形のみ）、フェーズ進行は <code class="inline">POST /phase {"phase": "base"}</code>、バケツ塗りは <code class="inline">POST /bucket {"x": 1, "y": 1, "fill": "#ff0000"}</code>、全消去は <code class="inline">DELETE /shapes</code> を使います。</p>
  </section>
</main>
<script>
  (function () {
    var canvas = document.querySelector('[data-testid="paint-canvas"]');
    var statusEls = document.querySelectorAll('[data-testid="preview-status"]');
    var errorEl = document.querySelector('[data-testid="preview-error"]');
    var okEl = document.querySelector('[data-testid="preview-ok"]');
    var jsonEl = document.querySelector('[data-testid="command-json"]');
    var shapeListEl = document.querySelector('[data-testid="shape-list"]');
    var shapeScrollEl = document.querySelector('[data-testid="shape-scroll"]');
    var countEl = document.querySelector('[data-testid="shape-count"]');
    var phaseBadgeEl = document.querySelector('[data-testid="phase-badge"]');
    var phaseProgressEl = document.querySelector('[data-testid="phase-progress"]');
    var refImg = document.querySelector('[data-testid="reference-image"]');
    var refStatus = document.querySelector('[data-testid="reference-status"]');
    var lastHash = "";
    var POLL_MS = ${String(PREVIEW_POLL_MS)};
    var MAX_LIST_ITEMS = ${String(PREVIEW_MAX_LIST_ITEMS)};

    function setStatus(text) {
      for (var i = 0; i < statusEls.length; i += 1) {
        statusEls[i].textContent = text;
      }
    }

    function scrollToBottom(el) {
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }

    function describeShape(shape, index) {
      var opacity = shape.opacity === undefined ? "" : " opacity=" + shape.opacity;
      var phase = shape.phase === undefined ? "phaseなし" : "[" + shape.phase + "] ";
      if (shape.kind === "rect") {
        return "#" + index + " " + phase + "rect x=" + shape.x + " y=" + shape.y + " " + shape.width + "x" + shape.height + " " + shape.fill + opacity;
      }
      if (shape.kind === "circle") {
        return "#" + index + " " + phase + "circle cx=" + shape.cx + " cy=" + shape.cy + " r=" + shape.r + " " + shape.fill + opacity;
      }
      if (shape.kind === "line") {
        return "#" + index + " " + phase + "line (" + shape.x1 + "," + shape.y1 + ")-(" + shape.x2 + "," + shape.y2 + ") " + shape.stroke + " w=" + shape.strokeWidth + opacity;
      }
      return "#" + index + " " + phase + "path " + shape.points.length + "点 " + shape.stroke + " w=" + shape.strokeWidth + opacity;
    }

    function displayRank(phase) {
      if (phase === "background") return 0;
      if (phase === "base") return 1;
      if (phase === "shadow") return 2;
      if (phase === "reflection") return 3;
      return 4;
    }

    function orderedShapes(shapes) {
      return shapes
        .map(function (shape, index) { return { shape: shape, index: index }; })
        .sort(function (a, b) {
          var rank = displayRank(a.shape.phase) - displayRank(b.shape.phase);
          return rank !== 0 ? rank : a.index - b.index;
        })
        .map(function (entry) { return entry.shape; });
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
      var ordered = orderedShapes(doc.shapes);
      for (var i = 0; i < ordered.length; i += 1) {
        var shape = ordered[i];
        ctx.save();
        if (shape.opacity !== undefined) {
          ctx.globalAlpha = shape.opacity;
        }
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
        } else if (shape.kind === "path") {
          ctx.strokeStyle = shape.stroke;
          ctx.lineWidth = shape.strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          if (shape.points.length > 0) {
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (var j = 1; j < shape.points.length; j += 1) {
              ctx.lineTo(shape.points[j].x, shape.points[j].y);
            }
          }
          if (shape.fill !== undefined) {
            ctx.fillStyle = shape.fill;
            ctx.fill();
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    function updatePhase(doc) {
      if (phaseBadgeEl) {
        phaseBadgeEl.textContent = "フェーズ: " + doc.phase;
      }
      if (phaseProgressEl) {
        phaseProgressEl.textContent =
          "作業順: 線画→バケツ塗り→影→反射→背景（現在: " + doc.phase + "）。背景は最後に作業しますが描画では最背面に合成されます。";
      }
    }

    function updateShapeList(doc) {
      while (shapeListEl.firstChild) {
        shapeListEl.removeChild(shapeListEl.firstChild);
      }
      var total = doc.shapes.length;
      var start = total > MAX_LIST_ITEMS ? total - MAX_LIST_ITEMS : 0;
      if (start > 0) {
        var omitted = document.createElement("li");
        omitted.textContent = "ほか " + start + " 件は省略（最新" + MAX_LIST_ITEMS + "件のみ表示）";
        shapeListEl.appendChild(omitted);
      }
      for (var i = start; i < total; i += 1) {
        var li = document.createElement("li");
        li.textContent = describeShape(doc.shapes[i], i);
        shapeListEl.appendChild(li);
      }
      if (countEl) {
        countEl.textContent = "図形 " + total + " 件";
      }
      scrollToBottom(shapeScrollEl);
    }

    function checkReference() {
      if (!refImg || !refStatus) {
        return;
      }
      refImg.addEventListener("load", function () {
        refImg.hidden = false;
        refStatus.textContent = "リファレンス画像を表示中（/reference から取得できます）。";
      });
      refImg.addEventListener("error", function () {
        refImg.hidden = true;
        refStatus.textContent = "リファレンス未設定（--reference <画像パス> で起動）。";
      });
      if (refImg.complete && refImg.naturalWidth > 0) {
        refImg.hidden = false;
        refStatus.textContent = "リファレンス画像を表示中（/reference から取得できます）。";
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
            if (okEl) {
              okEl.hidden = false;
              okEl.textContent =
                "更新: " + new Date().toLocaleTimeString("ja-JP") +
                " / " + payload.document.canvas.width + "x" + payload.document.canvas.height +
                " / 図形" + payload.document.shapes.length + "件 / フェーズ " + payload.document.phase;
            }
            renderDocument(payload.document);
            updatePhase(payload.document);
            updateShapeList(payload.document);
            scrollToBottom(jsonEl);
            setStatus(
              "更新: " + new Date().toLocaleTimeString("ja-JP") +
              " / " + payload.document.canvas.width + "x" + payload.document.canvas.height +
              " / 図形" + payload.document.shapes.length + "件 / フェーズ " + payload.document.phase + " / hash " + payload.hash
            );
          } else {
            if (errorEl) {
              errorEl.hidden = false;
              errorEl.textContent = payload.error;
            }
            if (okEl) {
              okEl.hidden = true;
              okEl.textContent = "";
            }
            setStatus("エラー: 入力を修正すると自動で再表示します / hash " + payload.hash);
          }
        })
        .catch(function (err) {
          setStatus("取得に失敗しました。再試行します: " + String(err));
        });
    }

    checkReference();
    poll();
    setInterval(poll, POLL_MS);
  })();
</script>
</body>
</html>`;
}
