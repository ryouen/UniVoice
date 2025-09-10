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

---

**重要**: このファイルの情報が最も正確です。
古いドキュメントと矛盾がある場合は、このファイルを信じてください。

最終更新: 2025-09-10