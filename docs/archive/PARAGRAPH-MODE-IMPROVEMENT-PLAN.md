# パラグラフモード改善計画

## 作成日: 2025-09-10
## 作成者: Claude Code

## 現状の問題

1. **履歴表示が細切れ**
   - 1-2文程度しか表示されない
   - 表示エリアが有効活用されていない
   - ユーザーが文脈を把握しにくい

2. **技術的な原因**
   - SentenceCombinerが0.8-8秒単位で文を結合
   - 文末パターン（。！？.!?）で即座に文として完成
   - FlexibleHistoryGrouperは3-5文でグループ化するが、各文が短い

3. **実装の不整合**
   - ParagraphBuilderは実装されているが無効化されている
   - MDドキュメントと実際のコードが乖離している

## 改善案

### 案1: ParagraphBuilderの再有効化（推奨）

**メリット**
- 既に実装済みのコードを活用できる
- 30-90秒の自然な単位でパラグラフを形成
- 話題の転換を検出して適切に区切る

**実装手順**
1. UnifiedPipelineServiceでParagraphBuilderのコメントを解除
2. useUnifiedPipeline.tsでparagraphCompleteイベントの処理を有効化
3. combinedSentenceイベントの処理を無効化（重複を防ぐ）

**設定調整**
```typescript
this.paragraphBuilder = new ParagraphBuilder(
  (paragraph) => this.handleParagraphComplete(paragraph),
  {
    minDurationMs: 30000,    // 30秒（より長い単位に）
    maxDurationMs: 90000,    // 90秒
    silenceThresholdMs: 3000 // 3秒（話題の区切りを検出）
  }
);
```

### 案2: SentenceCombinerの設定調整

**メリット**
- 既存の実装を維持したまま改善
- 段階的な変更が可能
- リスクが低い

**実装手順**
1. minSegmentsを3-5に増加
2. maxSegmentsを20-30に増加
3. timeoutMsを5000msに延長

```typescript
this.sentenceCombiner = new SentenceCombiner(
  (combinedSentence) => this.handleCombinedSentence(combinedSentence),
  {
    maxSegments: 25,    // 20秒相当
    timeoutMs: 5000,    // 5秒
    minSegments: 3      // 最低2.4秒
  }
);
```

### 案3: FlexibleHistoryGrouperの設定調整（即効性あり）

**メリット**
- フロントエンドのみの変更で完結
- すぐに実装可能
- 既存のデータとの互換性維持

**実装手順**
```typescript
// FlexibleHistoryGrouper.ts
private minSentencesPerBlock = 5;  // 3から増加
private maxSentencesPerBlock = 10; // 5から増加

// 自然な区切りの判定を緩和
private isNaturalBreakPoint(): boolean {
  // ... 
  // 時間的な区切りを5秒に延長
  hasTimePause = lastItem.timestamp - previousItem.timestamp > 5000;
  // ...
}
```

## 推奨実装順序

### Phase 1: 即時改善（1日）
- FlexibleHistoryGrouperの設定調整（案3）
- 効果を確認

### Phase 2: 中期改善（3日）
- SentenceCombinerの設定調整（案2）
- 既存のcombinedSentenceイベントを活用

### Phase 3: 最終改善（5日）
- ParagraphBuilderの再有効化（案1）
- より自然なパラグラフ単位の実現
- ユーザー設定で切り替え可能に

## テスト計画

1. **短い発話テスト**
   - 10秒、30秒、60秒の発話で適切にグループ化されるか
   - 文の区切りが自然か

2. **長い発話テスト**
   - 5分以上の連続発話で適切に分割されるか
   - メモリ使用量が適切か

3. **混合テスト**
   - 短い発話と長い発話が混在する場合
   - 話題の転換が適切に検出されるか

## 期待される効果

- 履歴表示が3-5倍長くなり、文脈が把握しやすくなる
- 表示エリアが有効活用される
- ユーザーエクスペリエンスの向上
- 翻訳コストの削減（まとめて翻訳）

## リスクと対策

1. **翻訳の遅延**
   - 対策: リアルタイム翻訳は維持し、履歴用高品質翻訳のみ遅延

2. **メモリ使用量の増加**
   - 対策: 古いパラグラフの定期的なクリーンアップ

3. **既存データとの互換性**
   - 対策: 移行期間を設け、両方の形式をサポート

## 結論

即時改善としてFlexibleHistoryGrouperの設定調整を行い、中期的にはSentenceCombinerとParagraphBuilderの調整を行うことで、より読みやすい履歴表示を実現できます。