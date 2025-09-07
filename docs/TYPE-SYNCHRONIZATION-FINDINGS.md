# 型定義同期に関する調査結果

**作成日**: 2025-08-30  
**作成者**: Claude Code  
**重要度**: 🔴 HIGH - ビルドプロセスに直接影響

## 発見された問題

### 1. 型定義の二重管理
- **バックエンド**: `electron/services/ipc/contracts.ts` - Zodスキーマによる完全な型定義
- **フロントエンド**: `src/shared/types/contracts.ts` - 手動で簡略化された型定義
- **問題**: 新しいイベントタイプ（`combinedSentence`など）を追加する際、両方のファイルを手動で更新する必要がある

### 2. ビルドエラーの原因
```typescript
// フロントエンドでこのエラーが発生
error TS2678: Type '"combinedSentence"' is not comparable to type '"asr" | "translation" | "segment" | "summary" | "error" | "status" | "vocabulary" | "finalReport"'.
```

原因: `src/shared/types/contracts.ts`に`combinedSentence`タイプが追加されていなかった

## 実装した解決策

### 1. 即時修正
`src/shared/types/contracts.ts`のPipelineEventタイプに`'combinedSentence'`を追加

### 2. 恒久的解決策
自動同期スクリプト`scripts/sync-contracts.js`を作成:
- バックエンドの型定義から自動的にフロントエンド用の型を生成
- `npm run sync-contracts`で手動実行
- `npm run build`の前に自動実行（prebuildフック）

## データフローの確認結果

### CombinedSentenceEventの流れ
1. **バックエンド（UnifiedPipelineService）**:
   - `handleCombinedSentence`（行1064）でイベント発行
   - `executeHistoryTranslation`（行1117）で高品質翻訳実行

2. **メインプロセス（main.ts）**:
   - IPCGatewayを通じてイベントを転送

3. **フロントエンド（useUnifiedPipeline）**:
   - 行617-650で`combinedSentence`イベントを処理
   - 行407-449で`history_`プレフィックス付き翻訳を処理

### 重複実装の確認
- ❌ 重複なし - 各メソッドは1箇所のみ実装されている

## 推奨事項

### 1. 型定義の完全な統一
現在の簡略化された型定義（`data: any`）を、Zodスキーマから生成された完全な型定義に置き換えることを検討

### 2. CI/CDへの統合
型の不整合を防ぐため、CIパイプラインに以下を追加:
```bash
npm run sync-contracts
git diff --exit-code src/shared/types/contracts.ts
```

### 3. 開発ワークフロー
新しいイベントタイプを追加する際:
1. `electron/services/ipc/contracts.ts`にZodスキーマを追加
2. `npm run sync-contracts`を実行
3. 生成されたファイルをコミット

## 関連ファイル
- `electron/services/ipc/contracts.ts` - ソース（真実の源）
- `src/shared/types/contracts.ts` - 生成されるファイル
- `scripts/sync-contracts.js` - 同期スクリプト
- `package.json` - sync-contractsコマンドとprebuildフック