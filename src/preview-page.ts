import { initializePreview } from "./preview-client.ts";
import { previewStyles } from "./preview-style.ts";
import {
  detailRenderUrl,
  fitReferenceCrop,
  normalizePreviewSettings,
  previewCanvasLayout,
  validateReferenceCrop,
} from "./preview-view.ts";

export const PREVIEW_POLL_MS = 500;
export const PREVIEW_MAX_LIST_ITEMS = 200;

function icon(
  name:
    | "mark"
    | "undo"
    | "redo"
    | "image"
    | "layers"
    | "export"
    | "fit"
    | "reset"
    | "sliders"
    | "code"
    | "info",
): string {
  const paths = {
    mark: '<path d="m8 5-5 7 5 7M16 5l5 7-5 7M14 4l-4 16"/>',
    undo: '<path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -2)"/>',
    redo: '<path d="m15 5 5 5-5 5M20 10H10a6 6 0 0 0 0 12" transform="translate(0 -2)"/>',
    image:
      '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
    export: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>',
    fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    sliders:
      '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
    code: '<path d="m8 5-6 7 6 7m8-14 6 7-6 7M14 3l-4 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
  };
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    paths[name] +
    "</svg>"
  );
}

export function buildPreviewHtml(): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>code-paint Studio</title><style>${previewStyles}</style></head><body>
<header class="app-header">
  <div class="brand"><span class="brand-mark">${icon("mark")}</span><div><div class="brand-name"><h1>code-paint</h1><span class="edition">STUDIO</span></div><p class="brand-subtitle">CODE DRIVEN ILLUSTRATION</p></div></div>
  <div class="header-actions"><span class="live-badge"><span class="live-dot"></span>LIVE</span><div class="history-actions"><button data-testid="undo" title="元に戻す" aria-label="元に戻す" disabled>${icon("undo")}</button><button data-testid="redo" title="やり直す" aria-label="やり直す" disabled>${icon("redo")}</button></div></div>
