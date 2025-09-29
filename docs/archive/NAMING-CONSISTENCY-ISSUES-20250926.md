# UniVoice 命名規則不統一問題レポート
作成日: 2025-09-26
作成者: Claude Code (DEEP THINK モード)

## エグゼクティブサマリー

UniVoiceプロジェクトのコードベース全体を深層分析した結果、以下の重大な問題を発見しました：

1. **命名規則の不統一**: 同じ概念に対して複数の名前が混在
2. **言語固定の問題**: 多言語対応設計にも関わらず、english/japanese がハードコード
3. **型定義の重複**: 同一インターフェースが複数箇所で定義
4. **実装の重複**: 同じ機能が複数バージョン存在

## 1. 命名規則の不統一

### 1.1 原文と翻訳文の命名

現在、以下の3つのパターンが混在しています：

| パターン | 原文 | 翻訳文 | 使用箇所 |
|---------|------|--------|----------|
| パターン1 | original | translation | useUnifiedPipeline.ts, Translation型 |
| パターン2 | source/sourceText | target/targetText | contracts.ts, LanguageConfig.ts |
| パターン3 | originalText | translatedText | TranslationEvent, TranslationQueueManager |

### 1.2 言語設定の命名

| 用途 | 使用されている名前 | 適切な名前 |
|------|-------------------|------------|
| 原言語 | sourceLanguage | ✅ 正しい |
| 対象言語 | targetLanguage | ✅ 正しい |
| 原文 | english | ❌ sourceText にすべき |
| 翻訳文 | japanese | ❌ targetText にすべき |

## 2. 言語固定の問題

### 2.1 影響範囲

以下のファイルで english/japanese がハードコードされています：

1. **UnifiedPipelineService.ts**
   - Summary インターフェース (115-125行)
   - translationComplete イベント (820-830行, 963-970行)

2. **SummaryService.ts**
   - Summary インターフェース (37-45行)
   - TODOコメントあり：「sourceText/targetText に変更予定」

3. **useUnifiedPipeline.ts**
   - Translation インターフェース (61-68行)
   - Summary インターフェース (70-81行)

4. **contracts.ts**
   - SummaryEventSchema (79-86行)

### 2.2 矛盾する設計

LanguageConfig.ts では36言語をサポートする設計になっているにも関わらず、実装では english/japanese に固定されています。

## 3. 型定義の重複

### 3.1 TranscriptSegment の重複定義

| ファイル | 行番号 | 差異 |
|----------|--------|------|
| src/domain/models/Transcript.ts | 6行 | 正規の定義 |
| electron/services/domain/SentenceCombiner.ts | 18行 | 独自定義 |
| electron/services/domain/UnifiedPipelineService.ts | 48行 | 1回目の定義 |
| electron/services/domain/UnifiedPipelineService.ts | 94行 | 2回目の定義（同一ファイル内で重複！） |

### 3.2 Translation 型の重複定義

| ファイル | 行番号 | 差異 |
|----------|--------|------|
| src/hooks/useUnifiedPipeline.ts | 61行 | export interface Translation |
| electron/services/domain/UnifiedPipelineService.ts | 104行 | interface Translation |

## 4. 実装の重複

### 4.1 handleTranscriptSegment メソッド

- **現行版**: handleTranscriptSegment (712行)
- **旧版**: handleTranscriptSegmentOLD (1242行)
- 同一ファイル内に新旧2つのバージョンが存在

### 4.2 contracts.ts の自動生成問題

- `src/shared/types/contracts.ts` は自動生成ファイル
- しかし、型定義が簡略化されている (`data: any`)
- sync-contracts.js スクリプトが存在するが、適切に実行されていない可能性

## 5. 推奨される修正案

### 5.1 命名規則の統一（優先度: 高）

**推奨される命名規則**:
- 原文: `sourceText`
- 翻訳文: `targetText`
- 原言語: `sourceLanguage`
- 対象言語: `targetLanguage`

**理由**:
1. LanguageConfig.ts で既に source/target を使用
2. 多言語対応の観点から言語中立的
3. 意味が明確で一貫性がある

### 5.2 型定義の一元化（優先度: 高）

1. **TranscriptSegment**: `src/domain/models/Transcript.ts` の定義を唯一の真実の源とする
2. **Translation**: 新しい共通型定義ファイルを作成
3. 各ファイルは import して使用

### 5.3 実装の整理（優先度: 中）

1. handleTranscriptSegmentOLD を削除
2. contracts.ts の自動生成を適切に実行
3. 重複する型定義をすべて削除

### 5.4 段階的移行計画

#### Phase 1: 型定義の一元化（1週間）
- 共通型定義ファイルの作成
- import の修正
- 重複定義の削除

#### Phase 2: 内部実装の修正（2週間）
- english/japanese → sourceText/targetText
- original/translation → sourceText/targetText
- 影響範囲のテスト

#### Phase 3: API契約の更新（1週間）
- contracts.ts の更新
- 後方互換性の確保
- クライアント側の対応

## 6. 影響分析

### 6.1 破壊的変更の可能性

- **高リスク**: translationComplete イベントの構造変更
- **中リスク**: Summary インターフェースの変更
- **低リスク**: 内部型定義の統一

### 6.2 テスト戦略

1. 単体テストの更新
2. 統合テストの実施
3. 後方互換性テスト
4. 多言語シナリオテスト

## 7. 結論

現在のコードベースは動作しているものの、技術的負債が蓄積しています。特に命名規則の不統一と言語固定の問題は、今後の多言語展開の大きな障害となります。

早期の対応により、保守性の向上とバグの予防が期待できます。

---

### 付録: 調査で使用したコマンド

```bash
# original の使用箇所
grep -n "original" ./src/hooks/useUnifiedPipeline.ts

# TranscriptSegment の重複定義
find ./src ./electron -name "*.ts" -o -name "*.tsx" | xargs grep -n "interface TranscriptSegment"

# english/japanese のハードコード箇所
find ./src ./electron -name "*.ts" -o -name "*.tsx" | xargs grep -l "english.*japanese"
```