# useUnifiedPipeline.ts 構造解析ドキュメント

## ファイル概要
- **ファイルパス**: `src/hooks/useUnifiedPipeline.ts`
- **総行数**: ~~1596行~~ → 1494行（useAudioCapture分離後）
- **目的**: リアルタイム音声翻訳パイプラインの統合管理フック
- **作成日**: 2025-09-21
- **更新日**: 2025-09-21（useAudioCapture分離実装）
- **分析手法**: 全文読み込みによる完全構造把握

## 主要セクション構造

### 1. インポートと型定義 (1-75行)
```typescript
// React標準フック
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// 独自フック
- useSessionMemory: セッションメモリ管理
- useAudioCapture: 音声キャプチャ管理（新規追加）

// 型定義
- Translation, Summary, Vocabulary等のドメイン型
- PipelineEvent: イベント型定義（contracts.tsから）

// マネージャー
- ~~AudioWorkletProcessor: 型安全なAudioWorklet実装~~ → useAudioCaptureへ移動
- SyncedRealtimeDisplayManager: リアルタイム表示管理
- FlexibleHistoryGrouper: 履歴グループ化
- IncrementalTextManager: インクリメンタルテキスト管理
```

### 2. インターフェース定義 (77-118行)
```typescript
interface UseUnifiedPipelineOptions {
  sourceLanguage: string;
  targetLanguage: string;
  className?: string;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
  onTranslation?: (translation: Translation) => void;
  onSummary?: (summary: Summary) => void;
  isEnabled?: boolean;
}

interface UseUnifiedPipelineReturn {
  // 状態管理
  isRunning: boolean;
  currentOriginal: string;
  currentTranslation: string;
  // ... 多数の戻り値
}

interface PipelineState {
  status: 'idle' | 'starting' | 'listening' | 'processing' | 'stopping' | 'stopped';
  startTime: number | null;
}
```

### 3. フック本体と状態管理 (119-374行)

#### カスタムフックの開始
```typescript
export const useUnifiedPipeline = ({
  sourceLanguage,
  targetLanguage,
  className,
  onError,
  onStatusChange,
  onTranslation,
  onSummary,
  isEnabled = true,
}: UseUnifiedPipelineOptions): UseUnifiedPipelineReturn => {
```

#### 主要な状態変数（18個以上）
- **パイプライン状態**: isRunning, state, error
- **表示用状態**: currentOriginal, currentTranslation, displayPairs
- **履歴管理**: history, historyBlocks
- **要約・語彙**: summaries, vocabulary, finalReport
- **言語設定**: currentSourceLanguage, currentTargetLanguage

#### Ref管理（多数）
```typescript
const currentCorrelationId = useRef<string | null>(null);
const segmentTranslationMap = useRef(new Map());
const translationTimeouts = useRef(new Map());
const addedToHistorySet = useRef(new Set());
const addedToGrouperSet = useRef(new Set());
const paragraphTranslationMap = useRef(new Map());
```

### 4. Manager初期化 (248-278行)
```typescript
// SyncedRealtimeDisplayManager: リアルタイム表示の同期管理
const displayManagerRef = useRef<SyncedRealtimeDisplayManager>();
useEffect(() => {
  displayManagerRef.current = new SyncedRealtimeDisplayManager();
}, []);

// FlexibleHistoryGrouper: 履歴のグループ化
const historyGrouperRef = useRef<FlexibleHistoryGrouper>();
useEffect(() => {
  historyGrouperRef.current = new FlexibleHistoryGrouper();
}, []);

// IncrementalTextManager: テキスト更新管理
const originalTextManagerRef = useRef(new IncrementalTextManager());
```

### 5. SessionMemory統合 (280-301行)
```typescript
const {
  isSessionActive,
  sessionContent,
  startSession,
  completeSession,
  addTranslation: addTranslationToMemory,
  updateTranslation: updateTranslationInMemory,
  addSummary: addSummaryToMemory
} = useSessionMemory();
```

### 6. パイプラインイベントハンドラー (403-1078行) - 🔴 最大のセクション

#### handlePipelineEvent関数 (403-1077行)
巨大なswitch文で全イベントタイプを処理:

##### ASRイベント処理 (410-642行)
- 音声認識の結果処理
- インクリメンタル/ファイナル判定
- セグメント管理と表示更新

##### 翻訳イベント処理 (644-816行)
- リアルタイム翻訳の処理
- 高品質翻訳（履歴用）の更新
- 翻訳タイムアウト管理

##### セグメントイベント処理 (818-871行)
- セグメント履歴への追加
- 不正なデータのフィルタリング

##### 要約イベント処理 (873-928行)
- プログレッシブ要約の追加/更新
- 単語数ベースの重複管理

##### その他のイベント (930-1077行)
- progressiveSummary
- status
- vocabulary
- finalReport
- combinedSentence（文結合）
- paragraphComplete（コメントアウト中）
- error

### 7. イベントリスナー設定 (1084-1176行)
```typescript
useEffect(() => {
  // IPC イベント購読
  const unsubscribe = window.univoice?.onPipelineEvent?.((event) => {
    handlePipelineEventRef.current(event);
  });
  
  // 直接イベントリスナー（Electron）
  window.electron.on('current-original-update', originalUpdateHandler);
  window.electron.on('current-translation-update', translationUpdateHandler);
  window.electron.on('progressive-summary', progressiveSummaryHandler);
  
  // クリーンアップ
  return () => { /* ... */ };
}, []);
```

### 8. 制御関数群 (1179-1306行)

#### startFromMicrophone (1179-1234行)
- レース条件防止（連打対策）
- SessionMemoryService開始
- パイプライン開始とエラーハンドリング

