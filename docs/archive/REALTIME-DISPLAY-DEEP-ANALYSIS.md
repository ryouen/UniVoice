# UniVoice 3段階表示システム - 詳細技術分析

作成日: 2025-08-24  
作成者: Claude Code

## 📋 エグゼクティブサマリー

UniVoiceプロジェクトには2つの並行する表示管理システムが実装されており、それぞれ異なる設計思想と目的を持っています。

## 🏗️ アーキテクチャ概要

### 2つの表示管理システム

1. **SyncedRealtimeDisplayManager** (src/utils/)
   - 左右同期型表示管理
   - Final結果のみ表示（interim resultsを除外）
   - UniVoice 1.0との互換性重視

2. **RealtimeDisplayService** (src/domain/services/)
   - 3段階フェード表示管理
   - interim results も表示
   - UniVoice 2.0の新機能

## 📊 詳細な処理フロー

### 1. ASRイベントの受信と分岐

```typescript
// useUnifiedPipeline.ts (273-313行目)
case 'asr':
  // 両方のサービスに並行してデータを送信
  
  // SyncedRealtimeDisplayManager（284-301行目）
  if (displayManagerRef.current && event.data.segmentId) {
    displayManagerRef.current.updateOriginal(
      event.data.text, 
      event.data.isFinal,    // interimも渡すが内部でフィルタ
      event.data.segmentId
    );
  }
  
  // RealtimeDisplayService（304-306行目）
  if (realtimeDisplayServiceRef.current) {
    realtimeDisplayServiceRef.current.updateOriginal(
      event.data.text, 
      event.data.isFinal     // interimも表示される
    );
  }
```

### 2. Interim Results の処理の違い

#### SyncedRealtimeDisplayManager の処理
```typescript
// SyncedRealtimeDisplayManager.ts (56-62行目)
if (!isFinal) {
  if (segmentId) {
    this.pendingOriginals.set(segmentId, text);
  }
  return; // ← 重要：interimは表示しない
}
```

#### RealtimeDisplayService の処理
```typescript
// RealtimeDisplayService.ts (68-77行目)
if (this.currentSegmentId && !isFinal) {
  const currentSegment = this.segments.find(s => s.id === this.currentSegmentId);
  if (currentSegment && !currentSegment.isFinal) {
    // 現在のセグメントがFinalでなければ、常に更新
    currentSegment.original = text;
    currentSegment.timestamp = now;
    this.emitUpdate();
    return;
  }
}
```

### 3. 翻訳処理フロー

#### 翻訳のトリガー（UnifiedPipelineService.ts）
```typescript
// processTranscriptSegment (492-526行目)
private processTranscriptSegment(segment: TranscriptSegment): void {
  // Final segments のみ翻訳
  if (segment.isFinal) {
    this.transcriptSegments.push(segment);
    // 直接翻訳をキューに追加
    this.translateSegment(segment.text, segment.id);
  }
  
  // ASRイベントは interim/final 両方で発行
  this.emitEvent(createASREvent({
    text: segment.text,
    confidence: segment.confidence,
    isFinal: segment.isFinal,
    language: this.sourceLanguage,
    segmentId: segment.id,
  }, this.currentCorrelationId || 'unknown'));
}
```

#### 翻訳完了時の処理（useUnifiedPipeline.ts）
```typescript
// case 'translate': (320-398行目)
// SyncedRealtimeDisplayManager への更新
if (displayManagerRef.current && event.data.segmentId) {
  displayManagerRef.current.updateTranslation(
    event.data.translatedText,
    event.data.segmentId
  );
}

// RealtimeDisplayService への更新
if (realtimeDisplayServiceRef.current && event.data.translatedText) {
  realtimeDisplayServiceRef.current.updateTranslation(
    event.data.translatedText
  );
}

// 翻訳完了のマーク
if (event.data.isFinal && event.data.segmentId) {
  if (displayManagerRef.current) {
    displayManagerRef.current.completeTranslation(event.data.segmentId);
  }
}
```

## 🎯 表示タイミングと制御

### タイミング定数

| 定数名 | 値 | 用途 |
|--------|------|------|
| minDisplayTimeMs | 1500ms | 最小表示時間 |
| translationDisplayTimeMs | 1500ms | 翻訳表示後の維持時間 |
| fadeInDurationMs | 200ms | フェードイン時間 |
| fadeOutDurationMs | 300ms | フェードアウト時間 |
| updateInterval | 50ms | 表示更新間隔 |

