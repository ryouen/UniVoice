# Clean Architecture実装計画 - UniVoice 2.0

## 🎯 目標
本質的・構造的で長期的なプロジェクトに耐える設計の実現

## 📊 アーキテクチャ分析結果

### 問題点
1. **状態管理の三重複**
   - useUnifiedPipeline: historyBlocks state
   - SegmentManager: segments Map
   - DataPersistenceService: IndexedDB
   
2. **密結合の問題**
   - 翻訳ロジックがUnifiedPipelineServiceに埋め込まれている
   - イベント処理が分散している
   
3. **パフォーマンスリスク**
   - 履歴データの無制限増大
   - 40以上のuseEffectによる過剰な再レンダリング

## 🏗️ フェーズ別実装計画

### Phase 0: 即座の修正（1-2日）
**目的**: 二段階翻訳システムの接続

#### タスク
1. **history_プレフィックス問題の修正**
   ```typescript
   // UnifiedPipelineService.ts
   // 履歴翻訳完了時にhistory_プレフィックス付きイベントを発行
   this.emitEvent(createTranslationEvent({
     ...eventData,
     segmentId: `history_${combinedId}`
   }, correlationId));
   ```

2. **SentenceCombinerの接続**
   - handleCombinedSentenceメソッドの実装
   - executeHistoryTranslationメソッドの追加

#### 影響とリスク
- **正の影響**: ユーザーは高品質な履歴翻訳を見られる
- **負の影響**: 翻訳API呼び出しが2倍になる
- **対策**: 優先度制御で影響を最小化

### Phase 1: アーキテクチャ準備（3-5日）
**目的**: 将来の拡張に向けた基盤整備

#### タスク
1. **TranslationServiceの抽出**
   ```typescript
   // 新規: services/domain/TranslationService.ts
   export class TranslationService {
     async translateRealtime(text: string, options: TranslationOptions): Promise<string>
     async translateHighQuality(text: string, context: string[], options: TranslationOptions): Promise<string>
   }
   ```

2. **HistoryRepositoryパターンの導入**
   ```typescript
   // 新規: services/domain/repositories/HistoryRepository.ts
   export interface HistoryRepository {
     addSegment(segment: Segment): Promise<void>
     updateTranslation(segmentId: string, translation: string): Promise<void>
     getHistory(limit?: number): Promise<HistoryBlock[]>
   }
   ```

3. **EventMediatorの導入**
   ```typescript
   // 新規: services/infrastructure/EventMediator.ts
   export class EventMediator {
     private handlers = new Map<string, Handler[]>()
     register(eventType: string, handler: Handler): void
     publish(event: DomainEvent): Promise<void>
   }
   ```

#### 影響とリスク
- **正の影響**: 疎結合化により将来の変更が容易に
- **負の影響**: 一時的にコードが複雑化
- **対策**: 段階的移行で既存機能を保護

### Phase 2: 段階的要約の実装（2-3日）
**目的**: ユーザー価値の高い機能を追加

#### タスク
1. **WordCountTrackerの実装**
   ```typescript
   // AdvancedFeatureService内
   private wordCountTracker = new WordCountTracker({
     thresholds: [400, 800, 1600, 2400],
     onThresholdReached: (threshold) => this.generateProgressiveSummary(threshold)
   })
   ```

2. **SummaryAggregatorの実装**
   ```typescript
   // 3つの履歴ブロックを1つに集約
   export class SummaryAggregator {
     aggregate(blocks: HistoryBlock[], count: number = 3): AggregatedBlock[]
   }
   ```

3. **Progressive Summary UIの追加**
   - タブ式UI for 400/800/1600/2400語要約
   - アコーディオン式展開

#### 影響とリスク
- **正の影響**: ユーザーは講義の進行に応じた要約を確認可能
- **負の影響**: UI複雑度の増加
- **対策**: Progressive Enhancement - 基本機能を維持しつつ拡張

### Phase 3: パフォーマンス最適化（3-4日）
**目的**: スケーラビリティの確保

#### タスク
1. **Virtual Scrollingの導入**
   ```typescript
   // react-window or react-virtualized
   <FixedSizeList
     height={600}
     itemCount={historyBlocks.length}
     itemSize={100}
   >
   ```

2. **メモリ管理戦略**
   - 最新N件のみメモリ保持
   - 古いデータはIndexedDBから遅延読み込み
   - WeakMapによる自動GC

3. **React最適化**
   - useMemoによる計算結果キャッシュ
   - useCallbackによる関数安定化
   - React.memoによる再レンダリング防止

#### 影響とリスク
- **正の影響**: 3時間授業でも安定動作
- **負の影響**: 実装複雑度の増加
- **対策**: パフォーマンスメトリクスの継続監視

## 🔄 実装シミュレーション

### シナリオ1: 通常の1時間授業
- 音声セグメント数: ~450
- メモリ使用量: Phase 0: 150MB → Phase 3: 50MB
- API呼び出し: 450（リアルタイム） + 150（履歴） = 600回

### シナリオ2: 3時間の長時間授業
- 音声セグメント数: ~1350
- メモリ使用量: Phase 0: 450MB（危険） → Phase 3: 80MB（安定）
- API呼び出し: 1800回（コスト要検討）

### シナリオ3: ネットワーク不安定
- 再接続処理: 自動（最大3回）
- データ保護: IndexedDBによる永続化
- ユーザー体験: 一時的な遅延のみ

## 📈 成功指標

1. **技術指標**
   - First Paint: ≤1000ms維持
   - メモリ使用量: 3時間で100MB以下
   - 再レンダリング: 50%削減

2. **ビジネス指標**
   - 履歴翻訳品質: ユーザー満足度80%以上
   - 段階的要約利用率: 60%以上
   - システム安定性: 99.9%

## 🚨 リスク管理

### 高リスク項目
1. **API料金の増加**
   - 対策: 料金上限の設定、キャッシュ戦略
   
2. **既存機能への影響**
   - 対策: Feature Toggleによる段階的ロールアウト
   
3. **複雑性の増大**
   - 対策: 徹底したドキュメント化、ADR作成

## 📅 タイムライン

| Phase | 期間 | 開始条件 | 完了条件 |
|-------|-----|---------|----------|
| Phase 0 | 1-2日 | 即座 | 二段階翻訳がUIに反映 |
| Phase 1 | 3-5日 | Phase 0完了 | 全テスト合格 |
| Phase 2 | 2-3日 | Phase 1完了 | 段階的要約UI表示 |
| Phase 3 | 3-4日 | Phase 2完了 | 3時間安定動作 |

## 🔍 代替案の検討

### 案1: 最小限の修正のみ
- **メリット**: 1日で完了、リスク最小
- **デメリット**: 技術的負債の蓄積
- **判定**: ❌ 長期的に持続不可能

### 案2: フルリライト
- **メリット**: 理想的なアーキテクチャ
- **デメリット**: 3ヶ月必要、リスク大
- **判定**: ❌ 現実的でない

### 案3: 段階的改善（採用）
- **メリット**: バランスが良い、リスク管理可能
- **デメリット**: 一時的な複雑性
- **判定**: ✅ 最適解

---

最終更新: 2025-08-30
作成者: Claude (Clean Architecture Senior Engineer)
レビュー: 未