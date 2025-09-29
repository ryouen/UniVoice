# UniVoicePerfect.tsx 移行分析レポート

## ファイル概要
- **総行数**: 1862行
- **主要セクション**: 6つ
- **状態管理**: 30以上のuseState

## 機能分離マッピング

### 1. 状態管理（78-180行）

#### Domain層へ移動
```typescript
// → services/domain/SessionService.ts
- selectedClass
- recordingTime
- recordingStartTimeRef
- autoSaveTime

// → services/domain/TranslationService.ts  
- currentOriginal
- currentTranslation
- realtimeBuffer
- historyEntries

// → services/domain/SummaryService.ts
- summaryJapanese
- summaryEnglish
- memoList
```

#### UI層に残す
```typescript
// → components/UniVoice/UniVoiceContainer.tsx
- showSetup
- isPaused
- expandedSection
- showFullscreenModal
- showMemoModal
- showReportModal
- modalTitle
- modalContent
- showBlockGuides
- isResizing
- resizingSection
- sectionHeights
```

### 2. イベントハンドラー（381-737行）

#### Domain層へ移動
```typescript
// → services/domain/SessionService.ts
- startSession() // セッション開始ロジック
- endSession()   // セッション終了ロジック
- togglePause()  // 一時停止制御

// → services/domain/ReportService.ts
- generateFinalReport()
- generateReport()

// → services/domain/TranslationService.ts
- generateEnglishQuestion()

// → services/domain/DataService.ts
- clearAllContent()
- saveAsMemo()
- saveMemoEdit()
```

#### UI層に残す
```typescript
// → components/UniVoice/SessionControls.tsx
- handleKeyDown()
- handleWordExport()
- handlePDFExport()

// → components/UniVoice/LayoutControls.tsx
- handleResizeMouseDown()
- handleHistoryClick()
- handleSummaryClick()
- expandInput()
```

### 3. 新しいファイル構造

```
UniVoice/
├── src/
│   ├── components/
│   │   └── UniVoice/
│   │       ├── UniVoiceContainer.tsx     # メインコンテナ（状態管理）
│   │       ├── SetupScreen.tsx           # セットアップ画面
│   │       ├── SessionControls.tsx       # セッション制御UI
│   │       ├── TranslationDisplay.tsx    # 翻訳表示（③④ブロック）
│   │       ├── HistorySection.tsx        # 履歴表示（①②ブロック）
│   │       ├── SummarySection.tsx        # 要約表示（⑤⑥ブロック）
│   │       ├── UserInputSection.tsx      # ユーザー入力（⑦⑧ブロック）
│   │       ├── ModalComponents.tsx       # モーダル関連
│   │       └── ResizeHandles.tsx         # リサイズハンドル
│   │
│   ├── hooks/
│   │   ├── useSession.ts                 # セッション管理フック
│   │   ├── useTranslation.ts             # 翻訳管理フック
│   │   ├── useSummary.ts                 # 要約管理フック
│   │   └── useLayout.ts                  # レイアウト管理フック
│   │
│   └── utils/
│       ├── formatters.ts                 # 時間フォーマット等
│       └── localStorage.ts               # LocalStorage操作
│
└── electron/
    └── services/
        └── domain/
            ├── SessionService.ts          # セッション管理
            ├── TranslationService.ts      # 翻訳処理
            ├── SummaryService.ts          # 要約処理
            ├── ReportService.ts           # レポート生成
            └── DataPersistenceService.ts # データ永続化
```

## 移行手順

### Phase 1: ドメインサービスの作成
1. SessionService.ts - セッション管理ロジック
2. TranslationService.ts - 翻訳とバッファ管理
3. SummaryService.ts - 要約生成と管理
4. ReportService.ts - レポート生成

### Phase 2: カスタムフックの作成
1. useSession - セッション状態とAPI
2. useTranslation - 翻訳状態とストリーム
3. useSummary - 要約状態と更新
4. useLayout - UI状態とリサイズ

### Phase 3: UIコンポーネントの分割
1. SetupScreen - 861-1004行を抽出
2. TranslationDisplay - リアルタイム表示部分
3. HistorySection - 履歴表示部分
4. その他各セクション

### Phase 4: 統合とテスト
1. UniVoiceContainer.tsxで全体を統合
2. 既存の機能が動作することを確認
3. パフォーマンステスト

## 効果測定指標

### Before
- ファイルサイズ: 1862行
- 責任: 15以上（UI、ロジック、状態管理、etc）
- テスタビリティ: 低（モノリシック）

### After（予測）
- 最大ファイルサイズ: 200行以下
- 責任: 各ファイル1-2個
- テスタビリティ: 高（単体テスト可能）
- StreamCoalescer統合によるUI更新: 50%削減

## リスクと対策

### リスク
1. 状態の同期問題
2. パフォーマンス劣化
3. 既存機能の破壊

### 対策
1. Zustandによる状態管理統一
2. React.memoとuseMemoの適切な使用
3. 段階的移行とE2Eテスト