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
import { AdvancedFeatureService } from './services/domain/AdvancedFeatureService';
import { logger } from './utils/logger';
import { runStartupChecks, watchForNulCreation } from './utils/startup-check';
// import { devTestService } from './services/DevTestService';
import { UnifiedEvent, generateEventId } from './shared/ipcEvents';
// import { UNIFIED_CHANNEL } from './shared/ipcEvents'; // Will be used in Stage 1

// Load environment variables
config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

// Run startup checks (nul file cleanup, etc.)
runStartupChecks();

// Watch for nul file creation in development
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  watchForNulCreation();
}

// Windows GPU stability configuration
// Note: GPU flags must be set before app is ready
// 透過ウィンドウのためハードウェアアクセラレーションを有効化
// app.disableHardwareAcceleration(); // グラスモーフィズムのためコメントアウト

if (process.platform === 'win32') {
  // These must be set before app.whenReady()
  // 透過ウィンドウのためGPU関連の無効化を削除
  // app.commandLine.appendSwitch('disable-gpu');
  // app.commandLine.appendSwitch('disable-software-rasterizer');
  // app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('enable-media-stream');
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
  app.commandLine.appendSwitch('max-old-space-size', '2048');
  // Move logging after app is ready to avoid early logger issues
}

let mainWindow: BrowserWindow | null = null;
let pipelineService: UnifiedPipelineService | null = null;
let advancedFeatureService: AdvancedFeatureService | null = null;
let dataPersistenceService: DataPersistenceService | null = null;
const mainLogger = logger.child('Main');

// Unified event system state
let globalSeq = 0; // Monotonic sequence counter
const ENABLE_LEGACY_CHANNELS = process.env.ENABLE_LEGACY_CHANNELS === 'true';

/**
 * Emit unified event - Stage 0 implementation
 * This is a shadow implementation that does not change current behavior
 */
export function emitUnified(event: Omit<UnifiedEvent, 'id' | 'seq' | 'ts' | 'v'>) {
  const fullEvent: UnifiedEvent = {
    v: 1,
    id: generateEventId(),
    seq: globalSeq++,
    ts: Date.now(),
    ...event,
  };
  
  // Stage 0: Emit to shadow consumer for metrics in development only
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Shadow emit for testing in development mode
    if (!app.isPackaged || process.env.NODE_ENV === 'development') {
      const UNIFIED_CHANNEL = 'univoice:event'; // Local import to avoid unused import warning
      mainWindow.webContents.send(UNIFIED_CHANNEL, fullEvent);
    }
    
    console.log('[Main] Shadow unified event:', {
      kind: fullEvent.kind,  
      seq: fullEvent.seq,
      corr: fullEvent.corr
    });
  }
  
  // Legacy compatibility layer (if enabled)
  if (ENABLE_LEGACY_CHANNELS && mainWindow && !mainWindow.isDestroyed()) {
    // Map unified events to legacy channels
    // This will be removed in Stage 2
    // Currently disabled to maintain exact current behavior
  }
}

