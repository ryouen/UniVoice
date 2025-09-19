# UniVoice 2.0 絶対命令と重要な制約

## 🔴 絶対命令（CRITICAL DIRECTIVES）

### 0. 動作実績のあるコードを壊すな
- 既に動作しているコードは正しい
- 「改善」や「リファクタリング」の名目で動くコードを変更しない

### 1. Ultrathink原則 — 表面的修正の禁止
- コード修正前に必ず状況と構造を深く分析すること
- 計画を立て、影響範囲と副作用を完全に見通してから着手
- 「とりあえず試す」「推測で修正」は厳禁

### 2. 型安全性の絶対優先
- 全てのIPC通信はZodによる型検証必須
- any型の使用は原則禁止
- Discriminated Union型でイベント契約を定義

### 3. アーキテクチャ原則の遵守
- Clean Architecture: 依存性の方向を内側に
- CQRS: コマンドとクエリの完全分離
- Event-Driven: UI層と処理層の疎結合
- Hexagonal: ポートとアダプタによる外部依存の分離

### 4. 知識カットオフ後のAPIパターンの尊重
- 動作している実装を「改善」しない
- 以下の誤解を避ける：
  - ❌「chat.completions.createが正しい」→ ✅ responses.createが正しい
  - ❌「messagesパラメータを使うべき」→ ✅ inputパラメータが正しい
  - ❌「max_completion_tokensに変更」→ ✅ max_output_tokensが正しい
- 推測による「改良」は改悪

### 5. プロジェクトは完全に独立
- UniVoiceプロジェクトは完全に自己完結
- 親フォルダの参照は不要
- 外部依存は公式npm/APIのみ

## ⚠️ 重要な訂正（疑ってはならないもの）

### GPT-5シリーズは実在する（2025年3月リリース）
- gpt-5、gpt-5-mini、gpt-5-nano は実在のモデル
- Responses API を使用（chat.completions APIではない）
- temperatureパラメータは1.0固定（変更不可）

### Deepgram Nova-3の仕様
- 日本語は`language=multi`パラメータで対応
- `language=ja`は使用しない（multi-languageモード推奨）

## 🚨 既知の問題と対処法

### SentenceCombinerは既に統合済み
- 多くのドキュメントで「未統合」と誤記載
- 実際はUnifiedPipelineService.ts:203で完全統合
- CombinedSentenceEventも正常に発行されている

### SessionStorageServiceは未使用
- 実装はあるが完全に孤立
- importが1つもない = 使われていない
- データ永続化が機能していない根本原因

### Setup画面の2重構造
- SetupScreen.tsx（削除対象）
- SetupSection.tsx（正式）
- 混在が画面遷移の問題を引き起こす

## 📋 コード修正時の必須確認

1. **型チェック**: `npm run typecheck`でエラー0
2. **型同期**: `npm run sync-contracts`で同期
3. **ビルド**: `npm run build`で成功
4. **動作確認**: 既存機能が壊れていない

## 🔒 変更禁止事項

### 以下のファイルは動作実績があるため変更禁止
- `electron/services/domain/UnifiedPipelineService.ts`の核心部分
- `electron/services/domain/SentenceCombiner.ts`
- `electron/services/adapters/DeepgramStreamAdapter.ts`
- `electron/services/adapters/OpenAIAdapter.ts`のAPIコール部分

### 以下の設定は最適化済みのため変更禁止
- StreamCoalescerのデバウンス設定（160ms/1100ms）
- Deepgramのendpointing設定（800ms）
- 翻訳モデルの選択（gpt-5-nano/gpt-5-mini）

## 💡 開発のヒント

1. 問題が起きたらまず`CRITICAL-FACTS-FOR-NEW-SESSION.md`を確認
2. ドキュメントの記載と実装が矛盾する場合、実装を信じる
3. Setup画面で問題が起きたら`%APPDATA%\univoice`を削除
4. 型エラーが出たら`npm run sync-contracts`を実行