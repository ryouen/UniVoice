/**
 * UniVoice Main Process - Streaming UI Optimization
 * Clean Architecture with IPC Gateway and Domain Services
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { config } from 'dotenv';
import path from 'path';
import { ipcGateway } from './services/ipc/gateway';
import { UnifiedPipelineService } from './services/domain/UnifiedPipelineService';
import { logger } from './utils/logger';

// Load environment variables
config({ quiet: true });

// Windows GPU stability configuration
app.disableHardwareAcceleration();

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('enable-media-stream');
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
  app.commandLine.appendSwitch('max-old-space-size', '2048');
  logger.info('Applied Windows GPU stability configuration');
}

let mainWindow: BrowserWindow | null = null;
let pipelineService: UnifiedPipelineService | null = null;
const mainLogger = logger.child('Main');

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
      enableBlinkFeatures: 'AudioWorklet'
    },
    title: 'UniVoice - Streaming UI Optimization'
  });

  // Development vs Production mode
  const isDev = !app.isPackaged;
  
  if (isDev) {
    try {
      await mainWindow.loadURL('http://localhost:5174');
      mainLogger.info('Connected to dev server on port 5174');
      mainWindow.webContents.openDevTools();
    } catch (err) {
      mainLogger.error('Failed to connect to dev server', { error: err });
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Enable DevTools shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F12 key to toggle DevTools
    if (input.key === 'F12' && input.type === 'keyDown') {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow?.webContents.openDevTools();
      }
    }
    // Ctrl+Shift+I alternative
    if (input.control && input.shift && input.key === 'I' && input.type === 'keyDown') {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow?.webContents.openDevTools();
      }
    }
  });

  // Force open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
    mainLogger.info('DevTools enabled - Press F12 to toggle');
  }

  // Setup IPC Gateway and Pipeline Service
  setupIPCGateway();
  setupPipelineService();

  // Auto-approve media device permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    mainLogger.info('Permission requested', { permission });
    if (permission === 'media' || permission === 'mediaKeySystem') {
      callback(true);
    } else {
      callback(true); // Allow all in development
    }
  });
  
  mainWindow.on('closed', () => {
    cleanup();
    mainWindow = null;
  });

  mainLogger.info('Main window created successfully');
}

/**
 * Setup IPC Gateway and handlers
 */
function setupIPCGateway(): void {
  // Handle commands from renderer
  ipcMain.handle('univoice:command', async (event, command) => {
    const startTime = Date.now();
    
    try {
      await ipcGateway.handleCommand(command);
      
      mainLogger.performance('info', 'IPC command handled', startTime, {
        command: command?.command,
      });
      
      return { success: true };
    } catch (error) {
      mainLogger.error('IPC command failed', {
        error: error instanceof Error ? error.message : String(error),
        command,
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // Forward pipeline events to renderer
  ipcGateway.on('pipeline-event', (event) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('univoice:event', event);
    }
  });

  // Handle domain commands - Route to pipeline service
  ipcGateway.on('domain-command', async (domainCommand) => {
    mainLogger.info('Domain command received', {
      type: domainCommand.type,
      correlationId: domainCommand.correlationId,
    });
    
    if (!pipelineService) {
      mainLogger.error('Pipeline service not initialized');
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
          break;
        case 'stopListening':
          await pipelineService.stopListening(domainCommand.correlationId);
          break;
        case 'getHistory':
          // TODO: Implement history retrieval
          mainLogger.info('Get history command', domainCommand.params);
          break;
        case 'clearHistory':
          pipelineService.clearHistory();
          break;
        default:
          mainLogger.warn('Unknown domain command', { domainCommand });
      }
    } catch (error) {
      mainLogger.error('Domain command failed', {
        error: error instanceof Error ? error.message : String(error),
        domainCommand,
      });
    }
  });

  mainLogger.info('IPC Gateway setup completed');
}

/**
 * Setup Pipeline Service
 */
function setupPipelineService(): void {
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
    ipcGateway.emitEvent(event);
  });
  
  // Handle audio chunks from renderer
  ipcMain.on('audio-chunk', (_event, buffer: Buffer) => {
    try {
      if (pipelineService && buffer && buffer.length > 0) {
        pipelineService.sendAudioChunk(buffer);
        // Sampling log (about once per second)
        if (Math.random() < 0.05) {
          mainLogger.debug('Audio chunk received', { size: buffer.length });
        }
      }
    } catch (error) {
      mainLogger.error('Audio chunk processing failed', {
        error: error instanceof Error ? error.message : String(error),
        bufferSize: buffer?.length || 0,
      });
    }
  });
  
  mainLogger.info('Pipeline service setup completed');
}

/**
 * Cleanup resources
 */
function cleanup(): void {
  if (pipelineService) {
    pipelineService.destroy();
    pipelineService = null;
  }
  
  if (ipcGateway) {
    ipcGateway.destroy();
  }
  
  mainLogger.info('Cleanup completed');
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  mainLogger.info('App ready and window created');
});

app.on('window-all-closed', async () => {
  cleanup();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
  
  mainLogger.info('All windows closed, app quitting');
});

// Handle app termination
process.on('SIGINT', () => {
  mainLogger.info('Received SIGINT, cleaning up...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  mainLogger.info('Received SIGTERM, cleaning up...');
  cleanup();
  process.exit(0);
});