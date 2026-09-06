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
  - DSL検証: 正常系（空shapes・3種図形）、異常系（version不一致、色形式、未知kind）。
  - 描画: PNGシグネチャ確認、背景色と矩形のピクセル一致（退行防止）。

## 手動検証（端到端）

```powershell
bun run src/cli.ts -- --input examples/hello.json --output out/hello.png
```

確認項目:

- 終了コードが0で、出力先・寸法・図形件数が表示される。
- `out/hello.png` の先頭8バイトが `137,80,78,71,13,10,26,10`（PNG）である。
- 代表的な異常系（存在しない入力、壊れたJSON、不正な色）で日本語エラーと非0終了になる。

## 未自動化の範囲

- 実ブラウザでのHTML Canvas表示確認はv0の対象外。ヘッドレスPNGのみを検証する。
- 複数解像度・DPIでの見た目比較は、Viewer導入時に `tests/` へ追加する。
