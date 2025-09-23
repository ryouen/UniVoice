# 全文履歴ウィンドウ実装戦略

## 調査結果のまとめ

### 1. 現在の実装状況

#### HistoryView.tsx
- 基本的な骨格のみ実装
- デモデータによる表示
- IPC通信は未実装（TODOコメントあり）

#### SummaryWindow.tsx
- 完成度の高い実装
- グラスモーフィズム効果対応
- 再利用可能な機能：
  - ヘッダーコントロール（表示モード切替、テーマ、フォントサイズ）
  - キーボードショートカット
  - 設定の同期機能
  - レスポンシブデザイン

#### データフロー
- **useUnifiedPipeline**：履歴データを管理
  - `history`: Translation[]
  - `historyBlocks`: HistoryBlock[]
  - `FlexibleHistoryGrouper`でグループ化
- **SentenceCombiner**：初期化はされているが、実際の処理は未実装
- **IPC通信**：履歴データ取得用のコマンドが未実装

### 2. 技術的な課題

1. **履歴データの取得方法**
   - 現在、履歴データはレンダラープロセス（UniVoice.tsx）で管理
   - 履歴ウィンドウは別プロセスなので、IPCでデータを渡す必要がある

2. **SentenceCombinerの統合状況**
   - CLAUDE.mdでは「統合済み」とあるが、実際は未完成
   - handleCombinedSentenceメソッドが実装されていない

3. **ウィンドウ管理**
   - WindowRegistry：実装済み
   - WindowClient：toggleHistoryメソッドあり
   - しかし、履歴ウィンドウを開く際のデータ渡しが未実装

## 実装戦略

### Phase 1: 基盤整備（履歴データアクセス）

#### 1.1 IPC通信の拡張
```typescript
// electron/services/ipc/contracts.ts に追加
export const GetFullHistoryQuerySchema = z.object({
  type: z.literal('getFullHistory'),
  correlationId: z.string(),
  options: z.object({
    includeTranslations: z.boolean().default(true),
    includeSummaries: z.boolean().default(false),
    groupByParagraph: z.boolean().default(true)
  }).optional()
});

export const FullHistoryResponseSchema = z.object({
  type: z.literal('fullHistoryResponse'),
  correlationId: z.string(),
  data: z.object({
    blocks: z.array(z.object({
      id: z.string(),
      type: z.enum(['paragraph', 'sentence', 'segment']),
      sentences: z.array(z.object({
        id: z.string(),
        original: z.string(),
        translation: z.string(),
        timestamp: z.number(),
        segmentIds: z.array(z.string()).optional()
      }))
    })),
    metadata: z.object({
      totalSegments: z.number(),
      totalSentences: z.number(),
      totalWords: z.number(),
      duration: z.number()
    })
  })
});
```

#### 1.2 履歴データ管理サービスの実装
```typescript
// electron/services/domain/HistoryDataService.ts
export class HistoryDataService {
  private historyData: Map<string, HistoryBlock> = new Map();
  
  // SentenceCombinerから結果を受け取って保存
  addCombinedSentence(sentence: CombinedSentence) {
    // 実装
  }
  
  // 全履歴データを取得
  getFullHistory(): FullHistoryData {
    // 実装
  }
}
```

### Phase 2: SummaryWindowベースの履歴ウィンドウ実装

#### 2.1 コンポーネント構造の変更

**SummaryWindowから流用する部分：**
- ヘッダーバーのレイアウト
- ボタンコンポーネント（統一CSSシステム）
- テーマ切り替え機能
- フォントサイズ調整機能
- グラスモーフィズム効果

**除去する部分：**
- ナビゲーション（前へ/次へ）ボタン
- ステージ表示
- 要約特有のデータ構造

**新規追加する部分：**
- 履歴リスト表示
- 検索/フィルター機能
- エクスポート機能

#### 2.2 新しいHistoryWindowコンポーネント

```typescript
// src/windows/HistoryWindow.tsx
import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import styles from './HistoryWindow.module.css';

interface HistoryWindowProps {
  currentTheme: 'light' | 'dark' | 'purple';
  fontScale: number;
  displayMode: 'both' | 'source' | 'target';
  onThemeChange: (theme: 'light' | 'dark' | 'purple') => void;
  onFontScaleChange: (scale: number) => void;
  onDisplayModeChange: (mode: 'both' | 'source' | 'target') => void;
  onClose: () => void;
}

export const HistoryWindow: React.FC<HistoryWindowProps> = (props) => {
  const [historyData, setHistoryData] = useState<FullHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // IPCで履歴データを取得
    fetchHistoryData();
  }, []);
  
  // SummaryWindowのヘッダーコントロールを再利用
  // 中央のナビゲーション部分を検索ボックスに変更
  // コンテンツ部分を履歴リスト表示に変更
};
```

### Phase 3: データ統合とリアルタイム更新

#### 3.1 SentenceCombinerの完全統合
- UnifiedPipelineServiceでhandleCombinedSentenceを実装
- 履歴データの永続化（SessionStorageService活用）
- リアルタイムでの履歴ウィンドウ更新

#### 3.2 高品質翻訳の統合
- 二段階翻訳システムの履歴への反映
- 履歴用翻訳（gpt-5-mini）の結果を履歴ウィンドウに表示

## 実装優先順位

1. **最優先：基本的な履歴表示**
   - SummaryWindowのコードをコピーしてHistoryWindowを作成
   - 不要な部分（ナビゲーション等）を削除
   - useUnifiedPipelineから取得した履歴データを表示

2. **中優先：IPC通信の実装**
   - 履歴データ取得用のIPCコマンド実装
   - ウィンドウ間のデータ受け渡し

3. **低優先：高度な機能**
   - 検索/フィルター機能
   - エクスポート機能
   - リアルタイム更新

## 必要なファイルの変更

1. **新規作成**
   - `src/windows/HistoryWindow.tsx`
   - `src/windows/HistoryWindow.module.css`
   - `electron/services/domain/HistoryDataService.ts`

2. **修正**
   - `electron/services/ipc/contracts.ts` - 履歴用のスキーマ追加
   - `electron/services/ipc/gateway.ts` - 履歴データ取得ハンドラー
   - `electron/main.ts` - 履歴ウィンドウ用のルート追加
   - `src/components/HistoryView.tsx` - HistoryWindowを使用するように変更

3. **参照**
   - `src/windows/SummaryWindow.tsx` - コピー元として使用
   - `src/windows/SummaryWindow.module.css` - スタイルの参考

## リスクと対策

1. **データ量の問題**
   - 長時間のセッションでは履歴データが膨大になる
   - 対策：仮想スクロール（react-window等）の導入

2. **パフォーマンス**
   - 大量のデータ描画でUIが重くなる可能性
   - 対策：ページネーションまたは遅延読み込み

3. **メモリ使用量**
   - 全履歴をメモリに保持すると問題になる可能性
   - 対策：必要な部分のみロード、古いデータの圧縮

## 成功基準

1. SummaryWindowと同等のUI品質
2. 全履歴データの正確な表示
3. スムーズなスクロールとレスポンシブな操作
4. テーマ/フォントサイズ/表示モードの設定同期
5. 1万件以上の履歴でも快適に動作

---

作成日: 2025-09-23
作成者: Claude Code