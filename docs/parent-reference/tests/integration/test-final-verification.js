#!/usr/bin/env node
/**
 * test-final-verification.js
 * 最終確認用の短時間テスト（③④⑤のみ）
 */

require('dotenv').config();
const {
  generateSummary,
  translateSummary,
  generateVocabulary
} = require('./test-gpt5-helpers.js');

async function finalTest() {
  console.log('🚀 Final Verification Test (③④⑤)');
  console.log('=====================================\n');
  
  const testText = `
    Psychological flexibility is the ability to stay present with difficult emotions 
    while taking values-guided action. Research shows that acceptance and commitment 
    therapy (ACT) improves mental health trajectories and behavioral patterns. 
    These processes predict whether people develop anxiety disorders or maintain wellbeing.
  `;
  
  const results = [];
  
  try {
    // ③ English Summary
    console.log('③ Generating English summary...');
    const start1 = Date.now();
    const englishSummary = await generateSummary(testText);
    const time1 = Date.now() - start1;
    const success1 = englishSummary && englishSummary.length > 0;
    console.log(`   ${success1 ? '✅' : '❌'} Generated in ${time1}ms`);
    console.log(`   Length: ${englishSummary.length} chars`);
    console.log(`   Content: "${englishSummary.substring(0, 80)}..."\n`);
    results.push({ name: 'Summary', success: success1, time: time1, length: englishSummary.length });
    
    // ④ Japanese Translation
    console.log('④ Translating to Japanese...');
    const start2 = Date.now();
    const japaneseSummary = await translateSummary(englishSummary);
    const time2 = Date.now() - start2;
    const success2 = japaneseSummary && japaneseSummary.length > 0;
    console.log(`   ${success2 ? '✅' : '❌'} Translated in ${time2}ms`);
    console.log(`   Length: ${japaneseSummary.length} chars`);
    console.log(`   Content: "${japaneseSummary.substring(0, 80)}..."\n`);
    results.push({ name: 'Translation', success: success2, time: time2, length: japaneseSummary.length });
    
    // ⑤ Vocabulary Extraction
    console.log('⑤ Extracting vocabulary...');
    const start3 = Date.now();
    const vocabulary = await generateVocabulary(testText);
    const time3 = Date.now() - start3;
    const success3 = Array.isArray(vocabulary) && vocabulary.length > 0;
    console.log(`   ${success3 ? '✅' : '❌'} Extracted in ${time3}ms`);
    console.log(`   Terms found: ${vocabulary.length}`);
    if (success3) {
      console.log('   Terms:');
      vocabulary.forEach((term, i) => {
        console.log(`     ${i+1}. ${term.term_en} → ${term.term_ja}`);
      });
    }
    results.push({ name: 'Vocabulary', success: success3, time: time3, count: vocabulary.length });
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
  
  // Summary
  console.log('\n=====================================');
  console.log('📊 RESULTS SUMMARY');
  console.log('=====================================');
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  if (successCount === totalCount) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log(`⚠️ ${successCount}/${totalCount} tests passed`);
  }
  
  console.log('\nDetails:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const metric = r.length !== undefined ? `${r.length} chars` : `${r.count} items`;
    console.log(`  ${status} ${r.name}: ${r.time}ms, ${metric}`);
  });
  
  console.log('\nEnvironment:');
  console.log(`  SUMMARY_MAX_TOKENS: ${process.env.OPENAI_SUMMARY_MAX_TOKENS}`);
  console.log(`  VOCAB_MAX_TOKENS: ${process.env.OPENAI_VOCAB_MAX_TOKENS}`);
  
  console.log('=====================================\n');
}

finalTest().then(() => {
  console.log('✅ Test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});