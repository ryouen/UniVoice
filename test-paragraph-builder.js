/**
 * Test script for ParagraphBuilder functionality
 */

const { ParagraphBuilder } = require('./electron/services/domain/ParagraphBuilder');

console.log('Testing ParagraphBuilder...');

// Create a ParagraphBuilder instance
const builder = new ParagraphBuilder(
  (paragraph) => {
    console.log('✅ Paragraph completed:', {
      id: paragraph.id,
      segments: paragraph.segments.length,
      duration: `${((paragraph.endTime - paragraph.startTime) / 1000).toFixed(1)}s`,
      words: paragraph.rawText.split(' ').length,
      text: paragraph.rawText.substring(0, 100) + '...'
    });
  },
  {
    minDurationMs: 5000,    // 5秒 (テスト用に短く)
    maxDurationMs: 20000,   // 20秒 (テスト用に短く)
    silenceThresholdMs: 2000 // 2秒
  }
);

// Simulate adding segments
const segments = [
  { id: 'seg1', text: 'Hello, welcome to today\'s lecture.', timestamp: Date.now(), isFinal: true },
  { id: 'seg2', text: 'Today we will be discussing machine learning.', timestamp: Date.now() + 1000, isFinal: true },
  { id: 'seg3', text: 'First, let me explain what machine learning is.', timestamp: Date.now() + 2000, isFinal: true },
  { id: 'seg4', text: 'Machine learning is a subset of artificial intelligence.', timestamp: Date.now() + 3000, isFinal: true },
  { id: 'seg5', text: 'It allows systems to learn from data.', timestamp: Date.now() + 4000, isFinal: true },
  // Silence gap to trigger completion
  { id: 'seg6', text: 'Now, let\'s move on to the next topic.', timestamp: Date.now() + 7000, isFinal: true },
  // Interim result (should be ignored)
  { id: 'seg7', text: 'This is an interim result', timestamp: Date.now() + 8000, isFinal: false },
  // Final result
  { id: 'seg8', text: 'Neural networks are another important concept.', timestamp: Date.now() + 9000, isFinal: true },
];

// Add segments with delay
async function addSegmentsWithDelay() {
  for (const segment of segments) {
    console.log(`\nAdding segment ${segment.id}: "${segment.text.substring(0, 50)}..."`);
    builder.addSegment(segment);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Force complete any remaining paragraph
  console.log('\nFlushing remaining paragraphs...');
  builder.flush();
  
  console.log('\n✅ Test completed!');
}

addSegmentsWithDelay().catch(console.error);