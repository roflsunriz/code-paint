# 検証手順

## 自動検証

```powershell
bun run lint
bun run format
bun run type-check
bun run build
bun run test
```

- `lint`: `any` 禁止・テンプレート式の型制限を含むESLint（警告0件が条件）。
- `format`: Prettierの検査。
- `type-check`: `tsc --noEmit` による厳密な型検査。
- `build`: `bun build` によるバンドル確認。
- `test`: `bun test`。検証・退行の観点は次の通り。
  - DSL検証: 正常系（空shapes・3種図形・pathとopacity）、異常系（version不一致、色形式、未知kind、負寸法rect、不足点path、範囲外opacity）。
  - 描画: PNGシグネチャ確認、背景色と矩形のピクセル一致（退行防止）、pathの線のピクセル一致、opacityの混色。
  - SVG: 3種図形の写像・決定性（同一入力で同一文字列）・実サンプルとの対応、pathとopacityの写像、CLIの `--svg` 出力（省略時はPNGのみ）、サーバ `/svg` の正常・異常系。
  - プレビュー: ペイロード生成（正常・壊れたJSON・検証NG・ハッシュ変化）、サーバ経路（`/` の画面目印、`/document` の正常・不存在入力）、画面HTMLの3種描画分岐と自動取得。

## 手動検証（端到端）

```powershell
bun run src/cli.ts -- --input examples/hello.json --output out/hello.png
```

確認項目:

- 終了コードが0で、出力先・寸法・図形件数が表示される。
- `out/hello.png` の先頭8バイトが `137,80,78,71,13,10,26,10`（PNG）である。
- `--svg out/hello.svg` を付けるとPNGと同一内容のSVGテキストが出力され、CLI出力と `/svg` の応答が一致する。
- 代表的な異常系（存在しない入力、壊れたJSON、不正な色）で日本語エラーと非0終了になる。

## 手動検証（プレビュー）

```powershell
bun run src/preview.ts -- --input examples/hello.json --port 8901
```

確認項目:

- `http://localhost:8901/` でキャンバス描画（矩形・円・線）と受け取った命令（図形一覧・JSON原文）が同時に表示される。
- 入力JSONを保存するとハッシュが変わり、約500ms間隔の取得で画面が自動更新される。
- 不正なJSONや検証NGの入力でもサーバが落ちず、画面にエラーが表示される。
- 代表的な複数ビューポート（例: 1920x1080、390x844）のヘッドレスChromeでスクリーンショットまたはDOM実測を行い、文字切れ・重なり・操作不能な要素がないか確認する。

## 未自動化の範囲

- 実ブラウザでの見た目比較は手動検証の対象とし、自動テストではサーバ経路と画面HTMLの含有確認まで行う。
- 複数解像度・DPIでの厳密な画像比較は、必要になった時点で `tests/` へ追加する。
