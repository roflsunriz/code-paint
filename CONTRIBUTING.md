# 貢献方法

## 基本

- 小さく、意味のある単位で変更する。
- 変更理由・検証内容を説明する。
- `bun run lint`、`bun run format`、`bun run type-check`、`bun run build`、`bun test`を通す。

## 手順

1. 現状と利用経路を確認する。
2. 実装前の判断ラダー（既存実装・標準機能・導入済み依存の再利用）を検討する。
3. 実装し、退行防止テストを追加または更新する。
4. `README.md`、`how-to-update.md`、`verification.md`、`CHANGELOG.md`の整合を確認する。

## 報告

- 最終報告では変更内容・検証結果・未検証項目・残るリスクを分けて書く。
- 秘密情報・個人情報・認証情報は含めない。
