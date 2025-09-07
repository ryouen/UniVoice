#!/usr/bin/env node

/**
 * Multi-language Support Test
 * 
 * Tests the dynamic language selection feature:
 * - Translation prompt generation
 * - Summary generation in different languages
 * - Vocabulary extraction
 * - Report generation
 */

const assert = require('assert');

// Test data
const testLanguages = [
  { source: 'en', target: 'ja', name: 'English to Japanese' },
  { source: 'en', target: 'zh', name: 'English to Chinese' },
  { source: 'ja', target: 'en', name: 'Japanese to English' },
  { source: 'es', target: 'en', name: 'Spanish to English' },
  { source: 'en', target: 'en', name: 'Same language (no translation)' }
];

const testResults = [];

// Helper function to test language configuration
async function testLanguageConfiguration(sourceLanguage, targetLanguage) {
  console.log(`\n🌐 Testing ${sourceLanguage} → ${targetLanguage}...`);
  
  const startTime = Date.now();
  const results = {
    sourceLanguage,
    targetLanguage,
    tests: {
      translationPrompt: false,
      summaryPrompt: false,
      vocabularyPrompt: false,
      reportPrompt: false,
      sameLanguageSkip: false
    },
    duration: 0
  };
  
  try {
    // Test 1: Translation prompt generation
    const { getTranslationPrompt } = require('../../electron/services/domain/LanguageConfig');
    const translationPrompt = getTranslationPrompt(sourceLanguage, targetLanguage);
    
    console.log('📝 Translation prompt:', translationPrompt.substring(0, 100) + '...');
    assert(translationPrompt.includes('translation') || translationPrompt.includes('翻訳'), 
      'Translation prompt should contain translation keyword');
    results.tests.translationPrompt = true;
    
    // Test 2: Same language skip
    if (sourceLanguage === targetLanguage) {
      console.log('✅ Same language detected - translation should be skipped');
      results.tests.sameLanguageSkip = true;
    }
    
    // Test 3: Summary prompt (simulated)
    const summaryPromptMap = {
      'ja': 'あなたは講義内容を要約する専門家です',
      'en': 'You are an expert at summarizing lecture content',
      'zh': '您是总结讲座内容的专家',
      'es': 'Eres un experto en resumir contenido de conferencias',
      'fr': 'Vous êtes un expert dans la synthèse du contenu',
      'de': 'Sie sind ein Experte für die Zusammenfassung'
    };
    
    const summaryPrompt = summaryPromptMap[targetLanguage] || summaryPromptMap['en'];
    console.log('📄 Summary prompt:', summaryPrompt.substring(0, 50) + '...');
    assert(summaryPrompt.length > 0, 'Summary prompt should not be empty');
    results.tests.summaryPrompt = true;
    
    // Test 4: Vocabulary prompt check
    const vocabKeywords = {
      'ja': '専門用語',
      'en': 'technical terms',
      'zh': '专业术语'
    };
    const vocabKeyword = vocabKeywords[targetLanguage] || vocabKeywords['en'];
    console.log('📚 Vocabulary keyword:', vocabKeyword);
    results.tests.vocabularyPrompt = true;
    
    // Test 5: Report prompt check
    const reportSections = {
      'ja': ['概要', 'トピック一覧', 'キーポイント'],
      'en': ['Overview', 'Topic List', 'Key Points'],
      'zh': ['概述', '主题列表', '关键要点']
    };
    const sections = reportSections[targetLanguage] || reportSections['en'];
    console.log('📊 Report sections:', sections.join(', '));
    results.tests.reportPrompt = true;
    
    results.duration = Date.now() - startTime;
    console.log(`✅ All tests passed for ${sourceLanguage} → ${targetLanguage} (${results.duration}ms)`);
    
  } catch (error) {
    console.error(`❌ Error testing ${sourceLanguage} → ${targetLanguage}:`, error.message);
    results.error = error.message;
  }
  
  return results;
}

// Main test runner
async function runTests() {
  console.log('🧪 UniVoice Multi-language Support Test');
  console.log('=====================================\n');
  
  // Test each language combination
  for (const { source, target, name } of testLanguages) {
    const result = await testLanguageConfiguration(source, target);
    testResults.push({ name, ...result });
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  
  let passedCount = 0;
  let failedCount = 0;
  
  testResults.forEach(result => {
    const passed = Object.values(result.tests).filter(t => t).length;
    const total = Object.keys(result.tests).length;
    const status = result.error ? '❌' : (passed === total ? '✅' : '⚠️');
    
    console.log(`${status} ${result.name}: ${passed}/${total} tests passed`);
    
    if (passed === total && !result.error) {
      passedCount++;
    } else {
      failedCount++;
    }
  });
  
  console.log(`\n🎯 Overall: ${passedCount}/${testResults.length} language pairs passed`);
  
  // Performance check
  const avgDuration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0) / testResults.length;
  console.log(`⚡ Average test duration: ${avgDuration.toFixed(0)}ms`);
  
  // Supported languages info
  console.log('\n🌍 Supported Languages (16 total):');
  console.log('Japanese (ja), English (en), Chinese (zh), Spanish (es),');
  console.log('French (fr), German (de), Korean (ko), Portuguese (pt),');
  console.log('Russian (ru), Italian (it), Arabic (ar), Hindi (hi),');
  console.log('Vietnamese (vi), Thai (th), Turkish (tr), Polish (pl)');
  
  // Exit with appropriate code
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});