# code-paint

コードのみでイラストを描くためのCLI。JSON DSLを入力し、ヘッドレスでPNGを出力する。
コーディングエージェントがCLI経由で描画し、出力PNGをフィードバックに次の描画へ進むループを想定する。

## 使い方

前提: Bun 1.x（`bun --version` で確認）。

```powershell
bun install
bun run src/cli.ts -- --input examples/hello.json --output out/hello.png
```

画像を見られないエージェント向けに、同一内容のSVGテキストも出力できる。

```powershell
bun run src/cli.ts -- --input examples/hello.json --output out/hello.png --svg out/hello.svg
```

入力JSON（v2、作業フェーズ付き）:

```json
{
  "version": 2,
  "canvas": { "width": 320, "height": 200, "background": "#ffffff" },
  "phase": "base",
  "shapes": [
    { "kind": "line", "phase": "lineart", "x1": 20, "y1": 170, "x2": 300, "y2": 170, "stroke": "#000000", "strokeWidth": 4 },
    { "kind": "rect", "phase": "base", "x": 20, "y": 30, "width": 120, "height": 80, "fill": "#ff0000" },
    { "kind": "circle", "phase": "base", "cx": 220, "cy": 100, "r": 48, "fill": "#0000ff" }
  ]
}
```

- `version` は現在 `2`。`version: 1` の旧データは `bun run src/migrate.ts -- --input <旧JSON> --output <新JSON>` で移行する（旧図形は線画として取り込み、現在フェーズは線画からやり直し）。
- 色は `#RGB` / `#RRGGBB` / `#RRGGBBAA` 形式。
- 対応図形: `rect` / `circle` / `line` / `path`（自由線・ブラシ相当。`points` は2〜10000点、`fill` 指定で閉形塗りつぶし）。
- 全図形に任意の `opacity`（0〜1、省略時1）を指定できる。
- rectの幅・高さは0以上。負の値はPNGとSVGで描画が一致しないため受け付けない。
- 見送り中のツール選定: テキスト（フォント依存で出力が非決定的になる）、楕円・レイヤー群（現状の円・透明度・フェーズ層で足りる間は追加しない）。効率性と検証性を優先した判断であり、実利用で不足が確認されれば再選定する。
- エラー時は原因と次の行動が分かる日本語メッセージを出す（例: 色形式、必須引数の不足）。
- 描画結果はPNG（画像）とSVG（コード）の両方で受け取れる。SVGは決定的なテキストのため、画像を見られないエージェントでも厳密な文字列比較・diffで検証できる。

## 作業フェーズ（線画→バケツ塗り→影→反射→背景の強制）

- 各図形は `phase`（`lineart` / `base` / `shadow` / `reflection` / `background`）を持ち、ドキュメントは現在の `phase` を持つ。
- 検証では図形配列が作業順（線画→バケツ塗り→影→反射→背景）に非減少であること、現在フェーズより先の図形を持たないことを強制する。違反は日本語エラーで拒否される。
- 描画（PNG・SVG・プレビュー）は背景層を常に最背面に合成する（背景→塗り→影→反射→線画の順）。背景は作業の最後に行うが、表示では背面に回る。
- バケツ塗りはラスタの flood fill を `rect` 束（高さ1・`phase: base`）へ展開して保存するため、PNG/SVG/プレビューの描画一致が保たれる。新規依存なし、同一入力は同一出力。

## ブラウザプレビュー

入力JSONの保存や逐次追記でキャンバスと命令表示が自動更新されるプレビューサーバ。

```powershell
bun run src/preview.ts -- --input examples/hello.json --port 8901
```

起動後に `http://localhost:8901/` を開くと、次の3つが同時に見られる。

- キャンバス: 2D Canvasによる描画結果（寸法・背景・図形を反映）
- 受け取った命令: 図形一覧と入力JSONの原文（検証エラー時はエラー内容も表示）
- リファレンス: `--reference` で指定した見本画像（未指定時は案内表示）

入力ファイルを保存すると約500ms間隔の取得で自動更新される。不正なJSONや検証NGの入力でもサーバは落ちず、画面にエラーが表示される。サーバは `127.0.0.1` のみで待ち受け、終了は Ctrl+C。

