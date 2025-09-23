"use strict";
/**
 * UniVoice Preload Script - Type-safe IPC Bridge
 * Provides secure, type-safe communication between renderer and main process
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const ipcEvents_1 = require("./shared/ipcEvents");
/**
 * Create type-safe command sender
 */
function createCommandSender() {
    const sendCommand = async (command) => {
        try {
            const result = await electron_1.ipcRenderer.invoke('univoice:command', command);
            return result;
        }
        catch (error) {
            try {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('[UniVoice Preload] Command failed:', error);
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    };
    return {
        startListening: (params) => sendCommand({ command: 'startListening', params }),
        stopListening: (params) => sendCommand({ command: 'stopListening', params }),
        getHistory: (params = { limit: 100, offset: 0 }) => sendCommand({ command: 'getHistory', params }),
        getFullHistory: async () => {
            try {
                // Use direct IPC invoke for getFullHistory
                const result = await electron_1.ipcRenderer.invoke('univoice:getFullHistory');
                return result;
            }
            catch (error) {
                console.error('[Preload] getFullHistory error:', error);
                return null;
            }
        },
        clearHistory: () => sendCommand({ command: 'clearHistory', params: {} }),
        generateVocabulary: (params) => sendCommand({ command: 'generateVocabulary', params }),
        generateFinalReport: (params) => sendCommand({ command: 'generateFinalReport', params })
    };
}
/**
 * Create type-safe event listeners
 */
function createEventListeners() {
    const addEventListener = (callback, filter) => {
        const listener = (_, event) => {
            try {
                if (!filter || filter(event)) {
                    callback(event);
                }
            }
            catch (error) {
                try {
                    if (typeof console !== 'undefined' && console.error) {
                        console.error('[UniVoice Preload] Event listener error:', error);
                    }
                }
                catch (e) {
                    // Ignore console errors to prevent EPIPE
                }
            }
        };
        electron_1.ipcRenderer.on('univoice:event', listener);
        // Return cleanup function
        return () => {
            electron_1.ipcRenderer.removeListener('univoice:event', listener);
        };
    };
    return {
        onPipelineEvent: (callback) => addEventListener(callback),
        onASREvent: (callback) => addEventListener(callback, (event) => event.type === 'asr'),
        onTranslationEvent: (callback) => addEventListener(callback, (event) => event.type === 'translation'),
        onSegmentEvent: (callback) => addEventListener(callback, (event) => event.type === 'segment'),
        onErrorEvent: (callback) => addEventListener(callback, (event) => event.type === 'error'),
        onStatusEvent: (callback) => addEventListener(callback, (event) => event.type === 'status')
    };
}
/**
 * Create unified event listener (Stage 0 - Shadow implementation)
 */
function createUnifiedEventListener() {
    // Only enable in development for testing
    // Note: process.env.NODE_ENV may be undefined in production builds
    const isDevelopment = process.env?.NODE_ENV === 'development' || false;
    if (!isDevelopment) {
        return {};
    }
    return {
        onUnifiedEvent: (callback) => {
            const handler = (_, data) => {
                // Basic validation for safety (Stage 0 - no Zod schema yet)
                if (!data || typeof data !== 'object' ||
                    !data.v || !data.id || typeof data.seq !== 'number' ||
                    typeof data.ts !== 'number' || !data.kind) {
                    try {
                        if (typeof console !== 'undefined' && console.warn) {
                            console.warn('[Preload] UnifiedEvent invalid format:', data);
                        }
                    }
                    catch (e) {
                        // Ignore console errors to prevent EPIPE
                    }
                    return;
                }
                callback(data);
            };
            electron_1.ipcRenderer.on(ipcEvents_1.UNIFIED_CHANNEL, handler);
            return () => electron_1.ipcRenderer.removeListener(ipcEvents_1.UNIFIED_CHANNEL, handler);
        }
    };
}
/**
 * Create window control API
 */
function createWindowAPI() {
    return {
        minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
        maximize: () => electron_1.ipcRenderer.invoke('window:maximize'),
        unmaximize: () => electron_1.ipcRenderer.invoke('window:unmaximize'),
        close: () => electron_1.ipcRenderer.invoke('window:close'),
        isMaximized: () => electron_1.ipcRenderer.invoke('window:isMaximized'),
        updateTheme: (theme) => electron_1.ipcRenderer.invoke('window:updateTheme', theme),
        setAlwaysOnTop: (alwaysOnTop) => electron_1.ipcRenderer.invoke('window:setAlwaysOnTop', alwaysOnTop),
        isAlwaysOnTop: () => electron_1.ipcRenderer.invoke('window:isAlwaysOnTop'),
        autoResize: (height) => electron_1.ipcRenderer.invoke('window:autoResize', height),
        setBounds: (bounds) => electron_1.ipcRenderer.invoke('window:setBounds', bounds),
        // Custom drag handlers for focus issue fix
        startDrag: () => electron_1.ipcRenderer.send('window:startDrag'),
        endDrag: () => electron_1.ipcRenderer.send('window:endDrag')
    };
}
/**
 * Create window manager API
 */
function createWindowManagerAPI() {
    return {
        // Setup window controls
        measureSetupContent: () => {
            // DISABLED: Dynamic content measurement causes resize loops
            // Return fixed size to prevent any resize attempts
            return { width: 600, height: 800 };
        },
        setSetupBounds: (width, height) => electron_1.ipcRenderer.invoke('window:setSetupBounds', width, height),
        enterMain: () => electron_1.ipcRenderer.invoke('window:enterMain'),
        // Panel window controls
        toggleHistory: () => electron_1.ipcRenderer.invoke('window:toggleHistory'),
        toggleSummary: () => electron_1.ipcRenderer.invoke('window:toggleSummary')
    };
}
/**
 * Utility functions
 */
function createUtilities() {
    return {
        generateCorrelationId: () => {
            return `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        },
        // Development only debug methods
        // Note: process.env.NODE_ENV may be undefined in production builds
        ...(process.env?.NODE_ENV === 'development' ? {
            getDebugInfo: async () => {
                try {
                    return await electron_1.ipcRenderer.invoke('univoice:debug');
                }
                catch (error) {
                    try {
                        if (typeof console !== 'undefined' && console.warn) {
                            console.warn('[UniVoice Preload] Debug info not available:', error);
                        }
                    }
                    catch (e) {
                        // Ignore console errors to prevent EPIPE
                    }
                    return null;
                }
            }
        } : {})
    };
}
// Create the complete UniVoice API
const univoiceAPI = {
    ...createCommandSender(),
    ...createEventListeners(),
    ...createUtilities(),
    ...createUnifiedEventListener(),
    window: createWindowAPI(),
    windowManager: createWindowManagerAPI()
};
// Expose the type-safe UniVoice API
electron_1.contextBridge.exposeInMainWorld('univoice', univoiceAPI);
// 🔴 CRITICAL: 親フォルダと同じ直接イベントのサポートを追加
// currentOriginalUpdateとcurrentTranslationUpdateイベント用
const allowedChannels = [
    ipcEvents_1.UNIFIED_CHANNEL, // Unified event channel (Stage 0)
    'univoice:event',
    'univoice:command',
    'univoice:debug',
    'audio-chunk',
    'currentOriginalUpdate', // 親フォルダ互換（キャメルケース版）
    'currentTranslationUpdate', // 親フォルダ互換（キャメルケース版）
    'current-original-update', // main.tsで実際に使用されている
    'current-translation-update', // main.tsで実際に使用されている
    'translation-complete', // main.tsで実際に使用されている
    'summary-generated', // main.tsで実際に使用されている
    'user-translation', // main.tsで実際に使用されている
    'final-report', // main.tsで実際に使用されている
    'pipeline:started', // パイプライン状態イベント
    'pipeline:stopped', // パイプライン状態イベント
    'pipeline:deepgramConnected', // パイプライン状態イベント
    'pipeline:error', // パイプラインエラーイベント
    'pipeline-event', // 追加互換性
    'history-block-created', // 履歴ブロックの保存
    'summary-created', // 要約の保存
    'session-metadata-update', // セッションメタデータの更新
    'session-end', // セッション終了
    'next-class', // 次の授業へ
    'check-today-session', // 当日セッション確認
    'get-available-sessions', // 利用可能なセッション一覧取得
    'load-session', // セッションデータ読み込み
    'progressive-summary', // ProgressiveSummary event
    'vocabulary-generated', // Vocabulary generation event
    'final-report-generated', // Final report generation event
    'advanced-feature-error', // Advanced feature error event
    'summary', // Regular summary event
    'audio-progress', // Audio progress event
    // Window control channels for frameless window
    'window:minimize', // Window minimize
    'window:maximize', // Window maximize
    'window:unmaximize', // Window unmaximize
    'window:close', // Window close
    'window:isMaximized', // Check if window is maximized
    'window:updateTheme', // Update title bar theme
    'window:setAlwaysOnTop', // Set window always on top
    'window:isAlwaysOnTop', // Check if window is always on top
    'window:autoResize', // Auto resize window to content
    'window:startDrag', // Start drag (focus fix)
    'window:endDrag', // End drag (focus fix)
    'window:dragStarted', // Drag started notification
    'open-summary-window', // Open progressive summary window
    'summary-window-data', // Send data to summary window
    'settings-updated' // Send settings updates between windows
];
// Legacy Electron API for backward compatibility
const legacyElectronAPI = {
    invoke: (channel, ...args) => {
        // セキュリティのため、許可されたチャンネルのみ
        if (!allowedChannels.includes(channel)) {
            try {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn(`[UniVoice Preload] Blocked invoke to channel: ${channel}`);
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
        }
        return electron_1.ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, listener) => {
        // セキュリティのため、許可されたチャンネルのみ
        if (!allowedChannels.includes(channel)) {
            try {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn(`[UniVoice Preload] Blocked access to channel: ${channel}`);
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            return () => { };
        }
        electron_1.ipcRenderer.on(channel, listener);
        // クリーンアップ関数を返す
        return () => {
            electron_1.ipcRenderer.removeListener(channel, listener);
        };
    },
    removeListener: (channel, listener) => {
        if (!allowedChannels.includes(channel)) {
            try {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn(`[UniVoice Preload] Blocked removeListener for channel: ${channel}`);
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            return;
        }
        electron_1.ipcRenderer.removeListener(channel, listener);
    },
    sendAudioChunk: (chunk) => {
        let buffer;
        if (Buffer.isBuffer(chunk)) {
            buffer = chunk;
        }
        else if (chunk instanceof ArrayBuffer) {
            buffer = Buffer.from(chunk);
        }
        else if (chunk instanceof Int16Array || chunk instanceof Uint8Array ||
            chunk instanceof Uint16Array || chunk instanceof Int8Array ||
            chunk instanceof Uint32Array || chunk instanceof Int32Array ||
            chunk instanceof Float32Array || chunk instanceof Float64Array) {
            // TypedArrayの場合、そのバッファから正しい範囲を取得
            buffer = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        }
        else {
            try {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('[Preload] Invalid audio chunk type:', chunk);
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            return;
        }
        electron_1.ipcRenderer.send('audio-chunk', buffer);
    },
    send: (channel, ...args) => {
        // セキュリティのため、許可されたチャンネルのみ
        if (!allowedChannels.includes(channel)) {
            try {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn(`[UniVoice Preload] Blocked send to channel: ${channel}`);
                }
            }
            catch (e) {
                // Ignore console errors to prevent EPIPE
            }
            return;
        }
        electron_1.ipcRenderer.send(channel, ...args);
    }
};
// Expose legacy API for backward compatibility
electron_1.contextBridge.exposeInMainWorld('electron', legacyElectronAPI);
electron_1.contextBridge.exposeInMainWorld('electronAPI', legacyElectronAPI); // Additional alias
// Safe console logging with try-catch
try {
    if (typeof console !== 'undefined' && console.info) {
        console.info('[UniVoice Preload] Script loaded');
        console.info('[UniVoice Preload] Type-safe API bridge exposed');
    }
}
catch (error) {
    // Ignore console errors during startup
}
// Safe console logging with try-catch
try {
    if (typeof console !== 'undefined' && console.info) {
        console.info('[UniVoice Preload] Available APIs:', {
            univoice: Object.keys(univoiceAPI),
            electron: Object.keys(legacyElectronAPI)
        });
    }
}
catch (error) {
    // Ignore console errors
}
// Safe console logging with try-catch
try {
    if (typeof console !== 'undefined' && console.info) {
        console.info('[UniVoice Preload] NODE_ENV:', process.env?.NODE_ENV || 'production');
    }
}
catch (error) {
    // Ignore console errors
}
