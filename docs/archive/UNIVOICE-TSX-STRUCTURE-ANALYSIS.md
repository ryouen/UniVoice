# UniVoice.tsx 構造解析ドキュメント

## ファイル概要
- **ファイルパス**: `src/components/UniVoice.tsx`
- **総行数**: 2779行
- **目的**: リアルタイム音声翻訳アプリケーションのメインコンポーネント
- **作成日**: 2025-09-18
- **最終更新**: 2025-09-21（全面的な再解析・構造把握）

## 主要セクション構造

### 1. インポートと型定義 (1-69行)
```typescript
// Reactと基本フック
import React, { useState, useEffect, useRef, useCallback } from 'react';

// カスタムフック
- useUnifiedPipeline: パイプライン統合
- useSessionMemory: セッション記憶管理
- useBottomResize: ボトムリサイズハンドル
- useHeaderControls: ヘッダー制御

// コンポーネント（Clean Architecture的な分割）
- HeaderControls: 抽出済みヘッダー
- SetupSection, RealtimeSection等: セクション別コンポーネント
- FullscreenModal, FloatingPanel等: モーダル系

// サービス
- sessionStorageService: セッション永続化
- WindowClient: ウィンドウ管理
```

### 2. ウィンドウリサイズ設計ドキュメント (70-122行)
- 高度なウィンドウリサイズ管理システムの詳細設計
- 宣言的高さ管理とリアクティブリサイズのハイブリッドアプローチ
- ResizeModeによる無限ループ防止メカニズム

### 3. コンポーネント定義と初期状態 (135-220行)

#### UniVoiceコンポーネントの開始
```typescript
export const UniVoice: React.FC<UniVoiceProps> = ({
  realtimeSegmentsOverride,
  historyOverride,
  summaryOverride,
  // ... その他のprops
}) => {
```

#### 重要な状態管理
- **activeSession**: 現在のセッション（nullならSetup画面）
- **previousSession**: 再開可能な前回セッション
- **showSetup**: Setup画面表示フラグ（activeSessionに連動）
- **recordingTime**: 録音経過時間
- **isPaused**: 一時停止フラグ

### 4. UI状態とテーマ管理 (224-261行)
```typescript
// テーマとディスプレイ
const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'purple'>('light');
const [displayMode, setDisplayMode] = useState<'both' | 'source' | 'target'>('both');

// セクション表示
const [showHeader, setShowHeader] = useState(true);
const [showSettings, setShowSettings] = useState(true);
const [showQuestionSection, setShowQuestionSection] = useState(false);
```

### 5. Ref定義とClean Architecture実装 (289-296行)
```typescript
const realtimeSectionRef = useRef<HTMLDivElement>(null);
const appContainerRef = useRef<HTMLDivElement>(null);
const questionInputRef = useRef<HTMLTextAreaElement>(null); // 型安全性改善で追加
```

### 6. パイプライン初期化とフック使用 (367-393行)
```typescript
const pipeline = useUnifiedPipeline({
  sourceLanguage: pipelineSourceLang,
  targetLanguage: pipelineTargetLang,
  className: activeSession?.className,
  onError: (error) => { /* エラーハンドリング */ },
  onStatusChange: (status) => { /* ステータス変更処理 */ }
});

const sessionMemory = useSessionMemory();
```

### 7. セッション管理関数 (460-799行)

#### handleStartSession (460-574行) - 新規セッション開始
- 重複チェック（isStartingPipelineフラグ）
- activeSession作成と永続化
- SessionMemoryService開始
- WindowClient.enterMain()呼び出し
- パイプライン開始とエラーハンドリング

#### handleResumeSession (576-753行) - セッション再開
- IPCで最新セッションデータ読み込み
- 履歴・要約・メモの復元
- 録音時間の復元
- パイプライン再開

#### endSession (755-799行) - セッション終了
- パイプライン停止
- 最終レポート生成
- 状態クリアとSetup画面への遷移

### 8. ウィンドウ制御とヘルパー関数 (800-1020行)

#### handleCloseWindow (802-832行)
- window.univoice.window.close()の呼び出し
- WindowClientフォールバック

