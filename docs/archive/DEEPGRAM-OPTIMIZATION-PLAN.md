# Deepgram最適化実装計画

## 概要
助言AIから提供されたDeepgram最適化案を基に、段階的な実装計画を策定します。

## 現状分析

### 現在の実装の問題点
1. **is_final のみに依存** - 自然な発話区切りを検出できない
2. **固定的なパラメータ** - endpointing=800ms は長すぎる可能性
3. **UtteranceEndイベント未使用** - より良い区切り検出が可能

### 提案された改善点
1. **UtteranceEndイベントの活用** - 自然な発話区切りの検出
2. **パラメータの最適化** - より短いendpointing、smart_format追加
3. **イベント処理の階層化** - Interim/UtteranceEnd/Finalの役割分担

## 実装計画

### Phase 1: 調査と影響分析（低リスク）
1. **現在のDeepgramService実装の詳細調査**
   - パラメータ設定箇所の特定
   - イベントハンドリングの流れ確認
   - UtteranceEndイベントのサポート状況確認

2. **影響範囲の特定**
   - DeepgramService.ts
   - UnifiedPipelineService.ts
   - RealtimeDisplayManager.ts
   - SegmentManager.ts

### Phase 2: パラメータ最適化（中リスク）
```typescript
// 推奨パラメータ
const optimizedParams = {
  model: 'nova-3',
  encoding: 'linear16',
  sample_rate: 16000,
  channels: 1,
  interim_results: true,
  punctuate: true,
  endpointing: 300,        // 800ms → 300ms
  utterance_end_ms: 1000,  // 新規追加
  smart_format: true,      // 新規追加（注意：最大3秒遅延）
  language: 'ja'           // 多言語対応時は 'multi'
};
```

### Phase 3: UtteranceEndイベント対応（高リスク）
1. **イベントハンドラーの追加**
   ```typescript
   case 'UtteranceEnd':
     const wordTiming = transcript.words?.[transcript.words.length - 1];
     if (wordTiming?.end !== undefined) {
       // 履歴セグメントの確定処理
       this.finalizeSegment(wordTiming.end * 1000);
     }
     break;
   ```

2. **セグメント管理の改善**
   - UtteranceEndでセグメント区切り
   - Finalで内容確定
   - Interimでリアルタイム表示

### Phase 4: TranslationQueueの改善（中リスク）
1. **優先度付きキュー実装**
   - Final直後の翻訳: high priority
   - 履歴再翻訳: normal priority
   - 手動メモ: low priority

2. **リトライ機能**
   ```typescript
   // 指数バックオフ実装
   private async executeWithRetry<T>(
     task: () => Promise<T>, 
     maxRetries = 3,
     initialDelay = 500
   ): Promise<T> {
     // 実装略
   }
   ```

## リスク評価と対策

### リスク項目
1. **smart_format の3秒遅延**
   - 対策: UIに「フォーマット中...」インジケータ表示
   - 設定で無効化可能にする

2. **UtteranceEnd未対応の場合**
   - 対策: フォールバック処理を実装
   - 既存のis_finalベースの処理を維持

3. **パラメータ変更の影響**
   - 対策: 環境変数で切り替え可能にする
   - A/Bテストできる仕組み

## 実装順序（推奨）

1. **Week 1**: 調査とドキュメント作成
2. **Week 2**: パラメータ最適化（環境変数化）
3. **Week 3**: UtteranceEndイベント対応
4. **Week 4**: TranslationQueue改善
5. **Week 5**: テストと調整

## 成功指標

1. **レスポンス改善**
   - 発話終了から履歴表示まで: 1秒以内
   - リアルタイム表示の更新頻度: 向上

2. **精度向上**
   - 不自然な区切り: 50%削減
   - 文章の可読性: smart_formatで向上

3. **安定性**
   - API エラー: リトライで90%回復
   - UI のフリーズ: 0件

## 注意事項

1. **後方互換性の維持**
   - 既存の動作を壊さない
   - 段階的な移行

2. **テスト重視**
   - 各フェーズでの十分なテスト
   - ログ収集と分析

3. **ユーザーフィードバック**
   - 実際の使用感の確認
   - パラメータの微調整

---

最終更新: 2025-08-25
作成者: Claude Code
バージョン: 1.0.0