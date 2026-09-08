export const previewStyles = `
:root {
  color-scheme:dark; font-family:Inter,"Segoe UI","Yu Gothic UI",sans-serif;
  color:#e2e8ee; background:#0f141b; font-synthesis:none;
  --panel:#171e27; --field:#1c2530; --edge:#2b3542; --muted:#8e9baa;
  --jade:#80e0c1; --ink:#e2e8ee;
}
* { box-sizing:border-box; } body { margin:0; min-width:320px; }
[hidden] { display:none !important; }
button,input,select,textarea { font:inherit; color:inherit; }
button { cursor:pointer; } button:disabled { cursor:default; opacity:.32; }
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible,summary:focus-visible { outline:2px solid var(--jade); outline-offset:3px; }
button,select,input { min-height:34px; border:1px solid var(--edge); border-radius:6px; background:var(--field); padding:6px 9px; }
button { transition:background .15s,border-color .15s; }
button:hover:not(:disabled) { background:#293744; border-color:#506171; }
button svg,a svg { flex:none; width:16px; height:16px; }
button { display:inline-flex; align-items:center; justify-content:center; gap:6px; }
input[type=number] { width:64px; font-variant-numeric:tabular-nums; }
input[type=search],textarea { width:100%; min-width:0; }
input[type=range] { accent-color:var(--jade); width:82px; min-height:20px; border:0; padding:0; }
textarea { min-height:116px; resize:vertical; border:1px solid var(--edge); border-radius:6px; background:#101720; padding:11px; font:11px/1.65 ui-monospace,Consolas,monospace; }
a { color:var(--jade); text-decoration:none; } a:hover { color:#c4ffeb; }
p { margin:0; } h1,h2,h3 { margin:0; font-weight:550; } h2 { font-size:14px; } h3 { font-size:12px; }
label { display:flex; align-items:center; gap:7px; font-size:11px; color:#b6c1ce; }
.app-header { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:18px 28px; border-bottom:1px solid #25303d; background:#111820; }
.brand { display:flex; align-items:center; gap:12px; min-width:0; }
.brand-mark { width:34px; height:34px; display:grid; place-items:center; border:1px solid #425d5b; border-radius:9px; color:var(--jade); background:linear-gradient(145deg,#294038,#1c282b); }
.brand-mark svg { width:22px; height:22px; }
.brand-name { display:flex; align-items:center; gap:9px; }
.brand h1 { font:600 18px/1.1 ui-monospace,Consolas,monospace; letter-spacing:-.7px; }
.edition { font:9px ui-monospace,Consolas,monospace; letter-spacing:1.5px; color:var(--jade); border:1px solid #365047; padding:3px 5px; border-radius:3px; }
.brand-subtitle { margin-top:5px; color:#718291; font:9px ui-monospace,Consolas,monospace; letter-spacing:1.7px; }
.header-actions { display:flex; align-items:center; gap:14px; }
.live-badge { display:inline-flex; align-items:center; gap:6px; color:#94cfba; font:10px ui-monospace,Consolas,monospace; letter-spacing:1px; }
.live-dot { width:5px; height:5px; border-radius:100%; background:var(--jade); box-shadow:0 0 9px #80e0c133; }
.history-actions { display:flex; gap:3px; padding-left:14px; border-left:1px solid var(--edge); }
.history-actions button { min-height:30px; width:32px; padding:5px; background:transparent; border-color:transparent; }
.workspace { display:grid; grid-template-columns:minmax(0,1fr) 304px; align-items:start; gap:20px; max-width:1880px; margin:auto; padding:24px 28px; }
.workbench { min-width:0; }
.workbench-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 14px; }
.eyebrow { color:#738595; font:9px ui-monospace,Consolas,monospace; letter-spacing:1.5px; text-transform:uppercase; }
.workbench-title { font-size:16px; letter-spacing:-.25px; margin-top:5px; }
.count { font:10px ui-monospace,Consolas,monospace; color:#7f929f; text-align:right; }
.stage { border:1px solid #2b3642; border-radius:12px; overflow:hidden; background:#17202a; box-shadow:0 14px 50px #0000001f; }
.stage-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:7px; padding:10px 13px; background:#1a232d; border-bottom:1px solid #303b47; }
.stage-toolbar label { font-size:10px; white-space:nowrap; }
.stage-toolbar select { max-width:150px; min-height:30px; font-size:11px; background:#232e3b; }
.stage-toolbar input[type=number] { width:57px; min-height:30px; padding:3px 5px; font-size:11px; }
.stage-toolbar button { min-height:30px; font-size:10px; padding:5px 7px; }
.toolbar-divider { height:16px; width:1px; background:#36424e; margin:0 3px; }
.stage-toolbar .reset-button { margin-left:auto; width:29px; padding:5px; background:transparent; border-color:transparent; }
button[data-testid=view-fit][aria-pressed=true] { background:#25453e; border-color:#3a6658; color:#a9f3d8; }
.view-scale { font:10px ui-monospace,Consolas,monospace; color:#84a497; min-width:53px; }
.blend-control { margin-left:auto; }
.blend-control.inactive { opacity:.4; }
.views { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px; padding:20px 22px 24px; background:radial-gradient(ellipse at 50% 0%,#222e3a 0%,#151d26 80%); }
.views.single { grid-template-columns:minmax(0,1fr); }
figure { margin:0; min-width:0; }
figcaption { display:flex; align-items:center; justify-content:space-between; gap:5px; margin-bottom:12px; color:#acbac7; font:10px ui-monospace,Consolas,monospace; letter-spacing:1.25px; }
.figure-label { display:flex; align-items:center; gap:7px; }
.figure-number { color:#657685; font-size:9px; }
.canvas-position { color:#6c8190; font-size:9px; letter-spacing:0; }
.viewport { overflow:auto; max-height:66vh; min-height:160px; scrollbar-width:thin; scrollbar-color:#455461 transparent; }
.viewport canvas { display:block; margin:0 auto; max-width:none; background:white; box-shadow:0 3px 18px #00000033; }
.stage-footer { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; padding:11px 15px; background:#131b24; border-top:1px solid #273441; }
.stage-footer p { color:#728897; font:9px/1.5 ui-monospace,Consolas,monospace; overflow-wrap:anywhere; }
.stage-footer .phase-badge { color:#a2c5b8; text-transform:uppercase; font-size:9px; }
.error { background:#372522; color:#efb2a6; border:1px solid #694339; border-radius:6px; padding:10px; font-size:11px; line-height:1.7; overflow-wrap:anywhere; margin-top:10px; }
.inspector { background:var(--panel); border:1px solid var(--edge); border-radius:10px; overflow:hidden; min-width:0; }
.inspector-heading { display:flex; justify-content:space-between; align-items:center; padding:15px 16px; }
.inspector-heading h2 { font:10px ui-monospace,Consolas,monospace; letter-spacing:1.5px; color:#9aabb9; }
.inspector-heading svg { width:15px; height:15px; color:#6d8293; }
.inspector-tabs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:3px; padding:0 9px 9px; border-bottom:1px solid var(--edge); }
.inspector-tabs button { border:0; background:transparent; color:#8294a4; font-size:11px; min-height:34px; padding:6px; }
.inspector-tabs button[aria-selected=true] { color:#adebd4; background:#233a35; }
.inspector-tabs button svg { width:14px; height:14px; }
.inspector-panel { padding:18px 16px; }
.panel-intro { margin-bottom:18px; }
.panel-intro h3 { color:#d4dce4; font-size:13px; }
.hint { color:#7f92a2; font-size:10px; line-height:1.8; margin-top:7px; overflow-wrap:anywhere; }
.muted { color:var(--muted); }
.section-label { display:block; margin:18px 0 9px; color:#6f8898; font:9px ui-monospace,Consolas,monospace; letter-spacing:1.4px; text-transform:uppercase; }
.field-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
.field-grid label { display:grid; gap:5px; color:#8296a7; font-size:10px; }
.field-grid input { width:100%; font-size:12px; }
.button-row { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
.button-row button { flex:1; font-size:11px; }
.primary { background:#7fdbc0; color:#102c23; border-color:#7fdbc0; font-weight:600; }
.primary:hover:not(:disabled) { background:#a0efda; border-color:#a0efda; }
.quiet { background:transparent; color:#8fabb6; }
.mini-note { display:flex; align-items:flex-start; gap:8px; margin-top:20px; padding:11px; background:#1b2930; border-radius:6px; color:#8dabaf; font-size:10px; line-height:1.8; }
.mini-note svg { width:14px; height:14px; flex:none; margin-top:2px; color:#6da797; }
.full-field { display:grid; gap:7px; margin-top:10px; }
.full-field select { width:100%; }
.shape-scroll { height: 240px; overflow:auto; scrollbar-width:thin; border:1px solid #2b3945; border-radius:6px; background:#121a23; margin-top:9px; }
ol { margin:0; padding:5px; list-style:none; } li { margin:2px 0; }
li button { text-align:left; justify-content:flex-start; width:100%; font:10px/1.6 ui-monospace,Consolas,monospace; background:transparent; border-color:transparent; padding:7px; overflow-wrap:anywhere; }
li button[aria-pressed=true] { background:#263e38; border-color:#3b6053; color:#b6ecd7; }
details { border-top:1px solid var(--edge); margin-top:15px; padding-top:13px; }
summary { cursor:pointer; color:#9caebd; font-size:11px; line-height:1.6; }
details[open] summary { margin-bottom:10px; color:#cedbe5; }
pre { height: 240px; overflow:auto; background:#0e151d; color:#9ebbb7; padding:12px; border:1px solid #26323f; border-radius:6px; font:10px/1.7 ui-monospace,Consolas,monospace; scrollbar-width:thin; }
.command-details { margin:16px 1px 0; }
.command-details summary { display:flex; align-items:center; gap:7px; color:#687f8f; font:10px ui-monospace,Consolas,monospace; letter-spacing:.4px; }
.command-details summary svg { width:13px; height:13px; }
.export-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
.export-link { display:flex; flex-direction:column; gap:12px; padding:15px; border:1px solid #35454d; border-radius:7px; color:#b8d9cf; background:linear-gradient(135deg,#243831,#1c2b2b); font:12px ui-monospace,Consolas,monospace; }
.export-link small { color:#749588; font-size:9px; }
.detail-image { display:block; max-width:100%; height:auto; margin-top:12px; border-radius:5px; }
.detail-link { display:block; font-size:10px; margin-top:12px; }
.edit-status { color:#85b9a6; font-size:10px; line-height:1.6; padding:0 16px; }
.edit-status:empty { display:none; }
.inspector .error { margin:10px 12px; }
@media(min-width:1500px) { .workspace { grid-template-columns:minmax(0,1fr) 320px; gap:26px; padding-top:30px; } .views { padding:26px 30px 30px; gap:30px; } }
@media(max-width:1100px) {
  .workspace { grid-template-columns:minmax(0,1fr); gap:18px; padding:22px; }
  .inspector-panel { max-width:720px; margin:auto; width:100%; }
  .inspector-heading { padding-bottom:10px; }
  .inspector-tabs { max-width:480px; margin:auto; border-bottom:0; padding-bottom:11px; }
  .inspector-panel { border-top:1px solid var(--edge); }
  .panel-intro { margin-bottom:12px; }
  .field-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
  .button-row button { flex:0 1 auto; min-width:130px; }
}
@media(max-width:600px) {
  .app-header { padding:14px 16px; gap:8px; } .brand { gap:8px; } .brand-mark { width:29px; height:29px; }
  .brand h1 { font-size:15px; } .brand-subtitle { font-size:7px; letter-spacing:1px; } .edition { font-size:8px; letter-spacing:.5px; }
  .header-actions { gap:7px; } .history-actions { padding-left:5px; gap:0; } .live-badge { font-size:8px; }
  .workspace { padding:16px 12px; } .workbench-heading { margin-bottom:11px; } .workbench-title { font-size:14px; }
  .count { font-size:8px; max-width:135px; line-height:1.6; }
  .stage-toolbar { gap:6px; padding:9px; } .toolbar-divider { display:none; }
  .stage-toolbar select { max-width:126px; } .blend-control { margin-left:0; }
  .views { gap:10px; padding:14px 10px 18px; } figcaption { font-size:8px; letter-spacing:.5px; margin-bottom:9px; }
  .figure-number { display:none; } .canvas-position { font-size:7px; } .viewport { max-height:54vh; min-height:100px; }
  .stage-footer { padding:9px 10px; } .stage-footer p { font-size:8px; }
  .field-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .button-row button { flex:1; min-width:0; }
}
`;