</header>
<main class="workspace">
  <div class="workbench">
    <div class="workbench-heading"><div><p class="eyebrow">WORKSPACE / 01</p><h2 class="workbench-title">線を重ねて、かたちに。</h2></div><span class="count" data-testid="shape-count">図形 — 件</span></div>
    <section class="stage" aria-label="描画とリファレンスの比較">
      <div class="stage-toolbar">
        <label><select data-testid="compare-mode" aria-label="比較表示"><option value="side">並べて比較</option><option value="overlay">重ねて比較</option><option value="difference">差分を見る</option><option value="art">作品のみ</option></select></label>
        <span class="toolbar-divider"></span>
        <label>倍率<input data-testid="canvas-zoom" type="number" min="25" max="400" step="0.1" value="100" aria-label="表示倍率（入力すると手動に切り替え）" />%</label>
        <button data-testid="view-fit" type="button" aria-pressed="true" title="枠に合わせて全体を表示">${icon("fit")}全体</button><output class="view-scale" data-testid="view-scale"></output>
        <label class="blend-control inactive">参照<input data-testid="reference-opacity" type="range" min="0" max="1" step="0.05" value="0.5" aria-label="重ねる参照の濃さ" disabled /></label>
        <button class="reset-button" data-testid="view-reset" type="button" title="表示をリセット" aria-label="表示をリセット">${icon("reset")}</button>
      </div>
      <div class="views" data-testid="comparison-views">
        <figure><figcaption><span class="figure-label"><span class="figure-number">01</span>ARTWORK</span><output class="canvas-position" data-testid="canvas-position">—, —</output></figcaption><div class="viewport" data-testid="canvas-viewport"><canvas data-testid="paint-canvas" width="320" height="200"></canvas></div></figure>
        <figure data-testid="reference-panel"><figcaption><span class="figure-label"><span class="figure-number">02</span>REFERENCE</span><span class="figure-number">SOURCE</span></figcaption><div class="viewport" data-testid="reference-viewport"><canvas data-testid="reference-canvas" width="320" height="200"></canvas></div></figure>
      </div>
      <div class="stage-footer"><p data-testid="preview-status" role="status">作品を読み込み中…</p><span class="phase-badge" data-testid="phase-badge">—</span><p data-testid="preview-ok" hidden></p></div>
    </section>
    <div class="error" data-testid="preview-error" role="alert" hidden></div>
    <details class="command-details" data-testid="command-details"><summary>${icon("code")}DRAWING LOG <span class="muted">/ 受け取った命令</span></summary><pre data-testid="command-json">読み込み中…</pre><details><summary>描画APIと操作のヒント</summary><p class="hint">入力の保存・追記を自動反映します。POST /shapes で追記、POST /phase で作業フェーズ変更、POST /bucket で塗り。拡大した画像は枠内をスクロールでき、カーソル位置は作品の座標で表示されます。</p></details></details>
  </div>
  <aside class="inspector" aria-label="作品の調整">
    <div class="inspector-heading"><h2>INSPECTOR</h2>${icon("sliders")}</div>
    <nav class="inspector-tabs" role="tablist" aria-label="調整パネル">
      <button id="tab-reference" data-testid="inspector-tab-reference" role="tab" aria-controls="panel-reference" aria-selected="true" tabindex="0">${icon("image")}参照</button>
      <button id="tab-layers" data-testid="inspector-tab-layers" role="tab" aria-controls="panel-layers" aria-selected="false" tabindex="-1">${icon("layers")}レイヤー</button>
      <button id="tab-export" data-testid="inspector-tab-export" role="tab" aria-controls="panel-export" aria-selected="false" tabindex="-1">${icon("export")}書き出し</button>
    </nav>
    <p class="edit-status" data-testid="edit-status" role="status"></p><div class="error" data-testid="edit-error" role="alert" hidden></div>
    <div id="panel-reference" class="inspector-panel" data-testid="inspector-panel-reference" role="tabpanel" aria-labelledby="tab-reference">
      <div class="panel-intro"><h3>見たい部分に、フォーカス。</h3><p class="hint">参照の一部分を選び、作品と同じ枠で比較できます。</p></div>
      <img data-testid="reference-image" alt="リファレンス原画像" hidden /><p class="hint" data-testid="reference-status">参照を確認中…</p>
      <span class="section-label">REFERENCE CROP</span>
      <form data-testid="crop-form"><div class="field-grid">
        <label>X<input data-testid="crop-x" type="number" min="0" step="any" value="0" required /></label><label>Y<input data-testid="crop-y" type="number" min="0" step="any" value="0" required /></label>
        <label>幅<input data-testid="crop-width" type="number" min="0.01" step="any" value="1" required /></label><label>高さ<input data-testid="crop-height" type="number" min="0.01" step="any" value="1" required /></label>
      </div><div class="button-row"><button class="primary" data-testid="crop-apply" type="submit" disabled>範囲を適用</button><button class="quiet" data-testid="crop-reset" type="button" disabled>参照全体へ</button></div></form>
      <p class="hint">元画像のピクセル座標で指定。縦横比は維持されます。</p>
      <div class="mini-note">${icon("info")}<span>参照は比較表示だけに使われます。書き出した作品には含まれません。</span></div>
    </div>
    <div id="panel-layers" class="inspector-panel" data-testid="inspector-panel-layers" role="tabpanel" aria-labelledby="tab-layers" hidden>
      <div class="panel-intro"><h3>細部を、何度でも。</h3><p class="hint" data-testid="phase-progress">フェーズを自由に行き来して修正できます。</p></div>
      <label class="full-field">作業フェーズ<select data-testid="phase-select"><option value="lineart">線画</option><option value="base">塗り</option><option value="shadow">影</option><option value="reflection">反射</option><option value="background">背景</option></select></label>
      <span class="section-label">SHAPES &amp; GROUPS</span><label><input type="search" data-testid="shape-search" placeholder="ID・グループ・種類で検索" aria-label="図形を検索" /></label>
      <div class="shape-scroll" data-testid="shape-scroll"><ol data-testid="shape-list"></ol></div><p class="hint">検索結果の最新${String(PREVIEW_MAX_LIST_ITEMS)}件を表示</p>
      <details data-testid="shape-editor"><summary>選択したパーツを編集</summary><p class="hint" data-testid="selected-shape">未選択</p><details><summary>現在の図形JSON</summary><pre data-testid="selected-json">未選択</pre></details>
        <label class="full-field">変更する項目<textarea data-testid="shape-patch" spellcheck="false">{"opacity": 1}</textarea></label>
        <div class="button-row"><button class="primary" data-testid="shape-save" disabled>変更を適用</button><button class="quiet" data-testid="shape-delete" disabled>削除</button></div>
        <p class="hint">例: {"transform":[1,0,0,1,5,0]} で右へ5px。任意項目の削除は null。</p>
      </details>
      <details data-testid="group-editor"><summary>グループをまとめて編集</summary><label class="full-field">グループ<select data-testid="group-select"><option value="">選択してください</option></select></label><label class="full-field">変更する項目<textarea data-testid="group-patch" spellcheck="false">{"hidden": false}</textarea></label><div class="button-row"><button class="primary" data-testid="group-save" disabled>変更を適用</button><button class="quiet" data-testid="group-delete" disabled>削除</button></div></details>
    </div>
    <div id="panel-export" class="inspector-panel" data-testid="inspector-panel-export" role="tabpanel" aria-labelledby="tab-export" hidden>
      <div class="panel-intro"><h3>作品を、持ち出す。</h3><p class="hint">全体の書き出しと、細部を確認する局所出力。</p></div>
      <div class="export-grid"><a class="export-link" href="/render.png" data-testid="export-png" target="_blank" rel="noopener">${icon("export")}<span>PNG <small>IMAGE</small></span></a><a class="export-link" href="/svg" data-testid="export-svg" target="_blank" rel="noopener">${icon("code")}<span>SVG <small>VECTOR</small></span></a></div>
      <span class="section-label">DETAIL EXPORT</span>
      <form data-testid="detail-form"><div class="field-grid"><label>X<input data-testid="detail-x" type="number" value="0" min="0" required /></label><label>Y<input data-testid="detail-y" type="number" value="0" min="0" required /></label><label>幅<input data-testid="detail-width" type="number" value="100" min="1" required /></label><label>高さ<input data-testid="detail-height" type="number" value="100" min="1" required /></label><label>倍率<input data-testid="detail-scale" type="number" value="2" min="0.1" max="8" step="0.1" required /></label></div><div class="button-row"><button class="primary" data-testid="detail-apply">局所PNGを表示</button></div></form>
      <a class="detail-link" data-testid="detail-link" href="/render.png" target="_blank" rel="noopener" hidden>局所PNGを開く ↗</a><img class="detail-image" data-testid="detail-image" alt="作品の局所拡大" hidden />
    </div>
    <div class="error" data-testid="view-error" role="alert" hidden></div>
  </aside>
</main>
<script>(${initializePreview.toString()})(${String(PREVIEW_POLL_MS)},${String(PREVIEW_MAX_LIST_ITEMS)},${normalizePreviewSettings.toString()},${validateReferenceCrop.toString()},${fitReferenceCrop.toString()},${previewCanvasLayout.toString()},${detailRenderUrl.toString()});</script>
</body></html>`;
}
