/**
 * Test paragraph formation with short sessions (10-15 seconds)
 */

const { UnifiedPipelineService } = require('../../dist-electron/services/domain/UnifiedPipelineService');

console.log('🧪 Short Session Paragraph Test (10-15 seconds)\n');

// Configuration
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

// Create service
const service = new UnifiedPipelineService(audioConfig, deepgramConfig, openaiConfig);

// Track events
let paragraphEventCount = 0;
const paragraphEvents = [];

service.on('pipelineEvent', (event) => {
  if (event.type === 'paragraphComplete') {
    paragraphEventCount++;
    paragraphEvents.push(event);
    console.log('\n✅ PARAGRAPH COMPLETE EVENT!');
    console.log(`- Paragraph ID: ${event.data.paragraphId}`);
    console.log(`- Segments: ${event.data.segmentIds.length}`);
    console.log(`- Duration: ${(event.data.duration / 1000).toFixed(1)}s`);
    console.log(`- Words: ${event.data.wordCount}`);
    console.log(`- Text preview: "${event.data.rawText.substring(0, 100)}..."`);
  }
});

// Simulate 12 seconds of speech (similar to user's session)
const shortSessionSegments = [];
const startTime = Date.now();

// Generate segments every 1 second for 12 seconds
for (let i = 0; i < 12; i++) {
  shortSessionSegments.push({
    id: `seg${i + 1}`,
    text: `This is segment ${i + 1}. We are testing short session paragraph formation.`,
    timestamp: startTime + (i * 1000),
    confidence: 0.9,
    isFinal: true
  });
}

console.log(`Simulating ${shortSessionSegments.length} segments over 12 seconds...\n`);

// Process segments
async function runTest() {
  const testStartTime = Date.now();
  
  // Set internal state
  service.setState = service.setState || (() => {});
  service.currentCorrelationId = 'test-correlation-id';
  service.sourceLanguage = 'en';
  service.targetLanguage = 'ja';
  
  // Process segments
  for (let i = 0; i < shortSessionSegments.length; i++) {
    const segment = shortSessionSegments[i];
    const targetTime = segment.timestamp - startTime;
    const currentTime = Date.now() - testStartTime;
    const waitTime = targetTime - currentTime;
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const elapsed = ((Date.now() - testStartTime) / 1000).toFixed(1);
    console.log(`[${elapsed}s] Processing segment ${i + 1}/${shortSessionSegments.length}`);
    
    service.processTranscriptSegment(segment);
  }
  
  console.log('\n⏳ Session complete. Flushing paragraph builder...');
  
  // IMPORTANT: Force flush the paragraph builder
  if (service.paragraphBuilder) {
    service.paragraphBuilder.flush();
    console.log('✅ Paragraph builder flushed');
  }
  
  // Wait a bit for events to propagate
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n📊 Test Results:');
  console.log(`- Total segments: ${shortSessionSegments.length}`);
  console.log(`- Session duration: 12 seconds`);
  console.log(`- Paragraph events: ${paragraphEventCount}`);
  console.log(`- Min paragraph duration: 10 seconds (configured)`);
  
  if (paragraphEventCount > 0) {
    console.log('\n✅ SUCCESS: Short session paragraph formation working!');
    console.log('\nParagraph details:');
    paragraphEvents.forEach((event, index) => {
      console.log(`\nParagraph ${index + 1}:`);
      console.log(`- ID: ${event.data.paragraphId}`);
      console.log(`- Segments: ${event.data.segmentIds.length}`);
      console.log(`- Duration: ${(event.data.duration / 1000).toFixed(1)}s`);
      console.log(`- Words: ${event.data.wordCount}`);
    });
  } else {
    console.log('\n❌ FAILURE: No paragraphs formed in short session');
    console.log('\nPossible issues:');
    console.log('1. ParagraphBuilder.flush() not called on session end');
    console.log('2. Min duration still too high (current: 10s)');
    console.log('3. Event propagation issues');
  }
  
  // Cleanup
  service.destroy();
}

// Run the test
runTest().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});