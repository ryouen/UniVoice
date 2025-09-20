/**
 * UniVoice Preload Script - Type-safe IPC Bridge
 * Provides secure, type-safe communication between renderer and main process
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { 
  IPCCommand, 
  PipelineEvent,
  StartListeningCommand,
  StopListeningCommand,
  GetHistoryCommand,
  GenerateVocabularyCommand,
  GenerateFinalReportCommand
} from './services/ipc/contracts';
import type { UnifiedEvent } from './shared/ipcEvents';
import { UNIFIED_CHANNEL } from './shared/ipcEvents';

/**
 * Window Control API for frameless window
 */
interface WindowAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  unmaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  updateTheme: (theme: { color: string; symbolColor: string }) => Promise<void>;
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<boolean>;
  isAlwaysOnTop: () => Promise<boolean>;
  autoResize: (height: number) => Promise<boolean>;
  setBounds: (bounds: { width: number; height: number }) => Promise<void>;
  // Custom drag handlers for focus issue fix
  startDrag: () => void;
  endDrag: () => void;
}

/**
 * Window Manager API for multi-window management
 */
interface WindowManagerAPI {
  // Setup window controls
  measureSetupContent: () => { width: number; height: number } | null;
  setSetupBounds: (width: number, height: number) => Promise<boolean>;
  enterMain: () => Promise<boolean>;
  
  // Panel window controls
  toggleHistory: () => Promise<boolean>;
  toggleSummary: () => Promise<boolean>;
}

/**
 * UniVoice API - Type-safe interface for renderer
 */
interface UniVoiceAPI {
  // Command methods
  startListening: (params: StartListeningCommand['params']) => Promise<{ success: boolean; error?: string }>;
  stopListening: (params: StopListeningCommand['params']) => Promise<{ success: boolean; error?: string }>;
  getHistory: (params?: GetHistoryCommand['params']) => Promise<{ success: boolean; error?: string }>;
  clearHistory: () => Promise<{ success: boolean; error?: string }>;
  generateVocabulary: (params: GenerateVocabularyCommand['params']) => Promise<{ success: boolean; error?: string }>;
  generateFinalReport: (params: GenerateFinalReportCommand['params']) => Promise<{ success: boolean; error?: string }>;
  
  // Event listeners
  onPipelineEvent: (callback: (event: PipelineEvent) => void) => () => void;
  onASREvent: (callback: (event: PipelineEvent & { type: 'asr' }) => void) => () => void;
  onTranslationEvent: (callback: (event: PipelineEvent & { type: 'translation' }) => void) => () => void;
  onSegmentEvent: (callback: (event: PipelineEvent & { type: 'segment' }) => void) => () => void;
  onErrorEvent: (callback: (event: PipelineEvent & { type: 'error' }) => void) => () => void;
  onStatusEvent: (callback: (event: PipelineEvent & { type: 'status' }) => void) => () => void;
  
  // Utility methods
  generateCorrelationId: () => string;
  
  // Debug methods (development only)
  getDebugInfo?: () => Promise<any>;
  
  // Unified event system (Stage 0 - Shadow implementation)
  onUnifiedEvent?: (callback: (event: UnifiedEvent) => void) => () => void;
  
  // Window control API
  window: WindowAPI;
  
  // Window manager API
  windowManager: WindowManagerAPI;
}

/**
 * Legacy Electron API for backward compatibility
 */
interface LegacyElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => () => void;
  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  sendAudioChunk: (chunk: ArrayBuffer | Buffer | ArrayBufferView) => void;
  send: (channel: string, ...args: any[]) => void;
}

/**
 * Create type-safe command sender
 */
