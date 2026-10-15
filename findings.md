# findings.md

このリポジトリ固有の実現手段と調査知見の正本です。作業前に全文を読み、行動規範は [AGENTS.md](AGENTS.md) と [COMMON-AGENTS.md](COMMON-AGENTS.md) に従ってください。移動元の本文は以下に保持しています。

## 共通方針の適用と具体的な例外

| 項目                       | このリポジトリでの扱い                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 対象の共通ルール           | 依存更新の互換性条件                                                                                                                               |
| 理由と適用範囲             | TypeScript7への更新はtypescript-eslintのpeer範囲外であるため、既存検証で確認した6系を維持する。これはTypeScript依存とlint用APIの互換性に限る条件。 |
| 同等の品質を保つ手段・検証 | peer範囲の再確認後にlint・型・描画/編集/移行テスト・監査を行う。根拠: `package.json`、`bun.lock`、[検証記録](verification.md)。                    |

## 文書の役割と適用範囲

- 共通ルールの対象は「ローカル AGENTS.md との関係」「設計と実装方針」「検証」「ドキュメント」。この文書は本リポジトリの構成と既存運用に適用し、共通の行動規範を弱めません。
- ファイル配置・ツール・環境をここに集約する理由は、作業規範と実装上の事実を分け、次の作業者が根拠を確認できるようにするためです。下記の既存手段は同じ対象の設定・CI・検証記録と照合して使います。
- README は利用開始・操作、更新手順は更新と復旧、verification.md は検証手順と実測証跡、専門の設計・研究文書は詳細な根拠を担います。これらの用途は維持し、この文書から参照します。
- 更新・検証の代替は一律のBunコマンドに固定せず、下記の採用技術と既存CIに対応する検査を使います。実行不能や未検証の条件は成功扱いせず verification.md に残します。

<a id="agents-1"></a>

## 実装メモ（作業で確定した事項のみ）

- 実行基盤はBun 1.x + strict TypeScript、ヘッドレス描画は `@napi-rs/canvas@1.0.10`。`bun run lint` / `format` / `type-check` / `build` / `test` を維持する。精密描画サンプルのTypeScriptもlintと型検査の対象。
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

移動元: `AGENTS.md`。

<a id="agents-2"></a>

## 依存監査と互換性

- 2026-10-05: typescript-eslint 8.71.1への更新で、未修正のbracesを持つfast-glob経路をtinyglobbyへ置き換えた。TypeScriptのpeer範囲は `<6.1.0` のため6.0.3を使用し、7系は対応が確認できるまで採用しない。ESLint 10では `@eslint/js` を直接依存として固定し、lint・型・96件の描画/編集/移行テストと監査を確認する。

移動元: `AGENTS.md`。

<a id="readme-1"></a>

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

移動元: `README.md`。

<a id="readme-2"></a>

## 依存更新の自動処理

Dependabot は対象の依存関係を毎週確認します。patch／minor 更新は PR のチェック（CI）が成功した後に自動で squash merge されます。CI の失敗ジョブは 1 回だけ再実行します。再失敗時は指定した lockfile を再生成し、CI を再実行します。major 更新は手動で確認します。

移動元: `README.md`。

## 根拠と検証記録

- [README.md](README.md): 利用者向けの導入と操作。
- [verification.md](verification.md): 検証手順、実測結果、未確認事項。
- [how-to-update.md](how-to-update.md): 更新・復旧の実手順。
