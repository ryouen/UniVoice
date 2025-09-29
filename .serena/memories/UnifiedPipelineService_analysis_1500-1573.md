# UnifiedPipelineService.ts 分析 (1500-1573行)

## cleanTranslationOutput メソッド (1511-1551行)
### 機能
- GPTの内部思考プロセスを除去
- 翻訳結果のクリーンアップ

### 処理内容
1. 先頭・末尾の空白を除去
2. 思考プロセスパターンのマッチング
   - "Note:", "Wait:", "Hmm" など10パターン
   - 正規表現で検出して除去
3. 最後の非空行を抽出
   - 複数行の場合は最後の有効な行を返す

### リファクタリング候補 ⚠️
- 正規表現パターンを定数として外出し
- 40行と長いので、パターン処理を別メソッドに

## destroy メソッド (1557-1572行)
### 処理内容
1. DeepgramAdapterの切断と破棄
2. TranslationQueueの破棄
3. SentenceCombinerの破棄
4. 全イベントリスナーの削除
5. ログ出力

### 削除された処理
- SegmentManager.destroy() - SegmentManager自体が削除済み
- AdvancedFeatureServiceはmain.tsで管理

## ファイル全体のまとめ

### 重要な発見事項 🔴
1. **言語ハードコード問題**
   - 746行: translationCompleteイベントで `original`/`japanese` 使用
   - 887行: 別のtranslationCompleteは正しく sourceText/targetText 使用
   - 不整合が存在！

2. **命名規則**
   - Translation型: sourceText/targetText ✅
   - 一部イベント: original/japanese ❌

3. **削除された機能**
   - SegmentManager: 完全削除（翻訳重複の原因）
   - ParagraphBuilder: 一時的に無効化

4. **Shadow Mode**
   - 完全に未実装（コメントアウト）
   - 削除候補

### ファイル統計
- 全体: 1573行（非常に大きい）
- メソッド数: 約25個
- 責務: ASR、翻訳、イベント管理、状態管理など多数

### リファクタリング優先順位
1. **高**: 746行のハードコード修正
2. **高**: executeTranslationメソッドの分割（191行）
3. **中**: Shadow Mode関連の削除
4. **中**: cleanTranslationOutputの整理
5. **低**: 廃止予定メソッドの削除