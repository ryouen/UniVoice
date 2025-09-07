# 🚀 START HERE - UniVoice 2.0 開発ガイド

**最終更新**: 2025-08-30 (Phase 1実装完了)  
**状態**: ✅ Phase 1修正完了 / 🔴 Phase 2 ParagraphBuilder実装待ち  
**実装者**: Claude Code

## ✅ Phase 1実装完了（2025-08-30）

### 「翻訳中...」問題の修正
**実装内容**：
1. 履歴の初期値を「翻訳中...」から空文字列に変更
2. FlexibleHistoryGrouperに`updateSentenceTranslation`メソッドを追加
3. 高品質翻訳到着時に内部状態も更新するよう修正

**結果**：
- 履歴に「翻訳中...」が残らなくなった ✅
- 高品質翻訳が正しく反映される ✅
- 詳細: [Phase 1実装レポート](docs/PHASE1-IMPLEMENTATION-REPORT.md)

## 🔴 現在の最重要課題

### Phase 2: ParagraphBuilder実装によるUX改善

**現象**：
- 履歴ウィンドウに「翻訳中...」が残り続ける
- 0.8秒ごとの断片的な履歴表示
- 同じ英文が複数回表示される

**根本原因**：
- SentenceCombinerクラスは存在するが、**一度も使われていない**
- UnifiedPipelineServiceに統合されていない
- CombinedSentenceEventが発行されない
- segmentToCombinedMapが常に空

**必要な作業**：
- 📝 [詳細な実装計画](docs/SENTENCE-COMBINER-INTEGRATION-PLAN.md)
- 🔍 [根本原因分析](docs/DEEP-THINK-ANALYSIS-HISTORY-ISSUE-20250830.md)
- ℹ️ **推定作業時間**: 4-6時間

---

## 📊 実装状態マトリックス

| 機能 | クラス/ファイル | 単体テスト | 統合 | 動作 | 備考 |
|------|----------------|-----------|------|------|------|
| 文単位結合 | SentenceCombiner.ts | ✅ | ✅ | ✅ | Phase 1で統合完了 |
| 高品質翻訳 | executeHistoryTranslation | ✅ | ✅ | ✅ | Phase 1で修正完了 |
| 履歴更新 | FlexibleHistoryGrouper | ✅ | ✅ | ✅ | updateメソッド追加 |
| 3段階表示 | RealtimeDisplayService | ✅ | ✅ | ✅ | 正常動作 |
| 段階的要約 | AdvancedFeatureService | ✅ | ✅ | ❓ | UI確認必要 |
| データ永続化 | DataPersistenceService | ✅ | ✅ | ✅ | 正常動作 |
| パラグラフ化 | ParagraphBuilder | ✅ | ❌ | ❌ | **Phase 2で実装予定** |

---

## 🏗️ プロジェクト構造（問題箇所を明示）

```
UniVoice/
├── electron/
│   └── services/
│       ├── domain/
│       │   ├── UnifiedPipelineService.ts    # ✅ メインパイプライン
│       │   ├── AdvancedFeatureService.ts    # ✅ 要約・単語帳・レポート
│       │   ├── RealtimeDisplayService.ts    # ✅ 3段階表示管理
│       │   ├── SentenceCombiner.ts          # 🔴 未統合！最優先対応
│       │   ├── TranslationQueueManager.ts   # ✅ 翻訳キュー管理
│       │   └── SegmentManager.ts            # ✅ セグメント管理
│       └── ipc/
│           ├── contracts.ts                 # ✅ 型定義（自動同期あり）
│           └── gateway.ts                   # ✅ IPCゲートウェイ
├── src/
│   ├── hooks/
│   │   └── useUnifiedPipeline.ts           # ⚠️ IDマッピング修正済みだが動作未確認
│   └── shared/types/
│       └── contracts.ts                    # ⚠️ 自動生成（手動編集禁止）
└── scripts/
    └── sync-contracts.js                   # ✅ 型同期スクリプト
```

---

## 🔧 環境設定

