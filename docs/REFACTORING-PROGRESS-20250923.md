# UniVoice.tsx リファクタリング・ロードマップ（2025-09-23 更新）

## 目的
- 巨大化したプレゼンテーション層（`src/components/UniVoice.tsx` 2785行）を分割し、Clean Architecture のレイヤを明確化
- `useUnifiedPipeline` / `UnifiedPipelineService` などパイプライン関連モジュールの責務を整理し、YAGNI 原則に沿って不要機能を排除
- リファクタリング過程でのリスクを最小化しつつ、段階的に成果をレビュー可能な状態に保つ

## 現状ハイライト
- プレゼンテーション層: UniVoice.tsx が直接 20 以上の hooks / services と結合し UI 状態を一括管理 `src/components/UniVoice.tsx:1`
- アプリケーション層: `src/hooks/useUnifiedPipeline.ts` が 1.6K 行でデータ整形・副作用・プレゼンター処理を同居させている
- ドメイン層: `electron/services/domain/UnifiedPipelineService.ts` が Deepgram/OpenAI/イベント駆動処理を単一クラスに集約
- 補助ツール: 依存グラフおよび巨大ファイルサマリを `analysis-dependency-graph.json`, `analysis-large-files.json` に出力済み

## 優先順位と段階的プラン
### Phase 0: セーフティネット整備（1日）
- Jest/Playwright のスモークを Git Hooks か npm script で走らせる（`npm run test`, `npm run test:e2e`）
- Serena `project index` を完了させ IDE ナビゲーションを安定化
- 解析スクリプト群（`scripts/dependency-graph.js` 等）を `tools/` か `scripts/analysis/` に整理し、差分監視

### Phase 1: プレゼンテーション層分割（2-3日）
- UniVoice.tsx を Context + Section コンポーネントへ再編成（Context: session、modal、layout/resize）
- `src/components/UniVoice/sections/` 以下へ Setup/Realtime/History/Summary を移設し、Props 経由のデータに限定
- 未使用となった `useSessionControl` 等を削除し YAGNI 遵守 `src/components/UniVoice.tsx:26`
- 成果物: UniVoice.tsx < 600 行を目標。機能フラグで段階的に切り替え

### Phase 2: Hooks / Presenter レイヤ分離（3日）
- `useUnifiedPipeline` を「パイプライン制御」「表示整形」「メモリ入出力」の3モジュールへ抽出
- Presenter 部分は `presentation/presenters/RealtimeDisplayPresenter.ts` へ寄せ、UI は Presenter 結果のみ利用 `src/hooks/useUnifiedPipeline.ts:1`
- モーダル/履歴/語彙生成などサブフローには個別 Hook（例: `useHistoryPipeline`, `useVocabularyPipeline`）を導入
- 成果物: `useUnifiedPipeline` 500 行未満、フィーチャ単位で単体テストを追加

### Phase 3: ドメインサービス再構成（3-4日）
- `UnifiedPipelineService` をコマンド/クエリハンドラへ整理し、OpenAI / Deepgram アダプタは `infrastructure/` に委譲
- Zod 契約 `electron/services/ipc/contracts.ts:1` を基点に DTO 変換を責務分割（Mapper 層追加を検討）
- `electron/main.ts:1` の IPC 登録・Window 起動ロジックを `bootstrap/` モジュールへ移し、main はエントリのみ
- 成果物: 各サービス 400 行未満、単体テスト + Playwright 経由で主要フロー検証

### Phase 4: クロスカッティング最適化（2日）
- `electron/utils/logger.ts` をインターフェース化し、依存注入経由に変更（テスト容易性向上）
- `FlexibleHistoryGrouper` など共通ユーティリティに対する契約テストを整備し、将来リファクタ時のリグレッションを防止
- CSS Modules の命名衝突や冗長クラスを整理して再利用性を高める

## リスク管理
- 各 Phase 完了ごとに Serena MCP で `write_memory` を実行し、進捗と注意点を記録
- フェーズ跨ぎの際は `analysis-dependency-graph.json` を再生成して依存変化を可視化
- 大規模分割では Feature Flag（例: `UNIVOICE_SECTION_SPLIT`）を導入し、段階的に本番同等環境で動作確認
- 既存のドキュメント（`docs/UNIVOICE-TSX-STRUCTURE-ANALYSIS.md` 等）は成果タイミングで更新

## 直近 TODO
1. Phase 0 のテスト/ツール整備を完了させ、作業用ブランチを切る
2. UniVoice.tsx の Context 設計草案をまとめ、レビューリクエスト（Serena メモリ共有）
3. Phase 1 実装に着手しつつ、対応箇所の Jest テストを先行作成
4. Playwright シナリオから重要フロー（リアルタイム表示/履歴保存/語彙生成）を抜粋して回帰テスト化
