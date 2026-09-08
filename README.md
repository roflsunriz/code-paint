# code-paint

コードで描き、プレビューで比較し、部品ごとに直すための描画CLIです。JSONの図形からPNGとSVGを生成します。ベジェ曲線、グラデーション、クリッピング、レイヤー、グループ編集に対応しています。

## はじめる

前提は Bun 1.x です。

```powershell
bun install
bun run src/cli.ts -- --input examples/hello.json --output out/hello.png --svg out/hello.svg
bun run src/preview.ts -- --input examples/hello.json --port 8901 --reference reference/miku.png
```

最後のコマンドの参照画像は手元の画像パスに置き換えてください。参照なしでも起動できます。[プレビュー](http://localhost:8901/)で入力ファイルの保存やAPIによる編集を約500ms間隔で反映します。終了は Ctrl+C。

## リファレンスに近づける

1. 参照のX・Y・幅・高さを元画像のピクセル座標で指定し、描きたい顔や部品を切り抜く。
2. 「並べて比較」「半透明で重ねる」「差分」を切り替え、輪郭や位置のずれを見る。
3. 図形のIDまたはグループで検索し、座標・色・曲線・変形を修正する。
4. 局所PNGを拡大して書き出し、細部を確認する。

参照は縦横比を保って作品の枠に収めます。「枠に合わせる」で全体を表示し、手動の拡大率は25〜400%。拡大時は枠内をスクロールできます。表示方法・拡大率・参照の切り抜きはブラウザに保存します。参照画像は比較用で、作品のPNG/SVGには入りません。

作業フェーズ（線画・塗り・影・反射・背景）はガイドです。いつでも戻る・飛ばすことができ、どのフェーズの図形も修正・追加できます。表示順はレイヤーで決めます。

### 精密描画サンプル

```powershell
bun run examples/miku-study.ts
Copy-Item out/miku-study/document.json out/miku-study/live.json
bun run src/preview.ts -- --input out/miku-study/live.json --port 8901 --reference <参照画像のパス>
```

生成した `out/miku-study/document.json` をプレビューの入力に指定して完成画を見ることもできます。ライブ描画では、空のv3 JSONを入力としてサーバーを起動した後に次を実行します。指定サーバーの絵全体がサンプルへ置き換わるため、別の作品は先に保存してください。

```powershell
bun run examples/miku-study.ts --live http://localhost:8901
```

サンプルは `examples/miku-study.ts` の曲線と色から描きます。参照画像の埋め込み・画素のコピーは使いません。元画像は同梱していません。

別ポーズの全身イラストとして、バターの跳躍サンプルも用意しています。3枚の参照から耳・髪・衣装・小物の特徴を取り、背景を含めコードで描いています。

```powershell
bun run examples/butter-adventure.ts
bun run examples/butter-adventure.ts --live http://localhost:8901
```

出力は `out/butter-adventure/`。`--live` は上と同じく、指定したサーバーの作品を置き換えて逐次描画します。

## JSON DSL v3

```json
{
  "version": 3,
  "canvas": { "width": 500, "height": 400, "background": "#ffffff" },
  "phase": "base",
  "shapes": [
    {
      "id": "hair",
      "group": "head",
      "layer": 10,
      "kind": "curve",
      "phase": "base",
      "d": "M 100 300 C 70 60 430 60 400 300 Q 250 240 100 300 Z",
      "fill": {
        "kind": "linear", "x1": 100, "y1": 100, "x2": 400, "y2": 300,
        "stops": [{ "offset": 0, "color": "#9edbd7" }, { "offset": 1, "color": "#3a8d9b" }]
      },
      "stroke": "#2c6571",
      "strokeWidth": 2
    }
  ]
}
```

### 図形と色

| kind | 必須の形状指定 | 塗りと線 |
| --- | --- | --- |
| `rect` | `x`, `y`, `width`, `height` | `fill` |
| `circle` | `cx`, `cy`, `r` | `fill` |
| `line` | `x1`, `y1`, `x2`, `y2` | `stroke`, `strokeWidth` |
| `path` | `points: [{x,y}, ...]` | `stroke`, `strokeWidth`, 任意の`fill` |
| `curve` | `d` | `stroke`, `strokeWidth`, 任意の`fill` |

`curve.d` は絶対座標の `M`（移動）、`L`（直線）、`Q`（二次ベジェ）、`C`（三次ベジェ）、`Z`（閉じる）。複数の `M` で独立した線を描けます。曲線・pathの線を消すには `strokeWidth: 0`。線幅の強弱が必要な輪郭は、閉じた曲線の塗りで表現できます。

色は `#RGB` / `#RRGGBB` / `#RRGGBBAA`。`fill` には色のほか次のグラデーションも使えます。

- 線形: `{kind:"linear", x1, y1, x2, y2, stops}`
- 放射: `{kind:"radial", cx, cy, r, stops}`
- `stops`: `[{offset:0,color:"#ffffff"},{offset:1,color:"#ffffff00"}]` のように0〜1の位置を昇順で指定。透明な色へ変化させれば、柔らかな光や赤みを重ねられます。

グラデーションの座標は図形と同じ座標系です。

### 部品・レイヤー・マスク

全図形に `phase` が必須です。以下は省略できます。

| 項目 | 意味 |
| --- | --- |
| `id` | 図形の識別子。同じドキュメント内で一意 |
| `group` | 一括修正する部品名（例: `eye-left`） |
| `layer` | 小さい値から大きい値へ描く。同値なら配列順 |
| `opacity` | 0〜1の不透明度 |
| `hidden` | `true` で書き出しを含め非表示 |
| `clip` | `curve.d`と同じ形式のパス。塗り・線をその内側だけへ描く |
| `transform` | `[a,b,c,d,e,f]` のアフィン変換。平行移動は `[1,0,0,1,dx,dy]` |

`layer` 省略時は background=0, base=1, shadow=2, reflection=3, lineart=4。明示レイヤーもこの数値と一緒に並びます。`clip` は図形のローカル座標で指定し、グラデーション・線と一緒に `transform` が適用されます。`group` は図形の集合で、独立した合成レイヤーではありません。グループのopacityは各図形に適用され、transformは各図形の既存行列を置き換えます。

上限: キャンバス・PNG出力は各辺4096px、図形10000件、pathの点／curveの命令10000個。座標・線幅・変形係数などの数値の絶対値は100万以下です。不正な入力は保存前に拒否します。

## 編集API

PowerShellから使う例です。ID・グループ名をURLに含めるときはURLエンコードしてください。

```powershell
# 図形を追加（phaseは現在の作業ガイドと異なってもよい）
Invoke-RestMethod -Method POST http://localhost:8901/shapes -ContentType 'application/json' -Body '{"shape":{"id":"eye","group":"face","kind":"circle","phase":"base","cx":200,"cy":150,"r":30,"fill":"#45aab5"}}'
# 座標だけを修正
Invoke-RestMethod -Method PATCH http://localhost:8901/shapes/eye -ContentType 'application/json' -Body '{"cx":205}'
# グループ全体を平行移動
Invoke-RestMethod -Method PATCH http://localhost:8901/groups/face -ContentType 'application/json' -Body '{"transform":[1,0,0,1,5,0]}'
# 工程を戻す
Invoke-RestMethod -Method POST http://localhost:8901/phase -ContentType 'application/json' -Body '{"phase":"lineart"}'
Invoke-RestMethod -Method POST http://localhost:8901/undo
Invoke-RestMethod -Method POST http://localhost:8901/redo
```

| メソッド・経路 | 操作 |
| --- | --- |
| `GET /document` | 検証結果・図形・入力原文・ハッシュ |
| `PUT /document` | v3ドキュメント全体の置換 |
| `POST /shapes` | `{"shape":{...}}` または `{"shapes":[...]}` の追記 |
| `PATCH /shapes/:id` | 指定図形の部分更新 |
| `DELETE /shapes/:id` | 指定図形の削除 |
| `PATCH /groups/:group` | 同じグループの図形を一括更新 |
| `DELETE /groups/:group` | グループの削除 |
| `DELETE /shapes` | 全消去。キャンバスを保持し作業ガイドを線画へ戻す |
| `POST /phase` | `{"phase":"shadow"}` など任意工程へ変更 |
| `POST /bucket` | `{"x":100,"y":100,"fill":"#aabbcc"}` で連続領域を塗る |
| `GET /history` | `canUndo`, `canRedo` を取得 |
| `POST /undo`, `POST /redo` | 操作を戻す・やり直す |
| `GET /svg` | 作品全体のSVG |
| `GET /render.png` | 作品のPNG。`?x=100&y=100&width=200&height=200&scale=3` で局所拡大 |
| `GET /reference` | 指定した参照画像（未設定・紛失時は404） |

PATCHは変更する項目だけを送ります。`id` と `kind` は変更できません。任意項目は `null` で除去できます。APIが追加図形のID省略を補うので、以後は `/document` で得たIDを使います。

バケツ塗りは描画結果の連続領域を走査し、高さ1のrect束にして保存します。工程を問わず使用でき、`layer`を指定できます。許容差は既定16、0〜255。PNGとSVGで同じ領域を再現できます。

編集は入力JSONへ保存されます。Undo/Redoはサーバー起動中の最大100件・合計32MiBで、外部から入力ファイルを保存した場合とサーバー再起動時にリセットされます。長期保存には入力JSONのコピーを使ってください。API同士の編集は直列化し、保存は一時ファイルから置き換えます。外部保存との競合を検出すると409で再確認を求めます。

サーバーは127.0.0.1で待ち受けます。別OriginのWebページからの書き込みを拒否し、外部画像やスクリプトをDSLへ埋め込む機能はありません。

## 局所拡大と旧データの移行

```powershell
bun run src/cli.ts -- --input out/miku-study/document.json --output out/miku-study/eyes.png --crop 230,360,400,400 --scale 3
bun run src/migrate.ts -- --input old-v2.json --output new-v3.json
```

局所PNGは曲線から再描画します。CLIの `--svg` はcrop指定にかかわらず全体のSVGを保存します。旧v1/v2は直接描画せず、移行コマンドでv3へ変換します。v2は元のフェーズによる表示順をレイヤーへ保存し、見た目を保持します。

## 開発者向け

```powershell
bun run lint
bun run format
bun run type-check
bun run build
bun run test
```

- `src/paint-document.ts`, `validate-document.ts`, `curve-path.ts`: DSLと入力検証
- `src/render-document.ts`, `render-svg.ts`: PNG/SVG描画
- `src/preview-server.ts`, `preview-store.ts`, `preview-render.ts`: 編集・履歴・保存・局所出力
- `src/preview-page.ts`, `preview-client.ts`, `preview-view.ts`: 比較画面
- `examples/miku-study.ts`: 編集可能な精密描画サンプル

検証は [verification.md](verification.md)、更新と復旧は [how-to-update.md](how-to-update.md)、変更履歴は [CHANGELOG.md](CHANGELOG.md) を参照してください。ソフトウェアのライセンスはMITです。
