# 調査知見

- DSLはv3。v1/v2移行では旧版が理解した属性だけを変換し、当時無視されたhidden/transform/clipを新たに有効化しない。表示順は数値layer優先、同値は配列順。
- curve/clipは絶対座標。clipとgradientは図形local座標でtransformと一緒に作用する。groupはoffscreen合成layerではなく図形集合で、一括transformは行列置換、一括opacityは各図形設定。
- 入力上限はcanvas各辺4096、図形/点/curve命令10000、幾何絶対値100万。有限値でもnative gradient例外を起こすため、`isFinite` だけで済ませない。
- PNGとbucketは同じ `renderDocumentToCanvas` を使う。region拡大は元図形から再描画し、原寸bitmapを拡大しない。bucketはRGBA連続領域をrect束へ展開し、PNG/SVG領域を一致させる。
- SVGの8桁hexは色とopacityへ分離し、半透明pathのfill/strokeも個別opacityにする。decoder差やCanvasの二重合成との差を回帰で確認する。
- `PreviewStore` は編集を直列化し、全文検証後にtemp→renameで保存する。外部保存検出時はhistoryをreset、競合は409。壊れたJSONを空dataで上書きしない。
- IDなし旧JSONは決定的 `shape-N` を投影して次回編集時に永続化する。新規自動IDはUUIDで、削除IDを再利用しない。描画前後のdocument hashを照合して異なる版を混ぜない。
- `/render.png` はregion queryだけを許可する。cache用hashを追加すると未知parameterで拒否されるため、client/API接続testを保つ。
- 接する輪郭を別pathの端合わせだけで描くと拡大時に白い隙間が出る。首は襟下へ重ね、まつ毛等は本体と同じ閉pathへ含める。
- TypeScript 7はtypescript-eslint非対応のため6系を維持する。描画sampleもlint/typecheck対象から外さない。
