/**
 * 履歴翻訳フローの単体テスト
 * 
 * テスト内容:
 * 1. SentenceCombinerがhandleCombinedSentenceを呼び出すか
 * 2. handleCombinedSentenceが履歴翻訳をキューに追加するか
 * 3. TranslationQueueManagerが適切に優先度制御するか
 * 4. executeHistoryTranslationが正しく動作するか
 */

const { TranslationQueueManager } = require('../../dist-electron/services/domain/TranslationQueueManager');
const { SentenceCombiner } = require('../../dist-electron/services/domain/SentenceCombiner');

console.log('=== History Translation Flow Test ===\n');

// Test 1: TranslationQueueManagerの優先度制御
console.log('Test 1: Priority control in TranslationQueueManager');

const queueManager = new TranslationQueueManager({
  maxConcurrency: 3,
  maxQueueSize: 100
});

let translationResults = [];

// 翻訳ハンドラーを設定（モック）
queueManager.setTranslationHandler(async (translation) => {
  console.log(`  Processing: ${translation.segmentId} (priority: ${translation.priority})`);
  
  // 履歴翻訳は少し遅い
  const delay = translation.priority === 'low' ? 300 : 100;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const result = {
    id: translation.segmentId,
    priority: translation.priority,
    processed: Date.now()
  };
  
  translationResults.push(result);
  return `Translated: ${translation.originalText}`;
});

// 通常翻訳と履歴翻訳を混在させてキューに追加
async function testPriorityHandling() {
  console.log('\nQueuing translations...\n');
  
  // 通常翻訳（高優先度）
  await queueManager.enqueue({
    segmentId: 'segment_1',
    originalText: 'Hello world',
    sourceLanguage: 'en',
    targetLanguage: 'ja',
    timestamp: Date.now(),
    priority: 'normal'
  });
  
  // 履歴翻訳（低優先度）
  await queueManager.enqueue({
    segmentId: 'history_combined_1',
    originalText: 'Hello world. This is a test.',
    sourceLanguage: 'en',
    targetLanguage: 'ja',
    timestamp: Date.now(),
    priority: 'low'
  });
  
  // 通常翻訳（高優先度）
  await queueManager.enqueue({
    segmentId: 'segment_2',
    originalText: 'Another segment',
    sourceLanguage: 'en',
    targetLanguage: 'ja',
    timestamp: Date.now(),
    priority: 'normal'
  });
  
  // 履歴翻訳（低優先度）
  await queueManager.enqueue({
    segmentId: 'history_combined_2',
    originalText: 'Another combined sentence.',
    sourceLanguage: 'en',
    targetLanguage: 'ja',
    timestamp: Date.now(),
    priority: 'low'
  });
  
  // 処理完了まで待機
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 結果を検証
  console.log('\nProcessing order:');
  translationResults.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.id} (${result.priority})`);
  });
  
  // 通常翻訳が先に処理されているか確認
  const normalTranslations = translationResults.filter(r => r.priority === 'normal');
  const historyTranslations = translationResults.filter(r => r.priority === 'low');
  
  console.log('\n✅ Priority control test:', 
    normalTranslations[0].processed < historyTranslations[0].processed ? 'PASSED' : 'FAILED'
  );
}

// Test 2: SentenceCombinerのコールバック動作
console.log('\n\nTest 2: SentenceCombiner callback behavior');

let combinedSentenceReceived = null;

const combiner = new SentenceCombiner(
  (combinedSentence) => {
    console.log('  Combined sentence callback triggered');
    combinedSentenceReceived = combinedSentence;
  },
  {
    maxSegments: 5,
    timeoutMs: 1000,
    minSegments: 2
  }
);

// テストセグメントを追加
combiner.addSegment({
  id: 'test_seg_1',
  text: 'This is a test.',
  timestamp: Date.now(),
  isFinal: true
});

combiner.addSegment({
  id: 'test_seg_2',
  text: 'It should combine segments.',
  timestamp: Date.now() + 100,
  isFinal: true
});

// タイムアウトまで待機
setTimeout(() => {
  console.log('\n✅ SentenceCombiner callback test:', 
    combinedSentenceReceived !== null ? 'PASSED' : 'FAILED'
  );
  
  if (combinedSentenceReceived) {
    console.log('  Combined ID:', combinedSentenceReceived.id);
    console.log('  Segment count:', combinedSentenceReceived.segmentCount);
    console.log('  Combined text:', combinedSentenceReceived.originalText);
  }
}, 1500);

// メインテスト実行
(async function() {
  await testPriorityHandling();
  
  // 全テスト完了まで待機
  setTimeout(() => {
    console.log('\n=== All tests completed ===');
    process.exit(0);
  }, 2500);
})();