async function createWindow() {
  mainLogger.info('createWindow called');
  
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('[Main] Preload script path:', preloadPath);
  console.log('[Main] Preload script exists:', require('fs').existsSync(preloadPath));
  
  mainLogger.info('Creating BrowserWindow...');
  // プラットフォーム別の透過設定
  const isMac = process.platform === 'darwin';
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 400, // 初期高さを内容に近い値に
    show: false, // Prevent flash of unstyled window
    frame: false, // フレームレスウィンドウ（全OS対応）
    transparent: false, // ← 絶対にfalse（DWM材質を見せるため）
    backgroundColor: '#00000000', // ← アルファ0でOS材質を見せる
    minWidth: 800,
    minHeight: 200, // 最小高さ: ヘッダー(40) + リアルタイムセクション(100) + 余白(60)
    resizable: true, // ユーザーによるリサイズを許可
    // macOSでVibrancy効果
    ...(isMac ? {
      vibrancy: 'under-window', // または 'sidebar', 'selection' など
      visualEffectState: 'active'
    } : {}),
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

  mainLogger.info('BrowserWindow created');

  // Windows 11のAcrylic効果を適用
  console.log('[WIN-GLASS] setBackgroundMaterial exists:',
    typeof (mainWindow as any).setBackgroundMaterial === 'function');

  const isWindows = process.platform === 'win32';
  if (isWindows && typeof (mainWindow as any).setBackgroundMaterial === 'function') {
    (mainWindow as any).setBackgroundMaterial('acrylic');
    console.log('[WIN-GLASS] backgroundMaterial: acrylic set');
  } else {
    console.warn('[WIN-GLASS] backgroundMaterial NOT set (non-Windows or API missing)');
  }

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
    } catch (err) {
      mainLogger.error('Failed to connect to dev server', { error: err });
      console.error('[Main] Failed to connect to dev server:', err);
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    
    // Show window immediately in development mode
    mainWindow.show();
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

  // Handle ready-to-show event for frameless window
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainLogger.info('Window shown after ready-to-show');
    } else {
      mainLogger.error('mainWindow is null or destroyed in ready-to-show');
    }
  });

  mainLogger.info('createWindow completed successfully');
  
  // IPC Gateway and Pipeline Service are setup in app.whenReady()
  
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
 * Setup window control handlers for frameless window
 */
