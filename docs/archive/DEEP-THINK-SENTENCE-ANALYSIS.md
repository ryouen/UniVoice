# /DEEP-THINK: 文単位履歴システムの詳細分析

## 1. 現在のシステムフロー

```
Deepgram → セグメント（0.8秒区切り）
    ↓
TranslationQueueManager（最大3並列）
    ↓
executeTranslation（Responses API）
    ↓
リアルタイム表示 + 履歴追加
```

## 2. 提案する新システム

```
Deepgram → セグメント（0.8秒区切り）
    ↓
    ├→ リアルタイム翻訳（現状維持）priority: 'normal'
    │   └→ 即座に表示
    │
    └→ SentenceCombiner（新規）
        ↓ （文の境界で結合）
        ↓
        履歴用高品質翻訳 priority: 'low'
        └→ 履歴を更新
```

## 3. リアルタイム翻訳を妨げない設計

### 3.1 優先度による制御
```typescript
// リアルタイム翻訳（既存）
await this.translationQueue.enqueue({
  segmentId,
  originalText: text,
  priority: 'normal',  // 通常優先度
  // ...
});

// 履歴用翻訳（新規）
await this.translationQueue.enqueue({
  segmentId: `history_${combinedId}`,
  originalText: combinedText,
  priority: 'low',     // 低優先度
  // ...
});
```

### 3.2 別々のハンドラーで処理
```typescript
// TranslationQueueManagerのハンドラー内で分岐
if (queuedTranslation.segmentId.startsWith('history_')) {
  return this.executeHistoryTranslation(queuedTranslation);
} else {
  return this.executeTranslation(queuedTranslation);
}
```

## 4. 文境界の判定ロジック

### 4.1 確実な文末パターン
```typescript
const sentenceEndPatterns = [
  // 日本語
  /[。．]\s*$/,           // 句点
  /[！？]\s*$/,           // 感嘆符・疑問符
  
  // 英語
  /\.\s+[A-Z]/,          // ピリオド + 大文字
  /[.!?]\s*$/,           // 文末記号
  
  // 追加条件
  /\.\)?\s*$/,           // 括弧付きピリオド
];
```

### 4.2 タイムアウトによる強制区切り
- 最後のセグメントから2秒経過
- 最大5セグメントで強制結合

## 5. Response API使用の維持

```typescript
// 既存のexecuteTranslationと同じパターン
const stream = await this.openai.responses.create({
  model: 'gpt-5-mini',  // 履歴用は高品質モデル
  input: [
    { role: 'system', content: historyTranslationPrompt },
    { role: 'user', content: combinedText }
  ],
  max_output_tokens: 2000,
  reasoning: { effort: 'low' },  // 履歴用は少し推論を強化
  stream: true
});
```

## 6. リスク軽減策

### 6.1 キュー圧迫の防止
- 履歴翻訳は最大1つまで同時実行
- キューサイズが50%を超えたら履歴翻訳を一時停止

### 6.2 メモリ管理
- SentenceCombinerは最大10セグメントまで保持
- 古いセグメントは自動破棄

### 6.3 エラーハンドリング
- 履歴翻訳の失敗はリアルタイム翻訳に影響しない
- 失敗時は元のセグメント翻訳を使用

## 7. 実装の段階的アプローチ

1. **Phase 1**: SentenceCombinerの実装とテスト
2. **Phase 2**: 低優先度キューイングの実装
3. **Phase 3**: 履歴更新UIの調整
4. **Phase 4**: パフォーマンス最適化

## 結論

この設計により：
- ✅ 既存のリアルタイム翻訳は影響を受けない
- ✅ Response APIの使用方法は変更なし
- ✅ 優先度制御で干渉を防ぐ
- ✅ 段階的な実装でリスクを最小化