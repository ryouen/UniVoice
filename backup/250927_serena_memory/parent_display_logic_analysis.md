# 親プロジェクト表示ロジック分析

## RealtimeDisplayManagerの重要な実装詳細

### 1. 3行表示の仕組み
- 最大3セグメントを同時表示
- 新しいセグメントが来ると古いものから順にフェードアウト
- 透明度による視覚的な階層表現（1.0 → 0.6 → 0.3）

### 2. 類似度判定アルゴリズム
```javascript
// 冒頭単語の一致を重視
- 冒頭3単語以上一致 → 95%類似（継続とみなす）
- 冒頭2単語一致 → 90%類似
- 冒頭1単語のみ一致 → 70%類似
- 70%以上で同じセグメントを更新
```

### 3. Final/Interim結果の処理
- Deepgramのis_finalフラグで判断
- Final結果は必ず新しいセグメントとして扱う
- Interim結果は既存セグメントを更新
- Final結果がある場合、Interim結果で上書きしない

### 4. 翻訳との左右対応
- 原文がFinalになったセグメントのみ翻訳可能
- pairIndexで左右の対応関係を管理
- 翻訳開始後1.5秒は表示を維持

### 5. タイミング制御
- minDisplayTimeMs: 1500ms（最小表示時間）
- translationDisplayTimeMs: 1500ms（翻訳表示後の維持時間）
- fadeInDurationMs: 200ms（フェードイン）
- fadeOutDurationMs: 300ms（フェードアウト）
- updateTimer: 50ms間隔で表示状態を更新

## max_tokensエラーの修正方法

### 問題の箇所
```javascript
// 親プロジェクトの誤った実装
await openai.chat.completions.create({
  model: 'gpt-5-nano',
  messages: [...],
  max_tokens: 256  // ❌ エラー
});
```

### 正しい実装
```javascript
// GPT-5モデルでの正しい実装
await openai.chat.completions.create({
  model: 'gpt-5-nano',
  messages: [...],
  max_completion_tokens: 256  // ✅ 正しい
});
```

## UniVoice 2.0への適用方針

1. **RealtimeDisplayManagerをそのまま活用**
   - すでにUniVoice/src/utils/RealtimeDisplayManager.tsに移植済み
   - 親プロジェクトとほぼ同じ実装

2. **モックデータの除去と実データ接続**
   - UniVoicePerfect.tsxの18箇所のモックデータを実データに置換
   - useUnifiedPipelineフックからのデータをRealtimeDisplayManagerに流す

3. **max_tokensの修正**
   - UnifiedPipelineService内のOpenAI呼び出しを全て修正
   - max_tokens → max_completion_tokens に変更