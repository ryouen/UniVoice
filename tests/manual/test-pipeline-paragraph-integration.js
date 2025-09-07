/**
 * Test UnifiedPipelineService with ParagraphBuilder integration
 */

const { UnifiedPipelineService } = require('../../dist-electron/services/domain/UnifiedPipelineService');

console.log('🧪 Testing UnifiedPipelineService ParagraphBuilder Integration\n');

// Mock configuration
const audioConfig = {
  frameMs: 20,
  frameSize: 640,
  sampleRate: 16000
};

const deepgramConfig = {
  apiKey: process.env.DEEPGRAM_API_KEY || 'test-key',
  model: 'nova-3',
  interim: true,
  endpointing: 800,
  utteranceEndMs: 1000
};

const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || 'test-key',
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

// Create service instance
const service = new UnifiedPipelineService(audioConfig, deepgramConfig, openaiConfig);

// Track events
const events = [];

service.on('pipelineEvent', (event) => {
  console.log(`📨 Pipeline Event: ${event.type}`, {
    correlationId: event.correlationId,
    timestamp: new Date(event.timestamp).toISOString()
  });
  
  if (event.type === 'paragraphComplete') {
    console.log('✅ ParagraphCompleteEvent detected:', {
      paragraphId: event.data.paragraphId,
      segmentCount: event.data.segmentIds.length,
      wordCount: event.data.wordCount,
      duration: `${(event.data.duration / 1000).toFixed(1)}s`
    });
  }
  
  events.push(event);
});

// Simulate processing segments
const segments = [
  { id: 'seg1', text: 'This is the first segment.', timestamp: Date.now(), confidence: 0.9, isFinal: true },
  { id: 'seg2', text: 'This is the second segment.', timestamp: Date.now() + 1000, confidence: 0.9, isFinal: true },
  { id: 'seg3', text: 'This is the third segment.', timestamp: Date.now() + 2000, confidence: 0.9, isFinal: true },
];

console.log('Processing segments through UnifiedPipelineService...\n');

// Mock the processTranscriptSegment method (since it's private)
// We'll directly access it through the compiled JS
const processMethod = service.processTranscriptSegment || service._processTranscriptSegment;

if (processMethod) {
  segments.forEach((segment, index) => {
    setTimeout(() => {
      console.log(`Processing segment ${index + 1}: "${segment.text}"`);
      processMethod.call(service, segment);
    }, index * 1000);
  });
} else {
  console.error('❌ Could not access processTranscriptSegment method');
  
  // Alternative: Check if ParagraphBuilder is initialized
  console.log('\nChecking service internals...');
  console.log('- Has paragraphBuilder:', !!service.paragraphBuilder);
  console.log('- Has sentenceCombiner:', !!service.sentenceCombiner);
  console.log('- Has translationQueue:', !!service.translationQueue);
}

// Wait and show results
setTimeout(() => {
  console.log('\n📊 Test Summary:');
  console.log(`- Total events: ${events.length}`);
  console.log(`- Event types: ${[...new Set(events.map(e => e.type))].join(', ')}`);
  
  const paragraphEvents = events.filter(e => e.type === 'paragraphComplete');
  console.log(`- Paragraph events: ${paragraphEvents.length}`);
  
  if (paragraphEvents.length === 0) {
    console.log('\n⚠️ No paragraph events detected. This might be because:');
    console.log('1. Segments need more time to form a paragraph (20-60s)');
    console.log('2. ParagraphBuilder is not properly integrated');
    console.log('3. Events are not being emitted correctly');
  }
  
  // Cleanup
  service.destroy();
  console.log('\n✅ Test completed');
}, 5000);