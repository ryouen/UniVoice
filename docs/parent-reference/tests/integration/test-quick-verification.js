#!/usr/bin/env node
/**
 * test-quick-verification.js
 * Quick test to verify ③④⑤⑥ functionality
 */

require('dotenv').config();
const {
  generateSummary,
  translateSummary,
  generateVocabulary,
  generateFinalReport
} = require('./test-gpt5-helpers.js');

async function quickTest() {
  console.log('🚀 Quick Verification Test Starting...\n');
  
  const testText = `
    Good morning everyone. Today we'll discuss artificial intelligence 
    and its impact on education. Machine learning algorithms can help 
    personalize learning experiences for students. Natural language 
    processing enables real-time translation and transcription services.
  `;
  
  try {
    // Test ③: Summary Generation
    console.log('③ Testing Summary Generation...');
    const startSummary = Date.now();
    const englishSummary = await generateSummary(testText);
    const summaryTime = Date.now() - startSummary;
    console.log(`✅ Summary generated in ${summaryTime}ms`);
    console.log(`   Result: "${englishSummary.substring(0, 100)}..."\n`);
    
    // Test ④: Summary Translation
    console.log('④ Testing Summary Translation...');
    const startTranslate = Date.now();
    const japaneseSummary = await translateSummary(englishSummary);
    const translateTime = Date.now() - startTranslate;
    console.log(`✅ Translation completed in ${translateTime}ms`);
    console.log(`   Result: "${japaneseSummary.substring(0, 100)}..."\n`);
    
    // Test ⑤: Vocabulary Extraction
    console.log('⑤ Testing Vocabulary Extraction...');
    const startVocab = Date.now();
    const vocabulary = await generateVocabulary(testText);
    const vocabTime = Date.now() - startVocab;
    console.log(`✅ Vocabulary extracted in ${vocabTime}ms`);
    console.log(`   Terms found: ${vocabulary.length}`);
    if (vocabulary.length > 0) {
      console.log(`   First 3 terms: ${vocabulary.slice(0, 3).join(', ')}\n`);
    }
    
    // Test ⑥: Final Report
    console.log('⑥ Testing Final Report Generation...');
    const startReport = Date.now();
    const finalReport = await generateFinalReport(
      testText,
      englishSummary,
      vocabulary
    );
    const reportTime = Date.now() - startReport;
    console.log(`✅ Report generated in ${reportTime}ms`);
    console.log(`   Length: ${finalReport.length} characters`);
    console.log(`   Preview: "${finalReport.substring(0, 150)}..."\n`);
    
    // Summary
    console.log('='.repeat(50));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(50));
    console.log('Performance Summary:');
    console.log(`  ③ Summary: ${summaryTime}ms ${summaryTime < 3000 ? '✅' : '⚠️'}`);
    console.log(`  ④ Translation: ${translateTime}ms`);
    console.log(`  ⑤ Vocabulary: ${vocabTime}ms`);
    console.log(`  ⑥ Report: ${reportTime}ms ${reportTime < 20000 ? '✅' : '⚠️'}`);
    console.log(`  Total: ${summaryTime + translateTime + vocabTime + reportTime}ms`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
quickTest().then(() => {
  console.log('\n✅ Quick verification complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});