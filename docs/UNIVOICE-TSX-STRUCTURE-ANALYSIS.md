# UniVoice.tsx 構造解析ドキュメント

## ファイル概要
- **ファイルパス**: `src/components/UniVoice.tsx`
- **総行数**: 2890行
- **目的**: Setup画面からMain画面への遷移問題を解決するための完全な構造分析
- **作成日**: 2025-09-18
- **最終更新**: 2025-09-18

## セクション別構造

### 1-200行: ヘッダーとインポート、型定義
- **1-15行**: ファイルヘッダーコメント（実装済み機能リスト）
- **17-36行**: インポート文
  - React関連
  - カスタムフック（useUnifiedPipeline, useSessionMemory）
  - コンポーネント（SetupSection, RealtimeSection等）
  - サービス（sessionStorageService, WindowClient）
- **41-56行**: 型定義（HistoryEntry, MockUpdate）
- **58-109行**: ウィンドウリサイズ管理システムの詳細なドキュメント
- **111-198行**: セクション定義（SECTION_DEFINITIONS, LAYOUT_HEIGHTS）

### 200-400行: コンポーネント定義と状態管理
- **200-222行**: UniVoicePropsインターフェース定義
- **227-237行**: UniVoiceコンポーネント関数の開始、propsの分解
- **240-244行**: activeSession状態（初期値: null）
- **247-259行**: previousSession状態（SessionStorageServiceから復元）
- **264行**: showSetup状態（初期値: !activeSession = true）
- **265-268行**: その他の基本状態（selectedClass, isPaused, recordingTime等）
- **270-283行**: activeSession変更時のログと永続化
- **285-288行**: 🔴 重要: showSetupをactiveSessionに連動させるuseEffect
- **290-311行**: 🔴 重要: 初期化時の強制Setup画面表示useEffect
- **314-330行**: 言語設定の状態管理
- **333-396行**: UI関連の各種状態（expandedSection, モーダル, フォント等）

### 400-600行: パイプライン設定とセッション開始処理
- **398-407行**: リサイズモード管理
- **431行**: WindowClientインスタンス取得
- **439-453行**: useUnifiedPipelineフックの設定
- **456行**: useSessionMemoryフック
- **458-472行**: パイプラインからのデータ統合
- **481-516行**: beforeunloadイベントハンドラー（異常終了対策）
- **519-520行**: isStartingPipeline状態
- **522-623行**: 🔴 重要: handleStartSession関数（Setup画面から呼ばれる）

### 600-800行: セッション再開と終了処理
- **625-800行**: handleResumeSession関数（セッション再開処理）

### 800-1000行: セッション終了とディスプレイコンテンツ構築
- **802-846行**: handleEndSession関数
- **849-886行**: nextClass関数（次の授業へ移行）
- **889-891行**: endSession関数
- **900-996行**: displayContentのメモ化処理

### 1000-1200行: 履歴データ管理と重複handleStartSession
- **1000-1013行**: pipeline.historyからhistoryEntriesへの更新
- **1015-1022行**: 履歴データの統合
- **1025-1049行**: 🔴 重要: handleStartSessionの重複定義（簡略化されたバージョン）
- **1052-1055行**: handleResumeSessionの簡略版
- **1058-1069行**: endSessionの簡略版
- **1072-1076行**: nextClassの簡略版
- **1078-1087行**: Ref変数の定義
- **1089-1165行**: 固定セクション高さ計算関数
- **1167-1207行**: ウィンドウリサイズ実行関数

### 1200-1400行: ウィンドウリサイズ管理
- **1209-1259行**: セクション表示状態変更時のリサイズ処理
- **1261-1345行**: ユーザードラッグによるリサイズ検知
- **1347-1402行**: 自動スクロール処理

### 1400-1600行: キーボードショートカットとタイマー
- **1404-1453行**: 🔴 重要: キーボードショートカット（1410行でhandleStartSessionを呼び出し）
- **1455-1472行**: タイマー管理
- **1474-1491行**: 自動保存処理
- **1493-1528行**: RealtimeDisplayManagerセグメントの3行表示更新
- **1530-1541行**: 履歴データの統合
- **1543-1573行**: 要約データと言語設定の保存
- **1580-1589行**: ブロックガイドの非表示タイマー
- **1591-1613行**: 録音時間の自動更新

