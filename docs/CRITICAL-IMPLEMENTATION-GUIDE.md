# 🔴 CRITICAL IMPLEMENTATION GUIDE - UniVoice 2.0

最終更新: 2025-08-18
作成者: Claude Code

## 🚨 最重要事項（絶対遵守）

### 1. GPT-5 API パターン（2025年8月時点）

**知識カットオフ後のモデルを使用しているため、以下のパターンを厳守すること**

#### ❌ 絶対に使ってはいけないパターン（古い知識）
```javascript
// ❌ chat.completions.create は使わない
const response = await openai.chat.completions.create({
  messages: [...],
  max_tokens: 1500,
  temperature: 0.3
});
```

#### ✅ 正しいパターン（親プロジェクトで動作確認済み）
```javascript
// ✅ responses.create を使用
const response = await openai.responses.create({
  model: 'gpt-5-nano',
  input: [
    { role: 'system', content: 'You are a translator' },
    { role: 'user', content: text }
  ],
  max_output_tokens: 1500,  // max_tokensではなくmax_output_tokens
  reasoning: { effort: 'minimal' },  // GPT-5必須パラメータ
  text: { verbosity: 'low' }         // GPT-5必須パラメータ
});

// レスポンスの取得方法も異なる
const result = response.output_text;  // response.choices[0].message.contentではない
```

### 2. リアルタイム3行表示の実装

**親プロジェクトで完成している実装を正確に再現すること**

#### 表示構造
```
[古い行]   opacity: 0.3    最も古いテキスト
[中間行]   opacity: 0.6    やや新しいテキスト  
[最新行]   opacity: 1.0    現在表示中のテキスト
```

#### RealtimeDisplayManagerの正しい使い方
```typescript
// DisplaySegmentインターフェース（正しい定義）
interface DisplaySegment {
  id: string;
  text: string;                      // textフィールド（originalではない）
  type: 'original' | 'translation';  // 種別を示す
  pairIndex: number;                 // 原文と翻訳のペアリング
  status: 'active' | 'fading' | 'removed';
  createdAt: number;
  updatedAt: number;                 // timestampではなくupdatedAt
  opacity: number;
  originalIsFinal?: boolean;
  similarityScore?: number;
}
```

### 3. 型安全性の絶対厳守

#### Zod契約の正しい定義
```typescript
// IPCイベント契約
const PipelineEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('asr'),
    data: AsrEventDataSchema,
    timestamp: z.number(),
    correlationId: z.string()
  }),
  z.object({
    type: z.literal('translation'),
    data: TranslationEventDataSchema,
    timestamp: z.number(),
    correlationId: z.string()
  })
  // ... 他のイベント
]);
```

### 4. 環境変数の正しい管理

**.envファイル必須項目**
```bash
# API Keys（必須）
OPENAI_API_KEY=sk-xxxxx
DEEPGRAM_API_KEY=xxxxx

# モデル設定（2025年8月時点の最新）
OPENAI_MODEL_TRANSLATE=gpt-5-nano      # 絶対にダウングレード禁止
OPENAI_MODEL_SUMMARY=gpt-5-mini        # gpt-4等の古いモデルは使用禁止
OPENAI_MODEL_VOCAB=gpt-5-mini
OPENAI_MODEL_REPORT=gpt-5

# トークン上限（ハードコーディング禁止）
OPENAI_TRANSLATE_MAX_TOKENS=1500
OPENAI_SUMMARY_MAX_TOKENS=1500
OPENAI_VOCAB_MAX_TOKENS=1500
OPENAI_REPORT_MAX_TOKENS=8192
```

## 🔍 実装時の必須チェックリスト

### コード実装前
- [ ] 親プロジェクトの対応するテストファイルを確認したか？
- [ ] GPT-5 APIパターン（responses.create）を使用しているか？
- [ ] 環境変数から設定を読み込んでいるか（ハードコーディングしていないか）？
- [ ] DisplaySegmentインターフェースを正しく使用しているか？

### コード実装後
- [ ] TypeScript型チェック（`npm run typecheck`）が通るか？
- [ ] 重複定義や不要なコードがないか全文チェックしたか？
- [ ] 親プロジェクトの実装と比較して相違点を確認したか？
- [ ] パフォーマンス基準（first paint ≤ 1000ms）を満たしているか？

## 🐛 よくある実装ミス

