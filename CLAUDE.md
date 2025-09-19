# CLAUDE.md — UniVoice 2.0 プロジェクト設定（Claude Code 用・最上位ルール）

## 🔴 最初に必ず実行すること

```bash
# 1. 重要事実集を確認（新セッション必須）- 2025-09-17大幅更新
cat CRITICAL-FACTS-FOR-NEW-SESSION.md

# 2. 現在の状況を確認 - 2025-09-17更新
cat START-HERE.md

# 3. 実装状況の詳細を確認 - 2025-09-17深層分析済み
cat IMPLEMENTATION-STATUS-20250910.md

# 4. ウィンドウ管理実装の進捗確認（2025-09-14追加）
# 実装ガイドを確認
cat docs/WINDOW-MANAGEMENT-IMPLEMENTATION-GUIDE.md | head -50

# 実装状況をチェック（以下のファイルの存在で進捗を判断）
ls -la electron/main/WindowRegistry.ts 2>/dev/null || echo "❌ M1: WindowRegistry未実装"
ls -la src/services/WindowClient.ts 2>/dev/null || echo "❌ M1: WindowClient未実装"
grep -q "windowManager" electron/preload.ts 2>/dev/null && echo "✅ M1: Preload API実装済" || echo "❌ M1: Preload API未実装"

# ⚠️ Setup画面374px問題の原因と解決（2025-09-14判明）
# BoundsStoreが前回の374pxを保存しているのが原因
# 解決方法：window-bounds.jsonを削除するか、setup画面は保存値を無視する修正が必要

# タスクリストで現在のマイルストーンを確認
grep "M1" docs/ACTIVE/TASKS.json | grep "pending" | head -5
```

📌 **必須ファイル**: [`CRITICAL-FACTS-FOR-NEW-SESSION.md`](CRITICAL-FACTS-FOR-NEW-SESSION.md) - 新セッションで最初に読む（2025-09-17大幅更新済み）

**重要**: このプロジェクトは UniVoice 2.0 として、
Clean Architecture + CQRS + Event-Driven パターンで構築されています。

**🔴 2025-09-17 重要な発見**:
- SentenceCombinerは既に統合済み・正常動作中（多くのドキュメントの誤情報を修正）
- SessionStorageServiceは実装済みだが完全に未使用（データ永続化の欠如）
- 実装進捗は約50%（リアルタイム100%、高度機能70%、永続化0%）

**⚠️ 重要な訂正 (あなたが疑ったり、改悪しては絶対にならないもの)**: 
- Responses API は2025年3月にリリースされた実在のAPIです
- GPT-5シリーズ（gpt-5、gpt-5-mini、gpt-5-nano）は実在のモデルです
- temperature パラメータは GPT-5 では1.0固定（変更不可）
- 詳細は [PARAMETER-INCONSISTENCIES-REPORT.md](PARAMETER-INCONSISTENCIES-REPORT.md) を参照してください

## 🔴 絶対命令（CRITICAL DIRECTIVES）

### 0. **動作実績のあるコードを壊すな**

### 1. **Ultrathink原則 — 表面的修正の禁止**
   - コード修正前に必ず状況と構造を深く分析（Ultrathink）すること
   - 計画を立て、その影響範囲と副作用を完全に見通してから着手
   - 「とりあえず試す」「推測で修正」は厳禁
   - **詳細プロトコル**: `/deep-think` コマンドで深層思考手順を確認。　コマンドは.\.claude\commands内

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
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - Clean Architecture設計 🆕
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
- [x] 文単位履歴管理（SentenceCombiner）- 統合済み・動作中 ✅
- [x] 二段階翻訳システム（リアルタイム/履歴）- 完了
- [x] 高品質翻訳の動的更新 - 完了
- [x] 単語数ベース要約（400/800語）- バックエンド完了、UI課題
- [x] 語彙抽出（5-10専門用語）- バックエンド完了、UI未統合
- [ ] 最終レポート生成（Markdown）- メソッド存在、未統合
- [ ] データ永続化 - SessionStorageService未使用 🔴

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
- [GitHubバックアップ差分詳細分析](docs/GITHUB-DIFF-FACTUAL-ANALYSIS-20250919.md) 🔴 NEW (2025-09-19) - 現在の変更とGitHubの差分を詳細分析（透過設定復元を含む）
- [Windows透過設定復元ログ](docs/TRANSPARENCY-RESTORATION-LOG-20250919.md) 🔴 NEW (2025-09-19) - グラスモーフィズム効果の復元作業記録
- [自動テスト・ログ収集システム](docs/development/AUTO-TEST-LOGGING-SYSTEM.md) 🔴 NEW
- [型定義同期に関する調査結果](docs/TYPE-SYNCHRONIZATION-FINDINGS.md) 🔴 NEW - ビルドエラーの原因と解決策
- [LocalStorage廃止・移行計画](docs/LOCALSTORAGE-MIGRATION-PLAN.md) 🔴 NEW (2025-09-16) - Setup画面スキップ問題の根本解決
- [ウィンドウ管理実装ガイド](docs/WINDOW-MANAGEMENT-IMPLEMENTATION-GUIDE.md) 🔴 NEW (2025-09-14) - 実装者向けの具体的な手順書
- [ウィンドウ管理アーキテクチャ](docs/WINDOW-MANAGEMENT-ARCHITECTURE.md) - 設計思想と詳細仕様
- [解決済み問題レポート](docs/RESOLVED-ISSUES-20250914.md) 🆕 - プロセス暴走・IPC重複問題の解決
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

