/**
 * Temperature エラー修正確認テスト
 * GPT-5モデルでtemperatureパラメータを削除した動作確認
 */

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

async function testTranslation() {
  console.log('🧪 UniVoice 2.0 翻訳テスト\n');
  console.log('📋 設定:');
  console.log(`  - APIキー: ${process.env.OPENAI_API_KEY ? '✅設定済み' : '❌未設定'}`);
  console.log(`  - モデル: gpt-5-nano`);
  console.log(`  - temperatureパラメータ: 削除済み\n`);
  
  const testCases = [
    "Hello, welcome to the machine learning lecture.",
    "Today we'll discuss neural networks.",
    "Deep learning has revolutionized AI."
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const text = testCases[i];
    console.log(`\nテスト ${i + 1}/${testCases.length}:`);
    console.log(`📝 原文: "${text}"`);
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: 'You are a real-time subtitle translator. Translate from English to Japanese. Keep technical terms. Be concise.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_completion_tokens: 150
        // temperature パラメータを削除（GPT-5では1.0のみサポート）
      });
      
      const translation = response.choices[0]?.message?.content?.trim();
      
      if (translation) {
        console.log(`✅ 翻訳成功: "${translation}"`);
        successCount++;
      } else {
        console.log('❌ 翻訳結果が空です');
      }
      
      // API制限対策
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('❌ エラー:', error.message);
      
      // エラーの詳細を確認
      if (error.message.includes('temperature')) {
        console.error('⚠️ temperatureエラーが依然として発生しています！');
      }
    }
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${successCount}/${testCases.length}`);
  console.log(`❌ 失敗: ${testCases.length - successCount}/${testCases.length}`);
  
  if (successCount === testCases.length) {
    console.log('\n🎉 全てのテストが成功しました！');
    console.log('temperatureエラーは修正されています。');
  } else {
    console.log('\n⚠️ 一部のテストが失敗しました。');
  }
}

// エラーハンドリング付き実行
testTranslation().catch(error => {
  console.error('\n💥 致命的エラー:', error);
  process.exit(1);
});