### 必須の環境変数（.env）

```bash
# API Keys（必須）
OPENAI_API_KEY=sk-xxxxx
DEEPGRAM_API_KEY=xxxxx

# モデル設定（絶対に変更禁止）
OPENAI_MODEL_TRANSLATE=gpt-5-nano      # リアルタイム翻訳
OPENAI_MODEL_SUMMARY=gpt-5-mini        # 要約
OPENAI_MODEL_VOCABULARY=gpt-5-mini     # 語彙抽出
OPENAI_MODEL_REPORT=gpt-5             # 最終レポート

# トークン上限
OPENAI_TRANSLATE_MAX_TOKENS=1500
OPENAI_SUMMARY_MAX_TOKENS=1500
OPENAI_VOCAB_MAX_TOKENS=1500
OPENAI_REPORT_MAX_TOKENS=8192
```

---

## 📋 優先タスクリスト

### 🔴 Phase 0: 準備（30分）
- [ ] 現在の動作ログ収集
- [ ] 関連ファイルのバックアップ
- [ ] デバッグログポイント設計

### 🟠 Phase 1: SentenceCombiner統合（1時間）
- [ ] UnifiedPipelineServiceへの統合
- [ ] handleSegmentへの組み込み
- [ ] 初期化ログ確認

### 🟡 Phase 2: イベントフロー接続（1時間）
- [ ] CombinedSentenceEvent発行
- [ ] フロントエンド受信確認
- [ ] IDマッピング動作確認

### 🟢 Phase 3: 高品質翻訳適用（1時間）
- [ ] history_翻訳の動作確認
- [ ] 履歴更新の確認
- [ ] 「翻訳中...」解消確認

詳細: [実装計画書](docs/SENTENCE-COMBINER-INTEGRATION-PLAN.md)

---

## 🚀 起動方法

```bash
# 1. 型同期（必須）
npm run sync-contracts

# 2. ビルド
npm run build

# 3. 開発サーバー起動
npm run dev

# 4. 別ターミナルでElectron起動
npm run electron
```

---

## 📚 重要ドキュメント

### 必読（最新・正確）
- [SentenceCombiner統合計画](docs/SENTENCE-COMBINER-INTEGRATION-PLAN.md)
- [深層分析：履歴問題](docs/DEEP-THINK-ANALYSIS-HISTORY-ISSUE-20250830.md)
- [重要調査報告書](docs/CRITICAL-INVESTIGATION-REPORT-20250830.md)

### 参考（注意：一部情報が古い可能性）
- [CLAUDE.md](CLAUDE.md) - プロジェクト設定
- [アーキテクチャ設計](docs/ARCHITECTURE.md)

### アーカイブ済み（誤解を招く可能性）
- 文単位履歴管理実装 → 実際には未統合
- 高品質翻訳実装 → 実際には動作せず

---

## ⚠️ よくある誤解

1. **「実装済み」≠「動作する」**
   - クラスが存在しても使われていない可能性
   - テストがパスしても統合されていない可能性

2. **ログに出ないものを疑う**
   - 初期化ログがない = 初期化されていない
   - イベントログがない = イベントが発行されていない

3. **型定義の罠**
   - contracts.tsは2箇所に存在
   - 必ず`npm run sync-contracts`を実行

---

## 🎯 成功基準

1. **履歴表示**
   - 2-3文単位でグループ化
   - 「翻訳中...」が消える
   - 重複表示がない

2. **パフォーマンス**
   - 既存の速度を維持
   - メモリ増加10%以内

3. **品質**
   - エラーログなし
   - 全テストパス

---

## 📝 メンテナンス指針

1. **ドキュメント更新タイミング**
   - 実装完了時
   - 重要な発見時
   - 誤解を生む記述を発見時

2. **アーカイブ基準**
   - 3日以上更新されていない
   - 現状と乖離している
   - 誤解を招く可能性がある

3. **必須記載事項**
   - 最終更新日
   - 動作確認状態
   - 既知の問題

質問があれば、まず最新のドキュメントを確認してください。