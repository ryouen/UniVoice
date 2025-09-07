/**
 * Test script to diagnose session start failure
 */

const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '.env') });

console.log('=== Environment Check ===');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'Not set');
console.log('DEEPGRAM_API_KEY:', process.env.DEEPGRAM_API_KEY ? 'Set (length: ' + process.env.DEEPGRAM_API_KEY.length + ')' : 'Not set');
console.log('DG_INTERIM:', process.env.DG_INTERIM);
console.log('DG_ENDPOINTING:', process.env.DG_ENDPOINTING);
console.log('DG_UTTERANCE_END_MS:', process.env.DG_UTTERANCE_END_MS);

// Test UnifiedPipelineService initialization
console.log('\n=== Testing UnifiedPipelineService ===');

async function testPipeline() {
  try {
    const { UnifiedPipelineService } = require('./dist-electron/services/domain/UnifiedPipelineService.js');
    
    const audioConfig = { 
      frameMs: 20, 
      frameSize: 640, 
      sampleRate: 16000 
    };
    
    const deepgramConfig = {
      apiKey: process.env.DEEPGRAM_API_KEY || '',
      model: 'nova-2',
      interim: (process.env.DG_INTERIM || 'true') === 'true',
      endpointing: parseInt(process.env.DG_ENDPOINTING || '800', 10),
      utteranceEndMs: parseInt(process.env.DG_UTTERANCE_END_MS || '1000', 10)
    };
    
    const openaiConfig = {
      apiKey: process.env.OPENAI_API_KEY || '',
      models: {
        translate: process.env.OPENAI_MODEL_TRANSLATE || 'gpt-4o-mini',
        summary: process.env.OPENAI_MODEL_SUMMARY || 'gpt-4o-mini',
        summaryTranslate: process.env.OPENAI_MODEL_SUMMARY_TRANSLATE || 'gpt-4o-mini',
        userTranslate: process.env.OPENAI_MODEL_USER_TRANSLATE || 'gpt-4o-mini',
        vocabulary: process.env.OPENAI_MODEL_VOCABULARY || 'gpt-4o-mini',
        report: process.env.OPENAI_MODEL_REPORT || 'gpt-4o'
      },
      maxTokens: {
        translate: parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500'),
        summary: parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500'),
        vocabulary: parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500'),
        report: parseInt(process.env.OPENAI_REPORT_MAX_TOKENS || '8192')
      }
    };
    
    console.log('Creating UnifiedPipelineService with config:');
    console.log('- Deepgram API Key:', deepgramConfig.apiKey ? 'Set' : 'Not set');
    console.log('- OpenAI API Key:', openaiConfig.apiKey ? 'Set' : 'Not set');
    console.log('- Deepgram Model:', deepgramConfig.model);
    console.log('- OpenAI Models:', openaiConfig.models);
    
    const pipelineService = new UnifiedPipelineService(audioConfig, deepgramConfig, openaiConfig);
    
    console.log('✅ UnifiedPipelineService created successfully');
    
    // Test starting a session
    console.log('\n=== Testing startListening ===');
    const correlationId = `test-${Date.now()}`;
    
    pipelineService.on('pipelineEvent', (event) => {
      console.log('Pipeline Event:', event.type, event);
    });
    
    await pipelineService.startListening('en', 'ja', correlationId);
    
    console.log('✅ startListening completed successfully');
    console.log('State:', pipelineService.getState());
    
    // Clean up
    await pipelineService.stopListening(correlationId);
    pipelineService.destroy();
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
}

testPipeline();