# 進捗的要約UI修正 - 2025-09-09

## 修正内容

### 1. 言語サポートの修正
- **中国語（'zh'）をisCharacterBasedLanguageから削除**
  - 理由：UniVoiceのサポート言語に'zh'が含まれていないため
  - 修正箇所：`AdvancedFeatureService.ts`の737行目

### 2. 定期要約の無効化
- **10分ごとの定期要約を無効化**
  - 理由：ユーザーの要望により不要と判断
  - 修正箇所：`AdvancedFeatureService.ts`の149-150行目
  - `startPeriodicSummary()`の呼び出しをコメントアウト

### 3. 進捗的要約UI表示の修正
#### 問題
- 進捗的要約（400, 800, 1600, 2400語）が生成されているが、UIでは最新の要約のみ表示
- 以前の進捗的要約が上書きされて見えなくなる

#### 解決策
- 新規コンポーネント`ProgressiveSummarySection`を作成
- タブ形式ですべての進捗的要約を切り替え表示
- 各要約の閾値（400語、800語など）を明示

#### 実装詳細
1. `ProgressiveSummarySection.tsx`を新規作成
2. `UniVoice.tsx`を修正：
   - `SummarySection`を`ProgressiveSummarySection`に置き換え
   - 全summaries配列を渡すように変更
3. `useUnifiedPipeline.ts`を修正：
   - Summary型に`threshold?: number`プロパティを追加
   - progressiveSummaryイベントでthresholdを設定

## 確認済みの事実

### Deepgram言語サポート
- **Nova-3**：韓国語は公式にサポートされているが、UniVoiceでは使用しない
- **UniVoiceのサポート言語**：en, ja, es, fr, de, hi, ru, pt, it, nl のみ
- 韓国語（'ko'）と中国語（'zh'）はUniVoiceでサポートされていない

### CJK言語サポート
- 日本語（'ja'）のみがCJK言語として実装済み
- 文字数カウント時に4倍の閾値を適用（環境変数CHARACTER_LANGUAGE_MULTIPLIERで調整可能）

## 残作業
- startPeriodicSummaryメソッドの未使用警告を修正（低優先度）
- 最終要約の生成タイミングを確認（stopListening時に自動生成されるか）