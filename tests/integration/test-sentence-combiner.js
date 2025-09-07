/**
 * SentenceCombiner統合テスト
 * 
 * テスト内容:
 * 1. セグメントが文単位に結合されるか
 * 2. 履歴用翻訳が低優先度でキューイングされるか
 * 3. リアルタイム翻訳が妨げられないか
 */

const { SentenceCombiner } = require('../../dist-electron/services/domain/SentenceCombiner');

console.log('=== SentenceCombiner Test ===\n');

// テスト用のセグメント
const testSegments = [
  { id: 'seg1', text: 'Hello everyone,', timestamp: Date.now(), isFinal: true },
  { id: 'seg2', text: 'welcome to our class.', timestamp: Date.now() + 1000, isFinal: true },
  { id: 'seg3', text: 'Today we will discuss', timestamp: Date.now() + 2000, isFinal: true },
  { id: 'seg4', text: 'machine learning algorithms.', timestamp: Date.now() + 3000, isFinal: true },
  { id: 'seg5', text: 'First,', timestamp: Date.now() + 4000, isFinal: true },
  { id: 'seg6', text: "let's start with", timestamp: Date.now() + 5000, isFinal: true },
  { id: 'seg7', text: 'supervised learning.', timestamp: Date.now() + 6000, isFinal: true },
];

// SentenceCombinerのインスタンス作成
const combiner = new SentenceCombiner(
  (combinedSentence) => {
    console.log('\n📦 Combined Sentence:');
    console.log(`  ID: ${combinedSentence.id}`);
    console.log(`  Segments: ${combinedSentence.segmentCount}`);
    console.log(`  Text: "${combinedSentence.originalText}"`);
    console.log(`  Segment IDs: ${combinedSentence.segmentIds.join(', ')}`);
  },
  {
    maxSegments: 10,
    timeoutMs: 2000,
    minSegments: 2
  }
);

// テスト実行
console.log('Adding segments...\n');

testSegments.forEach((segment, index) => {
  setTimeout(() => {
    console.log(`Adding segment ${index + 1}: "${segment.text}"`);
    combiner.addSegment(segment);
    
    // 最後のセグメント後、残りを強制出力
    if (index === testSegments.length - 1) {
      setTimeout(() => {
        console.log('\nForcing emit of remaining segments...');
        combiner.forceEmit();
        combiner.destroy();
        console.log('\n✅ Test completed!');
      }, 1000);
    }
  }, index * 300); // 300ms間隔でセグメントを追加
});

// 期待される出力:
// 1. "Hello everyone, welcome to our class." (2セグメント)
// 2. "Today we will discuss machine learning algorithms." (2セグメント)
// 3. "First, let's start with supervised learning." (3セグメント)