受け取った命令欄は固定高さ（図形一覧・JSONとも高さ240px）でスクロールし、更新のたびに末尾へ自動スクロールする。図形一覧は最新200件のみ表示し、それ以前は件数表示にまとめる。

### 逐次追記（細かく積み重ねる描画）

コーディングエージェントは全文JSONを毎回送らず、1件ずつ追記して積み重ねられる。

```powershell
# 1件追記（現在のフェーズの図形のみ受け付ける）
Invoke-RestMethod -Method POST http://localhost:8901/shapes `
  -ContentType "application/json" `
  -Body '{"shape": {"kind": "circle", "phase": "base", "cx": 220, "cy": 100, "r": 48, "fill": "#0000ff"}}'

# 複数件追記
Invoke-RestMethod -Method POST http://localhost:8901/shapes `
  -ContentType "application/json" `
  -Body '{"shapes": [{...}, {...}]}'

# フェーズ進行（一段ずつ、飛ばし・戻り不可）
Invoke-RestMethod -Method POST http://localhost:8901/phase `
  -ContentType "application/json" `
  -Body '{"phase": "shadow"}'

# バケツ塗り（base相のみ。flood fillをrect束へ展開して追記）
Invoke-RestMethod -Method POST http://localhost:8901/bucket `
  -ContentType "application/json" `
  -Body '{"x": 220, "y": 100, "fill": "#ff0000"}'

# 全消去（キャンバス設定は保持、フェーズは線画に戻る）
Invoke-RestMethod -Method DELETE http://localhost:8901/shapes
```

追記は入力JSONファイルに保存されるため、プレビュー表示と `/document`・`/svg`・CLI出力がそのまま連動する。不正な図形・別フェーズの図形・飛ばしの進行・base相以外のバケツ塗りは400番台のJSONエラーで拒否され、既存の入力は変更されない。

### リファレンス画像の受け渡し

```powershell
bun run src/preview.ts -- --input examples/hello.json --port 8901 --reference reference/miku.png
```

- 画面の「リファレンス」に見本が表示される。
- エージェントは `http://localhost:8901/reference` から画像バイトを取得できる。

```powershell
Invoke-WebRequest http://localhost:8901/reference -OutFile out/reference.png
```

画像を見られないエージェントは `http://localhost:8901/svg` から同一内容のSVGテキストを取得できる（異常入力時は400番台のJSONエラー）。

## 開発者向け

構成:

- `src/paint-document.ts` - DSLの型定義（v2・作業フェーズ付き）
- `src/paint-phase.ts` - 作業フェーズの定義・検証・表示順（背景を最背面に固定）
- `src/paint-error.ts` - 検証エラーの型（循環参照の回避）
- `src/validate-document.ts` - `unknown` からの厳密な検証（`any` 不使用）とv1→v2移行
- `src/bucket-fill.ts` - バケツ塗り（flood fillをrect束へ展開、決定的出力）
- `src/migrate.ts` - v1→v2移行CLI（`--input` / `--output`）
- `src/render-document.ts` - `@napi-rs/canvas` によるPNG描画（フェーズ層順）
- `src/render-svg.ts` - SVGテキスト描画（PNGと同一セマンティクス、決定的出力、新規依存なし）
- `src/cli.ts` - CLI（`--input` / `--output` / `--svg` / `--help`）
- `src/preview.ts` - プレビューサーバのCLI（`--input` / `--port` / `--reference` / `--help`）
- `src/preview-server.ts` - `/` と `/document` と `/svg` と `/reference` と `/shapes`（POST追記・DELETE消去）と `/phase`（一段進行）と `/bucket`（塗り展開）を返すBunサーバ（`127.0.0.1` のみ）
- `src/preview-payload.ts` - 配信用ペイロードの純粋関数（異常入力もエラー表示用に返す）
- `src/preview-page.ts` - プレビュー画面のHTML生成（Canvas描画・命令表示・約500ms取得・フェーズ表示）
- `tests/` - `bun test` による検証・退行テスト
- `examples/hello.json` - 動作確認用サンプル（v2）

品質確認:

```powershell
bun run lint
bun run format
bun run type-check
bun run build
bun run test
```

詳細は `verification.md`、更新手順は `how-to-update.md`、変更履歴は `CHANGELOG.md` を参照。

## ライセンス

MIT（`LICENSE` を参照）。
