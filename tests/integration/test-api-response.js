/**
 * API レスポンス形式確認テスト
 * GPT-5 の応答構造を詳しく調査
 */

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

async function testAPIResponse() {
  console.log('API Response Test for UniVoice 2.0\n');
  console.log('Configuration:');
  console.log('  API Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Not Set');
  console.log('  Model: gpt-5-nano');
  console.log('  Temperature: Not specified (default 1.0)\n');
  
  try {
    console.log('Sending test request...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: 'Translate English to Japanese. Output only the translation.'
        },
        {
          role: 'user',
          content: 'Hello world'
        }
      ],
      max_completion_tokens: 50
    });
    
    console.log('\nFull response structure:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\nKey paths:');
    console.log('  response.choices:', Array.isArray(response.choices) ? `Array(${response.choices.length})` : typeof response.choices);
    
    if (response.choices && response.choices[0]) {
      const choice = response.choices[0];
      console.log('  response.choices[0].message:', typeof choice.message);
      console.log('  response.choices[0].message.content:', typeof choice.message?.content);
      console.log('  response.choices[0].finish_reason:', choice.finish_reason);
      
      if (choice.message?.content) {
        console.log('\nTranslation result:', choice.message.content);
      } else {
        console.log('\nNo content found in standard location');
        
        // Check alternative locations
        console.log('\nChecking alternative locations:');
        console.log('  response.output:', response.output);
        console.log('  response.output_text:', response.output_text);
        console.log('  response.text:', response.text);
      }
    }
    
    console.log('\nModel information:');
    console.log('  response.model:', response.model);
    console.log('  response.system_fingerprint:', response.system_fingerprint);
    
  } catch (error) {
    console.error('\nError occurred:', error.message);
    
    if (error.response) {
      console.error('\nError response:', error.response);
    }
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    console.error('\nFull error object:');
    console.error(error);
  }
}

// Run test
testAPIResponse().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});