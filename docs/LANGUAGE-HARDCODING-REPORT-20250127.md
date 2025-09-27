# UniVoice 言語ハードコード調査レポート

調査日: 2025-01-27
調査者: Claude

## 概要

UniVoiceプロジェクトにおいて、言語コード（'en', 'ja'）および言語名（'english', 'japanese'）のハードコードを徹底的に調査しました。SetupScreen.tsx以外のファイルで、多言語対応を阻害する深刻な問題を複数発見しました。

## 致命的な問題

### 1. translationCompleteイベントでの言語固定

**ファイル**: `electron/services/domain/UnifiedPipelineService.ts`
**行番号**: 888-895
**問題**: 
```typescript
this.emit('translationComplete', {
  id: segmentId,
  original: result.original,
  japanese: result.translated,  // ❌ 'japanese'フィールドがハードコード
  timestamp: Date.now(),
  firstPaintMs: firstPaintTime,
  completeMs: completeTime
});
```
**影響**: 
- 履歴システムが日本語以外の翻訳を正しく記録できない
- 親フォルダとの互換性のために残されているが、多言語対応を完全に破壊
**重要度**: 致命的

### 2. Summary型のenglish/japaneseフィールド

**ファイル**: `electron/services/domain/AdvancedFeatureService.ts`
**行番号**: 43-51
**問題**:
```typescript
interface Summary {
  id: string;
  timestamp: number;
  english: string;    // ❌ 言語固定
  japanese: string;   // ❌ 言語固定
  wordCount: number;
  startTime: number;
  endTime: number;
}
```
**影響**: 
- 要約機能が英語・日本語以外の言語ペアで動作不可
- UIコンポーネントもこの型に依存している可能性が高い
**重要度**: 致命的

### 3. summaryEvent作成時の言語ハードコード

**ファイル**: `electron/services/domain/AdvancedFeatureService.ts`
**行番号**: 363-369
**問題**:
```typescript
const summaryEvent = createSummaryEvent(
  {
    sourceText: summary.english,
    targetText: summary.japanese,
    sourceLanguage: 'en',        // ❌ ハードコード
    targetLanguage: 'ja',        // ❌ ハードコード
    wordCount,
```
**影響**: 
- 実際の言語設定に関わらず、常に英語→日本語として処理される
- イベントハンドラー側で誤った言語として処理される
**重要度**: 致命的

## 重要な問題

### 4. Zodスキーマのデフォルト値

**ファイル**: `electron/services/ipc/contracts.ts`
**行番号**: 215-216
**問題**:
```typescript
sourceLanguage: z.string().default('en'),
targetLanguage: z.string().default('ja'),
```
**影響**: 
- デフォルト値として妥当だが、設定可能な言語の制限なし
- システムの初期状態が英語→日本語に固定
**重要度**: 重要

### 5. 関数のデフォルトパラメータ

**ファイル**: `electron/services/domain/UnifiedPipelineService.ts`
**行番号**: 275-276
**問題**:
```typescript
async startListening(
  sourceLanguage: LanguageCode = 'en',
  targetLanguage: LanguageCode = 'ja',
```
**影響**: 
- パラメータが省略された場合、常に英語→日本語として開始
**重要度**: 重要

### 6. ユーザー入力翻訳の言語判定

**ファイル**: `src/hooks/useUnifiedPipeline.ts`
**行番号**: 1242-1252
**問題**:
```typescript
const translateUserInput = useCallback(async (text: string, from: string = 'ja', to: string = 'en'): Promise<string> => {
  // ...
  if (from === 'ja' && to === 'en') {
    direction = 'Japanese to English';
  } else if (from === 'en' && to === 'ja') {
    direction = 'English to Japanese';
  }
```
**影響**: 
- ユーザー入力の翻訳が日本語↔英語のみサポート
- 他の言語ペアでは適切なプロンプトが生成されない
**重要度**: 重要

## 軽微な問題

### 7. main.tsの初期設定値

**ファイル**: `electron/main.ts`
**行番号**: 975-976, 1291, 1300, 1304
**問題**: 
- `sourceLanguage: 'en'` と `targetLanguage: 'ja'` が初期値として設定
**影響**: 
- セッション開始時に上書きされるため影響は限定的
- コメントで「Will be updated when session starts」と明記
**重要度**: 軽微

### 8. Deepgramの多言語サポートチェック

**ファイル**: `electron/services/adapters/DeepgramStreamAdapter.ts`
**行番号**: ライン数不明（配列内）
**問題**:
```typescript
const multilingualLanguages = ['ja', 'fr', 'de', 'it', 'es', 'pt', 'ru', 'hi', 'nl'];
```
**影響**: 
- Deepgramの仕様に基づく制限なので問題なし
**重要度**: 軽微（問題なし）

## 修正の推奨事項

### 優先度1: 致命的な問題の修正

1. **translationCompleteイベントの改修**
   ```typescript
   // 現在
   japanese: result.translated,
   
   // 修正案
   targetText: result.translated,
   sourceLanguage: this.languageConfig.sourceLanguage,
   targetLanguage: this.languageConfig.targetLanguage,
   ```

2. **Summary型の言語非依存化**
   ```typescript
   interface Summary {
     id: string;
     timestamp: number;
     sourceText: string;    // english → sourceText
     targetText: string;    // japanese → targetText
     wordCount: number;
     startTime: number;
     endTime: number;
   }
   ```

3. **summaryEvent作成時の動的言語設定**
   ```typescript
   sourceLanguage: this.sourceLanguage,
   targetLanguage: this.targetLanguage,
   ```

### 優先度2: 重要な問題の修正

1. **ユーザー入力翻訳の汎用化**
   - LanguageConfig.tsのgetTranslationPrompt()を活用
   - 任意の言語ペアに対応

2. **デフォルト値の設定見直し**
   - 環境変数やユーザー設定から読み込む
   - ハードコードされたデフォルト値を最小限に

## 結論

現在のUniVoiceは、表面的には多言語対応しているように見えますが、内部実装では英語・日本語の組み合わせに強く依存しています。特に、履歴システムと要約機能は完全に言語が固定されており、他の言語では正常に動作しません。

これらの問題を修正しないと、36言語サポートという目標は達成できません。特に、translationCompleteイベントとSummary型の修正は最優先で対応すべきです。

## 影響を受けるファイル一覧

1. `electron/services/domain/UnifiedPipelineService.ts` - translationCompleteイベント
2. `electron/services/domain/AdvancedFeatureService.ts` - Summary型、言語判定ロジック
3. `electron/services/ipc/contracts.ts` - Zodスキーマのデフォルト値
4. `src/hooks/useUnifiedPipeline.ts` - ユーザー入力翻訳
5. `electron/main.ts` - 初期設定値
6. `electron/services/domain/SummaryService.ts` - 同様の問題の可能性
7. フロントエンドのSummary関連コンポーネント - 型定義の影響

以上