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

- 実行基盤はBun 1.x + strict TypeScript、ヘッドレス描画は `@napi-rs/canvas@1.0.8`。`bun run lint` / `format` / `type-check` / `build` / `test` を維持する。精密描画サンプルのTypeScriptもlintと型検査の対象。
- CLIは `bun run src/cli.ts -- --input <JSON> --output <PNG> [--svg <SVG>] [--crop x,y,width,height] [--scale 倍率]`。crop/scaleはPNGだけに適用し、SVGは全体を保存する。出力寸法はPNGの実寸を表示する。
- DSLはv3固定。v1/v2は `migrateToCurrentDocument` と移行CLIで明示変換する。旧図形の既知属性だけを拾い、旧版で無視されたhidden/transform/clip等を新機能として有効化しない。v2のphase表示rankをlayerに保存して見た目を保持する。
- ユーザーの2026-09-08の方針変更により、phaseは作業ガイドになった。作業順強制・別工程の追加禁止は廃止し、自由に戻る・飛ばす・修正が可能。表示順は数値layer優先(省略時background=0,base=1,shadow=2,reflection=3,lineart=4)、同値は配列順。
- 図形はrect/circle/line/path/curve。curveとclipは絶対座標M/L/Q/C/Z。CanvasとSVGの両方でネイティブベジェ描画する。曲線/pathのstrokeWidth=0は線なし。全図形にid/group/layer/hidden/clip/transform/opacityを指定可能。
- fillは16進色またはlinear/radial gradient。色は#RGB/#RRGGBB/#RRGGBBAA。上限は各辺4096px、図形10000、path点/curve命令10000、幾何数値の絶対値100万。巨大な有限数値でもネイティブgradient描画例外を起こすため有界検証する。
- clip・gradientは図形ローカル座標。transformと一緒に作用する。groupは図形集合で、独立したオフスクリーン合成層ではない。一括transformは行列の置換、一括opacityは各図形への設定。
- PNGとbucketは `renderDocumentToCanvas` を共有。regionオプション(x/y/width/height/scale)による局所拡大は元図形から再描画し、原寸PNGの引き伸ばしにしない。
- SVGのgradient stopは8桁hexをstop-colorとstop-opacityへ分離する（画像デコーダのalpha解釈差対策）。半透明のpath塗りと線はCanvasの2回合成と合わせ、SVGでもfill-opacity/stroke-opacityへ分ける。tests/drawing-v3.test.tsで内部画素対応を確認。
- バケツ塗りは描画結果のRGBA連続領域を高さ1のrect束へ展開して保存する。許容差は既定16・0〜255。工程は問わない。APIでlayerを指定可能。PNG/SVGの領域が一致する。
- プレビュー起動は `bun run src/preview.ts -- --input <JSON> --port 8901 --reference <画像パス>`。127.0.0.1で待ち受け、約500msで外部保存・API編集を反映。参照はGET /reference、未設定/紛失時404。参照は比較専用で作品のexportに含めない。
- 編集APIはPOST /shapes、PATCH/DELETE /shapes/:id、PATCH/DELETE /groups/:group、PUT /document、POST /phase、POST /bucket、POST /undo・/redo。PATCHは平坦な部分JSONで、optionalをnullで解除。id/kind変更は拒否。GET /historyで履歴可否を取得。
- `PreviewStore` はAPI編集を直列化し、全文検証後に一時ファイル→renameで保存。外部保存を検出すると履歴をリセット、保存競合は409。履歴はセッション内100件/32MiB。壊れたJSONを空データで上書きせず、修正または保存コピーから復旧する。
- ID省略の既存JSONはGETで決定的なshape-Nを投影して次の編集時に永続化。APIの新規追加の自動IDはUUIDで、削除後に旧IDを別の図形へ再利用しない。古い選択からのPATCHで別部品を修正することを防ぐ。
- プレビューはSVGを読みCanvasへ描画する。取得前後のdocument hashを照合し、更新中に異なる版の描画を混ぜない。参照cropは元画像px、縦横比を保って作品枠へfit。ブラウザ表示設定はlocalStorage保存。
- UI要素特定はdata-testidを使う。paint-canvas/reference-canvas、compare-mode、crop-x/y/width/height、canvas-zoom、view-fit、shape-search、shape-patch、group-patch、phase-select、undo/redo等。表示文言に依存させない。
- GET /render.pngはx/y/width/height/scaleだけをqueryに受け付ける。UIのキャッシュ用hash等を付加すると未知パラメーターとして拒否されるため、クライアントとAPIの接続テストを保つ。
- ESLint restrict-template-expressionsではテンプレート内の数値をString()で変換する。Bunのテスト後始末で終了コードを戻す場合は0を明示代入する（undefinedでは元に戻らない）。
- 人物は閉じた曲線の輪郭・塗りで描き、ヘッドセット等は顔横に置く。首と襟は境界を接するだけにせず、首を襟の下へ延ばして重ねると白い隙間を防げる（examples/miku-study.ts）。
- まつ毛のハネのように接続が必要な部位は本体と同じ閉じたパスへ含める。別々の輪郭を端で接するだけだと隙間が見えるため、局所拡大でも接続を確認する。
- キャラクター模写では細部より先に顔の縦横比・頬の最大幅・頭と胴の比率を確認する。バターの下膨れは頬の色だけでなく輪郭を下側で広げて表現する。頭身変更時は首を基準に関連部品の変形を合成し、袖・手・持ち物の接続も確認する。
- バターの通常衣装・動きの確認根拠は `docs/butter-video-study.md`。動画には別衣装も含まれるため混同しない。通常衣装は大きな尖った白襟なし、短パンと靴下の間に素足、黄色の靴下帯は3本、パチンコ付け根にリボン。細部は低解像度一覧だけで確定せず原寸フレームでも確認する。
- out/dist/node_modules/subagentsはGit管理外。描画の生成元をexamplesへ保存し、PNG/SVG/JSONをoutへ出力する。PNGシグネチャは137,80,78,71,13,10,26,10。検証観点はverification.mdを参照。
