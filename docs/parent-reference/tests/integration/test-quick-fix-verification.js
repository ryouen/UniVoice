#!/usr/bin/env node
/**
 * test-quick-fix-verification.js
 * MAX_TOKENS修正後の動作確認テスト
 */

require('dotenv').config();
const {
  generateSummary,
  translateSummary,
  generateVocabulary,
  generateFinalReport
} = require('./test-gpt5-helpers.js');

async function quickTest() {
  console.log('🚀 Quick Fix Verification Test');
  console.log('================================');
  console.log('Environment Variables:');
  console.log(`  OPENAI_TRANSLATE_MAX_TOKENS: ${process.env.OPENAI_TRANSLATE_MAX_TOKENS}`);
  console.log(`  OPENAI_SUMMARY_MAX_TOKENS: ${process.env.OPENAI_SUMMARY_MAX_TOKENS}`);
  console.log(`  OPENAI_VOCAB_MAX_TOKENS: ${process.env.OPENAI_VOCAB_MAX_TOKENS}`);
  console.log(`  OPENAI_REPORT_MAX_TOKENS: ${process.env.OPENAI_REPORT_MAX_TOKENS}`);
  console.log('================================\n');
  
  const testText = `
    Life asks us questions. And probably one of the most important questions 
    it asks us is, what are you gonna do about difficult thoughts and feelings? 
    If you're feeling ashamed, or anxious, Life just asked you a question. 
    Good question. And the answer to that question says a lot about the 
    trajectories of our lives, whether they move towards prosperity, love, 
    freedom, contribution, or downward into pathology and despair.
  `;
  
  const results = {
    summary: { success: false, content: '', time: 0 },
    translation: { success: false, content: '', time: 0 },
    vocabulary: { success: false, content: [], time: 0 },
    report: { success: false, content: '', time: 0 }
  };
  
  try {
    // Test ③: Summary Generation
    console.log('③ Testing Summary Generation...');
    const startSummary = Date.now();
    const englishSummary = await generateSummary(testText);
    results.summary.time = Date.now() - startSummary;
    results.summary.success = englishSummary && englishSummary.length > 0;
    results.summary.content = englishSummary;
    console.log(`   ${results.summary.success ? '✅' : '❌'} Generated in ${results.summary.time}ms`);
    if (results.summary.success) {
      console.log(`   Length: ${englishSummary.length} chars`);
      console.log(`   Preview: "${englishSummary.substring(0, 100)}..."\n`);
    } else {
      console.log(`   ERROR: Empty or null result\n`);
    }
    
    // Test ④: Summary Translation
    if (results.summary.success) {
      console.log('④ Testing Summary Translation...');
      const startTranslate = Date.now();
      const japaneseSummary = await translateSummary(englishSummary);
      results.translation.time = Date.now() - startTranslate;
      results.translation.success = japaneseSummary && japaneseSummary.length > 0;
      results.translation.content = japaneseSummary;
      console.log(`   ${results.translation.success ? '✅' : '❌'} Translated in ${results.translation.time}ms`);
      if (results.translation.success) {
        console.log(`   Length: ${japaneseSummary.length} chars`);
        console.log(`   Preview: "${japaneseSummary.substring(0, 100)}..."\n`);
      } else {
        console.log(`   ERROR: Empty or null result\n`);
      }
    }
    
    // Test ⑤: Vocabulary Extraction
    console.log('⑤ Testing Vocabulary Extraction...');
    const startVocab = Date.now();
    const vocabulary = await generateVocabulary(testText);
    results.vocabulary.time = Date.now() - startVocab;
    results.vocabulary.success = Array.isArray(vocabulary) && vocabulary.length > 0;
    results.vocabulary.content = vocabulary;
    console.log(`   ${results.vocabulary.success ? '✅' : '❌'} Extracted in ${results.vocabulary.time}ms`);
    if (results.vocabulary.success) {
      console.log(`   Terms found: ${vocabulary.length}`);
      console.log(`   First 3 terms:`);
      vocabulary.slice(0, 3).forEach(term => {
        console.log(`     - ${JSON.stringify(term)}`);
      });
      console.log();
    } else {
      console.log(`   ERROR: Empty array or parsing failed\n`);
    }
    
    // Test ⑥: Mini Report (using summary as input to save time)
    if (results.summary.success) {
      console.log('⑥ Testing Report Generation (mini version)...');
      const startReport = Date.now();
      const miniReport = await generateFinalReport(
        testText,
        englishSummary,
        vocabulary || []
      );
      results.report.time = Date.now() - startReport;
      results.report.success = miniReport && miniReport.length > 0;
      results.report.content = miniReport;
      console.log(`   ${results.report.success ? '✅' : '❌'} Generated in ${results.report.time}ms`);
      if (results.report.success) {
        console.log(`   Length: ${miniReport.length} chars`);
        console.log(`   Preview: "${miniReport.substring(0, 150)}..."\n`);
      } else {
        console.log(`   ERROR: Empty or null result\n`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
  
  // Summary Report
  console.log('================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('================================');
  
  const totalSuccess = Object.values(results).filter(r => r.success).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`Overall: ${totalSuccess}/${totalTests} tests passed\n`);
  
  console.log('Individual Results:');
  console.log(`  ③ Summary:     ${results.summary.success ? '✅ SUCCESS' : '❌ FAILED'} (${results.summary.time}ms)`);
  console.log(`  ④ Translation: ${results.translation.success ? '✅ SUCCESS' : '❌ FAILED'} (${results.translation.time}ms)`);
  console.log(`  ⑤ Vocabulary:  ${results.vocabulary.success ? '✅ SUCCESS' : '❌ FAILED'} (${results.vocabulary.time}ms)`);
  console.log(`  ⑥ Report:      ${results.report.success ? '✅ SUCCESS' : '❌ FAILED'} (${results.report.time}ms)`);
  
  console.log('\nContent Lengths:');
  console.log(`  ③ Summary:     ${results.summary.content.length} chars`);
  console.log(`  ④ Translation: ${results.translation.content.length} chars`);
  console.log(`  ⑤ Vocabulary:  ${results.vocabulary.content.length} items`);
  console.log(`  ⑥ Report:      ${results.report.content.length} chars`);
  
  if (totalSuccess === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! The fix is working correctly.');
  } else {
    console.log(`\n⚠️ ${totalTests - totalSuccess} test(s) still failing. Check the details above.`);
  }
  
  console.log('================================\n');
}

// Run the test
quickTest().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});