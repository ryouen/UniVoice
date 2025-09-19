# UniVoice リファクタリング実装計画

作成日: 2025-09-19
作成者: Claude Code (Senior Engineer)
ステータス: 実装開始

## エグゼクティブサマリー

2773行の巨大なUniVoice.tsxコンポーネントを、Clean Architecture原則に基づいて分割・再構築します。
既存の分離済みコンポーネントが存在することを確認しました。これらを統合・強化していきます。

## 現状分析

### 問題点
- **ファイルサイズ**: 2773行（推奨の5倍以上）
- **状態管理**: 70+ useState hooks
- **副作用**: 30+ useEffect hooks
- **責任過多**: UI、ビジネスロジック、状態管理、外部通信すべて混在

### 既存資産
```
src/components/UniVoice/
├── components/
│   ├── Header/           ✅ 分離済み
│   ├── ControlsSection/  ✅ 分離済み
│   └── TranscriptSection/ ✅ 分離済み
└── hooks/
    └── useSessionControl.ts ✅ 分離済み
```

## 実装戦略

### Phase 0: 準備とバックアップ（完了）
- GitHubへのコミット完了
- 現状分析完了
- 既存コンポーネントの確認完了

### Phase 1: 既存コンポーネントの統合（現在）

#### 1.1 useSessionControl フックの統合
```typescript
// UniVoice.tsx の該当部分を置き換え
import { useSessionControl } from './hooks/useSessionControl';

// 削除対象：
// - handleStartSession
// - handleResumeSession
// - endSession
// - nextClass
// - togglePause
// - recordingTime関連のstate
```

#### 1.2 Header コンポーネントの統合
```typescript
// UniVoice.tsx から Header 関連を削除
import { Header } from './components/Header';

// 削除対象：
// - ヘッダー関連のJSX
// - recordingTime表示ロジック
// - memoCount計算
```

#### 1.3 ControlsSection の統合
```typescript
// UniVoice.tsx から制御部分を削除
import { ControlsSection } from './components/ControlsSection';

// 削除対象：
// - 録音開始/停止ボタン
// - 一時停止ボタン
// - 言語選択
```

#### 1.4 TranscriptSection の統合
```typescript
// UniVoice.tsx から表示部分を削除
import { TranscriptSection } from './components/TranscriptSection';

// 削除対象：
// - リアルタイム表示エリア
// - displayText関連
```

### Phase 2: 新規コンポーネントの分離

#### 2.1 SetupSection
- セットアップ画面全体
- クラス選択
- 言語設定

#### 2.2 HistorySection
- 履歴表示
- 履歴管理

#### 2.3 SummarySection
- 要約表示
- プログレッシブ要約

#### 2.4 ExportModal
- Word/PDFエクスポート
- レポート生成

### Phase 3: Context API導入

#### 3.1 SessionContext
```typescript
interface SessionContextType {
  activeSession: Session | null;
  previousSession: Session | null;
  showSetup: boolean;
  // ...
}
```

#### 3.2 UIContext
```typescript
interface UIContextType {
  theme: Theme;
  displayMode: DisplayMode;
  fontScale: number;
  // ...
}
```

#### 3.3 PipelineContext
```typescript
interface PipelineContextType {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  // ...
}
```

### Phase 4: 状態管理の外部化

#### 4.1 Zustand Store設計
```typescript
interface UniVoiceStore {
  // Session
  session: SessionSlice;
  // UI
  ui: UISlice;
  // Pipeline
  pipeline: PipelineSlice;
  // Actions
  actions: ActionSlice;
}
```

## リスク管理

### リスクマトリクス
| リスク | 可能性 | 影響度 | 対策 |
|--------|--------|--------|------|
| パフォーマンス低下 | 中 | 高 | React.memo, useMemo活用 |
| 機能破壊 | 低 | 高 | 段階的移行、テスト充実 |
| 型安全性低下 | 低 | 中 | TypeScript strict維持 |
| 再レンダリング増加 | 高 | 中 | Context分割、最適化 |

### 緩和策
1. **段階的移行**: 一度にすべて変更せず、コンポーネントごとに移行
2. **テスト駆動**: 各フェーズでテストを追加・実行
3. **パフォーマンス監視**: Chrome DevToolsでレンダリング監視
4. **ロールバック準備**: 各フェーズでGitタグ作成

## テスト戦略

### 単体テスト
- 各コンポーネントの独立テスト
- フックの動作確認
- 純粋関数のテスト

### 統合テスト
- コンポーネント間の連携
- Context経由のデータフロー
- イベントハンドリング

### E2Eテスト
- ユーザーシナリオの再現
- 録音開始→停止→エクスポート
- エラーケース

## 成功基準

### 定量的指標
- [ ] 各ファイル500行以下
- [ ] 責任範囲1ファイル1つ
- [ ] テストカバレッジ80%以上
- [ ] パフォーマンス現状維持以上

### 定性的指標
- [ ] コードの可読性向上
- [ ] 保守性の改善
- [ ] 拡張性の確保
- [ ] 開発者体験の向上

## タイムライン

| フェーズ | 作業内容 | 予定時間 | ステータス |
|---------|----------|----------|------------|
| Phase 0 | 準備 | 1h | ✅ 完了 |
| Phase 1 | 既存統合 | 3h | 🚧 進行中 |
| Phase 2 | 新規分離 | 4h | ⏳ 待機中 |
| Phase 3 | Context | 2h | ⏳ 待機中 |
| Phase 4 | Store | 3h | ⏳ 待機中 |
| テスト | 全体 | 2h | ⏳ 待機中 |

## 実装開始

### 第1ステップ: useSessionControlの統合確認
1. UniVoice.tsxでuseSessionControlがインポートされているか確認
2. 重複している機能を特定
3. 段階的に置き換え
4. テスト実行

---

次のアクション: useSessionControlフックの統合確認から開始