# UniVoice 2.0 機能仕様書

最終更新: 2025-08-18
作成者: Claude Code

## 概要

UniVoice 2.0 で実装された全機能の正式な仕様書です。

## 1. リアルタイム音声認識（ASR）

### 仕様
- **API**: Deepgram WebSocket API
- **モデル**: nova-3
- **パラメータ**:
  - `interim_results`: true（部分認識結果の表示）
  - `punctuate`: true（句読点の自動挿入）
  - `diarize`: true（話者分離）
  - `endpointing`: 800ms
  - `utterance_end_ms`: 1000ms

### 表示仕様
- **Interim表示**: グレー色（#666）、イタリック体、"認識中"ラベル
- **Final表示**: 黒色（#111）、通常フォント

## 2. リアルタイム翻訳

### 仕様
- **API**: OpenAI Responses API（**chat.completions.create を使用**）
  - 注：Responses API は存在しないため、実際はchat.completions.createを使用
- **モデル**: gpt-5-nano
- **最大トークン**: 1500（環境変数: OPENAI_TRANSLATE_MAX_TOKENS）
- **温度**: 削除（GPT-5では1.0固定）

### 表示仕様
- **3行表示**: RealtimeDisplayManager で管理
- **フェードイン**: 200ms
- **フェードアウト**: 300ms
- **最小表示時間**: 1500ms

## 3. 段階的要約（Progressive Summarization）

### 仕様
- **しきい値**: 400語、800語、1600語、2400語
- **モデル**: gpt-5-mini
- **最大トークン**: 1500（環境変数: OPENAI_SUMMARY_MAX_TOKENS）

### プロンプト仕様
- **400語**: 導入部分の要約（主題と初期ポイント2-3点）
- **800語**: 前半部分の要約（主要トピック3-4点）
- **1600語**: 中間まとめ（テーマ、概念、議論の流れ）
- **2400語**: 包括的まとめ（概要、論点4-6個、詳細、結論）

## 4. 定期要約（10分ごと）

### 仕様
- **間隔**: 600,000ms（10分）- 環境変数: SUMMARY_INTERVAL_MS
- **モデル**: gpt-5-mini
- **形式**: 箇条書き3-5個のポイント

## 5. 単語帳生成（Vocabulary Generation）

### 仕様
- **モデル**: gpt-5-mini
- **最大トークン**: 1500（環境変数: OPENAI_VOCAB_MAX_TOKENS）
- **出力形式**: JSON配列
- **抽出数**: 5-10個の重要用語

### データ構造
```typescript
interface VocabularyItem {
  term: string;        // 用語
  definition: string;  // 定義
  context?: string;    // 使用された文脈（オプション）
}
```

## 6. 最終レポート生成（Final Report）

### 仕様
- **モデル**: gpt-5 + reasoning.effort: "high"
- **最大トークン**: 8192（環境変数: OPENAI_REPORT_MAX_TOKENS）
- **出力形式**: Markdown

### レポート構成
1. **概要** - 講義全体の内容を2-3文で
2. **トピック一覧** - 箇条書きで主要トピック
3. **キーポイント** - 重要ポイントを3-5個
4. **重要用語** - 専門用語とその説明
5. **Q&A / ディスカッション** - もしあれば
6. **まとめ** - 学んだことの要点

## 7. 履歴表示

### 仕様
- **グループ化**: 3文ずつ
- **視覚的区切り**: 
  - 原文側: #667eea（紫）の境界線
  - 翻訳側: #0066cc（青）の境界線
- **トピックラベル**: 各グループに「トピック N」表示

## パフォーマンス基準

### 必須要件（DoD）
- **first paint ≤ 1000ms**（字幕の初期表示）
- **complete ≤ 2000ms**（翻訳完了）
- **要約 ≤ 3000ms**（セグメント要約）
- **レポート ≤ 15000ms**（最終レポート生成）

## 実装上の変更点

### APIの変更
1. **temperature パラメータの削除**
   - 理由：GPT-5では温度は1.0固定
   - 影響：全てのOpenAI API呼び出しから削除

2. **Responses API → chat.completions.create**
   - 理由：Responses APIは実在しない
   - 影響：実装では従来のchat.completions.createを使用

### 環境変数による設定
全ての重要なパラメータは環境変数で設定可能：
- `OPENAI_TRANSLATE_MAX_TOKENS`
- `OPENAI_SUMMARY_MAX_TOKENS`
- `OPENAI_VOCAB_MAX_TOKENS`
- `OPENAI_REPORT_MAX_TOKENS`
- `SUMMARY_INTERVAL_MS`
- `STREAM_COALESCER_DEBOUNCE_MS`
- `STREAM_COALESCER_FORCE_COMMIT_MS`