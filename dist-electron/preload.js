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
            console.error('[UniVoice Preload] Command failed:', error);
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
                console.error('[UniVoice Preload] Event listener error:', error);
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
    if (process.env.NODE_ENV !== 'development') {
        return {};
    }
    return {
        onUnifiedEvent: (callback) => {
            const handler = (_, data) => {
                // Basic validation for safety (Stage 0 - no Zod schema yet)
                if (!data || typeof data !== 'object' ||
                    !data.v || !data.id || typeof data.seq !== 'number' ||
                    typeof data.ts !== 'number' || !data.kind) {
                    console.warn('[Preload] UnifiedEvent invalid format:', data);
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
 * Utility functions
 */
function createUtilities() {
    return {
        generateCorrelationId: () => {
            return `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        },
        // Development only debug methods
        ...(process.env.NODE_ENV === 'development' && {
            getDebugInfo: async () => {
                try {
                    return await electron_1.ipcRenderer.invoke('univoice:debug');
                }
                catch (error) {
                    console.warn('[UniVoice Preload] Debug info not available:', error);
                    return null;
                }
            }
        })
    };
}
// Create the complete UniVoice API
const univoiceAPI = {
    ...createCommandSender(),
    ...createEventListeners(),
    ...createUtilities(),
    ...createUnifiedEventListener()
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
    'audio-progress' // Audio progress event
];
// Legacy Electron API for backward compatibility
const legacyElectronAPI = {
    invoke: (channel, ...args) => {
        // セキュリティのため、許可されたチャンネルのみ
        if (!allowedChannels.includes(channel)) {
            console.warn(`[UniVoice Preload] Blocked invoke to channel: ${channel}`);
            return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
        }
        return electron_1.ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, listener) => {
        // セキュリティのため、許可されたチャンネルのみ
        if (!allowedChannels.includes(channel)) {
            console.warn(`[UniVoice Preload] Blocked access to channel: ${channel}`);
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
            console.warn(`[UniVoice Preload] Blocked removeListener for channel: ${channel}`);
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
            console.error('[Preload] Invalid audio chunk type:', chunk);
            return;
        }
        electron_1.ipcRenderer.send('audio-chunk', buffer);
    },
    send: (channel, ...args) => {
        // セキュリティのため、許可されたチャンネルのみ
        if (!allowedChannels.includes(channel)) {
            console.warn(`[UniVoice Preload] Blocked send to channel: ${channel}`);
            return;
        }
        electron_1.ipcRenderer.send(channel, ...args);
    }
};
// Expose legacy API for backward compatibility
electron_1.contextBridge.exposeInMainWorld('electron', legacyElectronAPI);
electron_1.contextBridge.exposeInMainWorld('electronAPI', legacyElectronAPI); // Additional alias
// Always log for debugging
console.info('[UniVoice Preload] Script loaded');
console.info('[UniVoice Preload] Type-safe API bridge exposed');
console.info('[UniVoice Preload] Available APIs:', {
    univoice: Object.keys(univoiceAPI),
    electron: Object.keys(legacyElectronAPI)
});
console.info('[UniVoice Preload] NODE_ENV:', process.env.NODE_ENV);
