#!/usr/bin/env node
/**
 * test-vocabulary-debug.js
 * 語彙抽出のデバッグ専用テスト
 */

require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function debugVocabulary() {
  console.log('🔍 Vocabulary Extraction Debug Test');
  console.log('====================================\n');
  
  const testText = `
    Life asks us questions about difficult thoughts and feelings. 
    Psychological flexibility predicts mental health trajectories.
    Acceptance and commitment therapy (ACT) helps change behavior patterns.
  `;
  
  console.log('Input text:', testText.substring(0, 100) + '...\n');
  
  try {
    // 直接API呼び出しでデバッグ
    console.log('Calling OpenAI API...');
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL_VOCAB || 'gpt-5-mini',
      input: [
        { 
          role: 'system', 
          content: 'You are a terminology extractor. Output ONLY a JSON array of technical terms. Each item must be {"term_en":"English term","term_ja":"Japanese translation"}. No other text, no markdown, just the JSON array.'
        },
        { 
          role: 'user', 
          content: `Extract 3-5 key technical terms from this text and translate to Japanese:\n${testText}`
        }
      ],
      max_output_tokens: parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500')
    });
    
    console.log('\n📦 Raw Response:');
    console.log('================');
    console.log('Status:', response.status);
    console.log('output_text type:', typeof response.output_text);
    console.log('output_text length:', response.output_text?.length || 0);
    console.log('output_text content:');
    console.log(response.output_text);
    console.log('================\n');
    
    // JSONパースを試みる
    console.log('🔧 Attempting JSON parse...');
    
    const text = response.output_text || '';
    
    // 方法1: 直接パース
    try {
      const direct = JSON.parse(text);
      console.log('✅ Direct parse succeeded!');
      console.log('Result:', direct);
      return direct;
    } catch (e1) {
      console.log('❌ Direct parse failed:', e1.message);
    }
    
    // 方法2: 配列部分を抽出
    console.log('\n🔧 Trying to extract JSON array...');
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      console.log('Found array pattern:', arrayMatch[0].substring(0, 100) + '...');
      try {
        const extracted = JSON.parse(arrayMatch[0]);
        console.log('✅ Array extraction succeeded!');
        console.log('Result:', extracted);
        return extracted;
      } catch (e2) {
        console.log('❌ Array parse failed:', e2.message);
      }
    } else {
      console.log('❌ No array pattern found in text');
    }
    
    // 方法3: マークダウンコードブロックを除去
    console.log('\n🔧 Trying to remove markdown...');
    const cleanedText = text.replace(/^```json\s*|^```\s*|\s*```$/gm, '').trim();
    if (cleanedText !== text) {
      console.log('Markdown removed. Cleaned text:', cleanedText.substring(0, 100) + '...');
      try {
        const cleaned = JSON.parse(cleanedText);
        console.log('✅ Cleaned parse succeeded!');
        console.log('Result:', cleaned);
        return cleaned;
      } catch (e3) {
        console.log('❌ Cleaned parse failed:', e3.message);
      }
    }
    
    console.log('\n❌ All parsing methods failed');
    console.log('Returning empty array');
    return [];
    
  } catch (error) {
    console.error('\n❌ API call failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

// 実行
debugVocabulary().then(result => {
  console.log('\n====================================');
  console.log('📊 FINAL RESULT');
  console.log('====================================');
  console.log('Type:', Array.isArray(result) ? 'Array' : typeof result);
  console.log('Length:', Array.isArray(result) ? result.length : 'N/A');
  console.log('Content:', result);
  console.log('====================================\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});