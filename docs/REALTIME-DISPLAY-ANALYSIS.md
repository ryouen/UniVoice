# リアルタイム3段階表示の実装状況分析

作成日: 2025-08-23
更新日: 2025-08-23

## 🔍 現状分析（最新）

### 実装済みの機能 ✅

1. **RealtimeDisplayService.ts** (バックエンド)
   - 完全な3段階表示ロジック実装済み
   - 表示タイミング制御実装済み
   - フェードイン/アウトアニメーション実装済み

2. **useUnifiedPipeline.ts** (フック)
   - RealtimeDisplayServiceとの統合済み
   - threeLineDisplayステートの管理済み

3. **RealtimeSection/ThreeLineDisplay.tsx** (UI)
   - 3段階表示コンポーネント実装済み
   - opacity制御実装済み

4. **UniVoice.tsx** (メインコンポーネント) ✅
   - useUnifiedPipelineから`threeLineDisplay`を取得済み
   - currentDisplayステートに正しく設定済み（220-240行目）
   - RealtimeSectionに`displayContent`として渡している（1216行目）

### 結論 ✅

**3段階表示は既に完全に実装されています！**

```typescript
// UniVoice.tsx (220-240行目)
useEffect(() => {
  console.log('[UniVoice] threeLineDisplay changed:', pipeline.threeLineDisplay);
  
  // 3段階表示データがある場合はそれを優先
  if (pipeline.threeLineDisplay) {
    const newDisplay = {
      original: {
        oldest: pipeline.threeLineDisplay.oldest?.original || '',
        older: pipeline.threeLineDisplay.older?.original || '',
        recent: pipeline.threeLineDisplay.recent?.original || ''
      },
      translation: {
        oldest: pipeline.threeLineDisplay.oldest?.translation || '',
        older: pipeline.threeLineDisplay.older?.translation || '',
        recent: pipeline.threeLineDisplay.recent?.translation || ''
      }
    };
    setCurrentDisplay(newDisplay);
  }
}, [pipeline.threeLineDisplay]);

// RealtimeSectionに渡している (1213-1220行目)
<RealtimeSection
  currentOriginal={currentOriginal}
  currentTranslation={currentTranslation}
  displayContent={currentDisplay}  // ✅ 正しく渡されている！
  volumeLevel={0}
  isRunning={isRunning}
  debug={false}
/>
```

## 📊 表示タイミングの仕様

### セグメントのライフサイクル

1. **新規作成時**
   - Deepgramから`isFinal=true`を受信
   - 新しいセグメントとして`active`状態で作成
   - opacity: 0 → 1.0へフェードイン（200ms）

2. **更新時**
   - `isFinal=false`（interim）を受信
   - 既存セグメントのテキストを更新
   - 類似度70%以上なら同一セグメントとみなす

3. **翻訳追加時**
   - 原文が`isFinal`のセグメントのみ翻訳可能
   - 翻訳開始時刻を記録
   - 最低1.5秒は表示を維持

4. **フェードアウト時**
   - 新しいセグメントが追加されると`fading`状態へ
   - opacity: 1.0 → 0.6へフェードアウト（300ms）

5. **削除時**
   - `completed`状態で3秒経過後
   - 翻訳がある場合は翻訳表示から1.5秒経過後
   - セグメント数が3を超えた場合のみ削除

### タイミング定数

```typescript
minDisplayTimeMs = 1500         // 最小表示時間
translationDisplayTimeMs = 1500 // 翻訳表示後の維持時間
fadeInDurationMs = 200         // フェードイン時間
fadeOutDurationMs = 300        // フェードアウト時間
updateInterval = 50            // 更新間隔（50ms）
```

## 🧪 動作確認方法

1. **ブラウザのコンソールログを確認**
   ```
   [UniVoice] threeLineDisplay changed: {...}
   [useUnifiedPipeline] 3段階表示更新: {...}
   [RealtimeSection] Rendering currentOriginal: {...}
   ```

2. **デバッグモードを有効化**
   ```typescript
   // UniVoice.tsx (1219行目)
   debug={true}  // デバッグログを有効化
   ```

3. **表示される要素の確認**
   - oldest: 薄い表示（opacity 0.4）
   - older: 中間の濃さ（opacity 0.6）  
   - recent: 濃い表示（opacity 1.0）

## 📈 期待される動作

1. **初期状態**: 画面に何も表示されない
2. **最初の発話**: recentに表示（opacity 1.0）
3. **2番目の発話**: 
   - 1番目がolderへ移動（opacity 0.6）
   - 2番目がrecentに表示（opacity 1.0）
4. **3番目の発話**:
   - 1番目がoldestへ移動（opacity 0.4）
   - 2番目がolderへ移動（opacity 0.6）
   - 3番目がrecentに表示（opacity 1.0）
5. **4番目以降**: 
   - 最も古いものが削除
   - 残りが1段階ずつ古い方へシフト
   - 新しいものがrecentに追加

## 🎯 次のステップ

1. [x] 実装状況の調査（完了）
2. [ ] 実際の動作確認（ブラウザでテスト）
3. [ ] デバッグログの確認
4. [ ] 必要に応じてデバッグモードを有効化
5. [ ] テストケースの作成