#### stop (1236-1278行)
- パイプライン停止
- AudioCapture停止
- SessionMemoryService完了

#### translateUserInput (1280-1306行)
- ユーザー入力の翻訳（仮実装）

### 9. ~~AudioCapture実装~~ → useAudioCaptureフックへ分離完了

#### 分離前（1309-1426行、合計117行）
- MediaStream取得とAudioContext管理
- AudioWorkletProcessor作成と制御
- PCM16データの送信処理
- リソースクリーンアップ

#### 分離後
```typescript
// 音声キャプチャフックの使用（537-553行）
const {
  isCapturing,
  error: audioCaptureError,
  startCapture,
  stopCapture,
  audioMetrics
} = useAudioCapture({
  enabled: isEnabled,
  onError: (error) => {
    console.error('[useUnifiedPipeline] Audio capture error:', error);
    setError(error.message);
    if (onError) {
      onError(error.message);
    }
  }
});
```

### 10. クリア関数群 (1429-1468行)
- clearHistory: 履歴クリア
- clearSummaries: 要約クリア
- clearError: エラークリア
- clearAll: 全データクリア（IPC含む）

### 11. 高度な機能 (1470-1518行)
- generateVocabulary: 語彙生成
- generateFinalReport: 最終レポート生成

### 12. 言語管理 (1520-1531行)
- updateLanguages: 言語設定の動的更新
- useEffectによる言語変更の反映

### 13. 戻り値の構築 (1533-1595行)
```typescript
return {
  // 状態
  isRunning,
  currentOriginal,
  currentTranslation,
  displayPairs,
  threeLineDisplay,
  historyBlocks,
  groupedHistory: /* レガシー互換性のための変換 */,
  realtimeSegments: /* レガシー互換性のための変換 */,
  
  // 制御関数
  startFromMicrophone,
  stop,
  translateUserInput,
  generateVocabulary,
  generateFinalReport,
  
  // クリア関数
  clearHistory,
  clearSummaries,
  clearError,
  clearAll,
  
  // 言語管理
  updateLanguages,
  currentSourceLanguage,
  currentTargetLanguage,
  
  // レガシー互換性
  startFromFile: startFromMicrophone,
  refreshState: async () => {},
};
```

## 重要な発見事項とリファクタリング提案

### 1. 🔴 巨大すぎる責任範囲
- **問題**: 1596行という巨大なフックが多くの責任を持ちすぎている
- **影響**: 保守性低下、テスト困難、再利用性の欠如

### 2. 🔴 handlePipelineEventの巨大なswitch文
- **問題**: 670行に及ぶ巨大なイベントハンドラー
- **影響**: 可読性低下、新イベントタイプ追加時の複雑性

### 3. 状態管理の複雑性
- **問題**: 18個以上の状態変数、多数のRef
- **影響**: 状態の同期が困難、デバッグが複雑

### 4. ParagraphBuilderの無効化
- **問題**: コメントアウトされたコードが複数箇所に存在
- **決定**: 一時的に無効化されている機能

### 5. レガシー互換性の維持
- **良い点**: 既存UIとの互換性を保ちながら内部実装を改善
- **例**: groupedHistory, realtimeSegmentsの変換処理

## Clean Architecture観点からの改善提案

### 第1段階: カスタムフックへの分割
1. **useAudioCapture**: 音声キャプチャロジック（1309-1426行）
2. **useRealtimeTranscription**: ASRイベント処理（410-642行）
3. **useTranslationQueue**: 翻訳キュー管理（644-816行）
4. **useSummaryGeneration**: 要約生成ロジック（873-928行）
5. **useSessionControl**: セッション制御（開始/停止）

### 第2段階: イベントハンドラーの分離
```typescript
// イベントハンドラーをストラテジーパターンで実装
const eventHandlers: Record<string, EventHandler> = {
  asr: handleASREvent,
  translation: handleTranslationEvent,
  segment: handleSegmentEvent,
  summary: handleSummaryEvent,
  // ...
};
```

### 第3段階: 状態管理の改善
- useReducerによる状態の統合管理
- Context APIによる状態の分散

### 実装優先順位
1. ✅ 型安全性の改善（完了）
2. ✅ useAudioCapture フックの作成（完了 - 2025-09-21）
3. ✅ useRealtimeTranscription フックの作成（完了 - 2025-09-21）
4. 🚧 useTranslationQueue フックの作成（次の作業）
5. 🚧 その他のカスタムフック作成

### リファクタリング成果（2025-09-21）
- **useAudioCapture分離完了**
  - 削減行数: 102行（1596行 → 1494行）
  - 新規作成: `src/hooks/useAudioCapture.ts`（263行）
  - 責任の明確化: 音声キャプチャロジックが独立
  - 再利用性向上: 他のコンポーネントでも使用可能に

- **useRealtimeTranscription分離完了**
  - 削減行数: 121行（1494行 → 1373行）
  - 新規作成: `src/hooks/useRealtimeTranscription.ts`（308行）
  - 責任の明確化: ASRイベント処理とリアルタイム表示管理が独立
  - マネージャー統合: SyncedRealtimeDisplayManager, IncrementalTextManager, TranslationTimeoutManagerを一元管理
  - 削除: handleTranslationTimeout関数とその関連コード
  - 総削減: 223行（1596行 → 1373行）

### 総括
useUnifiedPipelineの段階的リファクタリングが順調に進行中。useAudioCaptureとuseRealtimeTranscriptionの分離により、責任が明確化され、コードの保守性とテスタビリティが大幅に向上した。次はuseTranslationQueueの分離に着手する。