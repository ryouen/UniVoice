# 命名パターン完全調査レポート
実施日: 2025-09-27

## 調査概要
UniVoiceプロジェクト全体における命名パターンの不統一問題について、網羅的な調査を実施しました。

## 1. テキスト関連の命名パターン

### 1.1 original/translation パターン（主流）
**使用箇所:**
- `UnifiedPipelineService.ts` (93行目): `interface Translation { original: string; translated: string; }`
- `AdvancedFeatureService.ts` (37行目): 同様の定義
- `SummaryService.ts` (32行目): 同様の定義
- `useUnifiedPipeline.ts` (64行目): `interface Translation { original: string; japanese: string; }`
- `main.ts`: translationCompleteイベントで使用
- 多数のコンポーネントで使用

### 1.2 sourceText/targetText パターン（推奨）
**使用箇所:**
- `src/types/univoice.types.ts` (31-32行目): HistoryEntryインターフェース
- LanguageConfig.tsの設計思想と一致
- 言語非依存の命名として推奨

### 1.3 text/fullText パターン（ASR専用）
**使用箇所:**
- `DeepgramStreamAdapter.ts`: Deepgramからの音声認識結果
- これは翻訳とは無関係（ASRの生テキスト）

## 2. 言語固定の問題

### 2.1 japanese/english ハードコード
**問題箇所:**
- `UnifiedPipelineService.ts` (106-107行目): `interface Summary { english: string; japanese: string; }`
- `SummaryService.ts` (40-41行目): 同様の定義（TODOコメント付き）
- `AdvancedFeatureService.ts` (47-48行目): 同様の定義
- `useUnifiedPipeline.ts` (75-76行目): 同様の定義
- `UniVoice.tsx`: summaryOverrideプロパティ

### 2.2 翻訳イベントでの言語固定
**問題箇所:**
- `translationComplete`イベント (UnifiedPipelineService.ts 745, 888行目)
  ```typescript
  this.emit('translationComplete', {
    id: segmentId,
    original: text,
    japanese: translatedText,  // ← ハードコード
    timestamp: Date.now()
  });
  ```

## 3. 型定義の重複

### 3.1 Translation型の重複定義（4箇所）
1. `electron/services/domain/UnifiedPipelineService.ts` (93行目)
2. `electron/services/domain/AdvancedFeatureService.ts` (37行目)
3. `src/hooks/useUnifiedPipeline.ts` (64行目)
4. `src/domain/models/Transcript.ts` (推測)

### 3.2 Summary型の重複定義（8箇所）
1. `electron/services/domain/UnifiedPipelineService.ts` (104行目)
2. `electron/services/domain/AdvancedFeatureService.ts` (44行目)
3. `electron/services/domain/SummaryService.ts` (37行目)
4. `src/hooks/useUnifiedPipeline.ts` (73行目)
5. `src/domain/models/Summary.ts` (6行目)
6. `src/presentation/components/UniVoice/sections/ProgressiveSummarySection.tsx` (8行目)
7. その他複数箇所

### 3.3 Memo型の定義
- 主に`src/types/univoice.types.ts`で定義
- 複数のコンポーネントで独自の定義も存在

## 4. 命名の一貫性問題

### 4.1 言語設定の命名
**統一されている部分:**
- `sourceLanguage` / `targetLanguage` （LanguageConfig.tsと一致）
- 全体的に一貫性あり

**問題点:**
- 一部で`sourceLang` / `targetLang`の省略形も混在

### 4.2 イベント命名の不一致
- `translationComplete` - 親フォルダ互換のため残存
- `translation` - IPCイベントとして使用
- `TranslationEvent` - 型定義

## 5. 推奨される改善案

### 5.1 段階的な移行戦略
1. **Phase 1**: 型定義の統一
   - 共通の型定義ファイルを作成
   - 重複定義を削除

2. **Phase 2**: 言語非依存への移行
   - `english`/`japanese` → `sourceText`/`targetText`
   - 既存APIとの互換性レイヤーを追加

3. **Phase 3**: 命名規則の統一
   - `original`/`translated` → `sourceText`/`targetText`
   - 段階的な置換とテスト

### 5.2 互換性の維持
```typescript
// 互換性レイヤーの例
interface Summary {
  sourceText: string;
  targetText: string;
  // 後方互換性のため
  get english() { return this.sourceText; }
  get japanese() { return this.targetText; }
}
```

## 6. 技術的負債の評価

### 影響度: 高
- 多言語対応の妨げ
- 新規開発者の混乱
- メンテナンス性の低下

### 緊急度: 中
- 現在は動作している
- 段階的な改善が可能
- 破壊的変更を避けられる

## 7. 結論

現在のコードベースには以下の命名パターンの不統一が存在します：
1. **original/translation** vs **source/target** の混在
2. **japanese/english** のハードコード
3. **型定義の重複**（Translation型4箇所、Summary型8箇所）

これらは技術的負債として蓄積されており、特に多言語対応の障害となっています。段階的な改善アプローチを推奨します。