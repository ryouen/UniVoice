# 🚨 新セッション必読 - 重要事実集

**これは新しいClaude Codeセッションで最初に読むべきファイルです**
*最終更新: 2025-09-19（Clean Architectureリファクタリング開始・セッション再開機能実装）*

## 🔴 絶対に知っておくべき5つの事実

### 1. AdvancedFeatureServiceは既に初期化済み（2025-09-04確認）
- ❌ 誤: 「初期化されていない」（古いドキュメントの情報）
- ✅ 正: main.ts:384-398で完全に初期化されている
- 📝 詳細: `docs/ADVANCED-FEATURE-SERVICE-VERIFICATION-20250904.md`

### 2. SentenceCombinerは統合済み・正常動作中（2025-09-17確認）
- ❌ 誤: 「SentenceCombiner未統合」（古いドキュメントの誤情報）
- ✅ 正: UnifiedPipelineService.ts:203で初期化、正常動作中
- ✅ 正: CombinedSentenceEventがフロントエンドで正しく受信されている
- 📝 注意: ParagraphBuilderは無効化中、文単位（1-2文）表示を使用

### 3. コア機能の実装状況（2025-09-19更新）
- ✅ 音声認識（Deepgram Nova-3、10言語対応）
- ✅ リアルタイム翻訳（二段階: GPT-5-nano/GPT-5-mini）
- ✅ セッション情報永続化（SessionStorageService使用中）
- 🆕 履歴データ永続化（SessionMemoryService統合済み - 2025-09-18）
- 🆕 セッション再開機能（最新セッション自動再開 - 2025-09-18）
- 🚧 Clean Architectureリファクタリング進行中（2025-09-19）
- 🟨 要約・語彙・レポート（バックエンド実装済み、UI統合に課題）

### 4. ウィンドウ管理問題は解決済み（2025-09-17確認）
- ✅ Setup画面374px問題: BoundsStore/WindowRegistryで修正済み
- ✅ 無限レンダリング: isStartingPipelineフラグで解決
- ✅ セッション管理: 24時間有効期限とbeforeunloadハンドラー実装
- 📝 詳細: `docs/WINDOW-RESIZE-FIXES-SUMMARY-20250917.md`

### 5. 文字化け問題は存在しない（2025-09-17確認）
- ✅ バックエンドは正常に日本語を処理（ログで確認）
- ✅ OpenAI APIレスポンスも正常
- ⚠️ UI層での表示確認が残タスク

## 📁 必ず確認すべきファイル（順番通りに）

1. **このファイル** - 重要事実の把握
2. `CLAUDE.md` - プロジェクトルール（最新リンク付き）
3. `START-HERE.md` - 現在の状態（2025-09-04更新済み）
4. `docs/ACTIVE/STATE.json` - 詳細な技術状態

## 🛠️ よくある誤解と正しい理解

| 誤解 | 正しい理解 |
|------|-----------|
| AdvancedFeatureService未初期化 | 既に修正済み（main.ts:384） |
| 要約機能が動かない | バックエンドは動作、UI統合に課題 |
| SentenceCombiner未統合 | 統合済み・正常動作中（UnifiedPipelineService.ts:203） |
| SessionStorageService未使用 | セッション情報保存に使用中（UniVoice.tsx） |
| SessionMemoryService未使用 | 履歴データ永続化に統合済み（2025-09-18） |
| セッション再開が複雑 | 簡略化実装完了（最新セッションを自動再開） |
| 言語設定がハードコード | SetupSectionでの定義は適切（選択のみの場所） |
| パラグラフモード実装済み | 実際は無効化中（要改善） |

## 📊 ログファイルの場所

```bash
# メインログ（日付形式）
logs/univoice-2025-09-04.jsonl

# 最新ログ確認コマンド
tail -f logs/univoice-$(date +%Y-%m-%d).jsonl

# エラーチェック
grep '"level":"error"' logs/univoice-$(date +%Y-%m-%d).jsonl
```

## 🎯 現在の作業フェーズ

**Phase 3: UI/UX改善フェーズ**
- バックエンドはほぼ実装済み（要約・語彙・レポート生成は動作）
- 主な課題：UI統合とデータ永続化

### 優先タスク（2025-09-18更新）
1. ✅ データ永続化機構の統合（SessionMemoryService統合完了）
2. ✅ セッション再開UI（基本実装完了、簡略化されたUI）
3. SessionStorageServiceの統合（設定データ永続化）
4. プログレッシブ要約のUI修正
5. レポート表示UI（生成は動作中）
6. 語彙テーブルUI（抽出は動作中）

## ⚡ クイックスタート

```bash
# 環境確認
npm --version  # 10.8.1以上
node --version # v24.4.0

# 起動
npm run dev
npm run electron

# ビルド確認
npm run build
npm run typecheck
```

## 💡 最近の成果

### 2025-09-19（Clean Architectureリファクタリング開始）
1. ✅ UniVoice.tsx（2890行）の構造分析完了
2. ✅ 型定義・定数・ユーティリティの分離実装
3. ✅ カスタムフック作成（useSessionManagement, useWindowResize）
4. ✅ 重複関数定義の削除とビルドエラー解消
5. 📝 残課題：コンポーネント分割、ディレクトリ構造再編

