# UnifiedPipelineService.ts 分析 (900-1200行)

## executeTranslation メソッド完了部分 (900-969行)
### Shadow Mode実装
- 918-938行: Shadow Modeを本番として使用する処理（コメントアウト）
- 環境変数USE_SHADOW_AS_PRIMARYで制御予定

### エラーハンドリング (943-969行)
- 詳細なエラーログ出力
- createErrorEventでエラーイベント発行
- エラーは再throwして呼び出し元（TranslationQueue）に処理を委譲

## ユーティリティメソッド群 (973-1016行)

### setState メソッド (973-994行)
- PipelineStateManagerを通じて状態遷移
- 状態変更時にstatusイベントを発行
- 前後の状態とcorrelationIdをログ

### emitEvent メソッド (999-1001行)
- シンプルなイベント発行ラッパー
- 'pipelineEvent'として発行

### emitError メソッド (1006-1016行)
- エラー専用のイベント発行
- recoverableフラグ（true固定）
- 現在の状態とタイムスタンプを含む

## 廃止予定メソッド (1021-1037行)

### generateVocabulary (1023-1027行)
- @deprecated マーク付き
- AdvancedFeatureServiceから呼ぶべき
- vocabularyRequestedイベントを発行するだけ

### generateFinalReport (1033-1037行)
- @deprecated マーク付き
- AdvancedFeatureServiceから呼ぶべき
- finalReportRequestedイベントを発行するだけ

## handleCombinedSentence メソッド (1043-1090行)
### 機能
- SentenceCombinerからのコールバック
- 結合された文を履歴用高品質翻訳として処理

### 処理フロー
1. CombinedSentenceEventをフロントエンドに送信
2. 履歴用翻訳を低優先度でキューに追加
   - segmentId: `history_${combinedId}`形式
   - priority: 'low'

### エラーハンドリング
- 履歴翻訳の失敗はエラーを握りつぶす（リアルタイム翻訳優先）

## handleParagraphComplete メソッド（コメントアウト）(1095-1161行)
### 状態
- 完全にコメントアウト（無効化）
- ParagraphBuilderは一時的に無効化中

### 本来の機能
- パラグラフ単位の履歴処理
- 20-60秒の音声をまとめて翻訳

## handleTranscriptSegment メソッド開始 (1167-1200行)
### 機能
- DeepgramからのTranscriptResult処理
- ASRイベントとSentenceCombinerへの転送

### 処理フロー（続きは1200行以降）
1. finalならデバッグログ出力
2. transcriptSegments配列に保存
3. ASRイベント発行
4. finalならSentenceCombinerに追加

## 主要な発見事項
1. **廃止予定メソッド**: vocabulary/report生成はAdvancedFeatureServiceへ
2. **ParagraphBuilder無効化**: 意図的に使用停止中
3. **優先度制御**: 履歴翻訳は低優先度で実行
4. **エラーハンドリング**: 履歴処理のエラーは握りつぶす設計

## リファクタリング候補
1. 廃止予定メソッドの削除
2. Shadow Mode関連コードの整理（削除 or 実装）
3. エラーハンドリングの一元化