# 🚀 START HERE - UniVoice 2.0 開発ガイド

## 🔴 現在の状況（2025-08-15）

**UniVoice 2.0** - Clean Architecture実装によるリアルタイム翻訳システム

### プロジェクト状態
- **基本構造**: ✅ Clean Architecture + CQRS + Event-Driven実装済み
- **Phase 1**: ✅ Streaming UI Optimization完了
- **Phase 2**: 🚧 Advanced Features実装中（要約・語彙・レポート）
- **親プロジェクト**: UniVoice 1.0.0（../realtime_transtrator）は参照のみ

## 📍 読むべきファイル（優先順）

### 必須（これだけ読めばOK）
```bash
1. CLAUDE.md                           # プロジェクトルール
2. docs/ARCHITECTURE.md                # アーキテクチャ設計
3. docs/ACTIVE/STATE.json              # 現在の実装状態
4. docs/API-CONTRACTS.md               # IPC契約仕様
```

### 実装時に参照
```bash
electron/services/ipc/contracts.ts     # 型定義
electron/services/domain/              # ドメインサービス
src/hooks/useUnifiedPipeline.ts        # Reactフック
tests/unit/                            # テストサンプル
```

### 1.0.0からの参照（絶対に変更禁止）
```bash
../realtime_transtrator/tests/core/test-20min-production-detailed.js  # 動作確認済み実装
../realtime_transtrator/tests/helpers/gpt5-helpers.js                # API関数群
```

## 🎯 現在の作業

### 実装中のタスク
1. **AdvancedFeatureService** - 要約・語彙・レポート機能の統合
2. **useAdvancedFeatures Hook** - フロントエンド統合
3. **単語数ベース要約トリガー** - 400/800語での自動処理

### 次のステップ
```bash
# 1. 環境セットアップ
cp .env.example .env
npm install

# 2. 型チェック
npm run typecheck

# 3. テスト実行
npm run test:unit

# 4. 開発開始
npm run dev
```

## ✅ 完了済み機能

### Phase 1: Streaming UI Optimization
- ✅ Clean Architecture構造（domain/infrastructure分離）
- ✅ 型安全IPC（Zod検証）
- ✅ StreamCoalescer（UI更新頻度50%削減）
- ✅ SegmentManager（重複除去）
- ✅ 観測可能性（構造化ログ、メトリクス）

## 🚧 実装中機能

### Phase 2: Advanced Features
- [ ] 単語数ベース要約（初回400語、以降800語）
- [ ] 要約翻訳（英→日）
- [ ] 語彙抽出（5-10専門用語）
- [ ] 最終レポート生成（900-1400語）
- [ ] LocalStorage永続化

## ⚡ クイックスタート

```bash
# アプリ起動
npm run electron

# 開発モード
npm run dev

# テスト音声で確認
# 1. アプリ起動後、"Test (Hayes.wav)"選択
# 2. Startボタンクリック
# 3. 8ブロックUIで動作確認
```

## 🔧 環境要件

- Node.js: v18以上
- npm: v8以上
- OS: Windows/macOS/Linux
- API Keys: OPENAI_API_KEY, DEEPGRAM_API_KEY

## 📊 パフォーマンス目標

- First Paint: ≤ 1000ms
- 翻訳完了: ≤ 2000ms
- 要約生成: ≤ 3000ms
- UI更新削減: ≥ 50%

## 🆘 困ったら

1. **TypeScriptエラー**: `npm run typecheck`で詳細確認
2. **テスト失敗**: `npm run test:unit -- --verbose`でデバッグ
3. **IPC通信エラー**: DevTools ConsoleでZod検証エラー確認
4. **参考実装**: ../realtime_transtrator/の動作確認済みコード参照

---
最終更新: 2025-08-15
次回作業: AdvancedFeatureService実装継続