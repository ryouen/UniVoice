# フロー型UI設計ドキュメント
*作成日: 2025-09-10*

## 概要

UniVoice 2.0の履歴表示を、従来のブロック型から自然なフロー型に改善しました。
この変更により、ユーザーは技術的な詳細に気を取られることなく、会話の内容に集中できます。

## 設計思想

### Before: ブロック型デザイン
- 各履歴がボックスで囲まれ、技術的情報（ブロック番号、文数など）が目立つ
- 視覚的なノイズが多く、読みにくい
- ブロック間の境界が強調されすぎている

### After: フロー型デザイン
- 自然な文章の流れを重視
- メタ情報は最小限（5分以上の間隔でのみタイムスタンプ表示）
- 控えめなビジュアルで内容に集中できる

## 実装詳細

### コンポーネント構成
```
src/components/
├── UnifiedHistoryRenderer.tsx      # 従来のブロック型（後方互換性）
├── UnifiedHistoryRenderer-Flow.tsx # 新しいフロー型
└── FlexibleHistoryDisplay.tsx      # 切り替えラッパー
```

### 主な特徴

#### 1. タイムスタンプの制御
```typescript
// 5分以上の間隔がある場合のみ表示
const shouldShowTimestamp = (block, index, blocks) => {
  if (index === 0) return true; // 最初のブロック
  const timeDiff = block.createdAt - blocks[index - 1].createdAt;
  return timeDiff > 5 * 60 * 1000; // 5分
};
```

#### 2. 自然な区切り
```typescript
// 30分以上の間隔で薄い区切り線
const shouldShowSeparator = (block, index, blocks) => {
  if (index === 0) return false;
  const timeDiff = block.createdAt - blocks[index - 1].createdAt;
  return timeDiff > 30 * 60 * 1000; // 30分
};
```

#### 3. 表示モード
- `flow`: 標準の読みやすいモード
- `compact`: 情報密度を重視
- `fullscreen`: 没入型表示
- `export`: 印刷・PDF用

### スタイル比較

#### ブロック型（従来）
```
┌─────────────────────────────┐
│ ブロック1 | 3文 | 10:15:30 │
├─────────────────────────────┤
│ Hello...  │ こんにちは...  │
└─────────────────────────────┘
```

#### フロー型（新）
```
10:15
  Hello everyone. Today...  │  皆さんこんにちは。今日は...
  Let's start with...       │  始めましょう...

  Next topic is...          │  次の話題は...
```

## 切り替え方法

`FlexibleHistoryDisplay.tsx`の`useFlowDesign`フラグで制御：

```typescript
// フロー型を使用（デフォルト）
const useFlowDesign = true;

// 従来のブロック型に戻す場合
const useFlowDesign = false;
```

## パフォーマンスへの影響

- レンダリング負荷の軽減（ボックスや境界線が減少）
- DOM要素数の削減
- スムーズなスクロール体験

## 今後の拡張

1. **ユーザー設定による切り替え**
   - 設定画面でフロー型/ブロック型を選択可能に

2. **テーマ対応**
   - ダークモード対応
   - カスタムカラースキーム

3. **アクセシビリティ強化**
   - キーボードナビゲーション
   - スクリーンリーダー対応

## 関連ファイル

- [`/src/components/UnifiedHistoryRenderer-Flow.tsx`](../src/components/UnifiedHistoryRenderer-Flow.tsx)
- [`/src/components/FlexibleHistoryDisplay.tsx`](../src/components/FlexibleHistoryDisplay.tsx)
- [`IMPLEMENTATION-STATUS-20250910.md`](../IMPLEMENTATION-STATUS-20250910.md)