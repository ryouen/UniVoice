/**
 * Test IPC integration between renderer and main process simulation
 */

const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '.env') });

// Import the IPC gateway and services
const { ipcGateway } = require('./dist-electron/services/ipc/gateway.js');
const { UnifiedPipelineService } = require('./dist-electron/services/domain/UnifiedPipelineService.js');

console.log('=== IPC Integration Test ===');

async function testIPCIntegration() {
  try {
    // Setup pipeline service (simulating main.ts setup)
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
    
    const pipelineService = new UnifiedPipelineService(audioConfig, deepgramConfig, openaiConfig);
    
    // Forward pipeline events to IPC Gateway
    pipelineService.on('pipelineEvent', (event) => {
      console.log('Pipeline Event:', event.type);
      ipcGateway.emitEvent(event);
    });
    
    // Listen for IPC gateway events
    let eventCount = 0;
    ipcGateway.on('pipeline-event', (event) => {
      console.log('IPC Gateway Event:', event.type);
      eventCount++;
    });
    
    // Handle domain commands
    ipcGateway.on('domain-command', async (domainCommand) => {
      console.log('Domain Command Received:', domainCommand.type);
      
      try {
        switch (domainCommand.type) {
          case 'startListening':
            await pipelineService.startListening(
              domainCommand.params.sourceLanguage,
              domainCommand.params.targetLanguage,
              domainCommand.correlationId
            );
            break;
          case 'stopListening':
            await pipelineService.stopListening(domainCommand.correlationId);
            break;
          default:
            console.warn('Unknown domain command:', domainCommand);
        }
      } catch (error) {
        console.error('Domain command failed:', error);
      }
    });
    
    console.log('\n=== Testing IPC Command Flow ===');
    
    // Simulate a command from renderer
    const testCommand = {
      command: 'startListening',
      params: {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        correlationId: `test-ipc-${Date.now()}`
      }
    };
    
    console.log('Sending test command:', testCommand);
    await ipcGateway.handleCommand(testCommand);
    
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\nEvents received by IPC Gateway:', eventCount);
    
    // Stop listening
    const stopCommand = {
      command: 'stopListening',
      params: {
        correlationId: testCommand.params.correlationId
      }
    };
    
    console.log('\nSending stop command:', stopCommand);
    await ipcGateway.handleCommand(stopCommand);
    
    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('\nTotal events received:', eventCount);
    console.log('✅ IPC Integration test completed');
    
    // Cleanup
    pipelineService.destroy();
    ipcGateway.destroy();
    
  } catch (error) {
    console.error('❌ IPC Integration test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testIPCIntegration();