### 2025-09-18（セッション再開機能実装）
1. ✅ SessionMemoryServiceの統合実装完了
2. ✅ 履歴データ（翻訳・要約）の永続化実現
3. ✅ セッション再開UI実装（「セッションを再開」ボタンで最新セッション自動再開）
4. ✅ 言語設定管理アーキテクチャの明確化
   - SetupSection: 言語オプション定義と選択UI
   - activeSession: 選択された言語設定の保持と他コンポーネントでの参照

### 2025-09-17（深層分析による発見）
1. ✅ SentenceCombinerが実際は統合済み・正常動作中と確認
2. ✅ SessionStorageServiceが実際は使用中であることを発見
3. ✅ プロジェクト全体の実装状況を正確に把握（約50%完了）
4. ✅ 誤解を招く古いドキュメントの特定と更新開始

### 2025-09-10
1. ✅ パラグラフモード実装状況の再調査（実際は無効化中と判明）
2. ✅ 履歴表示が短い原因を特定（SentenceCombiner + FlexibleHistoryGrouper）
3. ✅ ドキュメントを実際のコードに基づいて更新

## 🚨 Setup画面統一の緊急課題（2025-09-15）

### 問題の構造
1. **2つのSetup画面が混在**
   - `SetupScreen.tsx` - 不要（削除対象）
   - `SetupSection.tsx` - 正式なSetup画面（保持）

2. **誤った実装フロー**
   - 現状: App.tsx → SetupScreen → UniVoice → SetupSection → エラーで戻る
   - 正解: App.tsx → UniVoice → SetupSection → メイン画面

3. **修正方針**
   - SetupScreenを削除
   - App.tsxの条件分岐を削除
   - UniVoice.tsx内の既存showSetupロジックで制御

## 🆕 最新セッション（2025-09-14）の進捗と課題

### ウィンドウ管理実装（M1）
1. ✅ WindowRegistryとBoundsStoreの実装完了
2. ✅ mainWindow参照エラー（51箇所）の修正完了
3. ✅ ウィンドウリサイズ無限ループの解決
4. ✅ **Setup画面サイズ問題への対策実装**（WindowRegistry.tsで保存値無視）
5. ✅ **IPCハンドラー実装・重複削除**（check-today-session, get-available-sessions, load-session）
6. ✅ **Node.jsプロセス暴走問題を解決**（17個のプロセスを終了、1GB以上のメモリ解放）
7. ✅ **Setup画面での無限ループ問題を構造的に解決**（App.tsx: ルーティング実装、UniVoice.tsx: sessionConfig条件分岐）

### 重要な発見と解決
- **Setup画面の高さ問題**: BoundsStoreが前回の374pxを保存・復元している（WindowRegistry.ts:89-93）
- **ResizeObserver無効化**: autoResizeとの相互作用で無限ループが発生するため完全無効化
- **透明度設定**: 既存設定（transparent: false）で問題なし、ぼかし効果は断念
- **無限ループの根本原因**: Setup画面でもUniVoiceコンポーネントが読み込まれ、複数のuseEffectが連鎖的にリサイズを実行
  - 解決策: App.tsxでルーティング実装、UniVoiceでsessionConfig有無による条件分岐

### 構造的改善（Clean Architecture準拠）
1. **App.tsx**
   - SetupScreenとUniVoiceの条件分岐を実装
   - URLハッシュベースのルーティング（#/setup, #/main）
   - sessionConfigを通じたセッション情報の受け渡し

2. **UniVoice.tsx**
   - sessionConfigプロパティを追加
   - Setup画面（sessionConfig=null）では以下を無効化:
     - ウィンドウリサイズのuseEffect（656, 668, 685行目）
     - useUnifiedPipelineの完全初期化（357-370行目）
     - デバッグログ出力（388, 394行目）

### 参照ドキュメント
- `COMPREHENSIVE-ISSUE-REPORT-20250914.md` - 問題の詳細分析と解決策
- `docs/WINDOW-MANAGEMENT-IMPLEMENTATION-GUIDE.md` - 実装ガイド（v1.2.0に更新済み）

## 📝 重要な技術的発見（2025-09-17）

### SentenceCombiner統合の実際
```typescript
// UnifiedPipelineService.ts:203-210
this.sentenceCombiner = new SentenceCombiner(
  (combinedSentence) => this.handleCombinedSentence(combinedSentence),
  {
    maxSegments: 10,
    timeoutMs: 2000,
    minSegments: 1  // DEEP-THINK修正: 短い文も履歴に含める
  }
);
```

### データ永続化の問題
- `src/services/SessionStorageService.ts`は存在するが未使用
- `import`文が1つも存在しない = 完全に孤立したコード
- 結果：全ての設定・履歴がセッション限り

---

**重要**: このファイルの情報が最も正確です。
古いドキュメントと矛盾がある場合は、このファイルを信じてください。

最終更新: 2025-09-19（Clean Architectureリファクタリング開始・問題発生と修正）