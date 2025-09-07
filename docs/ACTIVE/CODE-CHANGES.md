# コード変更履歴

最終更新: 2025-08-18
作成者: Claude Code

## 実装中に行われた主要な変更

### 1. API の変更

#### temperature パラメータの削除
- **変更内容**: OpenAI API呼び出しから `temperature` パラメータを削除
- **理由**: GPT-5では温度パラメータは1.0固定でサポートされていない
- **影響範囲**: 
  - `AdvancedFeatureService.ts`
  - `UnifiedPipelineService.ts`
  - 親プロジェクトのテストファイル

#### Responses API → chat.completions.create
- **変更内容**: 当初計画していたResponses APIの代わりにchat.completions.createを使用
- **理由**: Responses APIは実在しないAPIであることが判明
- **影響範囲**: 全てのOpenAI API呼び出し

### 2. 型定義の追加

#### DisplaySegment への originalIsFinal 追加
- **変更内容**: `DisplaySegment` インターフェースに `originalIsFinal?: boolean` を追加
- **理由**: interim/final の音声認識結果を視覚的に区別するため
- **影響範囲**: 
  - `RealtimeDisplayManager.ts`
  - `UniVoicePerfect.tsx`

#### IPC契約の拡張
- **変更内容**: 以下のイベントとコマンドを追加
  - `VocabularyEvent` / `GenerateVocabularyCommand`
  - `FinalReportEvent` / `GenerateFinalReportCommand`
- **理由**: 単語帳生成と最終レポート生成機能の実装
- **影響範囲**: 
  - `contracts.ts`（electron側）
  - `contracts.ts`（src/shared側）
  - `window.d.ts`
  - `preload.ts`

### 3. 新機能の追加

#### 段階的要約（Progressive Summarization）
- **追加内容**: 400/800/1600/2400語での自動要約生成
- **実装場所**: `AdvancedFeatureService.ts`
- **設定可能**: 環境変数でしきい値を設定可能に変更予定

#### グループ化履歴表示
- **追加内容**: 履歴を3文ずつグループ化して表示
- **実装場所**: `useUnifiedPipeline.ts` の `groupHistorySegments` 関数
- **UI変更**: `UniVoicePerfect.tsx` にグループ表示UI追加

### 4. 環境変数による設定管理

#### MAX_TOKENS の一元管理
- **変更内容**: ハードコードされていたmax_tokensを環境変数に移行
- **環境変数**:
  - `OPENAI_TRANSLATE_MAX_TOKENS` (デフォルト: 1500)
  - `OPENAI_SUMMARY_MAX_TOKENS` (デフォルト: 1500)
  - `OPENAI_VOCAB_MAX_TOKENS` (デフォルト: 1500)
  - `OPENAI_REPORT_MAX_TOKENS` (デフォルト: 8192)

### 5. メモリ管理の改善

#### ビルド時のメモリ不足対策
- **変更内容**: `package.json` に `NODE_OPTIONS=--max-old-space-size=4096` を追加
- **理由**: TypeScriptビルド時のメモリ不足エラーを解決
- **影響**: ビルドコマンド全体

## 未解決の技術的負債

### 1. 型安全性の改善が必要
- `PipelineEvent` の `data: any` を適切な型に変更
- contracts.ts の重複（electron側とsrc/shared側）を解消

### 2. エラーハンドリングの改善
- correlationId が存在しない場合の処理
- API呼び出し失敗時のリトライ機構

### 3. テストカバレッジ
- 実際のE2Eテストの実装
- UIコンポーネントのテスト

## 推奨される次のステップ

1. **型定義の強化**
   - PipelineEvent を discriminated union で型安全に
   - 共通の型定義ファイルを作成

2. **設定の外部化**
   - 段階的要約のしきい値を環境変数化
   - その他のハードコードされた値の外部化

3. **ドキュメントの充実**
   - APIリファレンスの作成
   - アーキテクチャ図の更新

4. **パフォーマンス最適化**
   - 大量の翻訳データ処理時の最適化
   - メモリ使用量の監視とチューニング