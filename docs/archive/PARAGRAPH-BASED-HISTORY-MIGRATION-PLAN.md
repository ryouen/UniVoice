# パラグラフベース履歴表示への移行設計書

## 作成日: 2025-09-02
## 作成者: Claude Code (/DEEP-THINK mode)

## 1. 背景と目的

### 現状の課題
- 現在の履歴表示は**文単位（2-3セグメント、約2-3秒）**で細かく区切られている
- ユーザーの要望：「全文履歴では、細かく現在のチャンクのように区切られている必要はなく、むしろいわゆる英文の１～２パラグラフ単位で英文をきれいに出し直し」
- 短い文の断片が多く、読みにくい

### 目的
- 履歴表示を**パラグラフ単位（30-60秒、約100-300語）**に変更
- より自然で読みやすい履歴表示の実現
- 高品質翻訳もパラグラフ単位で行うことで、文脈を考慮した自然な翻訳

## 2. 現在のアーキテクチャ分析

### 2.1 データフロー
```
Deepgramセグメント (0.8秒)
    ↓
UnifiedPipelineService.processTranscriptSegment()
    ├─→ リアルタイム翻訳（即座表示用）
    └─→ SentenceCombiner.addSegment()
           ↓ (2-3セグメント結合)
         handleCombinedSentence()
           ↓
         CombinedSentenceEvent発行
           ↓
         履歴用高品質翻訳キュー
```

### 2.2 関連ファイルと依存関係
- **UnifiedPipelineService.ts**
  - 196-203行: SentenceCombiner初期化
  - 644行: sentenceCombiner.addSegment()
  - 1064-1107行: handleCombinedSentence()
  
- **useUnifiedPipeline.ts**
  - CombinedSentenceEventの受信と処理
  - FlexibleHistoryGrouperへの文追加
  
- **FlexibleHistoryGrouper.ts**
  - 3-5文を1ブロックとして表示管理

## 3. 移行設計

### 3.1 アーキテクチャ方針
**段階的移行アプローチ**を採用し、既存機能を維持しながら新機能を追加

#### Phase 1: 並列実装（推奨）
- SentenceCombinerは**維持**（リアルタイム翻訳の即座表示用）
- ParagraphBuilderを**追加**（履歴表示用）
- 両方が独立して動作

#### Phase 2: 完全移行（将来）
- SentenceCombinerを廃止
- ParagraphBuilderのみで運用

### 3.2 新しいデータフロー（Phase 1）
```
Deepgramセグメント (0.8秒)
    ↓
UnifiedPipelineService.processTranscriptSegment()
    ├─→ リアルタイム翻訳（即座表示用）
    ├─→ SentenceCombiner.addSegment() [既存維持]
    │      ↓
    │    即座の翻訳表示用
    │
    └─→ ParagraphBuilder.addSegment() [新規追加]
           ↓ (30-60秒結合)
         handleParagraphComplete()
           ↓
         ParagraphCompleteEvent発行
           ↓
         パラグラフ単位高品質翻訳
           ↓
         履歴表示
```

## 4. 実装詳細

### 4.1 新規追加コンポーネント

#### 4.1.1 ParagraphCompleteEvent（contracts.ts）
```typescript
export const ParagraphCompleteEventSchema = z.object({
  type: z.literal('paragraphComplete'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    paragraphId: z.string(),
    segmentIds: z.array(z.string()),
    rawText: z.string(),
    cleanedText: z.string().optional(),
    startTime: z.number(),
    endTime: z.number(),
    duration: z.number(),
    wordCount: z.number(),
  }),
});
```

#### 4.1.2 UnifiedPipelineServiceの変更
```typescript
// プロパティ追加
private paragraphBuilder: ParagraphBuilder;

// コンストラクタでの初期化
this.paragraphBuilder = new ParagraphBuilder(
  (paragraph) => this.handleParagraphComplete(paragraph),
  {
    minDurationMs: 20000,    // 20秒
    maxDurationMs: 60000,    // 60秒  
    silenceThresholdMs: 2000 // 2秒
  }
);

// processTranscriptSegmentの変更
private processTranscriptSegment(segment: TranscriptSegment): void {
  if (segment.isFinal) {
    // 既存処理
    this.sentenceCombiner.addSegment(segment);
    
    // 新規追加
    this.paragraphBuilder.addSegment(segment);
  }
}

// 新規メソッド
private async handleParagraphComplete(paragraph: Paragraph): Promise<void> {
  // テキストクリーン化
  paragraph.cleanedText = ParagraphBuilder.cleanText(paragraph.rawText);
  
  // イベント発行
  this.emitEvent(createParagraphCompleteEvent({...}, correlationId));
  
  // 高品質翻訳キューに追加
  await this.translationQueue.enqueue({
    segmentId: `paragraph_${paragraph.id}`,
    originalText: paragraph.cleanedText,
    priority: 'low'
  });
}
```

### 4.2 フロントエンドの変更

#### 4.2.1 useUnifiedPipelineの変更
- ParagraphCompleteEventの受信処理追加
- パラグラフ単位での履歴追加

#### 4.2.2 FlexibleHistoryGrouperの変更案

**オプション1: 最小限の変更**
- 既存のaddSentence()を使い、パラグラフ全体を1つの「文」として追加
- 利点：変更が最小限
- 欠点：意味的に正しくない

**オプション2: パラグラフ対応（推奨）**
- addParagraph()メソッドを新規追加
- パラグラフを適切な単位で表示
- 利点：意味的に正しく、拡張性が高い

## 5. 移行手順

### Step 1: 型定義の追加
1. ParagraphCompleteEventSchemaをcontracts.tsに追加
2. createParagraphCompleteEvent関数の追加

### Step 2: バックエンドの実装
1. UnifiedPipelineServiceにParagraphBuilder統合
2. handleParagraphCompleteメソッドの実装
3. 高品質翻訳のパラグラフ対応

### Step 3: フロントエンドの実装
1. useUnifiedPipelineでParagraphCompleteEvent受信
2. FlexibleHistoryGrouperのパラグラフ対応
3. 表示UIの調整

### Step 4: テストと調整
1. 20-60秒のパラグラフが適切に形成されるか確認
2. 翻訳品質の確認
3. パフォーマンスの検証

## 6. リスクと対策

### 6.1 リスク
1. **遅延の増加**: パラグラフ完成まで20-60秒待つ必要がある
2. **メモリ使用量**: より長いテキストを保持
3. **複雑性の増加**: 2つのシステムが並列動作

### 6.2 対策
1. **リアルタイム表示は維持**: SentenceCombinerで即座フィードバック
2. **適切なクリーンアップ**: 処理済みパラグラフの削除
3. **段階的移行**: まず並列実装でテスト、安定後に統合

## 7. 成功基準

1. **ユーザー体験**
   - 履歴が30-60秒のまとまった単位で表示される
   - テキストがクリーンで読みやすい
   - 高品質翻訳が文脈を考慮している

2. **パフォーマンス**
   - リアルタイム表示の遅延が増加しない
   - メモリリークが発生しない
   - 180分のセッションでも安定動作

3. **保守性**
   - コードが理解しやすい
   - テストが容易
   - 将来の拡張が可能

## 8. 次のステップ

1. この設計書のレビューと承認
2. ParagraphCompleteEventの型定義実装
3. UnifiedPipelineServiceへのParagraphBuilder統合
4. フロントエンドの対応実装
5. 統合テストの実施

---

この設計書は、ユーザーの要望である「1-2パラグラフ単位での履歴表示」を実現するための包括的な計画です。段階的な移行により、リスクを最小限に抑えながら、より良いユーザー体験を提供できます。