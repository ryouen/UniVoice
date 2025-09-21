# 翻訳フロー完全分析 - タイムアウト問題の根本原因

## 1. 翻訳フローの全体像

### バックエンド側の処理フロー

1. **ASR受信 → 翻訳開始**
   - `UnifiedPipelineService.handleTranscriptSegment()` (行1167)
   - ASRイベント発火 (行1190)
   - 翻訳キューに追加 (行1212) - `isFinal: true` のセグメントのみ

2. **翻訳実行**
   - `TranslationQueueManager.processNext()` (行108)
   - `UnifiedPipelineService.executeTranslation()` (行709)
   - OpenAI API呼び出し (行803)

3. **翻訳完了イベント**
   - `translation` PipelineEvent発火 (行913) - **`isFinal: true`** が設定されている
   - `translationComplete` レガシーイベント発火 (行930)

### フロントエンド側の処理フロー

1. **ASRイベント受信時**
   - `useRealtimeTranscription.handleASREvent()` (行172)
   - **7秒タイムアウト開始** (行213) - `isFinal: true` のセグメントに対して
   - segmentIdをキーとしてタイムアウトを管理

2. **翻訳イベント受信時**
   - `useUnifiedPipeline.handlePipelineEvent()` (行562)
   - `useTranslationQueue.handleTranslationEvent()` (行157)
   - **問題: `isFinal: true` の場合のみ `onTranslationComplete` が呼ばれる** (行228)

3. **タイムアウトクリア**
   - `onTranslationComplete` コールバック内 (行464)
   - `clearTranslationTimeout()` 呼び出し (行468)

## 2. 問題の根本原因

### 発見した問題点

1. **イベントのisFinalフラグ**
   - バックエンド: `executeTranslation()` で `isFinal: true` を設定している (行923)
   - フロントエンド: `isFinal: true` の場合のみタイムアウトをクリアしている

2. **しかし、実際の動作を確認する必要がある**
   - 翻訳イベントが本当に `isFinal: true` で送信されているか
   - segmentIdが正しくマッチしているか

## 3. デバッグのための追加ポイント

### バックエンド側で確認すべきこと
```typescript
// UnifiedPipelineService.executeTranslation() 行923付近
console.log('🔴 [BACKEND] Translation Event Emit:', {
  segmentId: segmentId,
  isFinal: result.isFinal,
  translatedText: result.translated.substring(0, 50)
});
```

### フロントエンド側で確認すべきこと
```typescript
// useTranslationQueue.handleTranslationEvent() 行167
console.log('🔴 [FRONTEND] Translation Event Received:', {
  segmentId: event.data.segmentId,
  isFinal: event.data.isFinal,
  hasTranslatedText: !!event.data.translatedText
});
```

## 4. 考えられる原因

1. **segmentIdの不一致**
   - ASR時: `result.id`
   - 翻訳時: 同じ `segmentId` が使われているはずだが...

2. **isFinalフラグの問題**
   - 実際に `true` が設定されているか
   - Zodスキーマで正しく検証されているか

3. **タイミングの問題**
   - 翻訳が7秒以内に完了しているか
   - ネットワーク遅延はないか

## 5. 解決のための次のステップ

1. デバッグログを追加して実際の値を確認
2. segmentIdのマッピングを完全に追跡
3. isFinalフラグの伝播を確認