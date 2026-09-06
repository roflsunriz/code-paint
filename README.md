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

入力JSON（v0最小仕様）:

```json
{
  "version": 1,
  "canvas": { "width": 320, "height": 200, "background": "#ffffff" },
  "shapes": [
    { "kind": "rect", "x": 20, "y": 30, "width": 120, "height": 80, "fill": "#ff0000" },
    { "kind": "circle", "cx": 220, "cy": 100, "r": 48, "fill": "#0000ff" },
    { "kind": "line", "x1": 20, "y1": 170, "x2": 300, "y2": 170, "stroke": "#000000", "strokeWidth": 4 }
  ]
}
```

- `version` は現在 `1` のみ。旧データは明示的マイグレーションの対象とし、曖昧な互換扱いはしない。
- 色は `#RGB` / `#RRGGBB` / `#RRGGBBAA` 形式。
- 対応図形: `rect` / `circle` / `line` / `path`（自由線・ブラシ相当。`points` は2〜10000点、`fill` 指定で閉形塗りつぶし）。
- 全図形に任意の `opacity`（0〜1、省略時1）を指定できる。描画順は配列順（後の図形が上に重なる）。
- rectの幅・高さは0以上。負の値はPNGとSVGで描画が一致しないため受け付けない。
- 見送り中のツール選定: バケツ塗り（ラスタ塗りはSVGのベクタ表現と一致保証できない）、テキスト（フォント依存で出力が非決定的になる）、楕円・レイヤー群（現状の円・透明度・配列順で足りる間は追加しない）。効率性と検証性を優先した判断であり、実利用で不足が確認されれば再選定する。
- エラー時は原因と次の行動が分かる日本語メッセージを出す（例: 色形式、必須引数の不足）。
- 描画結果はPNG（画像）とSVG（コード）の両方で受け取れる。SVGは決定的なテキストのため、画像を見られないエージェントでも厳密な文字列比較・diffで検証できる。

## ブラウザプレビュー

入力JSONの保存でキャンバスと命令表示が自動更新されるプレビューサーバ。

```powershell
bun run src/preview.ts -- --input examples/hello.json --port 8901
```

起動後に `http://localhost:8901/` を開くと、次の2つが同時に見られる。

- キャンバス: 2D Canvasによる描画結果（寸法・背景・図形を反映）
- 受け取った命令: 図形一覧と入力JSONの原文（検証エラー時はエラー内容も表示）

入力ファイルを保存すると約500ms間隔の取得で自動更新される。不正なJSONや検証NGの入力でもサーバは落ちず、画面にエラーが表示される。サーバは `127.0.0.1` のみで待ち受け、終了は Ctrl+C。

画像を見られないエージェントは `http://localhost:8901/svg` から同一内容のSVGテキストを取得できる（異常入力時は400番台のJSONエラー）。

## 開発者向け

構成:

- `src/paint-document.ts` - DSLの型定義
- `src/validate-document.ts` - `unknown` からの厳密な検証（`any` 不使用）
- `src/render-document.ts` - `@napi-rs/canvas` によるPNG描画
- `src/render-svg.ts` - SVGテキスト描画（PNGと同一セマンティクス、決定的出力、新規依存なし）
- `src/cli.ts` - CLI（`--input` / `--output` / `--svg` / `--help`）
- `src/preview.ts` - プレビューサーバのCLI（`--input` / `--port` / `--help`）
- `src/preview-server.ts` - `/` と `/document` と `/svg` を返すBunサーバ（`127.0.0.1` のみ）
- `src/preview-payload.ts` - 配信用ペイロードの純粋関数（異常入力もエラー表示用に返す）
- `src/preview-page.ts` - プレビュー画面のHTML生成（Canvas描画・命令表示・約500ms取得）
- `tests/` - `bun test` による検証・退行テスト
- `examples/hello.json` - 動作確認用サンプル

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
