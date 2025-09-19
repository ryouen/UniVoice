# UniVoice ウィンドウリサイズ仕様書

実装日: 2025-09-19
作成者: Claude Code
ステータス: 仕様策定完了・実装待ち

## 1. 現状の問題点

### 1.1 Layout定数とCSS実装の不整合

**重大な不整合が発見されました：**

```typescript
// src/constants/layout.constants.ts の値（誤り）
export const LAYOUT_HEIGHTS = {
  header: 200,        // ❌ 実際は60px
  settingsBar: 100,   // ❌ 実際は56px
  questionSection: 160,  // ✅ 正しい
  minimalControl: 32,    // ✅ 正しい
}
```

```css
/* src/components/UniVoice.module.css の値（正しい） */
--header-height: 60px;
--settings-bar-height: 56px;
--header-compact-height: 32px;
--question-section-height: 160px;
```

**影響：**
- calculateTotalHeight()関数が184px過大に計算
- ウィンドウリサイズ時に不正確な高さ調整
- リアルタイムエリアの高さ計算に誤差

### 1.2 ボトムリサイズハンドルの欠如

**Electronフレームレスウィンドウの制限：**
- `frame: false`設定により、OS標準のリサイズハンドルが無効化
- 現在、ウィンドウ下端のドラッグによるリサイズが不可能
- 過去実装（commit c060b06）は削除済み（Clean Architecture違反のため）

### 1.3 過去実装の問題点

削除された過去実装の問題：
- UIレイヤーにビジネスロジックが混在
- 直接的なマウスイベント処理によるパフォーマンス問題
- リサイズ状態管理の複雑化

## 2. 新仕様

### 2.1 Layout定数の修正

```typescript
// src/constants/layout.constants.ts（修正後）
export const LAYOUT_HEIGHTS = {
  header: 60,           // 修正: 200 → 60
  settingsBar: 56,      // 修正: 100 → 56
  questionSection: 160,
  minimalControl: 32,
  defaultRealtime: 540,
  minRealtime: 200,
  // maxRealtimeを削除（最大サイズ制限なし）
} as const;
```

### 2.2 リアルタイムエリアの固定位置動作

**重要な仕様：セクション切り替え時の挙動**

```
■ 通常表示時
┌──────────────────────────────┐
│ Header (60px)                │
├──────────────────────────────┤
│ Settings Bar (56px)          │
├──────────────────────────────┤
│ Realtime Area                │ ← 画面上の位置固定
│ (可変高さ)                    │
├──────────────────────────────┤
│ Question Section (160px)     │
└──────────────────────────────┘

■ ヘッダーをミニマル化
┌──────────────────────────────┐
│ Min Header (32px)            │ ← 縮小
├──────────────────────────────┤ ← 116px位置
│ Realtime Area                │ ← 位置は116pxのまま固定
│ (高さ増加 +28px)             │ ← 上部空間を埋める
├──────────────────────────────┤
│ Question Section (160px)     │
└──────────────────────────────┘
```

**動作原則：**
1. リアルタイムエリアの画面上の開始位置（Y座標）を固定
2. 上部セクションの切り替え時は、リアルタイムエリアが伸縮して空間を埋める
3. ウィンドウ全体の高さは維持

### 2.3 ボトムリサイズハンドル仕様

**実装要件：**

```typescript
interface BottomResizeHandle {
  // 視覚的表示
  height: 8;           // ハンドル領域の高さ
  cursor: 'ns-resize'; // リサイズカーソル
  color: 'transparent'; // 透明（ホバー時に表示）

  // 動作
  target: 'realtimeArea';     // リサイズ対象
  excludes: ['questionSection']; // 影響を受けないセクション

  // 制限
  minHeight: 200;      // リアルタイムエリアの最小高さ
  maxHeight: undefined; // 最大高さ制限なし
}
```

**ドラッグ時の動作：**
1. マウスダウン時：初期位置とリアルタイムエリア高さを記録
2. マウス移動時：差分をリアルタイムエリア高さに反映
3. マウスアップ時：最終高さを保存
4. 質問セクションのサイズは変更しない

### 2.4 セクショントグル時の詳細動作

#### 2.4.1 ヘッダートグル（H キー）

```
通常 → ミニマル:
- ヘッダー: 60px → 32px（-28px）
- リアルタイムエリア開始位置: 116px（固定）
- リアルタイムエリア高さ: +28px増加
- ウィンドウ全体高さ: 変化なし
```

#### 2.4.2 設定バートグル（S キー）

