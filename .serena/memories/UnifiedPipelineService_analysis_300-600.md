# UnifiedPipelineService.ts 分析 (300-600行)

## startListening メソッド完了部分 (300-321行)
### 処理フロー
1. `connectToDeepgram()` を呼び出し
2. 成功時: 'listening' 状態に遷移
3. エラー時: 'error' 状態に遷移してエラーイベント発行

### 注意点
- AdvancedFeatureServiceの開始はmain.tsで処理される（分離されている）

## stopListening メソッド (326-372行)
### 処理フロー
1. 既に'idle'ならリターン
2. 'stopping'状態に遷移
3. `sentenceCombiner.forceEmit()` で残りセグメントを処理
4. DeepgramAdapterの切断と破棄
5. 'idle'状態に戻してcorrelationIdをクリア
6. ログ出力（処理統計を含む）

### 削除された処理
- SegmentManager.forceEmitAll() - 削除済み
- ParagraphBuilder.flush() - 無効化

### リファクタリング候補 ⚠️
- エラーハンドリングが他メソッドと重複

## updateLanguages メソッド (377-420行)
### 機能
- 実行中の言語設定を動的に変更
- listening中の場合は自動で再起動

### 処理フロー
1. 言語が変更されていなければスキップ
2. 現在の状態を保存
3. 言語を更新
4. listening中なら停止→500ms待機→再起動

### 注意点
- エラー時はthrowしない（ユーザーに手動再起動を委ねる）
- 43行と長い - 再起動ロジックの切り出し候補

## pauseListening メソッド (425-449行)
### 処理内容
- StateManagerを通じて一時停止
- 成功時はstatusイベント（'paused'）を発行
- boolean返却（成功/失敗）

## resumeListening メソッド (454-478行)
### 処理内容
- pauseListeningと対称的な実装
- 'paused' → 'listening' への遷移
- statusイベント発行

## getState メソッド (483-501行)
### 返却内容
- state: PipelineStateManagerから取得
- sourceLanguage/targetLanguage: 現在の言語設定
- segmentCount/translationCount/summaryCount: 処理済みデータ数
- uptime: 実行時間

## sendAudioChunk メソッド (506-538行)
### 処理内容
- 音声データをDeepgramに送信
- 'listening'状態でのみ送信
- 'paused'状態では送信をスキップ
- 50フレームごとにデバッグログ出力

### 注意点
- audioFrameCountでフレーム数をカウント
- エラー時はログ出力のみ（throwしない）

## clearHistory メソッド (543-551行)
### 処理内容
- transcriptSegments, translations, summaries を空配列に
- SegmentManager.resetAll() は削除済み

## getMetrics メソッド (556-567行)
### 返却内容
- pipeline: getState()の結果
- performance: 開始時間、最終アクティビティ、稼働時間

### 削除された内容
- segmentManager.getMetrics() - SegmentManager削除に伴い

## setupSegmentManager（コメントアウト）(572-596行)
### 削除理由
- 翻訳の重複トリガーの原因
- UniVoice 1.0には存在しない機能
- SegmentManager自体が削除されている

## 主要な発見事項
1. **エラーハンドリングパターン**: 各メソッドで似たようなtry-catchパターン
2. **状態管理**: PipelineStateManagerを通じた一元管理
3. **削除された機能**: SegmentManager関連が完全に除去されている

## 依存関係の注意点
- DeepgramAdapterの生存期間管理
- SentenceCombinerへの依存（forceEmit）
- StateManagerを通じた状態遷移の制御

## リファクタリング提案
1. エラーハンドリングの共通化
2. updateLanguagesメソッドの分割（再起動ロジックの切り出し）
3. 定数の外出し（50フレーム、500ms待機など）