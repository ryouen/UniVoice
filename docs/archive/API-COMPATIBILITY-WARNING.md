# ⚠️ API互換性に関する重要な警告

## 🔴 絶対に理解すべきこと

### 旧APIでは新APIは動作しません

**Chat Completions API（旧）とResponses API（新）は互換性がありません**

```javascript
// ❌ これは動作しません（旧APIで新パラメータを使用）
const completion = await openai.chat.completions.create({
  model: 'gpt-5-nano',              // ❌ GPT-5系は動作しない
  messages: [...],                  // ✅ 旧APIの正しいパラメータ
  max_output_tokens: 1500,          // ❌ 認識されない（max_tokensが正しい）
  reasoning: { effort: 'minimal' }  // ❌ 存在しないパラメータ
});

// ❌ これも動作しません（新APIで旧パラメータを使用）
const response = await openai.responses.stream({
  model: 'gpt-4-turbo',            // ❌ GPT-4系は動作しない
  messages: [...],                 // ❌ 認識されない（inputが正しい）
  max_tokens: 1500,                // ❌ 認識されない（max_output_tokensが正しい）
  temperature: 0.7                 // ❌ GPT-5では無視される（1.0固定）
});
```

## ✅ 正しいAPI使用方法

### 1. GPT-5系モデル（2025年3月以降）

```javascript
// ✅ Responses API（新）- GPT-5系専用
const stream = await openai.responses.stream({
  model: 'gpt-5-nano',             // ✅ GPT-5系モデル
  input: [...],                    // ✅ 新APIのパラメータ
  max_output_tokens: 1500,         // ✅ 新APIのパラメータ
  reasoning: { effort: 'minimal' } // ✅ GPT-5の新機能
});
```

### 2. GPT-4系モデル（レガシー）

```javascript
// ✅ Chat Completions API（旧）- GPT-4系のみ
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo',            // ✅ GPT-4系モデル
  messages: [...],                 // ✅ 旧APIのパラメータ
  max_tokens: 1500,                // ✅ 旧APIのパラメータ
  temperature: 0.7,                // ✅ GPT-4では有効
  stream: true                     // ✅ ストリーミング
});
```

## 🚨 よくある間違い

### 1. モデルとAPIの不一致

| モデル | 正しいAPI | 間違ったAPI |
|--------|-----------|-------------|
| gpt-5, gpt-5-mini, gpt-5-nano | responses.create/stream | ❌ chat.completions.create |
| gpt-4, gpt-4-turbo | chat.completions.create | ❌ responses.create/stream |

### 2. パラメータ名の混同

| パラメータ | Responses API（新） | Chat Completions API（旧） |
|-----------|-------------------|------------------------|
| メッセージ | input | messages |
| トークン上限 | max_output_tokens | max_tokens |
| 推論制御 | reasoning.effort | （存在しない） |
| 温度 | （1.0固定） | temperature |

### 3. ストリーミングイベントの違い

```javascript
// Responses API（新）
for await (const chunk of stream) {
  if (chunk.type === 'response.output_text.delta') {
    console.log(chunk.delta); // ✅ 正しい
  }
}

// Chat Completions API（旧）
for await (const chunk of stream) {
  if (chunk.choices[0]?.delta?.content) {
    console.log(chunk.choices[0].delta.content); // ✅ 正しい
  }
}
```

## 📝 移行チェックリスト

移行前に必ず確認：

- [ ] 使用するモデルは何か？（GPT-5系 or GPT-4系）
- [ ] 対応するAPIを選択したか？（Responses or Chat Completions）
- [ ] パラメータ名は正しいか？（input vs messages）
- [ ] トークン制限の名前は正しいか？（max_output_tokens vs max_tokens）
- [ ] ストリーミング処理は適切か？（イベント形式の違い）

## 🔗 参考資料

- [GPT-5 Responses API ガイド](./GPT5-RESPONSES-API-GUIDE.md)
- [Deepgram Nova-3 API ガイド](./DEEPGRAM-NOVA3-API-GUIDE.md)
- [パラメータ不整合レポート](./PARAMETER-INCONSISTENCIES-REPORT.md)

---

最終更新: 2025-08-22
重要度: 🔴 最重要（APIの非互換性は実行時エラーの原因）