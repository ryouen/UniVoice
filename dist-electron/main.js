"use strict";
/**
 * UniVoice Main Process - Streaming UI Optimization
 * Clean Architecture with IPC Gateway and Domain Services
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitUnified = emitUnified;
const electron_1 = require("electron");
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const gateway_1 = require("./services/ipc/gateway");
const UnifiedPipelineService_1 = require("./services/domain/UnifiedPipelineService");
const DataPersistenceService_1 = require("./services/domain/DataPersistenceService");
const AdvancedFeatureService_1 = require("./services/domain/AdvancedFeatureService");
const logger_1 = require("./utils/logger");
const textMetrics_1 = require("./utils/textMetrics");
const startup_check_1 = require("./utils/startup-check");
const WindowRegistry_1 = require("./main/WindowRegistry");
// import { devTestService } from './services/DevTestService';
const ipcEvents_1 = require("./shared/ipcEvents");
// import { UNIFIED_CHANNEL } from './shared/ipcEvents'; // Will be used in Stage 1
// Load environment variables
(0, dotenv_1.config)({ path: path_1.default.resolve(__dirname, '..', '.env'), quiet: true });
// Run startup checks (nul file cleanup, etc.)
(0, startup_check_1.runStartupChecks)();
// Watch for nul file creation in development
if (process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged) {
    (0, startup_check_1.watchForNulCreation)();
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
    electron_1.app.commandLine.appendSwitch('enable-media-stream');
    electron_1.app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
    electron_1.app.commandLine.appendSwitch('max-old-space-size', '2048');
    // Move logging after app is ready to avoid early logger issues
}
// Remove direct mainWindow variable - use windowRegistry instead
let pipelineService = null;
let advancedFeatureService = null;
let dataPersistenceService = null;
const mainLogger = logger_1.logger.child('Main');
// Get current window (setup or main)
const getMainWindow = () => WindowRegistry_1.windowRegistry.get('main') || WindowRegistry_1.windowRegistry.get('setup');
// Unified event system state
let globalSeq = 0; // Monotonic sequence counter
const ENABLE_LEGACY_CHANNELS = process.env.ENABLE_LEGACY_CHANNELS === 'true';
/**
 * Emit unified event - Stage 0 implementation
 * This is a shadow implementation that does not change current behavior
 */