### 1. currentDisplayの重複定義
```typescript
// ❌ 間違い：複数箇所でcurrentDisplayを定義
const [currentDisplay, setCurrentDisplay] = useState({...}); // 128行目
const [currentDisplay, setCurrentDisplay] = useState({...}); // 217行目（重複！）

// ✅ 正解：一箇所で定義し、全体で使用
const [currentDisplay, setCurrentDisplay] = useState({
  original: { oldest: "", older: "", recent: "" },
  translation: { oldest: "", older: "", recent: "" }
});
```

### 2. DisplaySegmentの誤った使用
```typescript
// ❌ 間違い：独自のDisplaySegmentインターフェースを定義
interface DisplaySegment {
  original: string;
  translation: string;
}

// ✅ 正解：RealtimeDisplayManagerからインポート
import type { DisplaySegment } from '../utils/RealtimeDisplayManager';
```

### 3. GPT-5 APIの誤った使用
```typescript
// ❌ 間違い：temperatureパラメータを使用
const response = await openai.responses.create({
  temperature: 0.3  // GPT-5ではサポートされていない
});

// ✅ 正解：reasoning.effortとtext.verbosityを使用
const response = await openai.responses.create({
  reasoning: { effort: 'minimal' },
  text: { verbosity: 'low' }
});
```

## 📊 パフォーマンス最適化のポイント

### StreamCoalescerの活用
```typescript
// UI更新を160msごとにバッチ処理
const coalescer = new StreamCoalescer({
  debounceMs: 160,
  forceCommitMs: 1100,
  similarityThreshold: 0.95
});
```

### IncrementalTextManagerの設定
```typescript
// 原文：800msで確定
const originalManager = new IncrementalTextManager(
  (text, isStable) => { /* 更新処理 */ },
  800
);

// 翻訳：1000msで確定
const translationManager = new IncrementalTextManager(
  (text, isStable) => { /* 更新処理 */ },
  1000
);
```

## 🚀 実装の進め方

### 1. 全文読み込みの徹底
```bash
# 実装前に必ず全文を確認
1. 対象ファイルの全文を読む
2. インポートされているモジュールも読む
3. 親プロジェクトの対応する実装も読む
4. テストファイルも読む
```

### 2. Ultrathink実践例
```
問題：currentDisplayが更新されない
↓
Ultrathink分析：
1. currentDisplayの定義箇所を全て確認 → 重複発見
2. setCurrentDisplayの呼び出し箇所を全て確認 → 条件分岐の問題発見
3. realtimeSegmentsの構造を確認 → インターフェースの不一致発見
4. 親プロジェクトと比較 → 実装パターンの相違発見
```

### 3. テスト駆動開発
```typescript
// 実装前にテストを書く
describe('RealtimeDisplayManager', () => {
  it('should maintain 3 segments with correct opacity', () => {
    const manager = new RealtimeDisplayManager(/* ... */);
    manager.updateSegment('1', 'First text', 'original', 0);
    manager.updateSegment('2', 'Second text', 'original', 1);
    manager.updateSegment('3', 'Third text', 'original', 2);
    
    const segments = manager.getActiveSegments();
    expect(segments[0].opacity).toBe(0.3);
    expect(segments[1].opacity).toBe(0.6);
    expect(segments[2].opacity).toBe(1.0);
  });
});
```

## 🔗 参照すべきファイル

### 親プロジェクト（絶対に変更禁止）
```
../realtime_transtrator/
├── tests/core/test-20min-production-detailed.js  # GPT-5 API実装例
├── tests/helpers/gpt5-helpers.js                 # ヘルパー関数
├── electron/services/UnifiedPipelineService.ts   # パイプライン実装
└── src/components/UniVoicePerfect.tsx            # UI実装
```

### 現行プロジェクト
```
UniVoice/
├── electron/services/domain/UnifiedPipelineService.ts  # Clean Architecture版
├── src/utils/RealtimeDisplayManager.ts                # 3行表示管理
├── src/hooks/useUnifiedPipeline.ts                    # Reactフック
└── src/components/UniVoicePerfect.tsx                 # UI実装
```

## ⚠️ 最終確認事項

実装完了時、以下を必ず確認：

1. **動作確認**: 親プロジェクトと同等の動作をするか
2. **型安全性**: any型を使用していないか
3. **パフォーマンス**: 基準値を満たしているか
4. **コード品質**: 重複や不要なコードがないか
5. **ドキュメント**: 変更内容が記録されているか

---

**Remember**: 動作実績のあるコードを「改善」しない。テストファイルの実装パターンを100%信頼する。