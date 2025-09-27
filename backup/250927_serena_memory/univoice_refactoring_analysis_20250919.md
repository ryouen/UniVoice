# UniVoice.tsx リファクタリング深層分析

## 現在の問題点
- **2773行の巨大ファイル** - 明確なSRP違反
- **70+ useState hooks** - 状態管理の複雑性
- **30+ useEffect hooks** - 副作用の散在
- **14+ イベントハンドラー** - UIロジックの混在
- **責任範囲の混在** - UI、ビジネスロジック、状態管理、外部通信

## 責任範囲マッピング

### 1. セッション管理 (Session Management)
- activeSession, previousSession state
- handleStartSession, handleResumeSession, endSession
- SessionStorageService との連携

### 2. UI状態管理 (UI State Management)
- showSetup, showHeader, showSettings
- expandedSection, modal states
- theme, displayMode, fontScale

### 3. リアルタイム表示管理 (Realtime Display)
- displayText state
- SyncedRealtimeDisplayManager
- 音声認識結果の表示更新

### 4. ウィンドウ管理 (Window Management)
- realtimeSectionHeight
- WindowClient との連携
- リサイズハンドリング

### 5. 音声パイプライン制御 (Pipeline Control)
- useUnifiedPipeline hook
- 録音開始/停止/一時停止

### 6. 履歴・要約管理 (History & Summary)
- historyEntries
- summaryJapanese, summaryEnglish
- progressiveSummary

### 7. エクスポート機能 (Export Features)
- handleWordExport, handlePDFExport
- レポート生成

### 8. キーボード・マウス操作 (Input Handling)
- Keyboard shortcuts (H, S, Q keys)
- Mouse events for resizing

## リファクタリング戦略

### Phase 1: カスタムフックへの分離
1. **useSessionControl** - セッション管理ロジック
2. **useUIState** - UI状態管理
3. **useRealtimeDisplay** - リアルタイム表示
4. **useWindowManagement** - ウィンドウ制御
5. **useExportFeatures** - エクスポート機能

### Phase 2: コンポーネント分割
1. **Header** - ヘッダー部分
2. **SetupSection** - セットアップ画面
3. **ControlsSection** - 録音コントロール
4. **TranscriptSection** - 文字起こし表示
5. **HistorySection** - 履歴表示
6. **SummarySection** - 要約表示
7. **ExportModal** - エクスポートモーダル

### Phase 3: Context API導入
1. **SessionContext** - セッション状態の共有
2. **UIContext** - UI設定の共有
3. **PipelineContext** - パイプライン状態の共有

### Phase 4: 状態管理の外部化
1. **Redux Toolkit** or **Zustand** 導入検討
2. グローバル状態とローカル状態の分離
3. 永続化レイヤーの統合

## 実装優先順位

1. **最優先**: useSessionControl フックの分離
   - 既存の SessionStorageService と連携
   - セッション開始/終了ロジックの隔離

2. **高優先**: Header, ControlsSection コンポーネント分離
   - 視覚的に独立している部分から着手
   - 影響範囲が限定的

3. **中優先**: TranscriptSection の分離
   - リアルタイム表示の中核部分
   - パフォーマンスへの影響を慎重に測定

4. **低優先**: Context API の導入
   - 大規模な変更となるため最後に実施

## リスクと対策

### リスク
1. パフォーマンス低下（過度な再レンダリング）
2. 既存機能の破壊
3. 型安全性の低下

### 対策
1. React.memo, useMemo, useCallback の適切な使用
2. 段階的な移行とテストの徹底
3. TypeScript の strict mode 維持

## メトリクス目標

- ファイルサイズ: < 500行/ファイル
- 責任範囲: 1ファイル1責任
- テストカバレッジ: > 80%
- パフォーマンス: 現状維持または改善