function emitUnified(event) {
    const fullEvent = {
        v: 1,
        id: (0, ipcEvents_1.generateEventId)(),
        seq: globalSeq++,
        ts: Date.now(),
        ...event,
    };
    // Stage 0: Emit to shadow consumer for metrics in development only
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
        // Shadow emit for testing in development mode
        if (!electron_1.app.isPackaged || process.env.NODE_ENV === 'development') {
            const UNIFIED_CHANNEL = 'univoice:event'; // Local import to avoid unused import warning
            mainWindow.webContents.send(UNIFIED_CHANNEL, fullEvent);
        }
        try {
            if (typeof console !== 'undefined' && console.log) {
                console.log('[Main] Shadow unified event:', {
                    kind: fullEvent.kind,
                    seq: fullEvent.seq,
                    corr: fullEvent.corr
                });
            }
        }
        catch (e) {
            // Ignore console errors to prevent EPIPE
        }
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
    // プラットフォーム別の透過設定
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    // Windows 10 1803以降で透過をサポート
    let supportsTransparency = true;
    if (isWindows) {
        try {
            const release = os_1.default.release().split('.');
            const build = parseInt(release[2]) || 0;
            supportsTransparency = build >= 17134; // Windows 10 1803
        }
        catch (e) {
            supportsTransparency = false;
        }
    }
    // 共通のウィンドウオプション
    const baseOptions = {
        show: false, // Prevent flash of unstyled window
        frame: false, // フレームレスウィンドウ（全OS対応）
        transparent: supportsTransparency, // プラットフォームに応じて透過を設定
        backgroundColor: supportsTransparency ? '#01000000' : '#f0f0f0', // 1%不透明でフォーカス問題解決
        focusable: true, // 明示的にフォーカス可能に設定
        // Windows固有の設定
        ...(isWindows ? {
            type: 'normal', // toolbarではなくnormalに設定
            skipTaskbar: false,
            hasShadow: false, // 影を無効化（フォーカス問題の回避）
            // thickFrameはWindowRegistryでresizable設定に基づいて制御
            acceptFirstMouse: true, // 最初のクリックを受け入れる
            // Windows 11での透過ウィンドウのフォーカス問題を回避
            ...(supportsTransparency ? {
                backgroundMaterial: 'none'
            } : {})
        } : {}),
        // macOSでVibrancy効果
        ...(isMac ? {
            vibrancy: 'under-window',
            visualEffectState: 'active'
        } : {})
    };
    // Setup画面として起動（初期状態）
    const mainWindow = WindowRegistry_1.windowRegistry.createOrShow('setup', baseOptions);
    mainLogger.info('Setup window created via WindowRegistry');
    // Development vs Production mode
    const isDev = !electron_1.app.isPackaged;
    const testMode = false; // Window works, now try actual app
    if (testMode) {
        try {
            if (typeof console !== 'undefined' && console.log) {
                console.log('[Main] Loading test page for debugging...');
            }
        }
        catch (e) {
            // Ignore console errors to prevent EPIPE
        }
        try {
            await mainWindow.loadFile(path_1.default.join(__dirname, '../test.html'));
            mainWindow.show();
            try {
                if (typeof console !== 'undefined' && console.log) {
                    console.log('[Main] Test page loaded successfully');
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
        }
        catch (err) {
            try {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('[Main] Failed to load test page:', err);
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            mainLogger.error('Failed to load test page', { error: err });
        }
    }
    else if (isDev) {
        try {
            // Try common Vite ports
            const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182, 5183, 5190, 5195];
            let connected = false;
            for (const port of ports) {
                try {
                    try {
                        if (typeof console !== 'undefined' && console.log) {
                            console.log(`[Main] Trying to connect to dev server on port ${port}...`);
                        }
                    }
                    catch (e) {
                        // Ignore console errors to prevent EPIPE
                    }
                    await mainWindow.loadURL(`http://localhost:${port}/`);
                    mainLogger.info(`Connected to dev server on port ${port}`);
                    try {
                        if (typeof console !== 'undefined' && console.log) {
                            console.log(`[Main] Successfully connected to dev server on port ${port}`);
                        }
                    }
                    catch (e) {
                        // Ignore console errors to prevent EPIPE
                    }
                    connected = true;
                    break;
                }
                catch (err) {
                    // Try next port
                }
            }
            if (!connected) {
                throw new Error('Failed to connect to any dev server port');
            }
        }
        catch (err) {
            mainLogger.error('Failed to connect to dev server', { error: err });
            try {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('[Main] Failed to connect to dev server:', err);
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            await mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
        }
        // Show window immediately in development mode
        mainWindow.show();
    }
    else {
        try {
            if (typeof console !== 'undefined' && console.log) {
                console.log('[Main] Loading production build from:', path_1.default.join(__dirname, '../dist/index.html'));
            }
        }
        catch (e) {
            // Ignore console errors to prevent EPIPE
        }
        await mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    // Enable DevTools shortcuts
    mainWindow.webContents.on('before-input-event', (_event, input) => {
        // F12 key to toggle DevTools
        if (input.key === 'F12' && input.type === 'keyDown') {
            if (mainWindow?.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            }
            else {
                mainWindow?.webContents.openDevTools({ mode: 'detach' });
            }
        }
        // Ctrl+Shift+I alternative
        if (input.control && input.shift && input.key === 'I' && input.type === 'keyDown') {
            if (mainWindow?.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            }
            else {
                mainWindow?.webContents.openDevTools({ mode: 'detach' });
            }
        }
    });
    // Force open DevTools in development
    if (isDev || testMode) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
        mainLogger.info('DevTools enabled in detached window - Press F12 to toggle');
        // Log window bounds for debugging
        setTimeout(() => {
            const bounds = mainWindow.getBounds();
            try {
                if (typeof console !== 'undefined' && console.log) {
                    console.log('[Main] Window bounds:', bounds);
                    console.log('[Main] Window visible:', mainWindow.isVisible());
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
        }, 1000);
    }
    // Handle ready-to-show event for frameless window
    mainWindow.once('ready-to-show', () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainLogger.info('Window shown after ready-to-show');
        }
        else {
            mainLogger.error('mainWindow is null or destroyed in ready-to-show');
        }
    });
    // Remove focus event handlers completely - they may interfere with natural focus behavior
    // Transparent windows on Windows have known focus issues, and event handlers can make it worse
    // Remove leave-full-screen handler as it's not relevant for our use case
    // Note: Custom drag handlers removed - not being used by frontend
    // Electron's built-in drag behavior works well with our current setup
    mainLogger.info('createWindow completed successfully');
    // IPC Gateway and Pipeline Service are setup in app.whenReady()
    // Auto-approve media device permissions
    mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
        mainLogger.info('Permission requested', { permission });
        if (permission === 'media' || permission === 'mediaKeySystem') {
            callback(true);
        }
        else {
            callback(true); // Allow all in development
        }
    });
    mainWindow.on('closed', () => {
        cleanup();
    });
    // Add error logging for renderer process
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        try {
            if (typeof console !== 'undefined' && console.error) {
                console.error('[Main] Page failed to load:', errorCode, errorDescription);
            }
        }
        catch (e) {
            // Ignore console errors to prevent EPIPE
        }
        mainLogger.error('Page failed to load', { errorCode, errorDescription });
    });
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        try {
            if (typeof console !== 'undefined' && console.error) {
                console.error('[Main] Renderer process gone:', details);
            }
        }
        catch (e) {
            // Ignore console errors to prevent EPIPE
        }
        mainLogger.error('Renderer process gone', { details });
    });
    mainLogger.info('Setup window created successfully');
}
/**
 * Setup window control handlers for frameless window
 */
