# 🚨 新セッション必読 - 重要事実集

**これは新しいClaude Codeセッションで最初に読むべきファイルです**

## 🔴 絶対に知っておくべき3つの事実

### 1. AdvancedFeatureServiceは既に初期化済み（2025-09-04確認）
- ❌ 誤: 「初期化されていない」（古いドキュメントの情報）
- ✅ 正: main.ts:384-398で完全に初期化されている
- 📝 詳細: `docs/ADVANCED-FEATURE-SERVICE-VERIFICATION-20250904.md`

### 2. パラグラフモードは現在無効化中（2025-09-10確認）
- ❌ 誤: 「パラグラフモード実装済み」（古いドキュメントの情報）
- ✅ 正: ParagraphBuilderは無効化、文単位（1-2文）表示のまま
- 📝 詳細: `docs/PARAGRAPH-MODE-IMPLEMENTATION-SUMMARY.md`
- 📝 改善計画: `docs/PARAGRAPH-MODE-IMPROVEMENT-PLAN.md`

### 3. すべてのコア機能が実装済み
- ✅ 音声認識（Deepgram）
- ✅ リアルタイム翻訳（GPT-5-nano）
- ✅ データ永続化（C:\Users\{username}\UniVoice\）
- ✅ 要約・語彙・レポート（AdvancedFeatureService）

## 📁 必ず確認すべきファイル（順番通りに）

1. **このファイル** - 重要事実の把握
2. `CLAUDE.md` - プロジェクトルール（最新リンク付き）
3. `START-HERE.md` - 現在の状態（2025-09-04更新済み）
4. `docs/ACTIVE/STATE.json` - 詳細な技術状態

## 🛠️ よくある誤解と正しい理解

| 誤解 | 正しい理解 |
|------|-----------|
| AdvancedFeatureService未初期化 | 既に修正済み（main.ts:384） |
| 要約機能が動かない | 完全動作中（10分ごと） |
| SentenceCombiner未実装 | 実装済みだが現在は無効化 |
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
- バックエンドは全機能実装済み
- 残タスクはすべてフロントエンドUI

### 優先タスク
1. セッション再開UI（データは保存済み）
2. レポート表示UI（生成は動作中）
3. 語彙テーブルUI（抽出は動作中）

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

## 💡 前回セッション（2025-09-10）の成果

1. ✅ パラグラフモード実装状況の再調査（実際は無効化中と判明）
2. ✅ 履歴表示が短い原因を特定（SentenceCombiner + FlexibleHistoryGrouper）
3. ✅ ドキュメントを実際のコードに基づいて更新
4. ✅ パラグラフモード改善計画を作成

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

---

**重要**: このファイルの情報が最も正確です。
古いドキュメントと矛盾がある場合は、このファイルを信じてください。

最終更新: 2025-09-15