function setupWindowControls(): void {
  // Window minimize
  ipcMain.handle('window:minimize', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  // Window maximize
  ipcMain.handle('window:maximize', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.maximize();
    }
  });

  // Window unmaximize
  ipcMain.handle('window:unmaximize', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.unmaximize();
    }
  });

  // Window close
  ipcMain.handle('window:close', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  // Check if window is maximized
  ipcMain.handle('window:isMaximized', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isMaximized();
    }
    return false;
  });

  // Update title bar theme
  ipcMain.handle('window:updateTheme', async (_event, theme: { color: string; symbolColor: string }) => {
    // Theme is handled in renderer process
    mainLogger.info('Theme update requested', theme);
  });

  // Set always on top
  ipcMain.handle('window:setAlwaysOnTop', async (_event, alwaysOnTop: boolean) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(alwaysOnTop);
      return mainWindow.isAlwaysOnTop();
    }
    return false;
  });

  // Check if always on top
  ipcMain.handle('window:isAlwaysOnTop', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isAlwaysOnTop();
    }
    return false;
  });

  // Auto resize window to content height
  ipcMain.handle('window:autoResize', async (_event, height: number) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentBounds = mainWindow.getBounds();
      mainWindow.setBounds({
        x: currentBounds.x,
        y: currentBounds.y,
        width: currentBounds.width,
        height: Math.max(200, Math.min(800, height)) // Clamp between min and max
      });
      mainLogger.info('Window resized', { newHeight: height });
      return true;
    }
    return false;
  });

  mainLogger.info('Window controls setup completed');
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
          
          // Start AdvancedFeatureService with the same correlation ID and languages
          if (advancedFeatureService) {
            advancedFeatureService.start(
              domainCommand.correlationId,
              domainCommand.params.sourceLanguage,
              domainCommand.params.targetLanguage
            );
            mainLogger.info('AdvancedFeatureService started', {
              correlationId: domainCommand.correlationId,
              sourceLanguage: domainCommand.params.sourceLanguage,
              targetLanguage: domainCommand.params.targetLanguage
            });
          } else {
            mainLogger.error('AdvancedFeatureService not initialized');
          }
          
          console.log('[Main] Started listening successfully');
          mainLogger.info('Started listening successfully');
          break;
        case 'stopListening':
          await pipelineService.stopListening(domainCommand.correlationId);
          
          // Stop AdvancedFeatureService as well
          if (advancedFeatureService) {
            await advancedFeatureService.stop();
            mainLogger.info('AdvancedFeatureService stopped');
          }
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
          if (advancedFeatureService) {
            await advancedFeatureService.generateVocabulary();
            mainLogger.info('Vocabulary generation triggered');
          } else {
            mainLogger.error('AdvancedFeatureService not initialized for vocabulary generation');
          }
          break;
        case 'generateFinalReport':
          console.log('[Main] Generating final report for correlation:', domainCommand.correlationId);
          if (advancedFeatureService) {
            await advancedFeatureService.generateFinalReport();
            mainLogger.info('Final report generation triggered');
          } else {
            mainLogger.error('AdvancedFeatureService not initialized for report generation');
          }
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

  // Window control handlers are already registered in setupWindowControls()
  // Do not duplicate them here to avoid the "second handler" error
  mainLogger.info('Window control handlers already registered in setupWindowControls()');

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
  
  // Original defaults preserved in comments for reference
  const deepgramConfig = {
    apiKey: process.env.DEEPGRAM_API_KEY || '',
    model: process.env.DG_MODEL || 'nova-3',
    interim: (process.env.DG_INTERIM || 'true') === 'true',
    endpointing: parseInt(process.env.DG_ENDPOINTING || '800', 10), // Original: 800ms
    utteranceEndMs: parseInt(process.env.DG_UTTERANCE_END_MS || '1000', 10), // Original: 1000ms
    smartFormat: (process.env.DG_SMART_FORMAT || 'false') === 'true', // NEW: default false
    noDelay: (process.env.DG_NO_DELAY || 'false') === 'true' // NEW: default false
  };
  
  /**
   * 🔴 重要警告：OpenAIモデル設定
   */
  // Debug API key loading
  mainLogger.info('API Key Debug:', {
    hasKey: !!process.env.OPENAI_API_KEY,
    keyLength: process.env.OPENAI_API_KEY?.length || 0,
    keyStart: process.env.OPENAI_API_KEY?.substring(0, 20) || 'NONE',
    keyEnd: process.env.OPENAI_API_KEY?.slice(-5) || 'NONE'
  });

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
  
  // Initialize AdvancedFeatureService
  advancedFeatureService = new AdvancedFeatureService({
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    summaryInterval: parseInt(process.env.SUMMARY_INTERVAL_MS || '600000'), // 10 minutes default
    summaryModel: process.env.OPENAI_MODEL_SUMMARY || 'gpt-5-mini',
    vocabularyModel: process.env.OPENAI_MODEL_VOCABULARY || 'gpt-5-mini',
    reportModel: process.env.OPENAI_MODEL_REPORT || 'gpt-5',
    summaryThresholds: [400, 800, 1600, 2400],
    maxTokens: {
      summary: parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500'),
      vocabulary: parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500'),
      report: parseInt(process.env.OPENAI_REPORT_MAX_TOKENS || '8192')
    },
    sourceLanguage: 'en', // Will be updated when session starts
    targetLanguage: 'ja'  // Will be updated when session starts
  });
  
  // Forward AdvancedFeatureService events to renderer
  advancedFeatureService.on('progressiveSummary', (summary) => {
    mainLogger.info('Progressive summary generated', { 
      threshold: summary.threshold,
      summaryLength: summary.english?.length 
    });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('progressive-summary', summary);
    }
  });
  
  advancedFeatureService.on('summaryGenerated', (summary) => {
    mainLogger.info('Summary generated', { 
      wordCount: summary.data?.wordCount,
      summaryLength: summary.data?.english?.length 
    });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('summary', summary);
    }
  });
  
  advancedFeatureService.on('vocabularyGenerated', (vocabulary) => {
    mainLogger.info('Vocabulary generated', { itemCount: vocabulary.data?.items?.length });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vocabulary-generated', vocabulary);
    }
  });
  
  advancedFeatureService.on('finalReportGenerated', (report) => {
    mainLogger.info('Final report generated', { reportLength: report.data?.report?.length });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('final-report-generated', report);
    }
  });
  
  advancedFeatureService.on('error', (error) => {
    mainLogger.error('AdvancedFeatureService error', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('advanced-feature-error', error.message || String(error));
    }
  });
  
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
    
    // Stage 0: Shadow unified event
    emitUnified({
      kind: 'partial',
      corr: data.correlationId,
      payload: { type: 'asr', data }
    });
  });
  
  pipelineService.on('currentTranslationUpdate', (text) => {
    mainLogger.debug('currentTranslationUpdate event', { text });
    // メインウィンドウに直接送信 - ハイフン版のチャンネル名を使用
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('current-translation-update', text);
    }
    
    // Stage 0: Shadow unified event
    emitUnified({
      kind: 'translation_update',
      payload: { text }
    });
  });
  
  // 他の重要なイベントの転送
  pipelineService.on('translationComplete', async (data) => {
    mainLogger.debug('translationComplete event', data);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('translation-complete', data);
    }
    
    // Stage 0: Shadow unified event
    emitUnified({
      kind: 'translation_complete',
      corr: data.correlationId,
      payload: data
    });
    
    // Forward to AdvancedFeatureService
    // Note: The event uses 'japanese' field name for compatibility
    if (advancedFeatureService && data.original && data.japanese) {
      advancedFeatureService.addTranslation({
        id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        original: data.original,
        translated: data.japanese,
        timestamp: Date.now()
      });
      mainLogger.debug('Translation forwarded to AdvancedFeatureService', {
        originalLength: data.original.length,
        translatedLength: data.japanese.length
      });
    } else {
      mainLogger.warn('Translation not forwarded to AdvancedFeatureService', {
        hasService: !!advancedFeatureService,
        hasOriginal: !!data.original,
        hasJapanese: !!data.japanese,
        dataKeys: Object.keys(data || {})
      });
    }
  });
  
  pipelineService.on('started', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pipeline:started');
    }
    
    // Start AdvancedFeatureService with the current session
    if (advancedFeatureService) {
      // Get correlation ID from the current pipeline session
      const correlationId = `main-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Get languages from the pipeline configuration (will be updated by session-metadata-update)
      const sourceLanguage = 'en';  // Default, will be updated
      const targetLanguage = 'ja';  // Default, will be updated
      
      advancedFeatureService.start(correlationId, sourceLanguage, targetLanguage);
      mainLogger.info('AdvancedFeatureService started', { correlationId, sourceLanguage, targetLanguage });
    }
    
    // データ永続化サービスの開始は、session-metadata-updateイベントで行うため、ここでは何もしない
    // セッション情報はフロントエンドから受け取るのを待つ
  });
  
  pipelineService.on('stopped', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pipeline:stopped');
    }
    
    // Clear AdvancedFeatureService when pipeline stops
    if (advancedFeatureService) {
      // No explicit stop method, just log status
      mainLogger.info('Pipeline stopped, AdvancedFeatureService inactive');
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
  ipcMain.on('audio-chunk', (_event, data: any) => {
    
    try {
      // IPC serialization converts Buffer to {type: 'Buffer', data: number[]}
      // We need to reconstruct the Buffer
      let buffer: Buffer;
      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
        // Reconstruct Buffer from serialized form
        buffer = Buffer.from(data.data);
      } else if (data && data.data) {
        // Try to create Buffer from data property
        buffer = Buffer.from(data.data);
      } else if (data instanceof Uint8Array) {
        // Direct Uint8Array
        buffer = Buffer.from(data);
      } else if (data instanceof ArrayBuffer) {
        // Direct ArrayBuffer
        buffer = Buffer.from(data);
      } else if (ArrayBuffer.isView(data)) {
        // Other TypedArrays (Int16Array, etc.)
        buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      } else {
        return;
      }
      
      if (pipelineService && buffer && buffer.length > 0) {
        pipelineService.sendAudioChunk(buffer);
      }
    } catch (error) {
      mainLogger.error('Audio chunk processing failed', {
        error: error instanceof Error ? error.message : String(error),
        bufferSize: data?.length || 0,
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
        
        // STRUCTURAL FIX: Do not recreate the service, just update its languages
        if (advancedFeatureService) {
          advancedFeatureService.updateLanguages(
            metadata.sourceLanguage || 'en',
            metadata.targetLanguage || 'ja'
          );
          mainLogger.info('Updated AdvancedFeatureService languages', {
            sourceLanguage: metadata.sourceLanguage || 'en',
            targetLanguage: metadata.targetLanguage || 'ja'
          });
        }
        
        // REGRESSION FIX: Do not update pipeline service languages here, as it will restart the connection.
        // The pipeline is already started with the correct languages via the startListening command.
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

  // Handle check today session (当日セッション確認)
  ipcMain.handle('check-today-session', async (_event, courseName) => {
    try {
      if (dataPersistenceService && courseName) {
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD形式
        const existingSession = await dataPersistenceService.findTodaySession(courseName, dateStr);
        
        if (existingSession) {
          mainLogger.info('Found today session', { courseName, sessionId: existingSession.sessionId });
          return {
            exists: true,
            sessionId: existingSession.sessionId,
            sessionNumber: existingSession.sessionNumber,
            folderName: existingSession.folderName
          };
        }
      }
      return { exists: false };
    } catch (error) {
      mainLogger.error('Failed to check today session', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { exists: false };
    }
  });

  // Handle get available sessions (利用可能なセッション一覧取得)
  ipcMain.handle('get-available-sessions', async (_event, params) => {
    try {
      if (!dataPersistenceService) {
        mainLogger.error('DataPersistenceService not initialized');
        return [];
      }
      
      const { courseName, limit } = params || {};
      const sessions = await dataPersistenceService.getAvailableSessions(courseName, limit);
      
      mainLogger.info('Retrieved available sessions', { count: sessions.length });
      return sessions;
    } catch (error) {
      mainLogger.error('Failed to get available sessions', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  });

  // Handle load session (セッションデータ読み込み)
  ipcMain.handle('load-session', async (_event, params) => {
    try {
      if (!dataPersistenceService) {
        mainLogger.error('DataPersistenceService not initialized');
        return null;
      }
      
      const { courseName, dateStr, sessionNumber } = params;
      const sessionData = await dataPersistenceService.loadSession(courseName, dateStr, sessionNumber);
      
      mainLogger.info('Loaded session data', { courseName, dateStr, sessionNumber });
      return sessionData;
    } catch (error) {
      mainLogger.error('Failed to load session', {
        error: error instanceof Error ? error.message : String(error),
        params
      });
      return null;
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
  
  if (advancedFeatureService) {
    // No explicit cleanup needed for AdvancedFeatureService
    advancedFeatureService = null;
  }
  
  if (dataPersistenceService) {
    dataPersistenceService.endSession().catch(error => {
      mainLogger.error('Error ending session during cleanup', error);
    });
    dataPersistenceService = null;
  }
  
  if (ipcGateway) {
    ipcGateway.destroy();
  }
  
  mainLogger.info('Cleanup completed');
}

// App event handlers
app.whenReady().then(() => {
  mainLogger.info('App whenReady triggered');
  
  // Log GPU configuration that was applied earlier
  if (process.platform === 'win32') {
    logger.info('Applied Windows GPU stability configuration');
  }
  
  // Single instance lock - 複数起動防止
  const gotTheLock = app.requestSingleInstanceLock();
  mainLogger.info('Single instance lock requested', { gotTheLock });
  
  if (!gotTheLock) {
    // 既に起動している場合は終了
    mainLogger.warn('Another instance is already running, quitting');
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

  mainLogger.info('About to call createWindow');
  createWindow();
  
  // Initialize services after window is created
  // Wait a bit to ensure window is fully ready
  setTimeout(() => {
    setupWindowControls();
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