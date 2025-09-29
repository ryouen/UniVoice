# UnifiedPipelineService.ts 分析 (0-300行)

## ファイル概要
- Pure Domain Service として ASR/翻訳パイプラインを管理
- UI依存を排除し、イベント駆動アーキテクチャを採用

## インポートと削除された機能 (1-45行)
### 削除/無効化された機能
- **SegmentManager**: 完全に削除（翻訳の重複トリガーの原因だった）
- **ParagraphBuilder**: 一時的に無効化（フロントエンドでのグループ化を優先）
- **Shadow Mode**: 実装未完成でコメントアウト

### アクティブなインポート
- DeepgramStreamAdapter: 音声認識アダプター
- OpenAI: 翻訳API
- 各種イベントクリエーター（contracts.tsから）
- LanguageConfig関連
- TranslationQueueManager, SentenceCombiner

## 型定義 (48-115行)
### Configuration Interfaces
- **AudioConfig**: frameMs, frameSize, sampleRate
- **DeepgramConfig**: apiKey, model, interim設定など
- **OpenAIConfig**: 各種モデル設定とトークン上限

### Domain Models
- **TranscriptSegment**: 音声認識結果の型
- **Translation**: sourceText/targetText を使用（✅ original/translationではない）
- **Summary**: 要約データの型

## クラス定義 (118-155行)
### フィールド
- 設定系: audioConfig, deepgramConfig, openaiConfig
- サービス系: deepgramAdapter, openai, translationQueue, sentenceCombiner
- 状態管理: stateManager, sourceLanguage, targetLanguage
- データ保存: transcriptSegments[], translations[], summaries[]

### リファクタリング候補 ⚠️
- フィールドが多い（責務が多い可能性）

## コンストラクタ (157-268行)
### 初期化処理
1. 設定の保存
2. StateManagerの初期化
3. OpenAIクライアントの初期化
4. TranslationQueueManagerの設定
   - 履歴翻訳とリアルタイム翻訳の分岐処理を設定
5. SentenceCombinerの初期化
   - minSegments: 1（短い文も履歴に含める）

### リファクタリング候補 ⚠️
- コンストラクタが長い（111行）
- 初期化ロジックを別メソッドに切り出すべき

## startListening メソッド開始部分 (273-300行)
### 処理内容
1. 現在の状態チェック（idleでなければエラー）
2. Deepgramサポート言語の検証
3. 状態を'starting'に変更
4. 各種フィールドの設定
5. 言語設定のログ出力

### 注意点
- 言語が同じ場合の処理は後続で実装されている可能性

## 主要な発見事項
1. **命名規則**: Translation型は sourceText/targetText を正しく使用している
2. **削除された機能**: SegmentManager, ParagraphBuilder は意図的に削除/無効化
3. **責務の大きさ**: クラスが多くの責務を持っている可能性

## 依存関係の注意点
- TranslationQueueManagerのハンドラー設定でthisを参照
- SentenceCombinerのコールバックでthisを参照
- イベントエミッターとして多数のイベントを発行