function setupWindowControls() {
    // Window minimize
    electron_1.ipcMain.handle('window:minimize', async () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.minimize();
        }
    });
    // Window maximize
    electron_1.ipcMain.handle('window:maximize', async () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.maximize();
        }
    });
    // Window unmaximize
    electron_1.ipcMain.handle('window:unmaximize', async () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.unmaximize();
        }
    });
    // Window close
    electron_1.ipcMain.handle('window:close', async (event) => {
        const mainWindow = getMainWindow();
        // Check if the request is from summary window
        const summaryWindow = WindowRegistry_1.windowRegistry.get('summary');
        if (summaryWindow && !summaryWindow.isDestroyed() && event.sender.id === summaryWindow.webContents.id) {
            // Hide summary window instead of closing
            summaryWindow.hide();
            // Notify main window about state change
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('window-state-changed', {
                    type: 'summary',
                    isVisible: false
                });
            }
            return;
        }
        // Check if the request is from history window
        const historyWindow = WindowRegistry_1.windowRegistry.get('history');
        if (historyWindow && !historyWindow.isDestroyed() && event.sender.id === historyWindow.webContents.id) {
            // Hide history window instead of closing
            historyWindow.hide();
            // Notify main window about state change
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('window-state-changed', {
                    type: 'history',
                    isVisible: false
                });
            }
            return;
        }
        // Otherwise, close the main window
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.close();
        }
    });
    // Check if window is maximized
    electron_1.ipcMain.handle('window:isMaximized', async () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            return mainWindow.isMaximized();
        }
        return false;
    });
    // Update title bar theme
    electron_1.ipcMain.handle('window:updateTheme', async (_event, theme) => {
        // Theme is handled in renderer process
        mainLogger.info('Theme update requested', theme);
    });
    // Set always on top
    electron_1.ipcMain.handle('window:setAlwaysOnTop', async (_event, alwaysOnTop) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (alwaysOnTop) {
                // Windows specific: Use 'floating' level for better focus behavior
                // 'floating' allows other windows to receive focus while keeping this window on top
                if (process.platform === 'win32') {
                    // Use 'normal' level for better focus behavior on Windows
                    // Based on recent Electron behavior, 'normal' works better than 'floating'
                    mainWindow.setAlwaysOnTop(true, 'normal');
                    // Ensure window remains in taskbar
                    mainWindow.setSkipTaskbar(false);
                    // Allow the window to lose focus
                    mainWindow.setFocusable(true);
                }
                else {
                    // Keep 'floating' for other platforms
                    mainWindow.setAlwaysOnTop(true, 'floating');
                }
            }
            else {
                mainWindow.setAlwaysOnTop(false);
                mainWindow.setFocusable(true);
                // Keep the window in front when disabling always-on-top
                // This prevents the window from going behind other windows
                if (process.platform === 'win32') {
                    // Briefly re-focus the window to maintain z-order
                    mainWindow.moveTop();
                    mainWindow.focus();
                }
            }
            return mainWindow.isAlwaysOnTop();
        }
        return false;
    });
    // Check if always on top
    electron_1.ipcMain.handle('window:isAlwaysOnTop', async () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            return mainWindow.isAlwaysOnTop();
        }
        return false;
    });
    // Auto resize window to content height - COMPLETELY DISABLED
    electron_1.ipcMain.handle('window:autoResize', async () => {
        // This API is completely disabled to prevent infinite loops
        // Window sizes are managed by WindowRegistry defaults
        // Do not log to prevent log spam
        return false;
    });
    // Window bounds setter for Setup screen
    electron_1.ipcMain.handle('window:setBounds', async (_event, bounds) => {
        const currentWindow = WindowRegistry_1.windowRegistry.get('setup') || WindowRegistry_1.windowRegistry.get('main');
        if (currentWindow && !currentWindow.isDestroyed()) {
            currentWindow.setBounds({
                ...currentWindow.getBounds(),
                width: bounds.width,
                height: bounds.height
            });
        }
        return;
    });
    // NEW: Window management IPC handlers
    // Setup window size fitting
    electron_1.ipcMain.handle('window:setSetupBounds', async (_event, width, height) => {
        // Disable dynamic resizing to prevent infinite loops
        mainLogger.warn('window:setSetupBounds called - This API is disabled', {
            requestedWidth: width,
            requestedHeight: height
        });
        // Use fixed size defined in WindowRegistry instead
        return true;
    });
    // Transition from Setup to Main
    electron_1.ipcMain.handle('window:enterMain', async () => {
        mainLogger.info('[window:enterMain] Transitioning from Setup to Main');
        // WindowRegistryでSetup画面をMain画面として再利用
        WindowRegistry_1.windowRegistry.reuseSetupAsMain();
        const mainWindow = WindowRegistry_1.windowRegistry.get('main');
        if (mainWindow && !mainWindow.isDestroyed()) {
            // URLベースのルーティングは使用せず、
            // レンダラープロセス側でshowSetupフラグによる画面切り替えのみ行う
            mainLogger.info('[window:enterMain] Window transitioned to main role');
            // ウィンドウサイズをMain画面用に調整
            mainWindow.setBounds({
                width: 1200,
                height: 800,
                x: mainWindow.getBounds().x,
                y: mainWindow.getBounds().y
            });
            // タイトルをMain用に変更
            mainWindow.setTitle('UniVoice');
        }
        else {
            mainLogger.error('[window:enterMain] Main window not available');
        }
        return true;
    });
    // Toggle history window
    electron_1.ipcMain.handle('window:toggleHistory', async () => {
        const isVisible = WindowRegistry_1.windowRegistry.toggleHistory();
        return isVisible;
    });
    // Toggle summary window
    electron_1.ipcMain.handle('window:toggleSummary', async () => {
        const isVisible = WindowRegistry_1.windowRegistry.toggleSummary();
        return isVisible;
    });
    // Global settings update handler - forwards settings to all windows
    electron_1.ipcMain.on('settings-updated', (_event, settings) => {
        mainLogger.info('[settings-updated] Broadcasting settings to all windows', settings);
        // Get all windows and send settings update to each
        const allWindows = ['main', 'setup', 'history', 'summary'];
        allWindows.forEach(windowName => {
            const window = WindowRegistry_1.windowRegistry.get(windowName);
            if (window && !window.isDestroyed() && window.webContents.id !== _event.sender.id) {
                // Don't send back to the sender window
                window.webContents.send('settings-updated', settings);
            }
        });
    });
    // Open summary window
    electron_1.ipcMain.on('open-summary-window', async (_event, data) => {
        console.log('[Main] Received open-summary-window event');
        mainLogger.info('[open-summary-window] Opening summary window', {
            summaryCount: data.summaries?.length,
            settings: data.settings
        });
        try {
            // Create or show summary window
            const summaryWindow = WindowRegistry_1.windowRegistry.createOrShow('summary', {
                width: 1000,
                height: 700,
                minWidth: 600,
                minHeight: 400,
                title: 'プログレッシブ要約 - UniVoice'
            });
            // Check if URL needs to be loaded
            const url = WindowRegistry_1.windowRegistry.resolveUrl('#/summary');
            const currentUrl = summaryWindow.webContents.getURL();
            if (!currentUrl || !currentUrl.includes('#/summary')) {
                // Load summary window route if not already loaded
                await summaryWindow.loadURL(url);
                // Send initial data after page is loaded
                summaryWindow.webContents.once('did-finish-load', () => {
                    console.log('[Main] Summary window loaded, sending data');
                    summaryWindow.webContents.send('summary-window-data', data);
                });
            }
            else {
                // Window already loaded, send data immediately
                console.log('[Main] Summary window already loaded, sending data');
                summaryWindow.webContents.send('summary-window-data', data);
            }
            // Show window
            summaryWindow.show();
            summaryWindow.focus();
            // Note: settings-updated handler is registered globally in setupWindowControls
        }
        catch (error) {
            mainLogger.error('[open-summary-window] Failed to open summary window', error);
        }
    });
    mainLogger.info('Window controls setup completed');
}
/**
 * Setup IPC Gateway and handlers
 */
