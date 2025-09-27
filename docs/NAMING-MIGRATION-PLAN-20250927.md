# UniVoice 命名規則統一 移行計画書
作成日: 2025-09-27
作成者: Claude Code (DEEP THINK Protocol)

## 1. 現状分析サマリー

### 1.1 命名の不統一
- **バックエンド（contracts.ts）**: `originalText` / `translatedText`
- **フロントエンド（useUnifiedPipeline）**: `original` / `japanese`
- **要約関連**: `english` / `japanese` （言語固定）
- **メモ機能**: `japanese` / `english` （言語固定）

### 1.2 Setup画面との不整合
- Setup画面: `sourceLanguage` / `targetLanguage` で36言語対応
- 内部実装: 日本語・英語にハードコード

### 1.3 Deepgram Nova-3の制約
- 直接サポート: en, es, fr, de, pt, nl
- multiモード必須: ja, hi, ru, it
- 実装で考慮が必要

## 2. 統一方針

### 2.1 命名規則
```typescript
// テキスト内容
sourceText: string;      // 原文（音声認識結果）
targetText: string;      // 翻訳文

// 言語設定
sourceLanguage: string;  // 原文の言語（"en", "ja" など）
targetLanguage: string;  // 翻訳先の言語（"en", "ja" など）

// Deepgram用（内部処理）
deepgramLanguage: string; // "multi" に変換される場合あり
```

### 2.2 質問翻訳の特殊性
- 通常の翻訳: source → target
- 質問の翻訳: target → source（逆方向）
- 実装時に `translationDirection: 'normal' | 'reverse'` で管理

## 3. 移行手順（段階的アプローチ）

### Phase 1: 型定義の更新（後方互換性維持）
1. contracts.ts の更新
   - TranslationEventSchema: 新旧両フィールドを提供
   - SummaryEventSchema: 言語コード追加
   
2. フロントエンド型定義の更新
   - Translation型: 新旧両フィールドを提供
   - Summary型: sourceText/targetText追加

### Phase 2: バックエンド実装の更新
1. UnifiedPipelineService.ts
   - Deepgram言語設定のmultiモード対応
   - イベント送信時に新旧両フィールドを含める

2. AdvancedFeatureService.ts
   - 要約生成時の言語対応

### Phase 3: フロントエンド実装の更新
1. useUnifiedPipeline.ts
   - 新フィールドへの段階的移行
   - 旧フィールドの非推奨化

2. useMemoManager.ts
   - Memo型の言語中立化

### Phase 4: 旧フィールドの削除（次メジャーバージョン）
- 後方互換性フィールドの削除
- ドキュメント更新

## 4. 実装詳細

### 4.1 contracts.ts の変更
```typescript
export const TranslationEventSchema = z.object({
  type: z.literal('translation'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    // 新フィールド（推奨）
    sourceText: z.string(),
    targetText: z.string(),
    sourceLanguage: z.string(),
    targetLanguage: z.string(),
    
    // 旧フィールド（後方互換性）
    originalText: z.string().optional(), // deprecated
    translatedText: z.string().optional(), // deprecated
    
    // 共通フィールド
    confidence: z.number().min(0).max(1),
    isFinal: z.boolean(),
    segmentId: z.string().optional(),
  }),
});
```

### 4.2 Deepgram言語処理
```typescript
function getDeepgramLanguage(sourceLanguage: string): string {
  // multiモードが必要な言語
  if (['ja', 'hi', 'ru', 'it'].includes(sourceLanguage)) {
    return 'multi';
  }
  return sourceLanguage;
}
```

## 5. テスト計画

### 5.1 ユニットテスト
- 新旧フィールドの互換性テスト
- Deepgram言語変換テスト
- 質問翻訳の方向性テスト

### 5.2 統合テスト
- Setup画面からの言語設定伝播
- IPC通信の正常性
- 多言語での実動作確認

### 5.3 E2Eテスト
- 日本語授業→英語字幕
- 英語授業→日本語字幕
- 質問機能（逆方向翻訳）

## 6. リスク管理

### 6.1 破壊的変更のリスク
- **対策**: Phase 1で後方互換性を完全に維持
- **検証**: 既存のUIが動作することを確認

### 6.2 パフォーマンスへの影響
- **懸念**: 新旧両フィールドの送信によるペイロード増加
- **対策**: 影響は軽微（数十バイト程度）

### 6.3 多言語テストの不足
- **対策**: 主要言語（en, ja, es, fr）でのテストを優先
- **将来**: 全36言語のテストは段階的に実施

## 7. 成功基準

1. ✅ 既存機能が壊れないこと
2. ✅ Setup画面の言語選択が正しく反映されること
3. ✅ 日本語・英語以外の言語でも動作すること
4. ✅ 質問機能の逆方向翻訳が正常に動作すること
5. ✅ パフォーマンスの劣化がないこと

## 8. タイムライン

- **Phase 1**: 1日（型定義の更新）
- **Phase 2**: 1日（バックエンド実装）
- **Phase 3**: 1日（フロントエンド実装）
- **テスト**: 2日
- **合計**: 5日

---
注記: この計画書はDEEP THINKプロトコルに基づき、影響範囲を完全に把握した上で作成されています。