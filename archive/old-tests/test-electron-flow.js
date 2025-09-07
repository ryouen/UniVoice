/**
 * Test the exact flow from renderer to main process
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '.env') });

// Import required modules
const { ipcGateway } = require('./dist-electron/services/ipc/gateway.js');
const { UnifiedPipelineService } = require('./dist-electron/services/domain/UnifiedPipelineService.js');
const { logger } = require('./dist-electron/utils/logger.js');

console.log('=== Electron Flow Test ===');

// Initialize services
let pipelineService = null;

function setupPipelineService() {
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
  
  pipelineService = new UnifiedPipelineService(audioConfig, deepgramConfig, openaiConfig);
  
  // Forward pipeline events to IPC Gateway
  pipelineService.on('pipelineEvent', (event) => {
    console.log('[Test] Pipeline event:', event.type);
    ipcGateway.emitEvent(event);
  });
  
  console.log('[Test] Pipeline service setup completed');
}

function setupIPCGateway() {
  // Handle commands from renderer
  ipcMain.handle('univoice:command', async (event, command) => {
    console.log('[Test] Received IPC command:', command);
    
    try {
      await ipcGateway.handleCommand(command);
      console.log('[Test] Command handled successfully');
      return { success: true };
    } catch (error) {
      console.error('[Test] Command failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // Forward pipeline events to renderer
  ipcGateway.on('pipeline-event', (event) => {
    console.log('[Test] IPC Gateway emitted event:', event.type);
  });

  // Handle domain commands - Route to pipeline service
  ipcGateway.on('domain-command', async (domainCommand) => {
    console.log('[Test] Domain command received:', {
      type: domainCommand.type,
      correlationId: domainCommand.correlationId,
    });
    
    if (!pipelineService) {
      console.error('[Test] Pipeline service not initialized');
      return;
    }
    
    try {
      switch (domainCommand.type) {
        case 'startListening':
          await pipelineService.startListening(
            domainCommand.params.sourceLanguage,
            domainCommand.params.targetLanguage,
            domainCommand.correlationId
          );
          console.log('[Test] Started listening');
          break;
        case 'stopListening':
          await pipelineService.stopListening(domainCommand.correlationId);
          console.log('[Test] Stopped listening');
          break;
        default:
          console.warn('[Test] Unknown domain command:', domainCommand);
      }
    } catch (error) {
      console.error('[Test] Domain command failed:', error);
    }
  });

  console.log('[Test] IPC Gateway setup completed');
}

// Initialize everything
setupPipelineService();
setupIPCGateway();

// Simulate the exact command sent by the renderer
async function simulateRendererCommand() {
  console.log('\n=== Simulating Renderer Command ===');
  
  const command = {
    command: 'startListening',
    params: {
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      correlationId: `ui-${Date.now()}-test123`
    }
  };
  
  console.log('[Test] Simulating IPC invoke with command:', command);
  
  // Simulate the IPC invoke
  const result = await ipcMain.handle('univoice:command', null, command);
  
  console.log('[Test] IPC invoke result:', result);
  
  if (result.success) {
    console.log('✅ Command succeeded!');
    
    // Wait a bit then stop
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stopCommand = {
      command: 'stopListening',
      params: {
        correlationId: command.params.correlationId
      }
    };
    
    console.log('\n[Test] Sending stop command');
    const stopResult = await ipcMain.handle('univoice:command', null, stopCommand);
    console.log('[Test] Stop result:', stopResult);
  } else {
    console.error('❌ Command failed:', result.error);
  }
  
  // Cleanup
  setTimeout(() => {
    pipelineService.destroy();
    ipcGateway.destroy();
    process.exit(0);
  }, 1000);
}

// Run the test
simulateRendererCommand();