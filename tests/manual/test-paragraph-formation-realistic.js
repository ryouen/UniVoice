/**
 * Realistic test for paragraph formation
 * Simulates a 30-second lecture segment
 */

const { UnifiedPipelineService } = require('../../dist-electron/services/domain/UnifiedPipelineService');

console.log('🧪 Realistic Paragraph Formation Test\n');
console.log('This test will simulate 30 seconds of speech to trigger paragraph formation.\n');

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

service.on('pipelineEvent', (event) => {
  if (event.type === 'paragraphComplete') {
    paragraphEventCount++;
    console.log('\n✅ PARAGRAPH COMPLETE EVENT DETECTED!');
    console.log('Event data:', JSON.stringify(event.data, null, 2));
  }
});

// Simulate 25 seconds of continuous speech
const speechSegments = [];
const startTime = Date.now();

// Generate segments every 1 second for 25 seconds
for (let i = 0; i < 25; i++) {
  speechSegments.push({
    id: `seg${i + 1}`,
    text: `This is segment number ${i + 1} of the lecture. We are discussing important concepts.`,
    timestamp: startTime + (i * 1000),
    confidence: 0.9,
    isFinal: true
  });
}

// Add a silence break and then more segments
for (let i = 25; i < 30; i++) {
  speechSegments.push({
    id: `seg${i + 1}`,
    text: `Now moving to the next topic. This is segment ${i + 1}.`,
    timestamp: startTime + ((i + 2) * 1000), // 2 second gap for silence
    confidence: 0.9,
    isFinal: true
  });
}

console.log(`Simulating ${speechSegments.length} segments over ~32 seconds...\n`);

// Process segments with realistic timing
async function runTest() {
  const testStartTime = Date.now();
  
  // Start with the internal state
  service.setState = service.setState || (() => {});
  service.currentCorrelationId = 'test-correlation-id';
  service.sourceLanguage = 'en';
  service.targetLanguage = 'ja';
  
  for (let i = 0; i < speechSegments.length; i++) {
    const segment = speechSegments[i];
    const targetTime = segment.timestamp - startTime;
    const currentTime = Date.now() - testStartTime;
    const waitTime = targetTime - currentTime;
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const elapsed = ((Date.now() - testStartTime) / 1000).toFixed(1);
    console.log(`[${elapsed}s] Processing segment ${i + 1}/${speechSegments.length}`);
    
    // Call the private method directly on the service instance
    service.processTranscriptSegment(segment);
  }
  
  console.log('\n⏳ Waiting 5 more seconds for paragraph completion...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n📊 Test Results:');
  console.log(`- Total segments processed: ${speechSegments.length}`);
  console.log(`- Paragraph complete events: ${paragraphEventCount}`);
  console.log(`- Test duration: ${((Date.now() - testStartTime) / 1000).toFixed(1)}s`);
  
  if (paragraphEventCount > 0) {
    console.log('\n✅ SUCCESS: Paragraph formation is working correctly!');
  } else {
    console.log('\n❌ FAILURE: No paragraph events detected.');
    console.log('\nPossible reasons:');
    console.log('1. Check if ParagraphBuilder is properly initialized');
    console.log('2. Verify event emission in handleParagraphComplete');
    console.log('3. Check console logs for ParagraphBuilder messages');
  }
  
  // Cleanup
  service.destroy();
}

// Run the test
runTest().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});