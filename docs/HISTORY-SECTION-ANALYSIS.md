# HistorySection 分析ドキュメント

## 🔍 現状分析

### HistorySectionに含まれる要素

#### 1. UI要素
- 履歴表示エリア（スクロール可能）
- リサイズハンドル（下部）
- FlexibleHistoryDisplayコンポーネントの使用
- 空状態メッセージ

#### 2. 機能
- クリックでモーダル表示（全文履歴）
- リサイズ機能（ドラッグで高さ調整）
- 履歴ブロックの表示（FlexibleHistoryDisplay使用）
- 空状態の処理

#### 3. 関連する状態とプロパティ
```typescript
// 状態
- historyBlocks: HistoryBlock[]
- sectionHeights: { history: number }
- expandedSection: string | null
- isResizing: boolean
- resizingSection: string | null

// ハンドラー
- handleHistoryClick: モーダル表示
- handleResizeMouseDown: リサイズ開始
- getSectionStyle: 高さスタイル計算
```

#### 4. 依存関係
- FlexibleHistoryDisplay（既存コンポーネント）
- モーダル表示機能
- リサイズロジック

## 🏗️ 設計方針

### コンポーネント構造
```
HistorySection/
├── HistorySection.tsx      # メインコンポーネント
├── ResizeHandle.tsx        # リサイズハンドル（共通化可能）
├── EmptyState.tsx          # 空状態表示
└── index.ts
```

### Props設計
```typescript
interface HistorySectionProps {
  // データ
  historyBlocks: HistoryBlock[];
  
  // スタイル関連
  height: number;  // vh単位
  isExpanded?: boolean;
  
  // イベントハンドラー
  onClick?: () => void;
  onResize?: (newHeight: number) => void;
  onBlockClick?: (block: HistoryBlock) => void;
  
  // カスタマイズ
  emptyMessage?: string;
  style?: React.CSSProperties;
}
```

## 🚨 課題と対策

### 課題1: リサイズロジックの複雑さ
- 現状: UniVoice.tsx内でマウスイベントを管理
- 対策: カスタムフック（useResize）に分離

### 課題2: モーダル表示の依存
- 現状: 親コンポーネントの状態に依存
- 対策: onClickイベントで親に通知

### 課題3: FlexibleHistoryDisplayとの統合
- 現状: 直接使用
- 対策: そのまま維持（既に良い設計）

## 📋 実装手順

1. **ResizeHandleコンポーネントの作成**
   - 汎用的なリサイズハンドル
   - SummarySectionでも再利用可能

2. **useResizeフックの作成**
   - リサイズロジックを抽象化
   - マウスイベントの管理

3. **HistorySectionコンポーネントの実装**
   - FlexibleHistoryDisplayの統合
   - クリックイベントの処理
   - リサイズ機能の統合

4. **UniVoice.tsxからの抽出**
   - 関連コードの削除
   - HistorySectionの統合

## 📊 予想される効果

- **削減行数**: 約45行（履歴セクションのJSX部分）
- **追加の削減**: リサイズロジックを共通化すれば更に削減可能
- **再利用性**: ResizeHandleは他のセクションでも使用可能

---
作成日: 2025-08-22
作成者: Claude (Ultrathink)