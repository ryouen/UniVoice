# OpenAI API Parameter Report - GPT-5 Responses API 正式版

## 重要な訂正と謝罪

**以前のレポートで「Responses APIは架空」と記載しましたが、これは完全に誤りでした。**
- Responses APIは2025年3月にリリースされた実在のAPIです
- GPT-5シリーズ（gpt-5、gpt-5-mini、gpt-5-nano）は実在のモデルです
- 親プロジェクトのtest-3min-complete.jsは正しい実装です

## 正しいAPI情報（2025年8月時点）

### 1. Responses API - 正しい使用方法

#### ストリーミング呼び出し
```typescript
// ✅ 正しい実装（親プロジェクトで動作確認済み）
const stream = await openai.responses.stream({
  model: 'gpt-5-nano',
  input: [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'User input' }
  ],
  max_output_tokens: 1500,
  reasoning: { effort: 'minimal' },
  text: { verbosity: 'low' }
});

// イベント処理
for await (const chunk of stream) {
  if (chunk.type === 'response.output_text.delta' && chunk.delta) {
    // テキストの差分を処理
  }
}
```

#### 非ストリーミング呼び出し
```typescript
// ✅ 正しい実装
const response = await openai.responses.create({
  model: 'gpt-5-mini',
  input: [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'User input' }
  ],
  max_output_tokens: 1500,
  stream: false
});
```

### 2. GPT-5シリーズのモデルと価格

| モデル | 入力価格 | 出力価格 | 用途 |
|--------|----------|----------|------|
| gpt-5 | $1.25/1M tokens | $10/1M tokens | 高度な推論、最終レポート |
| gpt-5-mini | $0.25/1M tokens | $2/1M tokens | 要約、語彙抽出 |
| gpt-5-nano | $0.05/1M tokens | $0.40/1M tokens | リアルタイム翻訳 |

### 3. 新パラメータ

#### reasoning パラメータ
```typescript
reasoning: { 
  effort: 'minimal' | 'low' | 'medium' | 'high' 
}
```
- GPT-5の推論能力を制御
- 'minimal'は最速レスポンス

#### text パラメータ
```typescript
text: { 
  verbosity: 'low' | 'medium' | 'high' 
}
```
- 応答の詳細度を制御
- 'low'は簡潔な応答

#### temperature
- **GPT-5では1.0固定（変更不可）**
- temperatureパラメータは指定してもエラーにはならないが無視される

### 4. 古いChat Completions APIとの違い

| 項目 | Chat Completions API（古い） | Responses API（新しい） |
|------|------------------------------|-------------------------|
| メソッド | chat.completions.create | responses.create/stream |
| パラメータ名 | messages | input |
| トークン制限 | max_tokens | max_output_tokens |
| 推論制御 | なし | reasoning.effort |
| 詳細度制御 | なし | text.verbosity |

### 5. 実装の現状

#### 親プロジェクト（正しい実装）
- `test-3min-complete.js`: Responses API使用 ✅
- `gpt5-helpers.js`: Responses API使用 ✅
- `UnifiedPipelineService.ts`: Responses API使用 ✅

#### UniVoice 2.0の課題
- `AdvancedFeatureService.ts`: 古いChat Completions API使用 ❌
  - `chat.completions.create`を使用（要修正）
  - `max_completion_tokens`という誤ったパラメータ名

## 推奨事項

1. **UniVoice 2.0は親プロジェクトのAPI呼び出しパターンを完全に踏襲すべき**
2. **AdvancedFeatureService.tsをResponses APIに移行**
3. **ドキュメントから「架空」「実在しない」という誤った記述を削除**

## 参考資料

- OpenAI Cookbook: https://cookbook.openai.com/examples/gpt-5/gpt-5_new_params_and_tools
- 親プロジェクトの動作確認済みテスト結果: test-results/*.json

---

更新日: 2025-08-22
訂正: Responses APIは実在のAPIです