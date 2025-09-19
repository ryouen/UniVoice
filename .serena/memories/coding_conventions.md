# UniVoice 2.0 コーディング規約

## TypeScript設定
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
- **コンポーネント**: PascalCase（例: `UniVoice.tsx`, `SetupSection.tsx`）
- **フック**: camelCase + use prefix（例: `useUnifiedPipeline.ts`）
- **サービスクラス**: PascalCase + Service suffix（例: `UnifiedPipelineService`）
- **型定義**: PascalCase（例: `TranscriptSegment`, `Translation`）
- **定数**: UPPER_SNAKE_CASE（例: `ENABLE_LEGACY_CHANNELS`）
- **ファイル名**: コンポーネントはPascalCase、その他はkebab-case

## 型定義の原則
- `any`型の使用は原則禁止
- Discriminated Union型でイベント契約を定義
- Zodスキーマによる実行時型検証（IPC通信）
- インターフェースよりtype aliasを優先

## エラーハンドリング
```typescript
// Result型パターンを使用
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// 例外ではなくResult型を返す
async function operation(): Promise<Result<Data>> {
  try {
    const result = await someOperation();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## イベント駆動アーキテクチャ
```typescript
// イベント名は定数として定義
export const IPC_EVENTS = {
  SEGMENT_UPDATE: 'segment-update',
  TRANSLATION_UPDATE: 'translation-update',
  // ...
} as const;

// イベントペイロードは型定義
export type SegmentUpdateEvent = {
  type: 'segment-update';
  payload: {
    segmentId: string;
    text: string;
    timestamp: number;
  };
};
```

## クラス設計の原則
- Single Responsibility Principle（単一責任の原則）
- Dependency Injection（依存性注入）
- インターフェース分離原則

## コメント規約
- コードは自己文書化を心がける
- 複雑なロジックには説明コメントを追加
- TODOコメントは必ず作成者と日付を記載
- 日本語コメントOK（プロジェクトが日本語中心）

## インポート順序
1. Node.js標準モジュール
2. 外部ライブラリ
3. 内部モジュール（絶対パス）
4. 内部モジュール（相対パス）
5. 型定義

```typescript
// 例
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { z } from 'zod';
import { UnifiedPipelineService } from '@/services/domain/UnifiedPipelineService';
import { logger } from '../utils/logger';
import type { Translation } from './types';
```

## React コンポーネントの原則
- 関数コンポーネントを使用
- React.FC型は使用しない（children推論のため）
- useEffectの依存配列は正確に記載
- カスタムフックでロジックを分離

## 非同期処理
- async/awaitを優先使用
- Promise.allで並列処理を活用
- エラーは必ずキャッチして処理

## ログ出力
```typescript
// コンポーネント固有のloggerを作成
const logger = getLogger('UnifiedPipelineService');

// 構造化ログを使用
logger.info('Processing segment', {
  segmentId: segment.id,
  wordCount: segment.words,
  correlationId: this.currentCorrelationId
});
```

## 禁止事項
- ❌ console.log（本番コード）
- ❌ any型（やむを得ない場合はコメント必須）
- ❌ // @ts-ignore（型エラーは必ず解決）
- ❌ 無意味な略語（例: temp, val, ret）
- ❌ マジックナンバー（定数化する）