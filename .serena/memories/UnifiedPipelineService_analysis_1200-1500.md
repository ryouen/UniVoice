# UnifiedPipelineService.ts 分析 (1200-1500行)

## handleTranscriptSegment メソッド完了部分 (1200-1228行)
### 処理内容
1. finalセグメントをSentenceCombinerに追加
   - startMs/endMsも含めて渡す
2. finalかつテキストありなら翻訳キューに追加
   - priority: 'normal'（リアルタイム翻訳）
   - sourceLanguage/targetLanguageを含む

### エラーハンドリング
- エラーを握りつぶして処理を継続
- ログ出力のみ行う

## executeHistoryTranslation メソッド (1234-1367行)
### 概要
- 履歴用の高品質翻訳を実行
- history_またはparagraph_プレフィックスの処理

### 処理フロー
1. **プレフィックス処理** (1236-1239行)
   - history_/paragraph_を削除してbaseIdを取得
   
2. **同一言語チェック** (1242-1262行)
   - 同一言語なら原文をそのまま使用
   - translationイベント発行（✅ 正しくcreateTranslationEventを使用）

3. **翻訳プロンプト生成** (1272-1285行)
   - SUPPORTED_LANGUAGESから言語名を取得
   - 英語で詳細な翻訳指示を記述
   - 学術講義向けの専門的な翻訳

4. **高品質翻訳実行** (1288-1304行)
   - model: openaiConfig.models.summary（gpt-5-mini）
   - max_output_tokens: 2000
   - reasoning.effort: 'low'（通常翻訳より高め）

5. **結果処理** (1320-1335行)
   - cleanTranslationOutputで思考プロセス除去
   - confidence: 0.95（高品質なので高信頼度）
   - segmentIdは元のプレフィックス付きを保持

### エラーハンドリング (1353-1366行)
- エラー時は空文字列を返す
- 警告ログのみで処理継続（履歴翻訳の失敗は致命的でない）

## Shadow Modeメソッド群 (1372-1500行)
### executeShadowModeTranslation (1376-1435行)
- 完全にコメントアウト
- 通常翻訳の比較実行用（未実装）

### executeShadowModeHistoryTranslation (1441-1495行)
- 完全にコメントアウト
- 履歴翻訳の比較実行用（未実装）
- プロンプトが日本語で記述されている（実装されていたら問題）

## 主要な発見事項
1. **Shadow Mode**: 完全に未実装（環境変数で有効化予定だった）
2. **優先度制御**: リアルタイム翻訳はnormal、履歴翻訳はlow
3. **モデル使い分け**: 
   - リアルタイム: gpt-5-nano
   - 履歴: gpt-5-mini（より高品質）
4. **エラーハンドリング**: 履歴系は全てエラーを握りつぶす設計

## リファクタリング候補
1. Shadow Mode関連コードの完全削除
2. executeHistoryTranslationの分割（134行は長い）
3. 定数の外出し（2000トークン、0.95信頼度など）