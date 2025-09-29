# GPT-5 Responses API 公式ガイド（2025年8月版）

## 概要

このドキュメントは、2025年3月にリリースされたOpenAI Responses APIとGPT-5シリーズモデルの正しい使用方法を記載しています。親プロジェクト（UniVoice 1.0）の動作確認済み実装を基準として作成されています。

## 🔴 重要な前提

- **Responses APIは実在のAPIです**（2025年3月リリース）
- **GPT-5シリーズは実在のモデルです**（gpt-5、gpt-5-mini、gpt-5-nano）
- **親プロジェクトの実装が正しい実装です**（test-results/で動作確認済み）

## API メソッド

### 1. ストリーミング呼び出し（推奨）

```javascript
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

// ストリーム処理
for await (const chunk of stream) {
  if (chunk.type === 'response.output_text.delta' && chunk.delta) {
    // テキストの差分を処理
    console.log(chunk.delta);
  } else if (chunk.type === 'response.done' && chunk.usage) {
    // 完了時のusage情報
    console.log(chunk.usage);
  }
}
```

### 2. 非ストリーミング呼び出し

```javascript
const response = await openai.responses.create({
  model: 'gpt-5-mini',
  input: [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'User input' }
  ],
  max_output_tokens: 1500,
  stream: false
});

// レスポンスの取得
const result = response.output_text || '';
```

## パラメータ詳細

### 必須パラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| model | string | 使用するモデル（gpt-5、gpt-5-mini、gpt-5-nano） |
| input | array | メッセージの配列（role: system/user） |

### オプションパラメータ

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|------------|------|
| max_output_tokens | number | 4096 | 最大出力トークン数 |
| reasoning.effort | string | 'medium' | 推論の深さ（minimal/low/medium/high） |
| text.verbosity | string | 'medium' | 応答の詳細度（low/medium/high） |
| stream | boolean | false | ストリーミングの有効化 |

### 注意事項

- **temperature**: GPT-5では1.0固定（指定しても無視される）
- **messages**: 使用しない（inputを使用）
- **max_tokens**: 使用しない（max_output_tokensを使用）

## モデル別の推奨設定

### gpt-5-nano（リアルタイム翻訳）
```javascript
{
  model: 'gpt-5-nano',
  reasoning: { effort: 'minimal' },
  text: { verbosity: 'low' },
  max_output_tokens: 1500
}
```

### gpt-5-mini（要約・語彙抽出）
```javascript
{
  model: 'gpt-5-mini',
  reasoning: { effort: 'low' },
  text: { verbosity: 'medium' },
  max_output_tokens: 1500
}
```

### gpt-5（最終レポート）
```javascript
{
  model: 'gpt-5',
  reasoning: { effort: 'high' },
  text: { verbosity: 'high' },
  max_output_tokens: 8192
}
```

## 価格表（2025年8月時点）

| モデル | 入力（per 1M tokens） | 出力（per 1M tokens） |
|--------|----------------------|----------------------|
| gpt-5 | $1.25 | $10.00 |
| gpt-5-mini | $0.25 | $2.00 |
| gpt-5-nano | $0.05 | $0.40 |

## 実装例（UniVoice 1.0より）

### リアルタイム翻訳（test-3min-complete.js）
```javascript
async function translateStreaming(text, CURRENT_MODEL = 'gpt-5-nano') {
  const stream = await openai.responses.stream({
    model: CURRENT_MODEL,
    input: [
      { role: 'system', content: 'Translate English to Japanese. Output only the translation.' },
      { role: 'user', content: text }
    ],
    max_output_tokens: 1500,
    reasoning: { effort: 'minimal' },
    text: { verbosity: 'low' }
  });
  
  let translation = '';
  let firstTokenMs = null;
  const startTime = performance.now();
  
  for await (const chunk of stream) {
    if (chunk.type === 'response.output_text.delta' && chunk.delta) {
      if (!firstTokenMs) {
        firstTokenMs = performance.now() - startTime;
        console.log(`First token: ${firstTokenMs}ms`);
      }
      translation += chunk.delta;
    }
  }
  
  return translation;
}
```

## 移行ガイド

### 古いChat Completions APIからの移行

```javascript
// 旧（Chat Completions API）
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 1000,
  temperature: 0.7
});

// 新（Responses API）
const response = await openai.responses.create({
  model: 'gpt-5-nano',
  input: [{ role: 'user', content: 'Hello' }],
  max_output_tokens: 1000
  // temperature は指定不要（1.0固定）
});
```

## トラブルシューティング

### エラー: responses is not defined
- OpenAI SDKのバージョンを確認（最新版が必要）
- `import OpenAI from 'openai'` の記述を確認

### エラー: Invalid parameter 'messages'
- `messages` ではなく `input` を使用

### エラー: Invalid parameter 'max_tokens'
- `max_tokens` ではなく `max_output_tokens` を使用

## 参考資料

- 親プロジェクトの実装: `../realtime_transtrator/tests/core/test-3min-complete.js`
- 動作確認済みテスト結果: `../realtime_transtrator/test-results/*.json`
- OpenAI Cookbook: https://cookbook.openai.com/examples/gpt-5/gpt-5_new_params_and_tools

---

最終更新: 2025-08-22
確認者: UniVoice開発チーム