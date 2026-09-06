# 更新手順

## 前提

- Bun 1.x
- 初回のみ `bun install`

## 更新コマンド

```powershell
bun install
bun run src/cli.ts -- --input examples/hello.json --output out/hello.png
```

SVGテキストも必要な場合:

```powershell
bun run src/cli.ts -- --input examples/hello.json --output out/hello.png --svg out/hello.svg
```

プレビューを使う場合:

```powershell
bun run src/preview.ts -- --input examples/hello.json --port 8901
```

リファレンス画像を付ける場合:

```powershell
bun run src/preview.ts -- --input examples/hello.json --port 8901 --reference reference/miku.png
```

起動後に `http://localhost:8901/` を開く。終了は Ctrl+C。

逐次追記する場合（入力JSONに保存され画面へ自動反映される）:

```powershell
curl.exe -Method POST http://localhost:8901/shapes -ContentType "application/json" -Body '{"shape": {"kind": "circle", "cx": 220, "cy": 100, "r": 48, "fill": "#0000ff"}}'
curl.exe -Method DELETE http://localhost:8901/shapes
```

## 検証方法

```powershell
bun run lint
bun run format
bun run type-check
bun run build
bun run test
```

`out/hello.png` がPNGシグネチャ（`137,80,78,71,13,10,26,10`）で始まることを確認する。
詳細は `verification.md` を参照。

## 復旧方針

- 本ツールは入力JSONを読み取り、指定PNGを上書きするのみ。既存の入力は変更しない。
- 出力を誤って上書きした場合は、入力JSONから再生成する。
- 依存関係の更新で描画が変わった場合は、`bun.lock` を戻し `bun install` し直す。
- プレビューのポートが使用中の場合は `--port` を変える（例: `--port 8902）。サーバは `127.0.0.1` のみで待ち受ける。
