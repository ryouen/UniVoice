/**
 * 親プロジェクトのgpt5-helpers.jsからの正確なコピー
 */

require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 親プロジェクトと全く同じtoOutputText関数
function toOutputText(response) {
  try {
    // 優先順位1: output_text（SDKの集約プロパティ）
    if (response?.output_text !== undefined && response?.output_text !== null) {
      // 空文字でも有効な結果として扱う
      return String(response.output_text);
    }
    
    // 優先順位2: output[0].content[0].text（構造化応答）
    if (response?.output?.[0]?.content?.[0]?.text) {
      console.log('[GPT5] Using fallback: output[0].content[0].text');
      return response.output[0].content[0].text;
    }
    
    // 優先順位3: output配列の結合
    if (response?.output && Array.isArray(response.output)) {
      const texts = response.output
        .map(o => o?.content?.[0]?.text || o?.text || '')
        .filter(Boolean);
      if (texts.length > 0) {
        console.log('[GPT5] Using fallback: output array join');
        return texts.join('');
      }
    }
    
    // デバッグ: 取得失敗時は構造をログ
    console.error('[GPT5] Failed to extract text. Response keys:', Object.keys(response || {}));
    console.error('[GPT5] Response sample:', JSON.stringify(response).substring(0, 200));
    
    return '';
  } catch (error) {
    console.error('[GPT5] toOutputText error:', error.message);
    return '';
  }
}

// 親プロジェクトのrespondOnce関数の正確なコピー
async function respondOnce({ model, system, user, max = 512, effort /* optional */ }) {
  const payload = {
    model,
    input: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_output_tokens: max
  };
  // reasoning は mini/5 に対して必要な時のみ（既定は未指定）
  if (effort) payload.reasoning = { effort };
  const res = await client.responses.create(payload);
  return toOutputText(res);
}

async function test() {
  console.log('Testing exact copy from parent project\n');
  
  try {
    // 親プロジェクトと同じパラメータで呼び出し
    const result = await respondOnce({
      model: 'gpt-5-nano',
      system: 'Translate English to Japanese. Output only translation.',
      user: 'Hello world',
      max: 150
      // effortは指定しない（nanoの場合）
    });
    
    console.log('Result:', result);
    
    if (result) {
      console.log('\nSuccess! Translation received');
    } else {
      console.log('\nFailed: Empty result');
    }
    
  } catch (error) {
    console.error('\nError:', error.message);
  }
}

test().catch(console.error);