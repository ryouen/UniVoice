# 3段階表示修正サマリー

## 修正完了報告

### 根本原因
`SyncedRealtimeDisplayManager`が**final結果のみ**を受け入れる設計になっており、interim（中間）結果を拒否していたため、Deepgramからの即座の音声認識結果が表示されなかった。

### 主な修正内容

#### 1. SyncedRealtimeDisplayManager.ts
```typescript
// Before: interim結果を拒否
if (!isFinal) return;

// After: interim結果も処理
if (!isFinal) {
  if (!segmentId) return;
  
  const existingPair = this.displayPairs.find(pair => pair.segmentId === segmentId);
  
  if (existingPair) {
    // 既存ペアを更新
    existingPair.original.text = text;
    existingPair.original.timestamp = Date.now();
    this.emitUpdate();
  } else {
    // 新しいペアを作成
    const newPair = createNewPair(text, segmentId, false);
    this.shiftPairPositions();
    this.displayPairs.unshift(newPair);
    this.emitUpdate();
  }
}
```

#### 2. デバッグログの追加
以下の箇所にデバッグログを追加：
- ASRイベント受信時
- DisplayPairs更新時
- ThreeLineDisplay構築時
- コンポーネントレンダリング時

#### 3. 要約スクロール対応
```typescript
// SummarySection.tsx
overflow: 'auto',
maxHeight: '100%',
paddingRight: '10px'
```

## 動作確認方法

1. アプリケーションを起動
2. 録音を開始
3. 話し始めると即座に以下の動作が確認できるはず：
   - **最新の認識結果**が不透明度1.0で表示
   - 新しい文が追加されると既存の文が**older/oldest**にシフト
   - 最大3つの文が**異なる不透明度**で表示

## データフロー
```
ASR（interim/final）
  ↓
SyncedRealtimeDisplayManager.updateOriginal
  ↓ 
displayPairs更新（position: recent/older/oldest）
  ↓
threeLineDisplay構築
  ↓
ThreeLineDisplayコンポーネントで3段階表示
```

## 期待される表示
```
[古い文 - opacity: 0.3]    ← oldest
[中間の文 - opacity: 0.6]  ← older  
[最新の文 - opacity: 1.0]  ← recent
```

## 注意事項
- interim結果は即座に表示されるが、final結果で上書きされる
- 最大3つのペアのみ保持（メモリ効率のため）
- 古いペアは自動的に削除される