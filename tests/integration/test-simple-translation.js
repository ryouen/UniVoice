/**
 * シンプルな翻訳テスト
 * UnifiedPipelineServiceの翻訳機能のみをテスト
 */

require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testTranslation() {
  console.log('UniVoice 2.0 シンプル翻訳テスト\n');
  
  const testText = "Hello, welcome to the machine learning lecture.";
  console.log(`原文: "${testText}"`);
  
  try {
    const startTime = Date.now();
    
    // UniVoice 2.0 と同じパラメータで翻訳
    const response = await client.responses.create({
      model: 'gpt-5-nano',
      input: [
        {
          role: 'system',
          content: 'You are a real-time subtitle translator. Translate from English to Japanese. Keep technical terms. Be concise.',
        },
        {
          role: 'user',
          content: testText,
        },
      ],
      max_output_tokens: 1500,
      reasoning: { effort: 'minimal' },
      text: { verbosity: 'low' },
      stream: false,
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // レスポンスの構造を確認
    console.log('\nレスポンス構造:');
    console.log('  status:', response.status);
    console.log('  output_text:', response.output_text);
    console.log('  使用トークン数:', response.usage?.total_tokens);
    console.log('  処理時間:', duration + 'ms');
    
    if (response.output_text) {
      console.log('\n✅ 翻訳成功!');
      console.log(`翻訳: "${response.output_text}"`);
    } else {
      console.log('\n❌ 翻訳失敗: output_textが空です');
      
      // output配列を確認
      if (response.output && Array.isArray(response.output)) {
        console.log('\noutput配列の内容:');
        response.output.forEach((item, index) => {
          console.log(`  [${index}] type: ${item.type}`);
          if (item.content) {
            console.log(`      content:`, JSON.stringify(item.content).substring(0, 100));
          }
        });
      }
    }
    
  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    if (error.response) {
      console.error('詳細:', error.response);
    }
  }
}

testTranslation().catch(console.error);