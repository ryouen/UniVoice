# CLAUDE.md — UniVoice 2.0 プロジェクト設定（Claude Code 用・最上位ルール）

## 🔴 最初に必ず実行すること

```bash
# 1. 現在の状態を確認
cat docs/ACTIVE/STATE.json | head -20

# 2. タスクリストで優先作業を確認
cat docs/ACTIVE/TASKS.json | grep -A 5 '"priority": "high"'

# 3. ウィンドウ管理実装の進捗確認
ls -la electron/main/WindowRegistry.ts 2>/dev/null && echo "✅ M1: WindowRegistry実装済" || echo "❌ M1: WindowRegistry未実装"
ls -la src/services/WindowClient.ts 2>/dev/null && echo "✅ M1: WindowClient実装済" || echo "❌ M1: WindowClient未実装"

# 4. deep-thinkプロトコルの確認（重要）
cat .claude/commands/deep-think.md | head -30
```

**重要**: このプロジェクトは UniVoice 2.0 として、
Clean Architecture + CQRS + Event-Driven パターンで構築されています。

## 🕐 実行パターンの最適化（2025-09-27 追加）

### ファイル読み取りの判断基準

| 状況 | 行動 |
|------|------|
| ファイルが5000行以下 | 全文を読む |
| ファイルが5000行以上 | grep/sedで必要箇所のみ |
| エラーメッセージあり | スタックトレース全体を読む |
| 型エラー | 型定義ファイルを先に確認 |

### 実装前の必須確認コマンド

```bash
# 1. 既存実装の確認（重複防止）
grep -r "実装しようとしている関数名" --include="*.ts" --include="*.tsx"

# 2. 命名規則の確認
grep -r "handle\|on[A-Z]" <対象ファイル> | head -20

# 3. 型定義の確認
grep -r "interface.*{" <対象ファイル> | sort | uniq -c

# 4. importの確認（依存関係）
grep "^import" <対象ファイル> | sort
```

### 事実確認の徹底

- **実行結果**: 実際のコマンド出力を含める
- **推測**: 「推測:」と明記する
- **未確認**: 「未確認:」と明記する
- **わからない場合**: 「わかりません。調査します。」と正直に書く

## 🚨 既知の技術的負債（2025-09-27 時点）

### 命名規則の不統一
- **問題**: original/translation vs source/target が混在
- **影響**: UnifiedPipelineService.ts、useUnifiedPipeline.ts、contracts.ts
- **推奨**: source/target に統一（LanguageConfig.tsと一致）

### 言語固定の問題
- **問題**: english/japanese がハードコード
- **影響**: Summary型、translationCompleteイベント
- **推奨**: sourceText/targetText に変更

### 型定義の重複
- **問題**: TranscriptSegmentが4箇所で定義
- **確認**: `grep -n "interface TranscriptSegment" --include="*.ts" -r .`
- **推奨**: src/domain/models/Transcript.ts を唯一の定義源とする

### リファクタリング失敗の教訓（2025-09-27）
1. **onPipelineEvent問題**: 関数名に`on`プレフィックスを使用 → ASR未到達
2. **重複実装見逃し**: sendAudioChunkが2箇所に実装
3. **段階的実行の重要性**: 一度に3つのフックに分離 → useEffect不実行

**⚠️ 重要な訂正 (動作実績のあるコードを改悪するな)**: 
- Responses API は2025年3月にリリースされた実在のAPIです
- GPT-5シリーズ（gpt-5、gpt-5-mini、gpt-5-nano）は実在のモデルです
- temperature パラメータは GPT-5 では1.0固定（変更不可）
- Nova-3 は Deepgram の最新モデルです

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
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - Clean Architecture設計
- [`docs/START-HERE.md`](docs/START-HERE.md) - クイックスタートガイド
- [`docs/BUILD-GUIDE.md`](docs/BUILD-GUIDE.md) - ビルド手順

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
- [x] UniVoice.tsxリファクタリング Phase 1-2（モーダル/質問セクション分離）✅ 2025-09-23
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

### 重要な技術ドキュメント
- [命名規則不統一問題](docs/NAMING-CONSISTENCY-ISSUES-20250926.md) - source/target統一の必要性
- [コードベース深層分析](docs/CODEBASE-DEEP-ANALYSIS-20250926.md) - アーキテクチャの現状
- [リファクタリング分析](docs/REFACTORING-ANALYSIS-20250925.md) - フック分離の評価
- [透過ウィンドウ対策](docs/TRANSPARENT-WINDOW-FOCUS-FIX.md) - #01000000による解決
- [ウィンドウ管理実装](docs/WINDOW-MANAGEMENT-IMPLEMENTATION-GUIDE.md) - M1完了、M2準備中
- [多言語テストガイド](docs/MULTILINGUAL-TESTING-GUIDE.md) - 36言語サポートのテスト

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

最終更新: 2025-09-27（ea900b8リバート後の再構築）
作成者: Claude Code
バージョン: 2.0.0-alpha