function setupIPCGateway() {
    // Handle commands from renderer
    electron_1.ipcMain.handle('univoice:command', async (_event, command) => {
        const startTime = Date.now();
        try {
            try {
                if (typeof console !== 'undefined' && console.log) {
                    console.log('[Main] Received command:', JSON.stringify(command, null, 2));
                    console.log('[Main] Command type:', command?.command);
                    console.log('[Main] Command params:', JSON.stringify(command?.params, null, 2));
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            // Special handling for getFullHistory command
            if (command?.command === 'getFullHistory') {
                if (advancedFeatureService) {
                    const translations = advancedFeatureService.getAllTranslations();
                    const data = {
                        entries: translations.map((t) => ({
                            id: t.id,
                            original: t.sourceText,
                            translation: t.targetText,
                            timestamp: t.timestamp
                        })),
                        metadata: {
                            totalSegments: translations.length,
                            totalSentences: translations.length,
                            totalWords: translations.reduce((sum, t) => sum + t.sourceText.split(' ').length, 0),
                            duration: translations.length > 0
                                ? Date.now() - translations[0].timestamp
                                : 0,
                            startTime: translations.length > 0 ? translations[0].timestamp : Date.now(),
                            endTime: Date.now()
                        }
                    };
                    return { success: true, data };
                }
                return { success: false, error: 'AdvancedFeatureService not initialized' };
            }
            await gateway_1.ipcGateway.handleCommand(command);
            mainLogger.performance('info', 'IPC command handled', startTime, {
                command: command?.command,
            });
            try {
                if (typeof console !== 'undefined' && console.log) {
                    console.log('[Main] Command handled successfully');
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            return { success: true };
        }
        catch (error) {
            try {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('[Main] Command failed:', error);
                    console.error('[Main] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
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
    // Handle getFullHistory directly
    electron_1.ipcMain.handle('univoice:getFullHistory', async () => {
        try {
            // Get persisted history data
            let historyData = {
                blocks: [],
                entries: [],
                metadata: {
                    totalSegments: 0,
                    totalSentences: 0,
                    totalWords: 0,
                    duration: 0,
                    startTime: undefined,
                    endTime: undefined
                }
            };
            if (dataPersistenceService) {
                historyData = await dataPersistenceService.getFullHistory();
            }
            // Get current session translations from AdvancedFeatureService
            if (advancedFeatureService) {
                const currentTranslations = advancedFeatureService.getAllTranslations();
                // Convert translations to history entries format
                const currentEntries = currentTranslations.map(translation => ({
                    id: translation.id,
                    sourceText: translation.sourceText,
                    targetText: translation.targetText,
                    timestamp: translation.timestamp
                }));
                // Merge current session data with persisted data
                const allEntries = [...historyData.entries, ...currentEntries];
                return {
                    blocks: historyData.blocks,
                    entries: allEntries,
                    metadata: {
                        totalSegments: historyData.metadata.totalSegments + currentTranslations.length,
                        totalSentences: historyData.metadata.totalSentences + currentTranslations.length,
                        totalWords: historyData.metadata.totalWords +
                            currentTranslations.reduce((sum, t) => sum + (0, textMetrics_1.countWords)(t.sourceText, 'multi'), 0),
                        duration: historyData.metadata.duration,
                        startTime: historyData.metadata.startTime,
                        endTime: Date.now()
                    }
                };
            }
            return historyData;
        }
        catch (error) {
            mainLogger.error('Failed to get full history', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    });
    // Forward pipeline events to renderer
    gateway_1.ipcGateway.on('pipelineEvent', (event) => {
        try {
            if (typeof console !== 'undefined' && console.log) {
                console.log('[Main] Forwarding pipeline event to renderer:', event.type);
            }
        }
        catch (e) {
            // Ignore console errors to prevent EPIPE
        }
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('univoice:event', event);
        }
        else {
            try {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('[Main] Cannot forward event - mainWindow not available');
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
        }
    });
    // Handle domain commands - Route to pipeline service
    gateway_1.ipcGateway.on('domain-command', async (domainCommand) => {
        mainLogger.info('Domain command received', {
            type: domainCommand.type,
            correlationId: domainCommand.correlationId,
        });
        if (!pipelineService) {
            try {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('[Main] Pipeline service not initialized!');
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            mainLogger.error('Pipeline service not initialized');
            return;
        }
        try {
            if (typeof console !== 'undefined' && console.log) {
                console.log('[Main] Pipeline service is initialized:', !!pipelineService);
            }
        }
        catch (e) {
            // Ignore console errors to prevent EPIPE
        }
        try {
            switch (domainCommand.type) {
                case 'startListening':
                    try {
                        if (typeof console !== 'undefined' && console.log) {
                            console.log('[Main] Starting listening with params:', domainCommand.params);
                        }
                    }
                    catch (e) {
                        // Ignore console errors to prevent EPIPE
                    }
                    mainLogger.info('Starting listening', domainCommand.params);
                    await pipelineService.startListening(domainCommand.params.sourceLanguage, domainCommand.params.targetLanguage, domainCommand.correlationId);
                    // Start AdvancedFeatureService with the same correlation ID and languages
                    if (advancedFeatureService) {
                        advancedFeatureService.start(domainCommand.correlationId, domainCommand.params.sourceLanguage, domainCommand.params.targetLanguage);
                        mainLogger.info('AdvancedFeatureService started', {
                            correlationId: domainCommand.correlationId,
                            sourceLanguage: domainCommand.params.sourceLanguage,
                            targetLanguage: domainCommand.params.targetLanguage
                        });
                    }
                    else {
                        mainLogger.error('AdvancedFeatureService not initialized');
                    }
                    try {
                        if (typeof console !== 'undefined' && console.log) {
                            console.log('[Main] Started listening successfully');
                        }
                    }
                    catch (e) {
                        // Ignore console errors to prevent EPIPE
                    }
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
                    try {
                        if (typeof console !== 'undefined' && console.log) {
                            console.log('[Main] Generating vocabulary for correlation:', domainCommand.correlationId);
                        }
                    }
                    catch (e) {
                        // Ignore console errors to prevent EPIPE
                    }
                    if (advancedFeatureService) {
                        await advancedFeatureService.generateVocabulary();
                        mainLogger.info('Vocabulary generation triggered');
                    }
                    else {
                        mainLogger.error('AdvancedFeatureService not initialized for vocabulary generation');
                    }
                    break;
                case 'generateFinalReport':
                    try {
                        if (typeof console !== 'undefined' && console.log) {
                            console.log('[Main] Generating final report for correlation:', domainCommand.correlationId);
                        }
                    }
                    catch (e) {
                        // Ignore console errors to prevent EPIPE
                    }
                    if (advancedFeatureService) {
                        await advancedFeatureService.generateFinalReport();
                        mainLogger.info('Final report generation triggered');
                    }
                    else {
                        mainLogger.error('AdvancedFeatureService not initialized for report generation');
                    }
                    break;
                case 'startSession':
                    if (dataPersistenceService) {
                        const sessionMetadata = {
                            courseName: domainCommand.params.courseName,
                            startTime: Date.now(),
                            sourceLanguage: domainCommand.params.sourceLanguage,
                            targetLanguage: domainCommand.params.targetLanguage,
                            sessionNumber: domainCommand.params.sessionNumber || 1
                        };
                        await dataPersistenceService.startSession(sessionMetadata);
                        mainLogger.info('New session started', { sessionMetadata });
                    }
                    else {
                        mainLogger.error('DataPersistenceService not initialized');
                    }
                    break;
                case 'saveHistoryBlock':
                    if (dataPersistenceService) {
                        await dataPersistenceService.addHistoryBlock(domainCommand.params.block);
                        mainLogger.info('History block saved', { blockId: domainCommand.params.block.id });
                    }
                    else {
                        mainLogger.error('DataPersistenceService not initialized');
                    }
                    break;
                case 'saveSummary':
                    if (dataPersistenceService) {
                        await dataPersistenceService.addSummary(domainCommand.params.summary);
                        mainLogger.info('Summary saved', { summaryId: domainCommand.params.summary.id });
                    }
                    else {
                        mainLogger.error('DataPersistenceService not initialized');
                    }
                    break;
                case 'saveSession':
                    if (dataPersistenceService) {
                        await dataPersistenceService.saveSession();
                        mainLogger.info('Session saved to disk');
                    }
                    else {
                        mainLogger.error('DataPersistenceService not initialized');
                    }
                    break;
                case 'translateParagraph':
                    if (pipelineService) {
                        // パラグラフの再翻訳を実行
                        await pipelineService.translateParagraph(domainCommand.params.paragraphId, domainCommand.params.sourceText, domainCommand.params.sourceLanguage, domainCommand.params.targetLanguage, domainCommand.correlationId);
                        mainLogger.info('Paragraph translation requested', {
                            paragraphId: domainCommand.params.paragraphId
                        });
                    }
                    else {
                        mainLogger.error('PipelineService not initialized');
                    }
                    break;
                default:
                    mainLogger.warn('Unknown domain command', { domainCommand });
            }
        }
        catch (error) {
            mainLogger.error('Domain command failed', {
                error: error instanceof Error ? error.message : String(error),
                domainCommand,
            });
        }
    });
    // Window control handlers are already registered in setupWindowControls()
    // Do not duplicate them here to avoid the "second handler" error
    mainLogger.info('Window control handlers already registered in setupWindowControls()');
    // Session management handlers
    electron_1.ipcMain.handle('check-today-session', async (_event, courseName) => {
        try {
            if (!dataPersistenceService) {
                mainLogger.error('DataPersistenceService not initialized');
                return { exists: false };
            }
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const result = await dataPersistenceService.checkTodaySession(courseName);
            mainLogger.info('Checked today session', { courseName, today, result });
            return result;
        }
        catch (error) {
            mainLogger.error('Failed to check today session', { error });
            return { exists: false };
        }
    });
    electron_1.ipcMain.handle('get-available-sessions', async (_event, options) => {
        try {
            if (!dataPersistenceService) {
                mainLogger.error('DataPersistenceService not initialized');
                return [];
            }
            const sessions = await dataPersistenceService.getAvailableSessions(undefined, options.limit || 100);
            mainLogger.info('Retrieved available sessions', { count: sessions.length });
            return sessions;
        }
        catch (error) {
            mainLogger.error('Failed to get available sessions', { error });
            return [];
        }
    });
    electron_1.ipcMain.handle('load-session', async (_event, params) => {
        try {
            if (!dataPersistenceService) {
                mainLogger.error('DataPersistenceService not initialized');
                return null;
            }
            const sessionData = await dataPersistenceService.loadSession(params.courseName, params.dateStr, params.sessionNumber);
            mainLogger.info('Loaded session data', { params, hasData: !!sessionData });
            return sessionData;
        }
        catch (error) {
            mainLogger.error('Failed to load session', { error, params });
            return null;
        }
    });
    mainLogger.info('IPC Gateway setup completed');
    try {
        if (typeof console !== 'undefined' && console.log) {
            console.log('[Main] IPC Gateway setup completed - handlers registered');
        }
    }
    catch (e) {
        // Ignore console errors to prevent EPIPE
    }
}
/**
 * Setup Pipeline Service
 */
function setupPipelineService() {
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
            translate: process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano', // 絶対変更禁止
            summary: process.env.OPENAI_MODEL_SUMMARY || 'gpt-5-mini', // 絶対変更禁止
            summaryTranslate: process.env.OPENAI_MODEL_SUMMARY_TRANSLATE || 'gpt-5-nano', // 絶対変更禁止
            userTranslate: process.env.OPENAI_MODEL_USER_TRANSLATE || 'gpt-5-nano', // 絶対変更禁止
            vocabulary: process.env.OPENAI_MODEL_VOCABULARY || 'gpt-5-mini', // 絶対変更禁止
            report: process.env.OPENAI_MODEL_REPORT || 'gpt-5' // 絶対変更禁止
        },
        maxTokens: {
            translate: parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500'),
            summary: parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500'),
            vocabulary: parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500'),
            report: parseInt(process.env.OPENAI_REPORT_MAX_TOKENS || '8192')
        }
    };
    pipelineService = new UnifiedPipelineService_1.UnifiedPipelineService(audioConfig, deepgramConfig, openaiConfig);
    dataPersistenceService = new DataPersistenceService_1.DataPersistenceService();
    // Initialize AdvancedFeatureService
    advancedFeatureService = new AdvancedFeatureService_1.AdvancedFeatureService({
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
        targetLanguage: 'ja' // Will be updated when session starts
    });
    // Forward AdvancedFeatureService events to renderer
    advancedFeatureService.on('progressiveSummary', (summary) => {
        mainLogger.info('Progressive summary generated', {
            threshold: summary.threshold,
            summaryLength: summary.data?.sourceText?.length
        });
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('progressive-summary', summary);
        }
        // Also send to summary window if it's open
        const summaryWindow = WindowRegistry_1.windowRegistry.get('summary');
        if (summaryWindow && !summaryWindow.isDestroyed() && summaryWindow.isVisible()) {
            summaryWindow.webContents.send('summary-data-update', {
                summaries: [summary],
                settings: {} // Settings are already synchronized
            });
        }
    });
    advancedFeatureService.on('summaryGenerated', (summary) => {
        mainLogger.info('Summary generated', {
            wordCount: summary.data?.wordCount,
            summaryLength: summary.data?.sourceText?.length
        });
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('summary', summary);
        }
    });
    advancedFeatureService.on('vocabularyGenerated', (vocabulary) => {
        mainLogger.info('Vocabulary generated', { itemCount: vocabulary.data?.items?.length });
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('vocabulary-generated', vocabulary);
        }
    });
    advancedFeatureService.on('finalReportGenerated', (report) => {
        mainLogger.info('Final report generated', { reportLength: report.data?.report?.length });
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('final-report-generated', report);
        }
    });
    advancedFeatureService.on('error', (error) => {
        mainLogger.error('AdvancedFeatureService error', error);
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('advanced-feature-error', error.message || String(error));
        }
    });
    // Forward pipeline events to IPC Gateway
    pipelineService.on('pipelineEvent', (event) => {
        try {
            if (typeof console !== 'undefined' && console.log) {
                console.log('[Main] Pipeline event received from service:', event.type);
            }
        }
        catch (e) {
            // Ignore console errors to prevent EPIPE
        }
        gateway_1.ipcGateway.emitEvent(event);
        // Forward combinedSentence events to AdvancedFeatureService for summary generation
        if (event.type === 'combinedSentence' && advancedFeatureService) {
            const { combinedId, sourceText, targetText, timestamp } = event.data;
            mainLogger.info('Forwarding combined sentence to AdvancedFeatureService', {
                combinedId,
                sourceTextLength: sourceText?.length,
                hasTranslation: !!targetText
            });
            // Add translation to AdvancedFeatureService for word counting and summary generation
            advancedFeatureService.addTranslation({
                id: combinedId,
                sourceText: sourceText || '',
                targetText: targetText || '',
                timestamp: timestamp || Date.now()
            });
        }
        // Forward translation events to AdvancedFeatureService
        if (event.type === 'translation' && advancedFeatureService) {
            // For segment translations, check if this is a history translation
            if (event.data.segmentId && event.data.segmentId.startsWith('history_')) {
                const baseId = event.data.segmentId.replace('history_', '');
                mainLogger.info('Updating history translation in AdvancedFeatureService', {
                    baseId,
                    hasTranslation: !!event.data.translatedText
                });
                // Update existing translation with high-quality translation
                advancedFeatureService.updateTranslation(baseId, event.data.translatedText || '');
            }
        }
    });
    // 親フォルダ仕様: 直接イベントの転送
    pipelineService.on('currentOriginalUpdate', (data) => {
        mainLogger.debug('currentOriginalUpdate event', data);
        // メインウィンドウに直接送信 - ハイフン版のチャンネル名を使用
        const mainWindow = getMainWindow();
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
        const mainWindow = getMainWindow();
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
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('translation-complete', data);
        }
        // Also send to history window if it's open
        const historyWindow = WindowRegistry_1.windowRegistry.get('history');
        if (historyWindow && !historyWindow.isDestroyed() && historyWindow.isVisible()) {
            historyWindow.webContents.send('translation-complete', data);
        }
        // Stage 0: Shadow unified event
        emitUnified({
            kind: 'translation_complete',
            corr: data.correlationId,
            payload: data
        });
        // Forward to AdvancedFeatureService
        if (advancedFeatureService && data.sourceText && data.targetText) {
            advancedFeatureService.addTranslation({
                id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                sourceText: data.sourceText,
                targetText: data.targetText,
                timestamp: Date.now()
            });
            mainLogger.debug('Translation forwarded to AdvancedFeatureService', {
                sourceTextLength: data.sourceText.length,
                targetTextLength: data.targetText.length,
                sourceLanguage: data.sourceLanguage,
                targetLanguage: data.targetLanguage
            });
        }
        else {
            mainLogger.warn('Translation not forwarded to AdvancedFeatureService', {
                hasService: !!advancedFeatureService,
                hasOriginal: !!data.original,
                hasJapanese: !!data.japanese,
                dataKeys: Object.keys(data || {})
            });
        }
    });
    pipelineService.on('started', async () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('pipeline:started');
        }
        // Start AdvancedFeatureService with the current session
        if (advancedFeatureService) {
            // Get correlation ID from the current pipeline session
            const correlationId = `main-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // Get languages from the pipeline configuration (will be updated by session-metadata-update)
            const sourceLanguage = 'en'; // Default, will be updated
            const targetLanguage = 'ja'; // Default, will be updated
            advancedFeatureService.start(correlationId, sourceLanguage, targetLanguage);
            mainLogger.info('AdvancedFeatureService started', { correlationId, sourceLanguage, targetLanguage });
        }
        // データ永続化サービスの開始は、session-metadata-updateイベントで行うため、ここでは何もしない
        // セッション情報はフロントエンドから受け取るのを待つ
    });
    pipelineService.on('stopped', async () => {
        const mainWindow = getMainWindow();
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
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('pipeline:deepgramConnected');
        }
    });
    pipelineService.on('summaryGenerated', (data) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('summary-generated', data);
        }
    });
    pipelineService.on('userTranslation', (data) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('user-translation', data);
        }
    });
    pipelineService.on('finalReport', (report) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('final-report', report);
        }
    });
    pipelineService.on('error', (error) => {
        mainLogger.error('Pipeline error', error);
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('pipeline:error', error.message || String(error));
        }
    });
    pipelineService.on('audioProgress', (data) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('audio-progress', data);
        }
    });
    // Handle audio chunks from renderer
    electron_1.ipcMain.on('audio-chunk', (_event, data) => {
        try {
            // IPC serialization converts Buffer to {type: 'Buffer', data: number[]}
            // We need to reconstruct the Buffer
            let buffer;
            if (Buffer.isBuffer(data)) {
                buffer = data;
            }
            else if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
                // Reconstruct Buffer from serialized form
                buffer = Buffer.from(data.data);
            }
            else if (data && data.data) {
                // Try to create Buffer from data property
                buffer = Buffer.from(data.data);
            }
            else if (data instanceof Uint8Array) {
                // Direct Uint8Array
                buffer = Buffer.from(data);
            }
            else if (data instanceof ArrayBuffer) {
                // Direct ArrayBuffer
                buffer = Buffer.from(data);
            }
            else if (ArrayBuffer.isView(data)) {
                // Other TypedArrays (Int16Array, etc.)
                buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
            }
            else {
                return;
            }
            if (pipelineService && buffer && buffer.length > 0) {
                pipelineService.sendAudioChunk(buffer);
            }
        }
        catch (error) {
            mainLogger.error('Audio chunk processing failed', {
                error: error instanceof Error ? error.message : String(error),
                bufferSize: data?.length || 0,
            });
        }
    });
    // Handle history block from renderer (from FlexibleHistoryGrouper)
    electron_1.ipcMain.on('history-block-created', async (_event, block) => {
        try {
            if (dataPersistenceService && block) {
                await dataPersistenceService.addHistoryBlock(block);
                mainLogger.debug('History block added to persistence', { blockId: block.id });
            }
        }
        catch (error) {
            mainLogger.error('Failed to save history block', {
                error: error instanceof Error ? error.message : String(error),
                blockId: block?.id
            });
        }
    });
    // Handle summary from renderer
    electron_1.ipcMain.on('summary-created', async (_event, summary) => {
        try {
            if (dataPersistenceService && summary) {
                await dataPersistenceService.addSummary(summary);
                mainLogger.debug('Summary added to persistence', { summaryId: summary.id });
            }
        }
        catch (error) {
            mainLogger.error('Failed to save summary', {
                error: error instanceof Error ? error.message : String(error),
                summaryId: summary?.id
            });
        }
    });
    // Handle session metadata update
    electron_1.ipcMain.on('session-metadata-update', async (_event, metadata) => {
        try {
            // DEEP-THINK: className検証を強化
            if (!metadata) {
                mainLogger.error('session-metadata-update received with no metadata');
                return;
            }
            if (!metadata.className || metadata.className.trim() === '') {
                mainLogger.error('session-metadata-update received with empty className', { metadata });
                return;
            }
            if (!dataPersistenceService) {
                mainLogger.error('DataPersistenceService not initialized');
                return;
            }
            // 新規セッション開始（endSessionは呼ばない - 同日再開のため）
            const sessionId = await dataPersistenceService.startSession({
                courseName: metadata.className,
                sourceLanguage: metadata.sourceLanguage || 'en',
                targetLanguage: metadata.targetLanguage || 'ja'
            });
            // startSessionが内部で自動保存を開始するので、ここでは不要
            mainLogger.info('Session started', {
                className: metadata.className,
                sessionId,
                sourceLanguage: metadata.sourceLanguage,
                targetLanguage: metadata.targetLanguage
            });
            // STRUCTURAL FIX: Do not recreate the service, just update its languages
            if (advancedFeatureService) {
                advancedFeatureService.updateLanguages(metadata.sourceLanguage || 'en', metadata.targetLanguage || 'ja');
                mainLogger.info('Updated AdvancedFeatureService languages', {
                    sourceLanguage: metadata.sourceLanguage || 'en',
                    targetLanguage: metadata.targetLanguage || 'ja'
                });
            }
            // REGRESSION FIX: Do not update pipeline service languages here, as it will restart the connection.
            // The pipeline is already started with the correct languages via the startListening command.
        }
        catch (error) {
            mainLogger.error('Failed to start session', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
    // Handle session end (授業終了ボタン)
    electron_1.ipcMain.on('session-end', async (_event) => {
        try {
            if (dataPersistenceService) {
                await dataPersistenceService.endSession();
                mainLogger.info('Session ended successfully');
            }
        }
        catch (error) {
            mainLogger.error('Failed to end session', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
    // getFullHistory command is now handled in the main IPC gateway via domain commands
    // Handle next class (次の授業へボタン)
    electron_1.ipcMain.on('next-class', async (_event) => {
        try {
            if (dataPersistenceService) {
                // 現在のセッションを正しく終了
                await dataPersistenceService.endSession();
                mainLogger.info('Session ended for next class');
            }
        }
        catch (error) {
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
function cleanup() {
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
    if (gateway_1.ipcGateway) {
        gateway_1.ipcGateway.destroy();
    }
    // Close all windows via WindowRegistry
    WindowRegistry_1.windowRegistry.closeAll();
    mainLogger.info('Cleanup completed');
}
// App event handlers
electron_1.app.whenReady().then(() => {
    mainLogger.info('App whenReady triggered');
    // Log GPU configuration that was applied earlier
    if (process.platform === 'win32') {
        logger_1.logger.info('Applied Windows GPU stability configuration');
    }
    // Single instance lock - 複数起動防止
    const gotTheLock = electron_1.app.requestSingleInstanceLock();
    mainLogger.info('Single instance lock requested', { gotTheLock });
    if (!gotTheLock) {
        // 既に起動している場合は終了
        mainLogger.warn('Another instance is already running, quitting');
        electron_1.app.quit();
        return;
    }
    electron_1.app.on('second-instance', () => {
        // 別のインスタンスが起動しようとした場合、既存のウィンドウをフォーカス
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
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
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
    mainLogger.info('App ready and window created');
});
electron_1.app.on('window-all-closed', async () => {
    cleanup();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
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
