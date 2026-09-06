# AGENTS.md

## 作業開始前の必須手順（最優先・例外なし）

1. エージェントは、調査、計画、コマンド実行、スキル利用、ファイル編集、コミット、プッシュを始める前に、必ずリポジトリ直下の `.\COMMON-AGENTS.md` を開き、先頭から末尾まで全文を読む。
2. `COMMON-AGENTS.md` はGit管理外のシンボリックリンクである。`git`や既定のignore設定が有効な`rg --files`の検索結果だけで、ファイルが存在しないと判断してはならない。PowerShellでは最初に次を実行する。

```powershell
Get-Content -Raw -LiteralPath .\COMMON-AGENTS.md
```

3. 読み取りに失敗した場合、出力が省略された場合、または末尾まで読めたことを確認できない場合は、一切の作業を開始せず、パスとシンボリックリンク先を確認して全文を再取得する。必要なら分割して末尾まで読む。
4. 全文を読了するまで、ローカル `AGENTS.md` だけを根拠に作業を続けてはならない。読了後は `COMMON-AGENTS.md` を最優先の指針とし、読了直後の最初の進捗報告で全文を読了したことを明示する。
   このファイルでは `code-paint` 固有の補足だけを記載する。

## 目的
- HTML 2D Canvas上で、純粋にコードのみの利用でイラストを描けるソフトウェアを構築する
- ブラシやレイヤーやバケツ塗りなどのツール策定と仕様の選定は効率性と検証性を優先して決める
- コーディングエージェントがCLI経由でイラストを描き、そのフィードバックとして描画結果を受け取ってそのループを回すような使い方を想定

## 実装メモ（作業で確定した事項のみ）

- 実行基盤は Bun 1.x + TypeScript（strict）。`bun run lint` / `format` / `type-check` / `build` / `test` を必ず用意する（`package.json` 参照）。
- ヘッドレス描画は `@napi-rs/canvas@1.0.8` を採用。根拠: MIT、型定義同梱（`./index.d.ts`）、直近リリース2026-08-24、プリビルド配布でWindows導入が軽い。`canvas@3.2.3` はネイティブ依存が重く、`skia-canvas@3.0.8` は更新が2025-09-25で古いため不採用。
- CLIは `bun run src/cli.ts -- --input <JSON> --output <PNG>`。`out/`、`dist/`、`node_modules/` は生成物として `.gitignore` 済み。
- DSLは `version: 1` 固定、色は `#RGB/#RRGGBB/#RRGGBBAA` のみ、寸法上限4096・図形上限10000。旧データは明示的マイグレーション対象（`src/validate-document.ts`）。
- ESLintの `restrict-template-expressions` により、テンプレート内の数値は `String()` で明示変換する（文字列は変換不要）。
- PNG確認は先頭8バイト `137,80,78,71,13,10,26,10` で行う（`verification.md` 参照）。