### 1600-1800行: イベントハンドラー
- **1615-1653行**: リアルタイムセクションの自動スクロール
- **1659-1680行**: togglePause関数
- **1683-1689行**: formatTime関数
- **1691-1712行**: togglePanel関数（履歴/要約ウィンドウ）
- **1714-1756行**: saveAsMemo関数
- **1758-1765行**: saveMemoEdit関数
- **1767-1769行**: toggleHeader関数
- **1774-1801行**: generateReportとgenerateFinalReport関数

### 1800-2000行: ヘルパー関数とエクスポート
- **1806-1830行**: clearAllContent関数
- **1836-1849行**: setDisplayとchangeFont関数
- **1856-1876行**: cycleTheme関数とテーマ更新
- **1884-1899行**: adjustFontSize関数
- **1902-1952行**: handleWordExportとhandlePDFExport関数
- **1955-1984行**: セクションクリックハンドラー
- **1986-1999行**: generateQuestionTranslation関数

### 2000-2200行: ヘルパー関数とキーボードショートカット
- **2007-2016行**: splitText関数
- **2018-2024行**: getAlignedHistoryContent関数
- **2026-2082行**: getSummaryComparisonContent関数
- **2085-2131行**: 自動スクロール制御
- **2133-2208行**: キーボードショートカット（Ctrl+Shift+Rでセッションリセット）

### 2210-2400行: 🔴 重要：Setup画面とメイン画面の分岐
- **2211行**: 🔴 最重要: showSetupがtrueの時の条件分岐
- **2212-2229行**: SetupSectionコンポーネントのレンダリング
  - onStartSession={handleStartSession}
  - onResumeSession={handleResumeSession}
  - previousSession={previousSession}
  - sessionMemory={sessionMemory}
- **2231-2258行**: CSSモジュール用ヘルパー関数
- **2261行**: メイン画面のreturn開始
- **2263-2284行**: アプリコンテナとメインウィンドウ
- **2286-2400行**: ヘッダー部分（録音インジケーター、コントロールボタン等）

### 2400-2600行: ヘッダーとコントロール
- **2400-2500行**: 授業情報表示（科目名、録音時間、一時停止ボタン）
- **2500-2614行**: 設定ボタン群（レポート、エクスポート、表示モード、テーマ、ヘッダー表示）
- **2616-2670行**: ヘッダー非表示時のミニマルコントロール

### 2600-2890行: メインコンテンツとモーダル
- **2672-2710行**: リアルタイムセクション（RealtimeSection）
  - displayContent、displayOpacity、volumeLevel等のprops
  - displayModeとthemeの適用
- **2712-2740行**: プログレッシブ要約セクション（条件付き表示）
- **2744-2835行**: 質問セクション（折りたたみ可能）
  - questionInput textarea
  - メモ一覧と英訳して保存ボタン
- **2839-2856行**: フローティングパネル（履歴パネル、要約パネル）
- **2858-2884行**: 各種モーダル（フルスクリーン、メモ、レポート）
- **2885-2890行**: コンポーネントの終了とエクスポート

## 全文分析結果

### 1. 🔴 最重要発見：handleStartSessionの重複定義

#### 重複】1：522-623行（完全版）
```typescript
const handleStartSession = useCallback(async (className: string, sourceLang: string, targetLang: string) => {
  // 完全な実装
  // isStartingPipelineフラグのチェック
  // activeSessionの作成と保存
  // SessionMemoryServiceの開始
  // WindowClient.enterMain()の呼び出し
  // pipeline.startFromMicrophone()の実行
  // エラーハンドリングとロールバック
}, [pipeline, isStartingPipeline]);
```

#### 重複】2：1025-1049行（簡略版）
```typescript
const handleStartSession = useCallback((className: string, sourceLanguage: string, targetLanguage: string) => {
  // 簡略化された実装
  // setActiveSessionのみ
  // pipeline.start()の呼び出し（async/awaitなし）
}, [pipeline]);
```

### 2. Setup画面からの参照
- **2214行**: `onStartSession={handleStartSession}`
- **1410行**: キーボードショートカットから `handleStartSession(selectedClass || '', sourceLanguage, targetLanguage)`

