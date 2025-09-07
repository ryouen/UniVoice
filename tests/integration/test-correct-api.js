/**
 * 正しいAPI呼び出しテスト
 * 親プロジェクトのgpt5-helpers.jsに基づく実装
 */

require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// 親プロジェクトと同じ出力抽出関数
function toOutputText(response) {
  try {
    // 優先順位1: output_text
    if (response?.output_text !== undefined && response?.output_text !== null) {
      return String(response.output_text);
    }
    
    // 優先順位2: output[0].content[0].text
    if (response?.output?.[0]?.content?.[0]?.text) {
      console.log('Using fallback: output[0].content[0].text');
      return response.output[0].content[0].text;
    }
    
    // 優先順位3: output配列の結合
    if (response?.output && Array.isArray(response.output)) {
      const texts = response.output
        .map(o => o?.content?.[0]?.text || o?.text || '')
        .filter(Boolean);
      if (texts.length > 0) {
        console.log('Using fallback: output array join');
        return texts.join('');
      }
    }
    
    console.error('Failed to extract text. Response keys:', Object.keys(response || {}));
    console.error('Response sample:', JSON.stringify(response).substring(0, 200));
    
    return '';
  } catch (error) {
    console.error('toOutputText error:', error.message);
    return '';
  }
}

async function testCorrectAPI() {
  console.log('Testing Correct API Call for UniVoice 2.0\n');
  console.log('Configuration:');
  console.log('  API Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Not Set');
  console.log('  Model: gpt-5-nano');
  console.log('  API: responses.create (not chat.completions)');
  console.log('  Parameters: input (not messages), max_output_tokens\n');
  
  const testCases = [
    "Hello, welcome to the machine learning lecture.",
    "Today we'll discuss neural networks.",
    "Deep learning has revolutionized AI."
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const text = testCases[i];
    console.log(`\nTest ${i + 1}/${testCases.length}:`);
    console.log(`Original: "${text}"`);
    
    try {
      // 親プロジェクトと同じAPI呼び出し方法
      const response = await client.responses.create({
        model: 'gpt-5-nano',
        input: [
          { role: 'system', content: 'Translate English to Japanese. Output only translation.' },
          { role: 'user', content: text }
        ],
        max_output_tokens: 150,
        stream: false
      });
      
      console.log('\nResponse structure:');
      console.log('  Type:', typeof response);
      console.log('  Keys:', Object.keys(response).join(', '));
      
      const translation = toOutputText(response);
      
      if (translation) {
        console.log(`Success: "${translation}"`);
        successCount++;
      } else {
        console.log('Failed: Empty translation');
        console.log('Full response:', JSON.stringify(response, null, 2));
      }
      
      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Error:', error.message);
      
      if (error.response) {
        console.error('Error response:', error.response);
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Test Result Summary');
  console.log('='.repeat(50));
  console.log(`Success: ${successCount}/${testCases.length}`);
  console.log(`Failed: ${testCases.length - successCount}/${testCases.length}`);
  
  if (successCount === testCases.length) {
    console.log('\nAll tests passed!');
    console.log('The responses.create API is working correctly.');
  } else {
    console.log('\nSome tests failed.');
    console.log('Check the error messages above.');
  }
}

// Run test
testCorrectAPI().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});