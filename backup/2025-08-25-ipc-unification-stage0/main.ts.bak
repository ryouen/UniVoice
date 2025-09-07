/**
 * UniVoice Main Process - Streaming UI Optimization
 * Clean Architecture with IPC Gateway and Domain Services
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { config } from 'dotenv';
import path from 'path';
import { ipcGateway } from './services/ipc/gateway';
import { UnifiedPipelineService } from './services/domain/UnifiedPipelineService';
import { DataPersistenceService } from './services/domain/DataPersistenceService';
import { logger } from './utils/logger';
import { runStartupChecks, watchForNulCreation } from './utils/startup-check';
// import { devTestService } from './services/DevTestService';

// Load environment variables
config({ quiet: true });

// Run startup checks (nul file cleanup, etc.)
runStartupChecks();

// Watch for nul file creation in development
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  watchForNulCreation();
}

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
let dataPersistenceService: DataPersistenceService | null = null;
const mainLogger = logger.child('Main');

async function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('[Main] Preload script path:', preloadPath);
  console.log('[Main] Preload script exists:', require('fs').existsSync(preloadPath));
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
      enableBlinkFeatures: 'AudioWorklet',
      // Add sandbox: false to ensure preload script can run
      sandbox: false
    },
    title: 'UniVoice - Streaming UI Optimization'
  });

  // Development vs Production mode
  const isDev = !app.isPackaged;
  
  if (isDev) {
    try {
      // Try common Vite ports
      const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182, 5183, 5190, 5195];
      let connected = false;
      
      for (const port of ports) {
        try {
          console.log(`[Main] Trying to connect to dev server on port ${port}...`);
          await mainWindow.loadURL(`http://localhost:${port}`);
          mainLogger.info(`Connected to dev server on port ${port}`);
          console.log(`[Main] Successfully connected to dev server on port ${port}`);
          connected = true;
          break;
        } catch (err) {
          // Try next port
        }
      }
      
      if (!connected) {
        throw new Error('Failed to connect to any dev server port');
      }
      mainWindow.webContents.openDevTools();
    } catch (err) {
      mainLogger.error('Failed to connect to dev server', { error: err });
      console.error('[Main] Failed to connect to dev server:', err);
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  } else {
    console.log('[Main] Loading production build from:', path.join(__dirname, '../dist/index.html'));
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Enable DevTools shortcuts
  mainWindow.webContents.on('before-input-event', (_event, input) => {
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

  // IPC Gateway and Pipeline Service are setup in app.whenReady()
  
  // 🔴 開発モードで自動テストを有効化
  // TEMPORARY: Disable DevTestService to debug sendCommand error
  /*
  if (isDev) {
    devTestService.attach(mainWindow);
    mainLogger.info('DevTestService attached for automatic testing');
  }
  */

  // Auto-approve media device permissions
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
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
  ipcMain.handle('univoice:command', async (_event, command) => {
    const startTime = Date.now();
    
    try {
      console.log('[Main] Received command:', JSON.stringify(command, null, 2));
      console.log('[Main] Command type:', command?.command);
      console.log('[Main] Command params:', JSON.stringify(command?.params, null, 2));
      
      await ipcGateway.handleCommand(command);
      
      mainLogger.performance('info', 'IPC command handled', startTime, {
        command: command?.command,
      });
      
      console.log('[Main] Command handled successfully');
      return { success: true };
    } catch (error) {
      console.error('[Main] Command failed:', error);
      console.error('[Main] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
  ipcGateway.on('pipelineEvent', (event) => {
    console.log('[Main] Forwarding pipeline event to renderer:', event.type);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('univoice:event', event);
    } else {
      console.error('[Main] Cannot forward event - mainWindow not available');
    }
  });

  // Handle domain commands - Route to pipeline service
  ipcGateway.on('domain-command', async (domainCommand) => {
    mainLogger.info('Domain command received', {
      type: domainCommand.type,
      correlationId: domainCommand.correlationId,
    });
    
    if (!pipelineService) {
      console.error('[Main] Pipeline service not initialized!');
      mainLogger.error('Pipeline service not initialized');
      return;
    }
    
    console.log('[Main] Pipeline service is initialized:', !!pipelineService);
    
    try {
      switch (domainCommand.type) {
        case 'startListening':
          console.log('[Main] Starting listening with params:', domainCommand.params);
          mainLogger.info('Starting listening', domainCommand.params);
          await pipelineService.startListening(
            domainCommand.params.sourceLanguage,
            domainCommand.params.targetLanguage,
            domainCommand.correlationId
          );
          console.log('[Main] Started listening successfully');
          mainLogger.info('Started listening successfully');
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
        case 'generateVocabulary':
          console.log('[Main] Generating vocabulary for correlation:', domainCommand.correlationId);
          await pipelineService.generateVocabulary(domainCommand.correlationId);
          break;
        case 'generateFinalReport':
          console.log('[Main] Generating final report for correlation:', domainCommand.correlationId);
          await pipelineService.generateFinalReport(domainCommand.correlationId);
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
  console.log('[Main] IPC Gateway setup completed - handlers registered');
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
    model: 'nova-3',
    interim: (process.env.DG_INTERIM || 'true') === 'true',
    endpointing: parseInt(process.env.DG_ENDPOINTING || '800', 10),
    utteranceEndMs: parseInt(process.env.DG_UTTERANCE_END_MS || '1000', 10)
  };
  
  /**
   * 🔴 重要警告：OpenAIモデル設定
   * 
   * これらのモデル名を変更する前に、必ず以下を確認すること：
   * 1. CLAUDE.md の「3. 時系列認識と最新技術の理解」セクション（34-41行目）を読む
   * 2. CLAUDE.md の「4. 知識カットオフ後のAPIパターンの尊重」セクション（43-51行目）を読む
   * 3. docs/GPT5-RESPONSES-API-GUIDE.md - GPT-5とResponses APIの正しい使用方法
   * 4. docs/PARAMETER-INCONSISTENCIES-REPORT.md - APIパラメータの正しい情報
   * 
   * 現在は2025年8月。GPT-5系が最新モデルです。
   * GPT-4系への変更は「ダウングレード」として禁止されています。
   * 
   * 利用可能なモデル:
   * - gpt-5: 高度な推論（$1.25/1M input, $10/1M output）
   * - gpt-5-mini: 中間モデル（$0.25/1M input, $2/1M output）
   * - gpt-5-nano: 軽量モデル（$0.05/1M input, $0.40/1M output）
   * 
   * もしモデル変更が必要と感じた場合：
   * - まずCLAUDE.mdを確認
   * - test-3min-complete.jsの動作確認済み設定を参照
   * - それでも変更が必要な場合は、変更理由を明確にドキュメント化
   */
  const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY || '',
    models: {
      translate: process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano',  // 絶対変更禁止
      summary: process.env.OPENAI_MODEL_SUMMARY || 'gpt-5-mini',      // 絶対変更禁止
      summaryTranslate: process.env.OPENAI_MODEL_SUMMARY_TRANSLATE || 'gpt-5-nano', // 絶対変更禁止
      userTranslate: process.env.OPENAI_MODEL_USER_TRANSLATE || 'gpt-5-nano',      // 絶対変更禁止
      vocabulary: process.env.OPENAI_MODEL_VOCABULARY || 'gpt-5-mini',              // 絶対変更禁止
      report: process.env.OPENAI_MODEL_REPORT || 'gpt-5'                           // 絶対変更禁止
    },
    maxTokens: {
      translate: parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500'),
      summary: parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500'),
      vocabulary: parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500'),
      report: parseInt(process.env.OPENAI_REPORT_MAX_TOKENS || '8192')
    }
  };
  
  pipelineService = new UnifiedPipelineService(audioConfig, deepgramConfig, openaiConfig);
  dataPersistenceService = new DataPersistenceService();
  
  // Forward pipeline events to IPC Gateway
  pipelineService.on('pipelineEvent', (event) => {
    console.log('[Main] Pipeline event received from service:', event.type);
    ipcGateway.emitEvent(event);
  });
  
  // 親フォルダ仕様: 直接イベントの転送
  pipelineService.on('currentOriginalUpdate', (data) => {
    mainLogger.debug('currentOriginalUpdate event', data);
    // メインウィンドウに直接送信 - ハイフン版のチャンネル名を使用
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('current-original-update', data);
    }
  });
  
  pipelineService.on('currentTranslationUpdate', (text) => {
    mainLogger.debug('currentTranslationUpdate event', { text });
    // メインウィンドウに直接送信 - ハイフン版のチャンネル名を使用
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('current-translation-update', text);
    }
  });
  
  // 他の重要なイベントの転送
  pipelineService.on('translationComplete', async (data) => {
    mainLogger.debug('translationComplete event', data);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('translation-complete', data);
    }
  });
  
  pipelineService.on('started', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pipeline:started');
    }
    
    // データ永続化サービスの開始は、session-metadata-updateイベントで行うため、ここでは何もしない
    // セッション情報はフロントエンドから受け取るのを待つ
  });
  
  pipelineService.on('stopped', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pipeline:stopped');
    }
    
    // データ永続化サービスの停止は、session-endイベントで明示的に行うため、ここでは何もしない
    // 一時停止（togglePause）と終了を区別するため
  });
  
  pipelineService.on('deepgramConnected', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pipeline:deepgramConnected');
    }
  });
  
  pipelineService.on('summaryGenerated', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('summary-generated', data);
    }
  });
  
  pipelineService.on('userTranslation', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('user-translation', data);
    }
  });
  
  pipelineService.on('finalReport', (report) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('final-report', report);
    }
  });
  
  pipelineService.on('error', (error) => {
    mainLogger.error('Pipeline error', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pipeline:error', error.message || String(error));
    }
  });
  
  pipelineService.on('audioProgress', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('audio-progress', data);
    }
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
  
  // Handle history block from renderer (from FlexibleHistoryGrouper)
  ipcMain.on('history-block-created', async (_event, block) => {
    try {
      if (dataPersistenceService && block) {
        await dataPersistenceService.addHistoryBlock(block);
        mainLogger.debug('History block added to persistence', { blockId: block.id });
      }
    } catch (error) {
      mainLogger.error('Failed to save history block', {
        error: error instanceof Error ? error.message : String(error),
        blockId: block?.id
      });
    }
  });
  
  // Handle summary from renderer
  ipcMain.on('summary-created', async (_event, summary) => {
    try {
      if (dataPersistenceService && summary) {
        await dataPersistenceService.addSummary(summary);
        mainLogger.debug('Summary added to persistence', { summaryId: summary.id });
      }
    } catch (error) {
      mainLogger.error('Failed to save summary', {
        error: error instanceof Error ? error.message : String(error),
        summaryId: summary?.id
      });
    }
  });
  
  // Handle session metadata update
  ipcMain.on('session-metadata-update', async (_event, metadata) => {
    try {
      if (dataPersistenceService && metadata && metadata.className) {
        // 新規セッション開始（endSessionは呼ばない - 同日再開のため）
        const sessionId = await dataPersistenceService.startSession({
          courseName: metadata.className,
          sourceLanguage: metadata.sourceLanguage || 'en',
          targetLanguage: metadata.targetLanguage || 'ja'
        });
        // startSessionが内部で自動保存を開始するので、ここでは不要
        mainLogger.info('Session started', { className: metadata.className, sessionId });
      }
    } catch (error) {
      mainLogger.error('Failed to start session', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Handle session end (授業終了ボタン)
  ipcMain.on('session-end', async (_event) => {
    try {
      if (dataPersistenceService) {
        await dataPersistenceService.endSession();
        mainLogger.info('Session ended successfully');
      }
    } catch (error) {
      mainLogger.error('Failed to end session', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Handle next class (次の授業へボタン)
  ipcMain.on('next-class', async (_event) => {
    try {
      if (dataPersistenceService) {
        // 現在のセッションを正しく終了
        await dataPersistenceService.endSession();
        mainLogger.info('Session ended for next class');
      }
    } catch (error) {
      mainLogger.error('Failed to end session for next class', {
        error: error instanceof Error ? error.message : String(error)
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
  // Single instance lock - 複数起動防止
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    // 既に起動している場合は終了
    app.quit();
    return;
  }
  
  app.on('second-instance', () => {
    // 別のインスタンスが起動しようとした場合、既存のウィンドウをフォーカス
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  createWindow();
  
  // Initialize services after window is created
  // Wait a bit to ensure window is fully ready
  setTimeout(() => {
    setupIPCGateway();
    setupPipelineService();
  }, 100);

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