function createCommandSender() {
  const sendCommand = async (command: IPCCommand): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await ipcRenderer.invoke('univoice:command', command);
      return result;
    } catch (error) {
      try {
        if (typeof console !== 'undefined' && console.error) {
          console.error('[UniVoice Preload] Command failed:', error);
        }
      } catch (e) {
        // Ignore console errors to prevent EPIPE
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  return {
    startListening: (params: StartListeningCommand['params']) => 
      sendCommand({ command: 'startListening', params }),
    
    stopListening: (params: StopListeningCommand['params']) => 
      sendCommand({ command: 'stopListening', params }),
    
    getHistory: (params: GetHistoryCommand['params'] = { limit: 100, offset: 0 }) => 
      sendCommand({ command: 'getHistory', params }),
    
    clearHistory: () => 
      sendCommand({ command: 'clearHistory', params: {} }),
    
    generateVocabulary: (params: GenerateVocabularyCommand['params']) => 
      sendCommand({ command: 'generateVocabulary', params }),
    
    generateFinalReport: (params: GenerateFinalReportCommand['params']) => 
      sendCommand({ command: 'generateFinalReport', params })
  };
}

/**
 * Create type-safe event listeners
 */
function createEventListeners() {
  const addEventListener = <T extends PipelineEvent>(
    callback: (event: T) => void,
    filter?: (event: PipelineEvent) => event is T
  ) => {
    const listener = (_: any, event: PipelineEvent) => {
      try {
        if (!filter || filter(event)) {
          callback(event as T);
        }
      } catch (error) {
        try {
          if (typeof console !== 'undefined' && console.error) {
            console.error('[UniVoice Preload] Event listener error:', error);
          }
        } catch (e) {
          // Ignore console errors to prevent EPIPE
        }
      }
    };
    
    ipcRenderer.on('univoice:event', listener);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('univoice:event', listener);
    };
  };

  return {
    onPipelineEvent: (callback: (event: PipelineEvent) => void) => 
      addEventListener(callback),
    
    onASREvent: (callback: (event: PipelineEvent & { type: 'asr' }) => void) => 
      addEventListener(callback, (event): event is PipelineEvent & { type: 'asr' } => event.type === 'asr'),
    
    onTranslationEvent: (callback: (event: PipelineEvent & { type: 'translation' }) => void) => 
      addEventListener(callback, (event): event is PipelineEvent & { type: 'translation' } => event.type === 'translation'),
    
    onSegmentEvent: (callback: (event: PipelineEvent & { type: 'segment' }) => void) => 
      addEventListener(callback, (event): event is PipelineEvent & { type: 'segment' } => event.type === 'segment'),
    
    onErrorEvent: (callback: (event: PipelineEvent & { type: 'error' }) => void) => 
      addEventListener(callback, (event): event is PipelineEvent & { type: 'error' } => event.type === 'error'),
    
    onStatusEvent: (callback: (event: PipelineEvent & { type: 'status' }) => void) => 
      addEventListener(callback, (event): event is PipelineEvent & { type: 'status' } => event.type === 'status')
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
    onUnifiedEvent: (callback: (event: UnifiedEvent) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => {
        // Basic validation for safety (Stage 0 - no Zod schema yet)
        if (!data || typeof data !== 'object' || 
            !data.v || !data.id || typeof data.seq !== 'number' || 
            typeof data.ts !== 'number' || !data.kind) {
          try {
            if (typeof console !== 'undefined' && console.warn) {
              console.warn('[Preload] UnifiedEvent invalid format:', data);
            }
          } catch (e) {
            // Ignore console errors to prevent EPIPE
          }
          return;
        }
        
        callback(data as UnifiedEvent);
      };
      
      ipcRenderer.on(UNIFIED_CHANNEL, handler);
      return () => ipcRenderer.removeListener(UNIFIED_CHANNEL, handler);
    }
  };
}

/**
 * Create window control API
 */
