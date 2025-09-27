# UniVoice 2.0 現在の重大な課題（2025-09-19更新）

## 🔴 最優先課題

### 1. ✅ データ永続化（2025-09-18解決）
**解決内容**: SessionMemoryServiceの統合実装完了
- **実装内容**:
  - SessionStorageService: セッション情報保存（既に使用中）
  - SessionMemoryService: 履歴データ永続化（統合完了）
  - 60秒ごとの自動保存
- **残課題**:
  - セッション再開UIの実装
  - 高品質翻訳の更新処理
  - エクスポート機能のUI統合
- **関連ファイル**:
  - `src/services/SessionStorageService.ts`（セッション情報保存に使用中）
  - `src/domain/services/SessionMemoryService.ts`（履歴データ永続化に統合済み）
  - `src/hooks/useSessionMemory.ts`（統合フック）

### 2. Setup画面の統一問題
**問題**: SetupScreenとSetupSectionの2つのSetup画面が混在
- **影響**:
  - 画面遷移フローの破綻
  - 無限ループの可能性
  - ユーザー体験の悪化
- **解決方針**:
  - `src/components/SetupScreen.tsx` を削除
  - `App.tsx` から SetupScreen関連コードを削除
  - UniVoice.tsx内の既存showSetupロジックで制御
- **関連ファイル**:
  - `src/components/SetupScreen.tsx`（削除対象）
  - `src/App.tsx`
  - `src/components/UniVoice.tsx`

### 3. 外部ウィンドウ管理の問題
**問題**: 履歴・要約ボタンが外部ウィンドウを開かない
- **現象**:
  - 要約ボタンを押しても何も起きない
  - 履歴ボタンが内部パネルで開く（外部ウィンドウではない）
  - 履歴ボタンクリック時に新しいMain画面が重複して立ち上がる
- **2025-09-18の修正内容**:
  - togglePanel関数を修正（内部パネル表示を無効化）
  - 要約ボタンのonClickをtogglePanel('summary')に変更
  - WindowAPIにsetBoundsメソッドを追加
- **関連ファイル**:
  - `src/components/UniVoice.tsx`（togglePanel関数）
  - `electron/main/WindowRegistry.ts`（外部ウィンドウ管理）
  - `electron/main.ts`（IPCハンドラー）

## 🟨 重要な技術的負債

### 1. IPCハンドラーの未実装
- check-today-session
- get-available-sessions
- load-session
これらのハンドラーがmain.tsで未実装

### 2. SentenceCombiner統合の誤解
- 実際は統合済み（UnifiedPipelineService.ts:203）
- 多くのドキュメントで「未統合」と誤記載
- ドキュメント更新が必要

### 3. エラーハンドリングの不足
- 一部のPromiseでcatchがない
- エラーログが不十分
- ユーザーへのエラー通知なし

## ✅ 解決済みの問題（2025-09-19更新）

### Layout定数とCSS実装の不整合 - 本日解決 ✨
- **問題**: layout.constants.ts（header:200px, settingsBar:100px）とCSS（60px, 56px）の不一致
- **影響**: 184pxのウィンドウ高さ計算誤差
- **解決内容**:
  - layout.constants.tsを正しい値に修正
  - maxRealtime制限を削除（最大高さ制限なし）
  - 関連する全ファイルの参照を更新

### ウィンドウリサイズ機能強化 - 本日実装 ✨
- **リアルタイムエリア固定位置動作**:
  - セクション切り替え時にリアルタイムエリアのY座標を固定
  - 視線移動の最小化
- **ボトムリサイズハンドル**:
  - フレームレスウィンドウ用のリサイズハンドル実装
  - Clean Architecture準拠（useBottomResizeフック）
  - リアルタイムエリアのみリサイズ（質問セクション影響なし）

### ウィンドウ管理の問題 - 2025-09-18解決
- **Setup画面サイズリセット問題**: Main画面から戻る際にサイズが維持される問題を修正
  - UniVoice.tsxに明示的なwindow bounds resetを追加
- **Main画面リサイズ不可問題**: WindowRegistryで既に`resizable: true`設定済みを確認
- **セッション再起動ループ**: Ctrl+Shift+Rでのセッションリセット時の適切なクリーンアップ実装
- **重複要約ボタン問題**: Progressive Summary機能を既存の要約ボタンに統合

### プログレッシブ要約のUI問題 - 部分的解決
- **問題**: バックエンドは動作するがUIに表示されない → **一部解決**
- **対応内容**:
  - ProgressiveSummarySectionコンポーネントの統合
  - 要約ボタンでのトグル動作実装
  - 400/800/1600/2400語オプションの表示
- **残課題**: データバインディングの完全な動作確認が必要

### Setup画面374px問題
- BoundsStore/WindowRegistryで修正済み
- setup画面の固定サイズ強制（600x800）

### 無限レンダリング問題
- isStartingPipelineフラグで解決
- React.StrictModeによる重複実行を制御

### ウィンドウ管理基盤
- WindowRegistryとBoundsStore実装完了
- mainWindow参照エラー修正（51箇所）
- WindowClientサービスによるレンダラー側制御

## 対処優先順位（2025-09-19更新）

1. **次に対応**: Setup画面の統一
2. **確認必要**: 外部ウィンドウ管理の完全動作確認
3. **確認必要**: プログレッシブ要約のデータフロー完全動作
4. **新規追加**: セッション再開UIの実装
5. **技術的負債**: IPCハンドラーの実装