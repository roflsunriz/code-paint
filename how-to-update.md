# 更新手順

## 前提

- Bun 1.x
- 初回のみ `bun install`

## 更新コマンド

```powershell
bun install
bun run src/cli.ts -- --input examples/hello.json --output out/hello.png
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