#### nextClass (835-872行)
- レポート発行と次の授業への遷移
- 全コンテンツのクリア

#### displayContentのメモ化 (882-978行)
- threeLineDisplayからの3段階表示構築
- 空データ時のデフォルト値設定

### 9. 高さ計算とリサイズ管理 (1021-1270行)

#### calculateFixedSectionsHeight (1032-1058行)
- 固定セクションの高さ合計計算
- ヘッダー、設定バー、質問セクション

#### calculateTotalHeight (1071-1097行)
- ウィンドウ全体の高さ計算
- リアルタイムセクションを含む

#### executeWindowResize (1109-1140行)
- Electron IPCでウィンドウリサイズ実行
- ResizeModeの管理

#### ウィンドウリサイズイベントハンドラ (1205-1270行)
- ユーザードラッグの検知
- デバウンス処理
- リアルタイムセクション高さの動的調整

### 10. useEffectフック群 (1318-1562行)

#### 主要なuseEffect
- 自動スクロール (1318-1327行, 1524-1538行)
- キーボードショートカット (1330-1378行)
- 自動保存 (1383-1399行)
- 履歴データ統合 (1439-1449行)
- ブロックガイド非表示タイマー (1489-1497行)
- 録音時間更新 (1500-1521行)

### 11. イベントハンドラー (1567-1926行)

#### togglePause (1567-1606行)
- パイプラインの一時停止/再開
- 一時停止時間の累積管理

#### formatTime (1608-1613行)
- 秒数を HH:MM:SS 形式に変換

#### togglePanel (1615-1636行)
- 履歴/要約パネルの切り替え（外部ウィンドウ）
- WindowClient経由で制御

#### saveAsMemo (1638-1680行)
- 質問入力をメモとして保存
- Target言語→Source言語への翻訳
- questionInputRef使用（型安全性改善済み）

#### saveMemoEdit (1682-1689行)
- メモ編集機能（未実装）

#### ヘルパー関数群 (1696-1926行)
- generateReport: レポート生成
- generateFinalReport: 最終レポート生成
- clearAllContent: 全コンテンツクリア
- setDisplay: 表示モード切り替え
- changeFont: フォントサイズ変更
- cycleTheme: テーマ循環切り替え

### 12. エクスポート機能 (1824-1874行)

#### handleWordExport (1824-1848行)
- Word形式でのエクスポート（未実装）

#### handlePDFExport (1850-1874行)
- PDF形式でのエクスポート（未実装）

### 13. UIイベントハンドラー (1876-1922行)

#### handleHistoryClick (1877-1886行)
- 履歴セクションクリックでモーダル表示

#### handleSummaryClick (1888-1896行)
- 要約セクションクリックでモーダル表示

#### expandInput (1899-1905行)
- 入力エリアの拡大制御

#### generateQuestionTranslation (1908-1922行)
- ユーザー入力の翻訳（Target→Source）

### 14. ヘルパー関数とコンテンツ生成 (1926-2004行)

#### splitText (1930-1938行)
- テキストを3部分に分割

#### getAlignedHistoryContent (1940-1946行)
- 履歴コンテンツのHTML生成（フロー型）

#### getSummaryComparisonContent (1948-2004行)
- 要約比較のHTML生成

### 15. 自動スクロール制御 (2007-2053行)
- userIsScrollingRefによるスクロール状態管理
- ユーザースクロール検出と自動スクロール一時停止

### 16. キーボードショートカット (2056-2135行)
- Alt+S/T/B: 表示モード切り替え
- Alt+H: ヘッダートグル
- Alt+F4: ウィンドウを閉じる
- Ctrl++/-: フォントサイズ
- Escape: ヘッダー再表示
- Ctrl+Shift+R: セッションリセット

### 17. レンダリング (2137-2778行)

#### Setup画面 (2138-2156行)
```tsx
if (showSetup) {
  return <SetupSection ... />;
}
```

#### メイン画面 (2185-2777行)

##### ヘッダー部分 (2209-2357行)
- 録音インジケーター
- 一時停止/終了/次の授業ボタン
- 中央ボタン群（履歴/要約/質問）
- HeaderControlsコンポーネント

