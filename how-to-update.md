# 更新・復旧手順

## 前提と更新

Bun 1.xを使います。依存関係の正本は `package.json` と `bun.lock` です。

```powershell
bun install
bun run lint
bun run format
bun run type-check
bun run build
bun run test
bun run src/cli.ts -- --input examples/hello.json --output out/hello.png --svg out/hello.svg
```

## 旧JSONをv3へ移行する

v1/v2は直接読み込まず、出力先を分けて明示的に移行します。

```powershell
bun run src/migrate.ts -- --input old-v2.json --output new-v3.json
bun run src/cli.ts -- --input new-v3.json --output out/migrated.png
```

v2の表示順は `layer` に固定して保持します。旧形式で無視されていた項目を新しい機能として勝手に有効化しません。v1の図形は線画ガイドとして取り込み、元の配列順を保持します。移行後は必要な部品へ `group` を設定すると一括編集できます。元のJSONは復旧用に保管してください。

## プレビュー

```powershell
bun run src/preview.ts -- --input new-v3.json --port 8901 --reference reference/miku.png
```

参照画像のパスは手元の画像に置き換えます。参照なしの場合は `--reference` を省略。[プレビュー](http://localhost:8901/)を開きます。ポートが使用中なら `--port 8902` などへ変更してください。終了は Ctrl+C。

編集APIとUIの部分修正は入力JSONを更新します。工程は任意に戻せます。操作の詳細とAPI一覧は [README.md](README.md) を参照してください。

## 復旧

- 描画CLIは入力JSONを変更せず、指定した出力を上書きします。PNG/SVGを失った場合はJSONから再生成できます。
- プレビューのUndo/Redoは起動中の履歴です。外部からJSONを保存した場合と再起動時にリセットされるため、大きな変更の前には入力JSONのコピーを保存してください。
- JSONが壊れている場合は画面に検証エラーが出ます。原文または保存済みコピーを修正すると自動で再表示されます。壊れた入力を空の作品で自動上書きしません。
- API編集中に外部保存が検出されると409になります。最新の入力を読み直してから変更を再適用してください。
- 表示設定だけを戻す場合は「表示をリセット」を使います。作品のデータには影響しません。
- 依存更新により描画が変わった場合は、以前の `package.json` と `bun.lock` をそろえて復元し、`bun install` と検証を再実行してください。

## 局所PNG

```powershell
bun run src/cli.ts -- --input new-v3.json --output out/detail.png --crop 20,30,100,100 --scale 3
```

切り抜きはキャンバス内、出力は各辺4096px以下にしてください。元の曲線から拡大描画します。`--svg` は局所指定にかかわらず全体を保存します。
