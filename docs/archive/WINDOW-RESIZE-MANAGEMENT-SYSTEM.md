# 高度なウィンドウリサイズ管理システム

実装日: 2025-09-13  
実装者: Claude Code (シニアエンジニア設計)

## 概要

UniVoiceアプリケーションに、ユーザーのウィンドウドラッグ操作を検知してリアルタイムエリアの高さを動的に調整する高度なリサイズ管理システムを実装しました。

## 解決した問題

### 従来の問題
- ユーザーがウィンドウ境界をドラッグしてリサイズしても、リアルタイムエリアの高さが固定のまま
- 結果として、ウィンドウ下部に不要な余白が発生

### 新しい動作
- トグル操作時: リアルタイムエリアは固定、ウィンドウ全体がリサイズ（従来通り）
- ドラッグ操作時: リアルタイムエリアの高さが動的に調整され、余白が発生しない

## 技術的実装

### 1. リサイズモード管理
```typescript
enum ResizeMode {
  NONE = 'none',
  SECTION_TOGGLE = 'section_toggle',  // セクション表示/非表示
  USER_DRAG = 'user_drag'             // ユーザードラッグ
}
```

### 2. 無限ループ防止メカニズム
- `currentResizeMode` 状態でモードを管理
- セクショントグル中はウィンドウリサイズイベントを無視
- ユーザードラッグ中は executeWindowResize をスキップ

### 3. パフォーマンス最適化
- 100msのデバウンス処理
- 5px以上の変化のみ処理
- 不要な再レンダリングを防止

### 4. 高さ計算の分離
```typescript
calculateFixedSectionsHeight()  // 固定セクションの高さ合計
calculateTotalHeight()          // ウィンドウ全体の高さ
```

## 実装ファイル

### 更新されたファイル
- `src/components/UniVoice.tsx`
  - リサイズモード管理の追加
  - ウィンドウリサイズイベントハンドラーの実装
  - 高さ計算ロジックの分離と最適化

### 主要な変更点

1. **状態管理の追加**
   - `currentResizeMode`: 現在のリサイズモードを管理
   - `windowResizeTimeoutRef`: デバウンスタイマーの管理

2. **新しい関数**
   - `calculateFixedSectionsHeight()`: 固定セクションの高さを計算
   - ウィンドウリサイズイベントハンドラー（useEffect内）

3. **既存関数の更新**
   - `executeWindowResize()`: リサイズモードの設定を追加
   - リアルタイム高さ変更時のuseEffect: 無限ループ防止条件を追加

## 将来の拡張性

### 1. 新しいセクションの追加
```typescript
// LAYOUT_HEIGHTS に追加
newSection: 120,

// calculateFixedSectionsHeight に追加
if (showNewSection) {
  fixedHeight += LAYOUT_HEIGHTS.newSection;
}
```

### 2. リサイズ動作のカスタマイズ
- デバウンス時間を設定可能にする
- 最小/最大高さの制限を柔軟に設定
- アニメーション効果の追加

### 3. 新しいリサイズモード
ResizeModeEnum を拡張して、異なるリサイズ動作を追加可能

## テスト方法

### 手動テスト
1. **トグル操作テスト**
   - 各セクションの表示/非表示を切り替え
   - リアルタイムエリアの高さが変わらないことを確認
   - ウィンドウ全体がリサイズされることを確認

2. **ドラッグ操作テスト**
   - ウィンドウの下端をドラッグ
   - リアルタイムエリアが伸縮することを確認
   - 最小高さ（100px）が保証されることを確認

3. **LocalStorage永続化テスト**
   - ドラッグでリサイズ後、アプリを再起動
   - リアルタイムエリアの高さが保持されることを確認

### 自動テスト（推奨）
```typescript
describe('Window Resize Management', () => {
  it('should maintain realtime height during section toggle', () => {
    // セクショントグル時のテスト
  });
  
  it('should adjust realtime height on window drag', () => {
    // ウィンドウドラッグ時のテスト
  });
  
  it('should prevent infinite loops', () => {
    // 無限ループ防止のテスト
  });
});
```

## デバッグ情報

コンソールログで以下の情報を確認可能：
- `[Window Resize] Executing resize:` - セクショントグル時
- `[Window Resize] User drag detected:` - ユーザードラッグ検知時
- `[Window Resize] Skipping - in section toggle mode` - 無限ループ防止時

## 注意事項

1. **パフォーマンス**
   - 頻繁なリサイズ操作は100msでデバウンスされます
   - 必要に応じて `WINDOW_RESIZE_DEBOUNCE_MS` を調整してください

2. **互換性**
   - Electron環境でのみ動作します
   - window.univoice?.window.autoResize API が必要です

3. **制限事項**
   - リアルタイムエリアの最小高さ: 100px
   - リアルタイムエリアの最大高さ: 600px

## 関連ドキュメント
- [CLAUDE.md](../CLAUDE.md) - プロジェクト全体の設定
- [ARCHITECTURE.md](./ARCHITECTURE.md) - アーキテクチャ設計