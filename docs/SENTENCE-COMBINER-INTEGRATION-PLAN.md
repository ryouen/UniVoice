# SentenceCombiner統合実装計画書

**作成日**: 2025-08-30  
**作成者**: Claude Code (シニアエンジニア視点)  
**推定作業時間**: 4-6時間  
**リスクレベル**: 中（既存機能への影響あり）

## 🎯 実装目標

0.8秒のDeepgramセグメントを2-3文の意味単位に結合し、高品質翻訳を適用する履歴システムを完成させる。

## 📋 実装フェーズと優先順位

### 🔴 Phase 0: 準備と現状保全（30分）

#### 0-1. 現在の動作ログ収集 ⭐️ 最優先
```bash
# 現在の動作を記録（比較用）
npm run electron > logs/before-integration-$(date +%Y%m%d-%H%M%S).log 2>&1
```
- 現在の履歴表示をスクリーンショット
- 「翻訳中...」の状態を記録
- セグメント分割の様子を記録

#### 0-2. バックアップ作成
```bash
# 関連ファイルのバックアップ
cp electron/services/domain/UnifiedPipelineService.ts backup/
cp src/hooks/useUnifiedPipeline.ts backup/
cp electron/main.ts backup/
```

#### 0-3. デバッグログポイント設計
- SentenceCombiner呼び出し箇所
- CombinedSentenceEvent発行箇所
- segmentToCombinedMap更新箇所
- 高品質翻訳適用箇所

### 🟠 Phase 1: SentenceCombiner統合（1時間）

#### 1-1. UnifiedPipelineServiceへの統合
```typescript
// UnifiedPipelineService.ts
import { SentenceCombiner } from './SentenceCombiner';

class UnifiedPipelineService {
  private sentenceCombiner: SentenceCombiner;
  
  constructor() {
    // 既存のコード...
    this.sentenceCombiner = new SentenceCombiner();
    this.logger.info('SentenceCombiner initialized'); // 🔍 確認ポイント
  }
}
```

#### 1-2. handleSegmentへの組み込み
```typescript
private handleSegment(segment: Segment): void {
  // 既存の処理...
  
  // 🔍 確認ポイント: セグメントがSentenceCombinerに渡される
  this.logger.info('[SentenceCombiner] Adding segment:', {
    id: segment.id,
    text: segment.text.substring(0, 50),
    isFinal: segment.isFinal
  });
  
  const combinedSentence = this.sentenceCombiner.addSegment(segment);
  
  if (combinedSentence) {
    // 🔍 確認ポイント: 文が結合された
    this.logger.info('[SentenceCombiner] Sentence combined:', {
      id: combinedSentence.id,
      segmentCount: combinedSentence.segmentIds.length,
      text: combinedSentence.originalText.substring(0, 100)
    });
    
    this.handleCombinedSentence(combinedSentence);
  }
}
```

#### 1-3. 動作確認チェックリスト
- [ ] アプリが起動する
- [ ] SentenceCombiner初期化ログが出る
- [ ] セグメント追加ログが出る
- [ ] 文結合ログが出る（2-3セグメント後）

### 🟡 Phase 2: イベントフロー接続（1時間）

#### 2-1. CombinedSentenceEvent発行の有効化
```typescript
private handleCombinedSentence(combinedSentence: CombinedSentence): void {
  // 🔍 確認ポイント: イベント発行
  this.logger.info('[Event] Emitting CombinedSentenceEvent:', {
    combinedId: combinedSentence.id,
    segmentIds: combinedSentence.segmentIds
  });
  
  // 既存のコード（コメントアウトを解除）
  this.emitEvent(createCombinedSentenceEvent({
    combinedId: combinedSentence.id,
    segmentIds: combinedSentence.segmentIds,
    originalText: combinedSentence.originalText,
    timestamp: combinedSentence.timestamp,
    endTimestamp: combinedSentence.endTimestamp,
    segmentCount: combinedSentence.segmentCount,
  }, this.currentCorrelationId || 'unknown'));
  
  // 履歴翻訳実行
  this.executeHistoryTranslation(combinedSentence);
}
```

#### 2-2. フロントエンド受信確認
```typescript
// useUnifiedPipeline.ts
case 'combinedSentence':
  console.log('🔍 [Frontend] CombinedSentence received:', {
    combinedId: event.data.combinedId,
    segmentCount: event.data.segmentIds.length,
    mapSizeBefore: segmentToCombinedMap.current.size
  });
  
  // マッピング更新
  event.data.segmentIds.forEach((segmentId: string) => {
    segmentToCombinedMap.current.set(segmentId, event.data.combinedId);
  });
  
  console.log('🔍 [Frontend] Map updated:', {
    mapSizeAfter: segmentToCombinedMap.current.size
  });
  break;
```

