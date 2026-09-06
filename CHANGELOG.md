# Changelog

書式は Keep a Changelog に従う。日付は `YYYY-MM-DD`。

## [Unreleased]

### Added

- JSON DSL入力からPNGを出力する最小CLIを追加し、エージェントが描画と検証のループを回せるようにした
- DSL検証（色形式・寸法上限・図形種別）と日本語エラーメッセージを追加し、誤入力の原因を判断できるようにした
- 描画の退行を検出するため、PNGシグネチャとピクセル一致のテストを追加した
- 利用開始・更新・検証の文書（README、`how-to-update.md`、`verification.md`）を追加し、初期整備の手順を確認できるようにした
