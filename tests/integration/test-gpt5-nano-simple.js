/**
 * GPT-5-nano シンプルテスト
 * 親プロジェクトのgpt5-helpers.jsに基づく最小限の実装
 */

require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

async function testSimple() {
  console.log('GPT-5-nano Simple Test\n');
  
  try {
    // 親プロジェクトのrespondOnce関数と同じ構造
    const payload = {
      model: 'gpt-5-nano',
      input: [
        { role: 'system', content: 'Translate English to Japanese. Output only translation.' },
        { role: 'user', content: 'Hello world' }
      ],
      max_output_tokens: 150
      // reasoningパラメータは意図的に省略
    };
    
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
    const response = await client.responses.create(payload);
    
    console.log('\nResponse keys:', Object.keys(response).join(', '));
    console.log('Status:', response.status);
    console.log('Output text:', response.output_text);
    
    if (response.output_text) {
      console.log('\nSuccess! Translation:', response.output_text);
    } else {
      console.log('\nEmpty output_text');
      console.log('Full response:', JSON.stringify(response, null, 2));
    }
    
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.response) {
      console.error('Error response:', error.response);
    }
  }
}

testSimple().catch(console.error);