function createWindowAPI(): WindowAPI {
  return {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    unmaximize: () => ipcRenderer.invoke('window:unmaximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    updateTheme: (theme) => ipcRenderer.invoke('window:updateTheme', theme),
    setAlwaysOnTop: (alwaysOnTop) => ipcRenderer.invoke('window:setAlwaysOnTop', alwaysOnTop),
    isAlwaysOnTop: () => ipcRenderer.invoke('window:isAlwaysOnTop'),
    autoResize: (height) => ipcRenderer.invoke('window:autoResize', height),
    setBounds: (bounds) => ipcRenderer.invoke('window:setBounds', bounds),
    // Custom drag handlers for focus issue fix
    startDrag: () => ipcRenderer.send('window:startDrag'),
    endDrag: () => ipcRenderer.send('window:endDrag')
  };
}

/**
 * Create window manager API
 */
function createWindowManagerAPI(): WindowManagerAPI {
  return {
    // Setup window controls
    measureSetupContent: () => {
      // DISABLED: Dynamic content measurement causes resize loops
      // Return fixed size to prevent any resize attempts
      return { width: 600, height: 800 };
    },
    setSetupBounds: (width: number, height: number) => 
      ipcRenderer.invoke('window:setSetupBounds', width, height),
    enterMain: () => 
      ipcRenderer.invoke('window:enterMain'),
    
    // Panel window controls
    toggleHistory: () => 
      ipcRenderer.invoke('window:toggleHistory'),
    toggleSummary: () => 
      ipcRenderer.invoke('window:toggleSummary')
  };
}

/**
 * Utility functions
 */
function createUtilities() {
  return {
    generateCorrelationId: (): string => {
      return `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
    
    // Development only debug methods
    // Note: process.env.NODE_ENV may be undefined in production builds
    ...(process.env?.NODE_ENV === 'development' ? {
      getDebugInfo: async () => {
        try {
          return await ipcRenderer.invoke('univoice:debug');
        } catch (error) {
          try {
            if (typeof console !== 'undefined' && console.warn) {
              console.warn('[UniVoice Preload] Debug info not available:', error);
            }
          } catch (e) {
            // Ignore console errors to prevent EPIPE
          }
          return null;
        }
      }
    } : {})
  };
}

// Create the complete UniVoice API
const univoiceAPI: UniVoiceAPI = {
  ...createCommandSender(),
  ...createEventListeners(),
  ...createUtilities(),
  ...createUnifiedEventListener(),
  window: createWindowAPI(),
  windowManager: createWindowManagerAPI()
};

// Expose the type-safe UniVoice API
contextBridge.exposeInMainWorld('univoice', univoiceAPI);

// 🔴 CRITICAL: 親フォルダと同じ直接イベントのサポートを追加
// currentOriginalUpdateとcurrentTranslationUpdateイベント用
const allowedChannels = [
  UNIFIED_CHANNEL,            // Unified event channel (Stage 0)
  'univoice:event',
  'univoice:command',
  'univoice:debug',
  'audio-chunk',
  'currentOriginalUpdate',    // 親フォルダ互換（キャメルケース版）
  'currentTranslationUpdate', // 親フォルダ互換（キャメルケース版）
  'current-original-update',  // main.tsで実際に使用されている
  'current-translation-update', // main.tsで実際に使用されている
  'translation-complete',     // main.tsで実際に使用されている
  'summary-generated',        // main.tsで実際に使用されている
  'user-translation',         // main.tsで実際に使用されている
  'final-report',            // main.tsで実際に使用されている
  'pipeline:started',         // パイプライン状態イベント
  'pipeline:stopped',         // パイプライン状態イベント
  'pipeline:deepgramConnected', // パイプライン状態イベント
  'pipeline:error',           // パイプラインエラーイベント
  'pipeline-event',           // 追加互換性
  'history-block-created',    // 履歴ブロックの保存
  'summary-created',          // 要約の保存
  'session-metadata-update',  // セッションメタデータの更新
  'session-end',              // セッション終了
  'next-class',               // 次の授業へ
  'check-today-session',      // 当日セッション確認
  'get-available-sessions',   // 利用可能なセッション一覧取得
  'load-session',             // セッションデータ読み込み
  'progressive-summary',      // ProgressiveSummary event
  'vocabulary-generated',     // Vocabulary generation event
  'final-report-generated',   // Final report generation event
  'advanced-feature-error',   // Advanced feature error event
  'summary',                  // Regular summary event
  'audio-progress',           // Audio progress event
  // Window control channels for frameless window
  'window:minimize',          // Window minimize
  'window:maximize',          // Window maximize
  'window:unmaximize',        // Window unmaximize
  'window:close',             // Window close
  'window:isMaximized',       // Check if window is maximized
  'window:updateTheme',       // Update title bar theme
  'window:setAlwaysOnTop',    // Set window always on top
  'window:isAlwaysOnTop',     // Check if window is always on top
  'window:autoResize',        // Auto resize window to content
  'window:startDrag',         // Start drag (focus fix)
  'window:endDrag',           // End drag (focus fix)
  'window:dragStarted'        // Drag started notification
];

// Legacy Electron API for backward compatibility
const legacyElectronAPI: LegacyElectronAPI = {
  invoke: (channel: string, ...args: any[]) => {
    // セキュリティのため、許可されたチャンネルのみ
    if (!allowedChannels.includes(channel)) {
      try {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`[UniVoice Preload] Blocked invoke to channel: ${channel}`);
        }
      } catch (e) {
        // Ignore console errors to prevent EPIPE
      }
      return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    // セキュリティのため、許可されたチャンネルのみ
    if (!allowedChannels.includes(channel)) {
      try {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`[UniVoice Preload] Blocked access to channel: ${channel}`);
        }
      } catch (e) {
        // Ignore console errors to prevent EPIPE
      }
      return () => {};
    }
    
    ipcRenderer.on(channel, listener);
    // クリーンアップ関数を返す
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  
  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    if (!allowedChannels.includes(channel)) {
      try {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`[UniVoice Preload] Blocked removeListener for channel: ${channel}`);
        }
      } catch (e) {
        // Ignore console errors to prevent EPIPE
      }
      return;
    }
    ipcRenderer.removeListener(channel, listener);
  },
  
  sendAudioChunk: (chunk: ArrayBuffer | Buffer | ArrayBufferView) => {
    let buffer: Buffer;
    if (Buffer.isBuffer(chunk)) {
      buffer = chunk;
    } else if (chunk instanceof ArrayBuffer) {
      buffer = Buffer.from(chunk);
    } else if (chunk instanceof Int16Array || chunk instanceof Uint8Array || 
               chunk instanceof Uint16Array || chunk instanceof Int8Array ||
               chunk instanceof Uint32Array || chunk instanceof Int32Array ||
               chunk instanceof Float32Array || chunk instanceof Float64Array) {
      // TypedArrayの場合、そのバッファから正しい範囲を取得
      buffer = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    } else {
      try {
        if (typeof console !== 'undefined' && console.error) {
          console.error('[Preload] Invalid audio chunk type:', chunk);
        }
      } catch (e) {
        // Ignore console errors to prevent EPIPE
      }
      return;
    }
    ipcRenderer.send('audio-chunk', buffer);
  },
  
  send: (channel: string, ...args: any[]) => {
    // セキュリティのため、許可されたチャンネルのみ
    if (!allowedChannels.includes(channel)) {
      try {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`[UniVoice Preload] Blocked send to channel: ${channel}`);
        }
      } catch (e) {
        // Ignore console errors to prevent EPIPE
      }
      return;
    }
    ipcRenderer.send(channel, ...args);
  }
};

// Expose legacy API for backward compatibility
contextBridge.exposeInMainWorld('electron', legacyElectronAPI);
contextBridge.exposeInMainWorld('electronAPI', legacyElectronAPI); // Additional alias

// Safe console logging with try-catch
try {
  if (typeof console !== 'undefined' && console.info) {
    console.info('[UniVoice Preload] Script loaded');
    console.info('[UniVoice Preload] Type-safe API bridge exposed');
  }
} catch (error) {
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
} catch (error) {
  // Ignore console errors
}
// Safe console logging with try-catch
try {
  if (typeof console !== 'undefined' && console.info) {
    console.info('[UniVoice Preload] NODE_ENV:', process.env?.NODE_ENV || 'production');
  }
} catch (error) {
  // Ignore console errors
}

// Type declarations for renderer process
declare global {
  interface Window {
    univoice: UniVoiceAPI;
    electron: LegacyElectronAPI;
    electronAPI: LegacyElectronAPI;
  }
}