/**
 * Manual test for ParagraphBuilder functionality
 * This simulates segments being added and verifies paragraph formation
 */

const { ParagraphBuilder } = require('../../dist-electron/services/domain/ParagraphBuilder');

console.log('🧪 Manual ParagraphBuilder Test\n');

// Track completed paragraphs
const completedParagraphs = [];

// Create ParagraphBuilder instance
const paragraphBuilder = new ParagraphBuilder(
  (paragraph) => {
    console.log('✅ Paragraph completed:', {
      id: paragraph.id,
      segments: paragraph.segments.length,
      duration: `${((paragraph.endTime - paragraph.startTime) / 1000).toFixed(1)}s`,
      words: paragraph.rawText.split(' ').length
    });
    completedParagraphs.push(paragraph);
  },
  {
    minDurationMs: 5000,    // 5秒 (テスト用に短縮)
    maxDurationMs: 10000,   // 10秒 (テスト用に短縮)
    silenceThresholdMs: 1000 // 1秒
  }
);

// Simulate segments
const segments = [
  { id: 'seg1', text: 'Welcome to today\'s lecture on artificial intelligence.', timestamp: 1000, isFinal: true },
  { id: 'seg2', text: 'We will be discussing neural networks and deep learning.', timestamp: 2000, isFinal: true },
  { id: 'seg3', text: 'These are fundamental concepts in modern AI.', timestamp: 3000, isFinal: true },
  { id: 'seg4', text: 'Let\'s start with the basics of neural networks.', timestamp: 4000, isFinal: true },
  { id: 'seg5', text: 'A neural network consists of layers of interconnected nodes.', timestamp: 5000, isFinal: true },
  { id: 'seg6', text: 'Each node performs a simple computation.', timestamp: 6000, isFinal: true },
  // 2秒の無音
  { id: 'seg7', text: 'Now, let me explain how backpropagation works.', timestamp: 8500, isFinal: true },
  { id: 'seg8', text: 'Backpropagation is the key to training neural networks.', timestamp: 9500, isFinal: true },
  { id: 'seg9', text: 'It calculates gradients efficiently.', timestamp: 10500, isFinal: true },
];

// Process segments with realistic timing
async function runTest() {
  console.log('Adding segments...\n');
  
  const startTime = Date.now();
  
  for (const segment of segments) {
    // Wait until the segment's timestamp
    const waitTime = segment.timestamp - (Date.now() - startTime);
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Adding: "${segment.text.substring(0, 50)}..."`);
    paragraphBuilder.addSegment(segment);
  }
  
  // Wait a bit more
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Force flush any remaining segments
  console.log('\n📄 Flushing remaining segments...');
  paragraphBuilder.flush();
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`- Total segments: ${segments.length}`);
  console.log(`- Paragraphs formed: ${completedParagraphs.length}`);
  
  completedParagraphs.forEach((para, index) => {
    console.log(`\nParagraph ${index + 1}:`);
    console.log(`- Segments: ${para.segments.length}`);
    console.log(`- Duration: ${((para.endTime - para.startTime) / 1000).toFixed(1)}s`);
    console.log(`- Words: ${para.rawText.split(' ').length}`);
    console.log(`- Text preview: "${para.rawText.substring(0, 100)}..."`);
    
    if (para.cleanedText) {
      console.log(`- Cleaned text: "${para.cleanedText.substring(0, 100)}..."`);
    }
  });
  
  // Cleanup
  paragraphBuilder.destroy();
  console.log('\n✅ Test completed');
}

// Run the test
runTest().catch(console.error);