// 翻訳の動作確認テスト
const { config } = require('dotenv');
config();

async function testTranslation() {
  const testText = "This is a test. Hello world.";
  
  console.log('Testing translation with text:', testText);
  console.log('Using model:', process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano');
  
  // Responses API のテスト
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  try {
    console.log('\n=== Testing Responses API ===');
    const stream = await openai.responses.stream({
      model: process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano',
      input: [
        { role: 'system', content: 'You are a professional translator. Translate English to natural Japanese. Output ONLY the Japanese translation without explanations / inner thoughts.' },
        { role: 'user', content: testText }
      ],
      max_output_tokens: 1500,
      reasoning: { effort: 'minimal' }
    });
    
    let translation = '';
    for await (const chunk of stream) {
      if (chunk.type === 'response.output_text.delta' && chunk.delta) {
        translation += chunk.delta;
        process.stdout.write(chunk.delta);
      }
    }
    
    console.log('\n\nFinal translation:', translation);
    console.log('Contains "前："?', translation.includes('前：'));
    console.log('Contains "Previous"?', translation.includes('Previous'));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTranslation();
