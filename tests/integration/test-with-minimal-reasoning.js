/**
 * reasoning effort を minimal に設定したテスト
 */

require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function test() {
  console.log('Testing with minimal reasoning effort\n');
  
  try {
    // 親プロジェクトのprocessTranslation関数と同じパラメータ
    const response = await client.responses.create({
      model: 'gpt-5-nano',
      input: [
        { role: 'system', content: 'Translate English to Japanese. Output only the translation.' },
        { role: 'user', content: 'Hello world' }
      ],
      max_output_tokens: 150,
      reasoning: { effort: 'minimal' },
      text: { verbosity: 'low' },
      stream: false
    });
    
    console.log('Response status:', response.status);
    console.log('Output text:', response.output_text);
    console.log('Reasoning tokens:', response.usage?.output_tokens_details?.reasoning_tokens);
    
    if (response.output_text) {
      console.log('\nSuccess! Translation:', response.output_text);
    } else {
      console.log('\nFailed: Empty output_text');
      
      // output配列をチェック
      if (response.output && Array.isArray(response.output)) {
        console.log('\nOutput array:');
        response.output.forEach((item, index) => {
          console.log(`  [${index}] type: ${item.type}`);
          if (item.content) {
            console.log(`      content:`, item.content);
          }
          if (item.text) {
            console.log(`      text:`, item.text);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.response) {
      console.error('Error response:', JSON.stringify(error.response, null, 2));
    }
  }
}

test().catch(console.error);