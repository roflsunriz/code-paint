# code-paint

コードのみでイラストを描くためのCLI。JSON DSLを入力し、ヘッドレスでPNGを出力する。
コーディングエージェントがCLI経由で描画し、出力PNGをフィードバックに次の描画へ進むループを想定する。

## 使い方

前提: Bun 1.x（`bun --version` で確認）。

```powershell
bun install
bun run src/cli.ts -- --input examples/hello.json --output out/hello.png
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
- 対応図形（v0）: `rect` / `circle` / `line`。ブラシ・レイヤー・バケツ塗りは今後の仕様策定対象。
- エラー時は原因と次の行動が分かる日本語メッセージを出す（例: 色形式、必須引数の不足）。

## 開発者向け

構成:

- `src/paint-document.ts` - DSLの型定義
- `src/validate-document.ts` - `unknown` からの厳密な検証（`any` 不使用）
- `src/render-document.ts` - `@napi-rs/canvas` によるPNG描画
- `src/cli.ts` - CLI（`--input` / `--output` / `--help`）
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
