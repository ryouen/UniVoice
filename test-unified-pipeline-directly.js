/**
 * Test UnifiedPipelineService directly without Electron
 */

require('dotenv').config();

const { UnifiedPipelineService } = require('./electron/services/domain/UnifiedPipelineService');

console.log('🧪 Testing UnifiedPipelineService directly...\n');

// Check environment
if (!process.env.OPENAI_API_KEY || !process.env.DEEPGRAM_API_KEY) {
  console.error('❌ Missing API keys in environment');
  process.exit(1);
}

// Create service with test configuration
const audioConfig = {
  frameMs: 50,
  frameSize: 2400,
  sampleRate: 48000
};

const deepgramConfig = {
  apiKey: process.env.DEEPGRAM_API_KEY,
  model: process.env.DG_MODEL || 'nova-3',
  interim: true,
  endpointing: parseInt(process.env.DG_ENDPOINTING || '800'),
  utteranceEndMs: parseInt(process.env.DG_UTTERANCE_END_MS || '1000'),
  smartFormat: true,
  noDelay: true
};

const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  models: {
    translate: process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano',
    summary: process.env.OPENAI_MODEL_SUMMARY || 'gpt-5-mini',
    summaryTranslate: process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano',
    userTranslate: process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano',
    vocabulary: process.env.OPENAI_MODEL_VOCAB || 'gpt-5-mini',
    report: process.env.OPENAI_MODEL_REPORT || 'gpt-5'
  },
  maxTokens: {
    translate: parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500'),
    summary: parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500'),
    vocabulary: parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500'),
    report: parseInt(process.env.OPENAI_REPORT_MAX_TOKENS || '8192')
  }
};

console.log('📋 Configuration:', {
  deepgramModel: deepgramConfig.model,
  translationModel: openaiConfig.models.translate
});

// Create service
const service = new UnifiedPipelineService(
  audioConfig,
  deepgramConfig,
  openaiConfig,
  { sourceLanguage: 'en', targetLanguage: 'ja' }
);

// Listen for events
let eventCount = 0;
service.on('pipelineEvent', (event) => {
  eventCount++;
  console.log(`\n📌 Event #${eventCount} [${event.type}]:`, {
    type: event.type,
    correlationId: event.correlationId,
    dataPreview: event.type === 'PARAGRAPH_COMPLETE' ? {
      paragraphId: event.data.paragraphId,
      wordCount: event.data.wordCount,
      duration: event.data.duration
    } : event.type === 'ASR' ? {
      text: event.data.text.substring(0, 50) + '...',
      isFinal: event.data.isFinal
    } : event.type
  });
});

// Directly call processTranscriptSegment using reflection
const processMethod = service.processTranscriptSegment || service.__proto__.processTranscriptSegment;
if (!processMethod) {
  console.error('❌ Could not access processTranscriptSegment method');
  process.exit(1);
}

// Bind the method to the service instance
const processTranscriptSegment = processMethod.bind(service);

// Test function
async function runTest() {
  console.log('\n🚀 Starting test...\n');
  
  // Simulate transcript segments
  const segments = [
    { id: 'seg1', text: 'Hello and welcome to today\'s lecture.', timestamp: Date.now(), confidence: 0.95, isFinal: true },
    { id: 'seg2', text: 'We will be discussing artificial intelligence.', timestamp: Date.now() + 1000, confidence: 0.95, isFinal: true },
    { id: 'seg3', text: 'First, let me explain', timestamp: Date.now() + 2000, confidence: 0.90, isFinal: false }, // interim
    { id: 'seg3', text: 'First, let me explain what AI means.', timestamp: Date.now() + 2500, confidence: 0.95, isFinal: true },
    { id: 'seg4', text: 'AI is the simulation of human intelligence.', timestamp: Date.now() + 3500, confidence: 0.95, isFinal: true },
    { id: 'seg5', text: 'It includes learning, reasoning, and self-correction.', timestamp: Date.now() + 4500, confidence: 0.95, isFinal: true },
  ];
  
  // Process each segment
  for (const segment of segments) {
    console.log(`\n📝 Processing: "${segment.text}" (${segment.isFinal ? 'FINAL' : 'INTERIM'})`);
    try {
      processTranscriptSegment(segment);
    } catch (error) {
      console.error('❌ Error processing segment:', error.message);
    }
    
    // Small delay between segments
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Wait for async processing
  console.log('\n⏳ Waiting for async processing...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Force flush paragraphs
  console.log('\n🔄 Flushing paragraphs...');
  if (service.paragraphBuilder) {
    service.paragraphBuilder.flush();
  }
  
  // Wait a bit more
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`- Total events emitted: ${eventCount}`);
  console.log(`- Pipeline state:`, service.getState());
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  service.destroy();
  
  console.log('\n✅ Test complete!');
}

// Run the test
runTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});