### 3. 画面遷移の制御フロー
1. **初期状態**:
   - activeSession = null (240行)
   - showSetup = true (264行)
   - 起動時強制Setup表示 (306-310行)

2. **useEffectの連鎖**:
   - activeSession変更時のログと永続化 (270-283行)
   - showSetupをactiveSessionに連動 (285-288行)

3. **画面切り替え条件**:
   - showSetup = true → SetupSection表示 (2211-2229行)
   - showSetup = false → メイン画面表示 (2261行以降)

### 4. 依存関係と副作用の分析

#### 完全版handleStartSessionが依存するもの：
- pipeline
- isStartingPipeline状態
- sessionMemoryフック
- windowClient
- SessionStorageService
- IPC通信 (window.electron.send)

#### 簡略版handleStartSessionが依存するもの：
- pipelineのみ

### 5. エラーハンドリングの違い
- **完全版**: try-catchでエラーを捕捉し、失敗時はSetup画面に戻る
- **簡略版**: エラーハンドリングなし

## 推測される問題の根本原因

コードの構造から、以下のような問題が発生している可能性が高い：

1. **JavaScriptの変数巻き上げ**: 同名の関数が2つ定義されている場合、後の定義が優先される
2. **簡略版が使われている**: SetupSectionからはhandleStartSessionが呼ばれるが、それは1025行の簡略版
3. **簡略版の問題**:
   - WindowClient.enterMain()が呼ばれない
   - ウィンドウサイズ変更が実行されない
   - SessionMemoryServiceが開始されない
   - isStartingPipelineフラグが管理されない
   - エラーハンドリングがない

### 6. その他の重要な発見
- endSession、nextClass、handleResumeSessionも重複定義がある
- キーボードショートカットのuseEffectの依存配列が不完全（1453行）
- ウィンドウリサイズ管理が複雑で、activeSessionがない場合の処理が多数存在

## Clean Architecture観点からの解決策提案

### 1. 削除すべき重複関数（1025-1076行）
以下の簡略版関数は全て削除すべき：
- handleStartSession（1025-1049行）
- handleResumeSession（1052-1055行）
- endSession（1058-1069行）
- nextClass（1072-1076行）

**理由**：
- 完全版の方が責任を適切に分離している
- SessionMemoryServiceとの統合が適切
- エラーハンドリングが実装されている
- 依存性注入パターンに準拠

### 2. 残すべき実装の特徴

#### handleStartSession（522-623行）の責任分離：
1. **UI状態管理**: setActiveSession、setShowSetup等
2. **永続化**: sessionStorageService経由
3. **セッションメモリ**: sessionMemory.startSession
4. **ウィンドウ制御**: windowClient.enterMain
5. **パイプライン制御**: pipeline.startFromMicrophone
6. **IPC通信**: window.electron.send

#### Clean Architectureの層構造の遵守：
- **UI層**: 状態管理とレンダリング
- **アプリケーション層**: パイプラインとセッション管理
- **インフラ層**: IPC、永続化、外部API

### 3. 修正時の注意点

#### 依存関係の確認：
- useCallbackの依存配列：`[pipeline, isStartingPipeline, sessionMemory]`
- キーボードショートカット（1410行）の参照更新
- SetupSectionコンポーネントへのprops確認

#### 副作用の考慮：
- recordingStartTimeRefの初期化タイミング
- showBlockGuidesの表示制御
- 自動保存機能との連携

### 4. 実装手順（推奨）

1. **バックアップ作成**
2. **簡略版関数の削除**（1025-1076行）
3. **依存配列の修正**：
   ```typescript
   // 623行の依存配列に sessionMemory を追加
   }, [pipeline, isStartingPipeline, sessionMemory]);
   ```
4. **handleEndSession関数名の統一**：
   - 802行のhandleEndSessionをendSessionに変更
   - または逆に、全てhandleEndSessionに統一
5. **テスト実施**：
   - Setup画面からの遷移
   - キーボードショートカット動作
   - セッション再開機能

### 5. 将来的な改善提案

1. **コンポーネント分割**：
   - 2890行は大きすぎる
   - ロジックとUIの分離
   - カスタムフックへの抽出

2. **状態管理の改善**：
   - useReducerパターンの採用
   - 状態の正規化

3. **エラーバウンダリの実装**：
   - 異常終了時の復旧
   - ユーザーフレンドリーなエラー表示