// SentenceCombinerの直接テスト
// node test-sentence-combiner-directly.js で実行

const { SentenceCombiner } = require('./electron/services/domain/SentenceCombiner');

console.log('=== SentenceCombiner 直接テスト ===\n');

// コールバックで結合された文を受け取る
let combinedCount = 0;
const sentenceCombiner = new SentenceCombiner(
  (combinedSentence) => {
    combinedCount++;
    console.log(`\n🎯 文結合 #${combinedCount}:`);
    console.log(`  ID: ${combinedSentence.id}`);
    console.log(`  セグメント数: ${combinedSentence.segmentCount}`);
    console.log(`  テキスト: "${combinedSentence.originalText}"`);
    console.log(`  セグメントID: ${combinedSentence.segmentIds.join(', ')}`);
  },
  {
    maxSegments: 10,
    timeoutMs: 2000,
    minSegments: 2
  }
);

// テストケース1: 句読点なしの短いセグメント
console.log('📝 テストケース1: 句読点なしの短いセグメント');
const segments1 = [
  { id: 'seg1', text: 'Hello everyone', timestamp: Date.now(), isFinal: true },
  { id: 'seg2', text: 'welcome to our class', timestamp: Date.now() + 800, isFinal: true },
  { id: 'seg3', text: 'today we will learn', timestamp: Date.now() + 1600, isFinal: true },
];

segments1.forEach((seg, i) => {
  setTimeout(() => {
    console.log(`  → セグメント追加: "${seg.text}"`);
    sentenceCombiner.addSegment(seg);
  }, i * 100);
});

// テストケース2: 句読点ありのセグメント
setTimeout(() => {
  console.log('\n📝 テストケース2: 句読点ありのセグメント');
  const segments2 = [
    { id: 'seg4', text: 'This is important.', timestamp: Date.now() + 3000, isFinal: true },
    { id: 'seg5', text: 'Please pay attention', timestamp: Date.now() + 3800, isFinal: true },
  ];
  
  segments2.forEach((seg, i) => {
    setTimeout(() => {
      console.log(`  → セグメント追加: "${seg.text}"`);
      sentenceCombiner.addSegment(seg);
    }, i * 100);
  });
}, 3000);

// テストケース3: タイムアウトテスト
setTimeout(() => {
  console.log('\n📝 テストケース3: タイムアウトテスト（2秒待機）');
  const segment = { id: 'seg6', text: 'This will timeout', timestamp: Date.now() + 5000, isFinal: true };
  console.log(`  → セグメント追加: "${segment.text}"`);
  sentenceCombiner.addSegment(segment);
  console.log('  ⏱️ 2秒後にタイムアウトで結合されるはず...');
}, 5000);

// 結果の確認
setTimeout(() => {
  console.log('\n\n📊 === テスト結果 ===');
  console.log(`結合された文の数: ${combinedCount}`);
  console.log('\n期待される結果:');
  console.log('1. テストケース1: minSegments(2)に達した時点で結合');
  console.log('2. テストケース2: ピリオドで即座に結合');
  console.log('3. テストケース3: 2秒後にタイムアウトで結合');
  
  if (combinedCount === 0) {
    console.log('\n❌ 文結合が一度も発生していません！');
    console.log('SentenceCombinerに問題がある可能性があります。');
  }
}, 8000);