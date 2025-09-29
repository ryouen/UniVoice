# 命名規則の不統一 - 実際のコード調査結果 (2025-09-27)

## 調査概要
UnifiedPipelineService.tsを300行ずつ詳細に読み込み、実際の命名規則の使用状況を確認した。

## 重要な発見事項

### 1. translationCompleteイベントの不整合 🔴

#### 746行目（同一言語スキップ処理内）
```typescript
this.emit('translationComplete', {
  id: segmentId,
  original: text,        // ❌ originalを使用
  japanese: text,        // ❌ japaneseにハードコード
  timestamp: Date.now(),
  firstPaintMs: 0,
  completeMs: 0
});
```

#### 887行目（通常の翻訳完了時）
```typescript
this.emit('translationComplete', {
  id: segmentId,
  sourceText: result.sourceText,      // ✅ sourceTextを使用
  targetText: result.targetText,      // ✅ targetTextを使用
  sourceLanguage: result.sourceLanguage,
  targetLanguage: result.targetLanguage,
  timestamp: Date.now(),
  firstPaintMs: firstPaintTime,
  completeMs: completeTime
});
```

### 2. 型定義は正しい

#### Translation型（92-101行）
```typescript
interface Translation {
  id: string;
  sourceText: string;     // ✅ 正しい
  targetText: string;     // ✅ 正しい
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
}
```

### 3. その他の命名規則

- DeepgramからのASRイベント: 正しくsourceLanguageを使用
- TranslationQueueManager: sourceText/sourceLanguageで統一
- createTranslationEvent: sourceText/targetTextで正しく実装

## 問題の影響範囲

1. **translationCompleteイベントのリスナー**
   - フロントエンドでこのイベントを受信するコードが影響を受ける
   - 2つの異なる形式のイベントが混在する

2. **言語固定の問題**
   - 同一言語スキップ時に「japanese」固定で送信
   - 多言語対応時に問題となる

## 結論

古いドキュメント（NAMING-CONSISTENCY-ISSUES-20250926.md）の指摘は部分的に正しかった：
- ✅ translationCompleteイベントにoriginal/japaneseのハードコードが存在
- ❌ ただし、全体的にはsourceText/targetTextへの移行が進んでいる
- ❌ 他の箇所（Summary型など）の問題は現在のコードでは確認できず

リファクタリングの優先事項：
1. 746行目のtranslationCompleteイベントの修正
2. イベントリスナー側の互換性確認