# UnifiedPipelineService.ts 分析 (600-900行)

## connectToDeepgram メソッド (602-644行)
### 処理内容
1. DeepgramStreamAdapter設定の構築
2. アダプターインスタンスの作成
3. イベントハンドラーの設定（setupDeepgramEventHandlers）
4. 接続実行

### 設定値
- smartFormat: デフォルトtrue（句読点含む）
- noDelay: デフォルトtrue（3秒の最終化遅延をスキップ）

### 注意点
- 日本語選択時は「multi」を使用するとログに記載

## setupDeepgramEventHandlers メソッド (649-687行)
### 登録されるイベント
1. **TRANSCRIPT**: handleTranscriptSegmentを呼び出し
2. **ERROR**: エラーログとエラーイベント発行
3. **CONNECTED**: 接続ログ
4. **DISCONNECTED**: 切断ログ（再接続ロジックは未実装）
5. **UTTERANCE_END**: TODO状態
6. **METADATA**: デバッグログのみ

## executeTranslation メソッド (709-900行まで)
### 重要な発見 🔴
**746-748行目に japanese ハードコード発見！**
```typescript
this.emit('translationComplete', {
  id: segmentId,
  original: text,
  japanese: text,  // ← ハードコード！
  timestamp: Date.now(),
  firstPaintMs: 0,
  completeMs: 0
});
```

### メソッド概要
- TranslationQueueManagerから呼ばれる
- Responses API（GPT-5）を使用
- ストリーミング対応

### 処理フロー
1. **同一言語チェック** (715-753行)
   - sourceLanguage === targetLanguageならスキップ
   - translationイベントとtranslationCompleteイベントを発行
   - **問題**: translationCompleteで `original`/`japanese` を使用

2. **Shadow Mode処理** (756-781行)
   - 現在コメントアウト（未実装）
   - 環境変数USE_SHADOW_AS_PRIMARYで制御予定

3. **翻訳実行** (788-830行)
   - getTranslationPromptで動的プロンプト生成
   - responses.create を使用（GPT-5の正しいAPI）
   - ストリーミングで結果を受信

4. **リアルタイム更新** (834-843行)
   - currentTranslationUpdateイベントを発行
   - SegmentManagerは削除済み

5. **結果処理** (847-870行)
   - cleanTranslationOutputで思考プロセスを除去
   - Translation型に変換（sourceText/targetText使用）
   - translations配列に追加

6. **イベント発行** (877-900行)
   - translationイベント（PipelineEvent）
   - translationCompleteイベント（887行目付近で確認が必要）

### リファクタリング必須項目 🔴
1. **translationCompleteイベントの構造**
   - 746行: `original`/`japanese` のハードコード
   - 887行目も確認が必要
   - sourceText/targetTextに統一すべき

2. **メソッドの長さ**
   - 191行は長すぎる
   - 同一言語処理、Shadow Mode、通常翻訳を分割すべき

### 依存関係
- TranslationQueueManager（呼び出し元）
- LanguageConfig（プロンプト生成）
- OpenAI client（翻訳実行）
- イベントエミッター（複数イベント発行）