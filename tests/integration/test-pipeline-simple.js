/**
 * UniVoice 2.0 シンプルパイプラインテスト
 * temperatureエラー修正確認用
 */

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

async function testTranslation() {
  console.log('🧪 翻訳テスト開始...\n');
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: 'Translate English to Japanese. Be concise.'
        },
        {
          role: 'user',
          content: 'Hello, this is a test.'
        }
      ],
      max_completion_tokens: 100
      // temperature パラメータなし
    });
    
    const result = response.choices[0]?.message?.content;
    console.log('✅ 翻訳成功:', result);
    return true;
  } catch (error) {
    console.error('❌ エラー:', error.message);
    return false;
  }
}

testTranslation();
EOF < /dev/null
