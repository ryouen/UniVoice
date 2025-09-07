# CLAUDE.md — UniVoice 2.0 プロジェクト設定（Claude Code 用・最上位ルール）

## 🔴 最初に必ず実行すること

```bash
# 1. 重要事実集を確認（新セッション必須）
cat CRITICAL-FACTS-FOR-NEW-SESSION.md

# 2. 現在の状況を確認
cat START-HERE.md
```

📌 **必須ファイル**: [`CRITICAL-FACTS-FOR-NEW-SESSION.md`](CRITICAL-FACTS-FOR-NEW-SESSION.md) - 新セッションで最初に読む

**重要**: このプロジェクトは UniVoice 2.0 として、
Clean Architecture + CQRS + Event-Driven パターンで構築されています。

**⚠️ 重要な訂正**: 
- Responses API は2025年3月にリリースされた実在のAPIです
- GPT-5シリーズ（gpt-5、gpt-5-mini、gpt-5-nano）は実在のモデルです
- temperature パラメータは GPT-5 では1.0固定（変更不可）
- 詳細は [PARAMETER-INCONSISTENCIES-REPORT.md](PARAMETER-INCONSISTENCIES-REPORT.md) を参照してください

## 🔴 絶対命令（CRITICAL DIRECTIVES）

### 0. **動作実績のあるコードを絶対に壊すな**
   - test-results/*.jsonが存在 = 動作確認済み = 変更前に必ず確認
   - 必ず実行して確認: `npm run test`

### 1. **Ultrathink原則 — 表面的修正の禁止**
   - コード修正前に必ず状況と構造を深く分析（Ultrathink）すること
   - 計画を立て、その影響範囲と副作用を完全に見通してから着手
   - 「とりあえず試す」「推測で修正」は厳禁
   - **詳細プロトコル**: `/deep-think` コマンドで深層思考手順を確認

### 2. **型安全性の絶対優先**
   - 全てのIPC通信はZodによる型検証必須
   - any型の使用は原則禁止
   - Discriminated Union型でイベント契約を定義

### 3. **アーキテクチャ原則の遵守**
   - **Clean Architecture**: 依存性の方向を内側に
   - **CQRS**: コマンドとクエリの完全分離
   - **Event-Driven**: UI層と処理層の疎結合
   - **Hexagonal**: ポートとアダプタによる外部依存の分離

### 4. **知識カットオフ後のAPIパターンの尊重（🔴 CRITICAL）**
   - **動作している実装を「改善」しない** — 既存の動くコードは正しい
   - **「古い知識」での判断禁止** — 以下の誤解を避ける：
     - ❌ 「chat.completions.createが正しい」→ ✅ responses.createが正しい
     - ❌ 「messagesパラメータを使うべき」→ ✅ inputパラメータが正しい  
     - ❌ 「max_completion_tokensに変更」→ ✅ max_output_tokensが正しい
   - **推測による「改良」は改悪** — 動作実績が全てに優先する

### 5. **プロジェクトは完全に独立（🔴 CRITICAL）**
   - **UniVoiceプロジェクトは完全に自己完結**
   - **親フォルダの参照は不要** - 全ての実装はUniVoice内で完結
   - **外部依存は公式npm/API のみ** - 他プロジェクトへの依存は禁止

---

## 📁 プロジェクト構造とリンク

### コアドキュメント（必読）
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - Clean Architecture設計
- [`docs/MIGRATION-GUIDE.md`](docs/MIGRATION-GUIDE.md) - 1.0からの移行ガイド
- [`docs/API-CONTRACTS.md`](docs/API-CONTRACTS.md) - IPC契約定義

### 仕様書（.kiro/specs）
- [1-streaming-ui-optimization](docs/specs/streaming-ui-optimization.md) - ✅ 実装済み
- [2-univoice-advanced-features](docs/specs/advanced-features.md) - 🚧 実装中

### 引き継ぎシステム
- [`docs/ACTIVE/`](docs/ACTIVE/) - アクティブな作業状態
  - `STATE.json` - 現在の状態（構造化データ）
  - `TASKS.json` - タスク管理（優先順位付き）
  - `SESSION-HANDOVER.md` - セッション引き継ぎ

---

## 🏗️ アーキテクチャ概要

```
UniVoice/                              
├── electron/                          # バックエンド処理層
│   ├── services/                      
│   │   ├── ipc/                       # 型安全IPC（Zod）
│   │   │   ├── contracts.ts           # イベント/コマンド契約
│   │   │   └── gateway.ts             # 薄いBFF
│   │   ├── domain/                    # ドメインロジック
│   │   │   ├── UnifiedPipelineService.ts
│   │   │   ├── AdvancedFeatureService.ts  # 要約・語彙・レポート
│   │   │   ├── StreamCoalescer.ts     # UI最適化
│   │   │   ├── SentenceCombiner.ts    # 文単位結合（2-3文）
│   │   │   ├── TranslationQueueManager.ts # 優先度制御
│   │   │   └── SegmentManager.ts      
│   │   └── monitoring/                # 観測可能性
│
├── src/                               # フロントエンドUI層
│   ├── components/                    
│   │   └── UniVoice.tsx              # メインUI（旧UniVoicePerfect）
│   ├── hooks/                         
│   │   ├── useUnifiedPipeline.ts      # 基本機能
│   │   └── useAdvancedFeatures.ts     # 高度機能
│   └── types/                         
│
└── tests/                             # テスト層
```

---

## 🎯 実装状態とロードマップ

### ✅ Phase 1: Streaming UI Optimization（完了）
- Clean Architecture構造
- 型安全IPC（Zod）
- StreamCoalescer（UI更新50%削減）
- SegmentManager（重複除去）

### 🚧 Phase 2: Advanced Features（実装中）
- [x] 文単位履歴管理（SentenceCombiner）- 2025-08-24 完了
- [x] 二段階翻訳システム（リアルタイム/履歴）- 2025-08-24 完了
- [x] 高品質翻訳の動的更新 - 2025-08-24 完了
- [ ] 単語数ベース要約（400/800語）
- [ ] 語彙抽出（5-10専門用語）
- [ ] 最終レポート生成（Markdown）
- [ ] データ永続化（IndexedDB）

### 🔮 Phase 3: Production Ready（計画中）
- [ ] パフォーマンス最適化
- [ ] エラー回復機能
- [ ] Docker環境
- [ ] CI/CDパイプライン

---

## 🚀 基本コマンド

### 開発環境
```bash
# 環境変数設定（.envファイルを作成）
cp .env.example .env

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# Electronアプリ起動
npm run electron
```

### テスト実行
```bash
# 単体テスト
npm run test:unit

# 統合テスト
npm run test:integration

# パフォーマンステスト
npm run test:performance

# 全テスト実行
npm run test
```

### ビルド
```bash
# TypeScript型チェック
npm run typecheck

# 本番ビルド
npm run build

# Electronパッケージング
npm run package
```

---

## 📊 パフォーマンス基準

### 必須要件（DoD - Definition of Done）
- **first paint ≤ 1000ms**（字幕の初期表示）
- **complete ≤ 2000ms**（翻訳完了）
- **要約 ≤ 3000ms**（セグメント要約）
- **レポート ≤ 15000ms**（最終レポート生成）
- **UI更新頻度削減 ≥ 50%**（StreamCoalescer効果）

### 計測方法
```bash
# メトリクス計測
npm run metrics

# ベンチマーク実行
npm run benchmark

# プロファイリング
npm run profile
```

---

## 🔧 設定管理

### 環境変数（.env）
```bash
# API Keys（必須）
OPENAI_API_KEY=sk-xxxxx
DEEPGRAM_API_KEY=xxxxx

# モデル設定（2025年8月時点の最新、絶対にダウングレード禁止）
OPENAI_MODEL_TRANSLATE=gpt-5-nano
OPENAI_MODEL_SUMMARY=gpt-5-mini
OPENAI_MODEL_VOCAB=gpt-5-mini
OPENAI_MODEL_REPORT=gpt-5

# トークン上限
OPENAI_TRANSLATE_MAX_TOKENS=1500
OPENAI_SUMMARY_MAX_TOKENS=1500
OPENAI_VOCAB_MAX_TOKENS=1500
OPENAI_REPORT_MAX_TOKENS=8192

# Deepgram設定
DG_MODEL=nova-3
DG_ENDPOINTING=800
DG_UTTERANCE_END_MS=1000
DG_INTERIM=true

# StreamCoalescer設定
STREAM_COALESCER_DEBOUNCE_MS=160
STREAM_COALESCER_FORCE_COMMIT_MS=1100
```

---

## 📝 コーディング規約

### TypeScript厳格設定
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 命名規則
```typescript
// ✅ 良い例
UniVoice.tsx                    // コンポーネント（PascalCase）
useAdvancedFeatures.ts          // フック（camelCase）
advanced-features.types.ts      // 型定義（kebab-case）

// ❌ 悪い例
UniVoicePerfect.tsx            // 格好悪い命名
service_improved.ts            // アンダースコア接尾辞
temp-fix.ts                    // temp prefix
```

### エラーハンドリング
```typescript
// Result型パターン
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// 例外ではなくResult型
async function translateText(text: string): Promise<Result<string>> {
  try {
    const result = await openai.translate(text);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

---

## 🐛 トラブルシューティング

### よくある問題と解決法

#### TypeScriptエラー
```bash
# 型定義の再生成
npm run generate-types

# キャッシュクリア
npm run clean
```

#### IPC通信エラー
- DevTools > Console でエラーログ確認
- `window.univoice` が定義されているか確認
- Zod検証エラーの詳細を確認

#### パフォーマンス問題
- StreamCoalescer設定を調整（DEBOUNCE_MS）
- 並列処理数を制限（MAX_CONCURRENCY）
- メモリプロファイリング実行

---

## 📚 参考資料

### 公式ドキュメント（一次情報）
- [OpenAI Platform](https://platform.openai.com/docs)
- [Deepgram Docs](https://developers.deepgram.com/docs)
- [Electron Documentation](https://www.electronjs.org/docs)

### 内部ドキュメント
- [1.0.0からの移行ガイド](docs/MIGRATION-GUIDE.md)
- [アーキテクチャ設計書](docs/ARCHITECTURE.md)
- [API契約仕様](docs/API-CONTRACTS.md)

### 開発支援ドキュメント
- [自動テスト・ログ収集システム](docs/development/AUTO-TEST-LOGGING-SYSTEM.md) 🔴 NEW
- [型定義同期に関する調査結果](docs/TYPE-SYNCHRONIZATION-FINDINGS.md) 🔴 NEW - ビルドエラーの原因と解決策
- テスト戦略ガイド（準備中）
- デバッグ手順書（準備中）


---

## 📋 文単位履歴管理システム（2025-08-24 実装）

### 概要
Deepgramのセグメント（0.8秒区切り）を2-3文の意味単位に結合し、高品質な履歴翻訳を提供するシステム。

### 実装詳細
1. **SentenceCombiner**: 文末判定（。！？.!?）による自動結合
2. **二段階翻訳システム**:
   - リアルタイム: gpt-5-nano（通常優先度）で即座表示
   - 履歴用: gpt-5-mini（低優先度）で高品質翻訳
3. **TranslationQueueManager**: 優先度制御でリアルタイム翻訳を保護

### 関連ドキュメント
- [実装詳細](docs/SENTENCE-BASED-HISTORY-IMPLEMENTATION.md)
- [高品質翻訳統合](docs/HIGH-QUALITY-TRANSLATION-IMPLEMENTATION.md)

---

## 📄 最重要ドキュメント (2025-09-04 更新)

### 🔥 現在の状態管理
- `START-HERE.md` - セッション開始ガイド
- `docs/ACTIVE/STATE.json` - アプリケーションの現在状態
- `docs/ACTIVE/TASKS.json` - 優先順位付きタスクリスト

### 🔴 最新の重要実装 (2025-08-28～09-03)
- [`docs/DATA-PERSISTENCE-IMPLEMENTATION-STATUS.md`](docs/DATA-PERSISTENCE-IMPLEMENTATION-STATUS.md) - データ永続化（完了）
- [`docs/PARAGRAPH-MODE-IMPLEMENTATION-SUMMARY.md`](docs/PARAGRAPH-MODE-IMPLEMENTATION-SUMMARY.md) - パラグラフ履歴（完了）
- [`docs/CRITICAL-BUG-DISCOVERY-20250830.md`](docs/CRITICAL-BUG-DISCOVERY-20250830.md) - **🚨 AdvancedFeatureService未初期化バグ**

### 🔨 開発ガイド
- [`docs/BUILD-GUIDE.md`](docs/BUILD-GUIDE.md) - ビルド手順
- [`docs/MULTILINGUAL-TESTING-GUIDE.md`](docs/MULTILINGUAL-TESTING-GUIDE.md) - 多言語テスト
- [`docs/development/AUTO-TEST-LOGGING-SYSTEM.md`](docs/development/AUTO-TEST-LOGGING-SYSTEM.md) - 自動テストシステム
- [`docs/LOGGING-AND-DEBUG-GUIDE.md`](docs/LOGGING-AND-DEBUG-GUIDE.md) - 🆕 ログ出力とデバッグガイド

---

## 🚨 重要な注意事項

1. **動作確認済みのテストが通らない変更は即座にrevert**
2. **型安全性を犠牲にした「とりあえず動く」実装は禁止**
3. **パフォーマンス基準を満たさない実装はマージしない**
4. **/deep-think なしの表面的な修正は禁止**

---

最終更新: 2025-09-04
作成者: Claude Code
バージョン: 2.0.0-alpha