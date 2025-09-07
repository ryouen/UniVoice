/**
 * Debug script to trace the data flow for ParagraphBuilder
 * 
 * This script will:
 * 1. Create a minimal UnifiedPipelineService instance
 * 2. Manually trigger processTranscriptSegment
 * 3. Monitor ParagraphBuilder activity
 */

const { UnifiedPipelineService } = require('./electron/services/domain/UnifiedPipelineService');
const { ParagraphBuilder } = require('./electron/services/domain/ParagraphBuilder');

console.log('=== ParagraphBuilder Debug Script ===\n');

// Create minimal configs
const audioConfig = {
  frameMs: 50,
  frameSize: 2400,
  sampleRate: 48000
};

const deepgramConfig = {
  apiKey: 'test-key',
  model: 'nova-2',
  interim: true,
  endpointing: 300,
  utteranceEndMs: 1000,
  smartFormat: true,
  noDelay: true
};

const openaiConfig = {
  apiKey: 'test-key',
  models: {
    translate: 'gpt-5-nano',
    summary: 'gpt-5-mini',
    summaryTranslate: 'gpt-5-nano',
    userTranslate: 'gpt-5-nano',
    vocabulary: 'gpt-5-mini',
    report: 'gpt-5'
  },
  maxTokens: {
    translate: 1500,
    summary: 1500,
    vocabulary: 1500,
    report: 8192
  }
};

// Create service (but don't start listening)
console.log('Creating UnifiedPipelineService...');
const service = new UnifiedPipelineService(audioConfig, deepgramConfig, openaiConfig);

// Monitor ParagraphBuilder events
service.on('pipelineEvent', (event) => {
  if (event.type === 'PARAGRAPH_COMPLETE') {
    console.log('\n✅ PARAGRAPH_COMPLETE event received:', {
      paragraphId: event.data.paragraphId,
      segmentCount: event.data.segmentIds.length,
      wordCount: event.data.wordCount,
      duration: `${(event.data.duration / 1000).toFixed(1)}s`
    });
  }
});

// Manually call processTranscriptSegment (using private method via reflection)
console.log('\nManually triggering processTranscriptSegment...');

// Access the private method (for debugging only)
const processTranscriptSegment = service.processTranscriptSegment.bind(service);

// Test segments
const testSegments = [
  {
    id: 'test-seg-1',
    text: 'Hello, this is a test segment.',
    timestamp: Date.now(),
    confidence: 0.95,
    isFinal: true,
    startMs: 0,
    endMs: 1000
  },
  {
    id: 'test-seg-2',
    text: 'This is another test segment.',
    timestamp: Date.now() + 1000,
    confidence: 0.95,
    isFinal: true,
    startMs: 1000,
    endMs: 2000
  },
  {
    id: 'test-seg-3',
    text: 'And here is a third segment.',
    timestamp: Date.now() + 2000,
    confidence: 0.95,
    isFinal: false,  // This should be ignored by ParagraphBuilder
    startMs: 2000,
    endMs: 3000
  },
  {
    id: 'test-seg-4',
    text: 'Final segment after interim.',
    timestamp: Date.now() + 3000,
    confidence: 0.95,
    isFinal: true,
    startMs: 3000,
    endMs: 4000
  }
];

// Process segments
async function processTestSegments() {
  for (const segment of testSegments) {
    console.log(`\n📝 Processing segment ${segment.id}:`, {
      text: segment.text,
      isFinal: segment.isFinal
    });
    
    try {
      // Call the method directly
      processTranscriptSegment(segment);
    } catch (error) {
      console.error('❌ Error processing segment:', error.message);
    }
    
    // Wait a bit between segments
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Wait for any async operations
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n🏁 Test completed. Cleaning up...');
  service.destroy();
}

processTestSegments().catch(console.error);