### セグメントのライフサイクル

1. **作成フェーズ**
   - Deepgramから`isFinal=true`受信時に新規作成
   - opacity: 0 → 1.0へフェードイン（200ms）
   - status: 'active'

2. **更新フェーズ**（RealtimeDisplayServiceのみ）
   - `isFinal=false`受信時に既存セグメントを更新
   - 類似度70%以上で同一セグメントと判定

3. **翻訳追加フェーズ**
   - 原文が`isFinal`のセグメントのみ翻訳可能
   - 翻訳開始時刻を`translationStartTime`に記録

4. **フェードアウトフェーズ**
   - 新セグメント追加時に既存が`fading`へ
   - opacity: 1.0 → 0.6へフェードアウト（300ms）

5. **削除フェーズ**
   - status: 'completed'で最小表示時間経過後
   - 翻訳がある場合は翻訳表示から1.5秒経過後

## 🔍 類似度計算アルゴリズム

```typescript
// RealtimeDisplayService.ts (412-473行目)
private calculateSimilarity(text1: string, text2: string): number {
  // 冒頭単語の一致を重視
  // - 冒頭3単語以上一致: 95%
  // - 冒頭2単語一致: 90%
  // - 冒頭1単語一致: 70-85%
  // - 不一致: 30%
}
```

## ⚠️ エラー処理とフォールバック

### 翻訳エラー時の挙動
- 翻訳が失敗しても原文表示は継続
- エラーログは記録されるが、UIには影響しない
- 新しいセグメントが来ると自動的にシフト

### タイムアウト処理
- **現状**: 明示的なタイムアウト処理は未実装
- **影響**: 翻訳が10秒以上遅延しても原文のみ表示継続
- **推奨**: 翻訳タイムアウト（10秒）の実装を検討

## 📈 パフォーマンス特性

### メモリ使用量
- SyncedRealtimeDisplayManager: 最大3ペア保持
- RealtimeDisplayService: 最大3セグメント保持
- 両システム合計で最大6セグメント分のメモリ使用

### 更新頻度
- 表示更新: 50ms間隔（両システム共通）
- ASRイベント: Deepgramの送信頻度に依存
- 翻訳イベント: OpenAI APIレスポンスに依存

## 🎨 UI表示の最終形

### ThreeLineDisplay コンポーネント
```typescript
// 表示優先順位
1. displayContent（3段階表示）が存在する場合は優先表示
2. directContent が存在する場合はフォールバック表示
3. 両方ない場合は null

// 表示スタイル
- oldest: opacity 0.4, lineHeight 1.6
- older: opacity 0.6, lineHeight 1.6
- recent: opacity 1.0, fontWeight 500, lineHeight 1.6
```

## 🔧 設定可能なパラメータ

### SyncedRealtimeDisplayManager
- maxDisplayPairs: 3（最大表示ペア数）
- minDisplayTimeMs: 1500（最小表示時間）

### RealtimeDisplayService
- maxDisplaySegments: 3（最大表示セグメント数）
- minDisplayTimeMs: 1500（最小表示時間）
- translationDisplayTimeMs: 1500（翻訳表示維持時間）
- fadeInDurationMs: 200（フェードイン時間）
- fadeOutDurationMs: 300（フェードアウト時間）
- similarityThreshold: 0.7（類似度閾値）

## 📝 実装上の注意点

1. **SegmentManager の無効化**
   - UnifiedPipelineService内でコメントアウト済み（363-388行目）
   - 重複翻訳の原因となるため使用しない

2. **並行システムの管理**
   - 両システムは独立して動作
   - 将来的にはどちらか一方に統一する必要あり

3. **メモリリーク対策**
   - 両システムとも`destroy()`メソッド実装済み
   - コンポーネントアンマウント時に必ず呼び出す

## 🚀 今後の改善提案

1. **タイムアウト処理の実装**
   - 翻訳が10秒以上かかる場合の処理
   - エラー表示やリトライ機能

2. **システムの統合**
   - 2つの表示システムを1つに統合
   - パフォーマンスとメモリ使用量の最適化

3. **設定のカスタマイズ**
   - ユーザーが表示時間やフェード速度を調整可能に
   - interim表示のON/OFF切り替え機能

4. **アクセシビリティ**
   - スクリーンリーダー対応
   - 高コントラストモード対応