#### 2-3. 動作確認チェックリスト
- [ ] CombinedSentenceEventがバックエンドで発行される
- [ ] フロントエンドで受信される
- [ ] segmentToCombinedMapが更新される
- [ ] マップサイズが増加する

### 🟢 Phase 3: 高品質翻訳の適用（1時間）

#### 3-1. 履歴翻訳の動作確認
```typescript
// useUnifiedPipeline.ts - history_翻訳処理
if (event.data.segmentId && event.data.segmentId.startsWith('history_')) {
  console.log('🔍 [History Translation] Received:', {
    historySegmentId: event.data.segmentId,
    originalSegmentId,
    mapSize: segmentToCombinedMap.current.size,
    hasCombinedId: segmentToCombinedMap.current.has(originalSegmentId)
  });
  
  const combinedId = segmentToCombinedMap.current.get(originalSegmentId) || originalSegmentId;
  
  console.log('🔍 [History Translation] Applying to:', {
    combinedId,
    translationPreview: translationText?.substring(0, 50)
  });
}
```

#### 3-2. 履歴更新の確認
```typescript
// 履歴ブロック更新時のログ
setHistoryBlocks(prevBlocks => {
  console.log('🔍 [History Update] Before:', {
    blockCount: prevBlocks.length,
    totalSentences: prevBlocks.reduce((sum, b) => sum + b.sentences.length, 0)
  });
  
  const updated = /* 更新ロジック */;
  
  console.log('🔍 [History Update] After:', {
    updatedCount: /* 更新された数 */
  });
  
  return updated;
});
```

#### 3-3. 動作確認チェックリスト
- [ ] history_プレフィックス付き翻訳が到着
- [ ] combinedIdが正しく解決される
- [ ] 履歴ブロックが更新される
- [ ] 「翻訳中...」が翻訳テキストに置き換わる

### 🔵 Phase 4: UI表示確認と調整（30分）

#### 4-1. 表示確認項目
- [ ] 2-3文単位でグループ化されている
- [ ] 「翻訳中...」が消えている
- [ ] 重複表示がない
- [ ] 文の区切りが自然

#### 4-2. デバッグ情報の追加（一時的）
```typescript
// UniVoice.tsx - HistorySection
{historyBlocks.map((block, index) => (
  <div key={block.id}>
    {/* デバッグ情報 */}
    <div style={{ fontSize: '10px', color: '#666' }}>
      Block {index + 1} | Sentences: {block.sentences.length} | 
      IDs: {block.sentences.map(s => s.id).join(', ')}
    </div>
    {/* 既存の表示 */}
  </div>
))}
```

### ⚫️ Phase 5: 統合テストと最終確認（1時間）

#### 5-1. E2Eテストシナリオ
```javascript
// tests/integration/test-sentence-combiner-e2e.js
describe('SentenceCombiner E2E', () => {
  it('should combine segments and apply high-quality translation', async () => {
    // 1. アプリ起動
    // 2. 録音開始
    // 3. 3-5文の音声を流す
    // 4. 履歴確認
    // 5. 高品質翻訳の適用確認
  });
});
```

#### 5-2. パフォーマンス確認
- [ ] CPU使用率が異常でない
- [ ] メモリリークがない
- [ ] UIの更新頻度が適切

#### 5-3. ロールバック準備
```bash
# 問題があった場合の復元手順
cp backup/*.ts electron/services/domain/
cp backup/useUnifiedPipeline.ts src/hooks/
npm run build
```

## 🚨 リスクと対策

### リスク1: 既存の翻訳が動作しなくなる
**対策**: 各フェーズで基本機能の動作確認を必須とする

### リスク2: パフォーマンス劣化
**対策**: 文結合のタイムアウトを適切に設定（2秒）

### リスク3: メモリリーク
**対策**: SentenceCombinerの古いセグメント削除を確認

## 📊 成功基準

1. **機能面**
   - 2-3文単位の履歴表示
   - 高品質翻訳の適用
   - 「翻訳中...」の解消

2. **性能面**
   - 既存の翻訳速度を維持
   - メモリ使用量の増加が10%以内

3. **品質面**
   - エラーログなし
   - 全テストケースがパス

## 🔄 実装順序の根拠

1. **Phase 0を最初に**: 現状保全とロールバック可能性の確保
2. **Phase 1-3を順番に**: 依存関係に従った実装
3. **各フェーズで確認**: 問題の早期発見
4. **Phase 5で総合確認**: 全体の動作保証

この計画により、**リスクを最小化しながら確実に実装**を進めることができます。