## 📄 最重要ドキュメント (2025-09-17 更新)

### 🔥 現在の状態管理（全て最新版に更新済み）
- `CRITICAL-FACTS-FOR-NEW-SESSION.md` - 重要事実集（深層分析反映）✅
- `START-HERE.md` - セッション開始ガイド（優先順位更新）✅
- `IMPLEMENTATION-STATUS-20250910.md` - 正確な実装状況 ✅
- `docs/ACTIVE/TASKS.json` - 優先順位付きタスクリスト ✅

### 🔴 重要な発見と修正 (2025-09-17)
- SentenceCombiner統合済みの発見（多くのドキュメントの誤情報を修正）
- SessionStorageService完全未使用の発見（データ永続化の欠如）
- プロジェクト実装率の正確な把握（約50%）

### 🔨 開発ガイド
- [`docs/BUILD-GUIDE.md`](docs/BUILD-GUIDE.md) - ビルド手順
- [`docs/MULTILINGUAL-TESTING-GUIDE.md`](docs/MULTILINGUAL-TESTING-GUIDE.md) - 多言語テスト
- [`docs/development/AUTO-TEST-LOGGING-SYSTEM.md`](docs/development/AUTO-TEST-LOGGING-SYSTEM.md) - 自動テストシステム
- [`docs/LOGGING-AND-DEBUG-GUIDE.md`](docs/LOGGING-AND-DEBUG-GUIDE.md) - 🆕 ログ出力とデバッグガイド
- [`docs/UNIVOICE-TSX-STRUCTURE-ANALYSIS.md`](docs/UNIVOICE-TSX-STRUCTURE-ANALYSIS.md) 🔴 NEW (2025-09-19) - 2890行のUniVoice.tsx構造分析とClean Architectureリファクタリング戦略
- [`docs/CLEAR-SESSION-DEBUG-GUIDE.md`](docs/CLEAR-SESSION-DEBUG-GUIDE.md) - Setup画面が表示されない問題のデバッグ

---

## 🚨 重要な注意事項

1. **動作確認済みのテストが通らない変更は即座にrevert**
2. **型安全性を犠牲にした「とりあえず動く」実装は禁止**
3. **パフォーマンス基準を満たさない実装はマージしない**
4. **/deep-think なしの表面的な修正は禁止**

---

## 🔄 実装整合性チェック＆更新管理（2025-09-14追加）

### マイルストーン完了時の更新手順

```bash
# M1完了時の確認と更新
# 1. 実装完了チェック
npm run test:window-management  # ウィンドウ管理のテスト
ls -la electron/main/{window-registry,bounds-store}.ts
ls -la src/services/window-client.ts

# 2. ドキュメント更新
# 実装ガイドのM1セクションを「完了」に更新
# 新しい知見や変更点を追記

# 3. タスクリスト更新
# TodoWriteツールでM1タスクをcompletedに変更
# M2タスクのpriorityをhighに上げる
```

### 実装とドキュメントの整合性確認

```bash
# ソースコードから実装状況を自動検出
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "WindowRegistry\|WindowClient\|windowManager" | sort

# ドキュメントに記載されている実装ファイルと比較
diff <(cat docs/WINDOW-MANAGEMENT-IMPLEMENTATION-GUIDE.md | grep -E "^(electron|src)/" | sort) \
     <(find . -name "*window*.ts" -o -name "*Window*.tsx" | grep -v node_modules | sort)
```

### 更新対象ドキュメント一覧

| マイルストーン | 主要更新ドキュメント | 更新内容 |
|----------------|---------------------|----------|
| M1完了時 | WINDOW-MANAGEMENT-IMPLEMENTATION-GUIDE.md | M1セクションを完了マーク、実装の振り返り追加 |
| M2完了時 | 同上 + ARCHITECTURE.md | UI分割の実装詳細、コンポーネント構成図 |
| M3完了時 | 同上 + API-CONTRACTS.md | Hook分割に伴うIPC契約の整理 |
| M4完了時 | 全アーキテクチャドキュメント | Clean Architecture完成形の記録 |

### TodoWriteツール使用タイミング

- **毎日の作業開始時**: 当日のタスクをin_progressに
- **機能実装完了時**: 該当タスクをcompletedに
- **新しい課題発見時**: 新規タスクを追加
- **マイルストーン完了時**: 次フェーズのタスクpriorityを調整

---

最終更新: 2025-09-19（Clean Architectureリファクタリング開始）
作成者: Claude Code
バージョン: 2.0.0-alpha