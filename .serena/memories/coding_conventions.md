# UniVoice 2.0 コーディング規約と重要事項

## TypeScript設定（厳格モード）
```json
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "exactOptionalPropertyTypes": true,
  "noFallthroughCasesInSwitch": true
}
```

## 命名規則
- **コンポーネント**: PascalCase（例: UniVoice.tsx）
- **フック**: camelCase + use prefix（例: useUnifiedPipeline.ts）
- **型定義ファイル**: kebab-case（例: advanced-features.types.ts）
- **禁止事項**:
  - UniVoicePerfect.tsx のような格好悪い命名
  - service_improved.ts のようなアンダースコア接尾辞
  - temp-fix.ts のような一時的な名前

## エラーハンドリング（Result型パターン）
```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// 例外ではなくResult型を使用
async function translateText(text: string): Promise<Result<string>> {
  try {
    const result = await openai.responses.create({...});
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## 重要な実装パターン

### 1. 型の重複定義禁止
- DisplaySegment等の型は必ず元ファイルからインポート
- 独自定義は禁止

### 2. IPC通信は必ずZod検証
```typescript
// 正しい例
const validated = StartSessionCommand.parse(data);

// 禁止例
const data = event.data as any; // ❌ any型禁止
```

### 3. 状態管理の一元化
- currentDisplay等の状態変数が複数箇所で定義されないよう注意
- 単一責任原則の遵守

## 親フォルダ参照の絶対禁止

### ❌ 禁止事項
```typescript
// 絶対にやってはいけない
import { Something } from '../../realtime_transtrator/...';
import { Config } from '../src/...';
```

### ✅ 正しい方法
```typescript
// 必要なコードはUniVoice内にコピー
import { Something } from './domain/Something';
// 参照用データは docs/parent-reference/ を見る
```

## パフォーマンス関連

### 必須の計測
- first paint ≤ 1000ms
- 全ての変更後にメトリクス計測
- `npm run metrics` で確認

### UI更新の最適化
- StreamCoalescerを通じた更新
- 直接的なsetState呼び出しは避ける
- バッチ処理を活用

## テスト作成規則

### テストファイルの配置
- unit/: 単体テスト
- integration/: 統合テスト
- performance/: パフォーマンステスト
- e2e/: エンドツーエンドテスト

### テストの命名
- *.test.ts: TypeScriptテスト
- test-*.js: JavaScriptテスト（レガシー）

## ビルドとデプロイ

### メモリ設定
```bash
# ビルド時に4GB必要
NODE_OPTIONS=--max-old-space-size=4096
```

### ビルドコマンド
```bash
npm run typecheck  # 型チェック（必須）
npm run build      # 本番ビルド
npm run test       # テスト実行
```

## ログ規約

### ログレベル
- error: エラー情報
- warn: 警告
- info: 重要な情報
- debug: デバッグ情報

### ログ出力先
- logs/univoice-YYYY-MM-DD.jsonl（JSON Lines形式）

## セキュリティ

### APIキー管理
- 環境変数で管理（.env）
- ハードコーディング禁止
- コミットに含めない

### データ保護
- 音声データは一時的にのみ保持
- 個人情報の永続化は避ける