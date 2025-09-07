# 3段階表示検証計画

## 問題の要約
3段階表示（oldest/older/recent）が動作せず、1行のみ表示される問題

## 修正内容
1. **SyncedRealtimeDisplayManager.ts** - interim結果も受け入れるよう修正
   - `updateOriginal`メソッドでinterim結果を処理
   - 新しいペアを作成してdisplayPairsに追加

2. **デバッグログの追加**
   - ASRイベント受信時のログ
   - DisplayPairs更新時のログ  
   - ThreeLineDisplay構築時のログ
   - コンポーネントレンダリング時のログ

## データフロー
```
1. ASRイベント (interim/final)
   ↓
2. useUnifiedPipeline.handlePipelineEvent
   ↓
3. SyncedRealtimeDisplayManager.updateOriginal
   ↓
4. displayPairs更新（position: oldest/older/recent）
   ↓
5. useUnifiedPipeline.useEffect（threeLineDisplay構築）
   ↓
6. UniVoice.displayContent構築
   ↓
7. RealtimeSection.displayContent受信
   ↓
8. ThreeLineDisplay.displayContent表示
```

## 検証手順

### 1. コンソールログの確認
開発者ツール（F12）を開いて以下のログを確認：

- `[ASR]` - ASRイベントの受信
- `[DisplayFlow]` - SyncedRealtimeDisplayManagerの更新
- `[ThreeLineDebug]` - threeLineDisplay構築
- `[UniVoice]` - displayContent構築
- `[RealtimeSection]` - props受信
- `[ThreeLineDisplay]` - レンダリング

### 2. 期待される動作
1. 音声認識開始時
   - interim結果が即座に表示される
   - position: 'recent'、opacity: 1.0

2. 新しいセグメント追加時
   - 既存のペアがolder/oldestにシフト
   - 新しいペアがrecentに追加
   - opacity: oldest(0.3), older(0.6), recent(1.0)

3. 3つ以上のセグメント時
   - 最大3つのペアのみ表示
   - 古いペアは削除される

### 3. デバッグポイント

#### A. ASRイベントが届いているか
```
[ASR] Calling updateOriginal: {
  textLength: 42,
  isFinal: false,
  segmentId: "seg_123",
  hasSegmentId: true
}
```

#### B. DisplayPairsが更新されているか
```
[DisplayFlow] SyncedRealtimeDisplayManager update: {
  pairCount: 2,
  pairs: [
    { position: 'older', opacity: 0.6, ... },
    { position: 'recent', opacity: 1.0, ... }
  ]
}
```

#### C. ThreeLineDisplayが構築されているか
```
[ThreeLineDebug] Final threeLineDisplay: {
  hasOldest: false,
  hasOlder: true,
  hasRecent: true,
  olderText: "これは古いテキストです...",
  recentText: "これは新しいテキストです..."
}
```

#### D. コンポーネントが正しくレンダリングされているか
```
[ThreeLineDisplay] Rendering currentOriginal: {
  has3LineContent: true,
  willShow3Lines: true
}
```

## トラブルシューティング

### ケース1: ASRイベントが届かない
- DeepgramのWebSocket接続を確認
- interim_results設定を確認

### ケース2: DisplayPairsが空
- SyncedRealtimeDisplayManagerのインスタンス生成を確認
- updateOriginalメソッドの呼び出しを確認

### ケース3: 3段階表示されない
- displayContentの構造を確認
- ThreeLineDisplayコンポーネントのレンダリングロジックを確認

### ケース4: positionが正しく設定されない
- shiftPairPositionsメソッドの動作を確認
- 最大表示数（3）の制限を確認