##### 設定バー (2360-2471行)
- 表示モード切り替え
- テーマ切り替え
- フォントサイズ調整

##### ミニマルヘッダー (2474-2549行)
- ヘッダー非表示時の最小限コントロール

##### リアルタイムセクション (2551-2600行)
- RealtimeSectionコンポーネント
- ボトムリサイズハンドル

##### プログレッシブ要約 (2602-2630行)
- ProgressiveSummarySectionコンポーネント

##### 質問セクション (2634-2725行)
- textarea（questionInputRef使用）
- メモ一覧/英訳して保存ボタン

##### フローティングパネル (2729-2746行)
- 履歴パネル
- 要約パネル

##### モーダル (2748-2774行)
- FullscreenModal
- MemoModal
- ReportModal


## 重要な発見事項（2025-09-21 完全分析）

### 1. 重複関数は既に削除済み
- 1006行のコメント「重複関数を削除しました（522-800行の完全版を使用）」
- 以前のドキュメントに記載されていた重複は既に解決

### 2. Clean Architectureの段階的実装
- HeaderControlsコンポーネントの抽出済み
- useHeaderControlsフックの使用
- セクション別コンポーネント（SetupSection、RealtimeSection等）のインポートと部分的使用

### 3. 型安全性の改善（完了済み）
- questionInputRefの追加（document.getElementByIdの置き換え）
- window.univoiceの型安全な参照
- WebkitAppRegionの全ての`as any`除去済み

### 4. コンポーネント分割の現状と推奨事項

#### 現在の実装状況
- **Setup画面**: 完全に`SetupSection`コンポーネントに分離済み（2138-2156行）
- **メイン画面のセクション**: 部分的に分離
  - RealtimeSection: 使用中
  - ProgressiveSummarySection: 使用中
  - HeaderControls: 使用中
- **モーダル**: 完全に分離済み
  - FullscreenModal
  - MemoModal
  - ReportModal
  - FloatingPanel

#### リファクタリングタスク「3つのコンポーネントに分割」について
現状を踏まえた推奨：
1. **継続すべき**: メイン画面のレンダリング部分（2185-2777行）が592行と巨大
2. **段階的アプローチ**: 
   - 第1段階: ヘッダー全体の抽出（通常/ミニマル両方）
   - 第2段階: 設定バーの抽出
   - 第3段階: 質問セクションの抽出
3. **既存の良い実践を踏襲**: HeaderControlsのような段階的な抽出

### 5. アーキテクチャ上の改善ポイント

#### 責任の分離が必要な箇所
1. **巨大なコンポーネント**: 2779行は保守性の観点から大きすぎる
2. **状態管理の集中**: 約40個の状態変数が一箇所に集中
3. **イベントハンドラーの混在**: ビジネスロジックとUIロジックの混在

#### 推奨される改善順序
1. 重複関数の削除 ✅（完了済み）
2. 型安全性の改善 ✅（完了済み）
3. useAudioCapture等のカスタムフック作成（useUnifiedPipelineの分割）
4. UIコンポーネントの更なる分割
5. 状態管理の分散化（useReducerやContext APIの活用）

### 6. 発見された技術的特徴

#### 高度な実装
- ResizeModeによる無限ループ防止メカニズム
- ボトムリサイズハンドル（useBottomResize）の実装
- 一時停止時間の累積管理（pausedDurationRef）
- デバウンス処理による最適化

#### 未実装/仮実装の機能
- saveMemoEdit（1682-1689行）
- handleWordExport/handlePDFExport（exportUtils未実装）
- volumeLevel（常に0）

### 7. 総括

UniVoice.tsxは機能的には完成度が高いが、Clean Architecture観点では改善の余地がある。特に：
- **Good**: 型安全性、部分的なコンポーネント分離、カスタムフックの活用
- **Need Improvement**: ファイルサイズ、状態管理の集中、更なるコンポーネント分離

現在のタスクリストは適切な優先順位で設定されており、特にuseUnifiedPipelineの分割から着手することで、ビジネスロジックの整理が進み、その後のUIコンポーネント分割がスムーズになると考えられる。