```
表示 → 非表示:
- 設定バー: 56px → 0px（-56px）
- リアルタイムエリア開始位置: 状況による
  - ヘッダー通常時: 116px → 60px
  - ヘッダーミニマル時: 88px → 32px
- リアルタイムエリア高さ: +56px増加
- ウィンドウ全体高さ: 変化なし
```

#### 2.4.3 質問セクショントグル（Q キー）

```
表示 → 非表示:
- 質問セクション: 160px → 0px
- リアルタイムエリア: 変化なし
- ウィンドウ全体高さ: -160px減少
```

## 3. 実装アプローチ

### 3.1 Clean Architectureに準拠した設計

```typescript
// src/hooks/useBottomResize.ts（新規）
interface UseBottomResizeProps {
  realtimeHeight: number;
  onHeightChange: (height: number) => void;
  minHeight?: number;
}

// ドラッグ状態とロジックをカプセル化
export function useBottomResize({
  realtimeHeight,
  onHeightChange,
  minHeight = 200
}: UseBottomResizeProps) {
  // リサイズハンドルのロジック
}
```

### 3.2 パフォーマンス最適化

- requestAnimationFrameによるスムーズな更新
- デバウンス処理（100ms）
- 差分が5px未満の場合は無視

### 3.3 実装優先順位

1. **Phase 1**: Layout定数の修正（即座に実装可能）
2. **Phase 2**: リアルタイムエリア固定位置動作の実装
3. **Phase 3**: ボトムリサイズハンドルの実装
4. **Phase 4**: テストとドキュメント更新

## 4. テスト要件

### 4.1 単体テスト

```typescript
describe('Window Resize Specification', () => {
  describe('Layout Constants', () => {
    it('should match CSS values', () => {
      expect(LAYOUT_HEIGHTS.header).toBe(60);
      expect(LAYOUT_HEIGHTS.settingsBar).toBe(56);
    });
  });

  describe('Fixed Position Behavior', () => {
    it('should maintain realtime area Y position on toggle', () => {
      // セクション切り替え時の位置確認
    });
  });

  describe('Bottom Resize Handle', () => {
    it('should only resize realtime area', () => {
      // 質問セクションが影響を受けないことを確認
    });

    it('should respect minimum height', () => {
      // 最小高さ200pxの確認
    });

    it('should have no maximum height limit', () => {
      // 最大高さ制限なしの確認
    });
  });
});
```

### 4.2 統合テスト

- Electronアプリケーション全体での動作確認
- 各種画面サイズでのテスト
- 複数モニター環境での動作確認

## 5. 移行計画

### 5.1 破壊的変更の影響

Layout定数の修正により影響を受ける機能：
- calculateTotalHeight()関数
- calculateFixedSectionsHeight()関数
- executeWindowResize()関数
- LocalStorageに保存された高さ情報

### 5.2 段階的移行

1. **Step 1**: 新しい定数を別名で追加（ACTUAL_LAYOUT_HEIGHTS）
2. **Step 2**: 徐々に新定数へ移行
3. **Step 3**: 旧定数を削除
4. **Step 4**: LocalStorageのマイグレーション

## 6. 関連ファイル

### 修正対象ファイル
- `src/constants/layout.constants.ts` - Layout定数の修正
- `src/components/UniVoice.tsx` - 固定位置動作の実装
- `src/components/UniVoice.module.css` - リサイズハンドルのスタイル
- `src/hooks/useWindowResize.ts` - リサイズロジックの更新

### 新規作成ファイル
- `src/hooks/useBottomResize.ts` - ボトムリサイズハンドル専用Hook
- `src/components/ResizeHandle.tsx` - リサイズハンドルコンポーネント（オプション）

## 7. 注意事項

### 7.1 パフォーマンス
- 頻繁なリサイズ操作はパフォーマンスに影響
- requestAnimationFrameとデバウンスの併用推奨

### 7.2 互換性
- Electron環境依存の機能
- フレームレスウィンドウ前提の実装

### 7.3 アクセシビリティ
- キーボードでのリサイズ操作も考慮（将来的に）
- リサイズハンドルの視認性向上（ホバー時の表示）

## 8. 参考資料

- [過去の実装（削除済み）](https://github.com/.../commit/c060b06)
- [WINDOW-RESIZE-MANAGEMENT-SYSTEM.md](./WINDOW-RESIZE-MANAGEMENT-SYSTEM.md) - 2025-09-13の実装
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Clean Architecture設計
- [Electron Frameless Window Documentation](https://www.electronjs.org/docs/latest/tutorial/frameless-window)

---

最終更新: 2025-09-19
次のステップ: Layout定数の修正実装から開始