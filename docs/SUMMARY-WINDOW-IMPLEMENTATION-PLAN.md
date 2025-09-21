# 要約ウィンドウ実装計画

## 概要
UniVoice 2.0にプログレッシブ要約ウィンドウを実装する計画書です。

## 現在の状況確認

### 既存実装の確認結果
1. **WindowClient.ts** - toggleSummary()メソッドが既に存在
2. **SummaryView.tsx** - 既存の要約ビューコンポーネント
3. **ウィンドウ実装なし** - srcディレクトリに別ウィンドウ実装は存在しない

### アーキテクチャ適合性
- Clean Architecture原則に従い、適切な層に実装
- 既存のWindowClient/WindowManagerパターンを活用
- メイン画面（UniVoice.tsx）との一貫性を保つ

## 実装計画

### フェーズ1: 基盤整備
1. **型定義の作成**
   - `src/types/summary-window.types.ts`
   - ProgressiveSummaryData型の定義
   - ウィンドウ間通信の型定義

2. **Electronメインプロセス側の実装**
   - `electron/main/windows/SummaryWindowManager.ts`
   - WindowRegistryへの登録
   - IPC通信ハンドラーの実装

### フェーズ2: Reactコンポーネント実装
1. **メインコンポーネント**
   - `src/components/SummaryWindow/SummaryWindow.tsx`
   - UniVoice.tsxと同じパターンで実装
   - 設定同期機能の実装

2. **CSS Modules**
   - `src/components/SummaryWindow/SummaryWindow.module.css`
   - UniVoice.module.cssから共通スタイルを踏襲
   - グラスモーフィズム効果の適用

3. **サブコンポーネント**
   - HeaderBar: 8つのアイコンボタン
   - SummaryContent: 段階的要約表示
   - NavigationControls: 段階ナビゲーション

### フェーズ3: 統合
1. **メイン画面との連携**
   - UniVoice.tsxにサマリーボタンハンドラー追加
   - useUnifiedPipelineからのデータ取得
   - 設定の双方向同期

2. **IPC通信の実装**
   - 設定変更の同期
   - データ更新の通知
   - ウィンドウ状態管理

### フェーズ4: テストと最適化
1. **機能テスト**
   - 各ボタンの動作確認
   - キーボードショートカット
   - テキスト選択機能

2. **パフォーマンス最適化**
   - レンダリング最適化
   - メモリ使用量の監視
   - IPC通信の効率化

## 技術的詳細

### コンポーネント構成
```
SummaryWindow/
├── SummaryWindow.tsx          # メインコンポーネント
├── SummaryWindow.module.css   # スタイル定義
├── components/
│   ├── HeaderBar/            # ヘッダーバー（8ボタン）
│   ├── SummaryStage/         # 各段階の要約表示
│   └── Navigation/           # ナビゲーション
└── hooks/
    ├── useSummarySync.ts     # メイン画面との同期
    └── useKeyboardNav.ts     # キーボード操作
```

### 状態管理
- React Context APIを使用
- メイン画面の設定を共有
- ローカル状態は最小限に

### セキュリティ考慮事項
- contextIsolation: true
- nodeIntegration: false
- preloadスクリプト経由のAPI公開

## 実装の優先順位

1. **高優先度**
   - 基本的なウィンドウ表示
   - 要約データの表示
   - 閉じるボタン機能

2. **中優先度**
   - 8つのボタン機能
   - キーボードショートカット
   - 設定同期

3. **低優先度**
   - アニメーション効果
   - レスポンシブデザイン
   - 高度なテキスト選択

## リスクと対策

### リスク1: パフォーマンス問題
- 対策: React.memoとuseMemoの適切な使用

### リスク2: 設定同期の複雑性
- 対策: 単方向データフローの維持

### リスク3: CSS Modulesの重複
- 対策: 共通スタイルの抽出と再利用

## 完了基準
- [ ] 要約ウィンドウが独立して開く
- [ ] 5段階の要約が正しく表示される
- [ ] 8つのボタンが全て機能する
- [ ] メイン画面との設定が同期する
- [ ] キーボードショートカットが動作する
- [ ] テキスト選択が自然に動作する
- [ ] 閉じるボタンとEscキーで閉じられる

## 参考実装
- UniVoice.tsx: メインコンポーネントのパターン
- WindowClient.ts: ウィンドウ管理のパターン
- HeaderControls.tsx: ボタン実装のパターン