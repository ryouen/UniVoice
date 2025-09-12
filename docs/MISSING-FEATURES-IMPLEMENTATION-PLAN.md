# 未実装機能の洗い出しと実装計画

## 調査結果サマリー

backup/250911_design_update/univoice-liquid-glass.html と現在の UniVoice.tsx を比較し、以下の未実装機能を特定しました。

## 未実装機能リスト

### 1. テーマサイクル機能
**現状**: 個別のテーマ設定は可能だが、循環切り替え機能なし
**HTML実装**: `cycleTheme()` で light → dark → purple をループ
**実装方針**: 
```typescript
const cycleTheme = () => {
  const themes = ['light', 'dark', 'purple'];
  const currentIndex = themes.indexOf(currentTheme);
  const nextTheme = themes[(currentIndex + 1) % themes.length];
  setTheme(nextTheme);
};
```

### 2. 自動タイマー更新
**現状**: 録音時間の表示はあるが、自動更新機能なし
**HTML実装**: `setInterval(updateTimer, 1000)` で毎秒更新
**実装方針**:
- useEffect内でタイマーを設定
- isPaused状態に応じて更新を制御
- コンポーネントのアンマウント時にクリーンアップ

### 3. リアルタイムセクション自動スクロール
**現状**: 手動スクロールのみ
**HTML実装**: 3秒ごとに最下部へ自動スクロール
**実装方針**:
- useRefでスクロール対象を参照
- useEffectで定期的なスクロールを実装
- 新しいセグメント追加時にもスクロール

### 4. Glass効果テーマクラス
**現状**: 異なるテーマシステムを使用
**HTML実装**: glass-light, glass-dark, glass-purple クラス
**実装方針**: 
- 現行のテーマシステムとの互換性を検討
- 必要に応じてスタイルを調整

### 5. ポーズ状態の視覚的フィードバック
**現状**: 基本的なポーズ機能のみ
**HTML実装**: 
- ポーズ時にボタンアイコンが変更
- 録音インジケーターの色が変化（緑→グレー）
**実装方針**: より明確な視覚的フィードバックを追加

## 実装優先順位

### 高優先度
1. **自動タイマー更新機能** - ユーザー体験に直接影響
2. **リアルタイムセクション自動スクロール** - 使いやすさの向上

### 中優先度
3. **cycleTheme関数** - 便利機能
4. **ポーズ状態の視覚的フィードバック** - UX改善

### 低優先度
5. **Glass効果テーマクラス** - 現行システムで代替可能

## 実装スケジュール案

### Phase 1（即時実装）
- 自動タイマー更新機能
- リアルタイムセクション自動スクロール

### Phase 2（次回実装）
- cycleTheme関数の追加
- ポーズ状態の視覚的フィードバック改善

### Phase 3（将来検討）
- Glass効果テーマクラスの統合

## リスクと考慮事項

1. **パフォーマンス**: 自動スクロールとタイマー更新が同時に動作する際の負荷
2. **ユーザー操作との競合**: 自動スクロール中のユーザー手動スクロールへの対応
3. **既存機能との互換性**: 現行のテーマシステムとの統合

## 技術的詳細

### 自動タイマー更新の実装例
```typescript
useEffect(() => {
  if (!isPaused && isListening) {
    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }
}, [isPaused, isListening]);
```

### 自動スクロールの実装例
```typescript
useEffect(() => {
  const scrollInterval = setInterval(() => {
    if (realtimeSectionRef.current && !userIsScrolling) {
      realtimeSectionRef.current.scrollTop = 
        realtimeSectionRef.current.scrollHeight;
    }
  }, 3000);
  
  return () => clearInterval(scrollInterval);
}, [userIsScrolling]);
```

## 次のステップ

1. 高優先度機能から順次実装
2. 各機能実装後に動作テスト
3. ユーザーフィードバックの収集と改善