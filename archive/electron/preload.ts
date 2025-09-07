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
  ClearHistoryCommand
} from './services/ipc/contracts';

/**
 * UniVoice API - Type-safe interface for renderer
 */
interface UniVoiceAPI {
  // Command methods
  startListening: (params: StartListeningCommand['params']) => Promise<{ success: boolean; error?: string }>;
  stopListening: (params: StopListeningCommand['params']) => Promise<{ success: boolean; error?: string }>;
  getHistory: (params?: GetHistoryCommand['params']) => Promise<{ success: boolean; error?: string }>;
  clearHistory: () => Promise<{ success: boolean; error?: string }>;
  
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
}

/**
 * Legacy Electron API for backward compatibility
 */
interface LegacyElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  sendAudioChunk: (chunk: ArrayBuffer | Buffer) => void;
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
      console.error('[UniVoice Preload] Command failed:', error);
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
    
    getHistory: (params: GetHistoryCommand['params'] = {}) => 
      sendCommand({ command: 'getHistory', params }),
    
    clearHistory: () => 
      sendCommand({ command: 'clearHistory', params: {} })
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
        console.error('[UniVoice Preload] Event listener error:', error);
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
 * Utility functions
 */
function createUtilities() {
  return {
    generateCorrelationId: (): string => {
      return `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
    
    // Development only debug methods
    ...(process.env.NODE_ENV === 'development' && {
      getDebugInfo: async () => {
        try {
          return await ipcRenderer.invoke('univoice:debug');
        } catch (error) {
          console.warn('[UniVoice Preload] Debug info not available:', error);
          return null;
        }
      }
    })
  };
}

// Create the complete UniVoice API
const univoiceAPI: UniVoiceAPI = {
  ...createCommandSender(),
  ...createEventListeners(),
  ...createUtilities()
};

// Expose the type-safe UniVoice API
contextBridge.exposeInMainWorld('univoice', univoiceAPI);

// Legacy Electron API for backward compatibility
const legacyElectronAPI: LegacyElectronAPI = {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, listener);
  },
  
  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, listener);
  },
  
  sendAudioChunk: (chunk: ArrayBuffer | Buffer) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    ipcRenderer.send('audio-chunk', buffer);
  }
};

// Expose legacy API for backward compatibility
contextBridge.exposeInMainWorld('electron', legacyElectronAPI);
contextBridge.exposeInMainWorld('electronAPI', legacyElectronAPI); // Additional alias

// Development logging
if (process.env.NODE_ENV === 'development') {
  console.info('[UniVoice Preload] Type-safe API bridge exposed');
  console.info('[UniVoice Preload] Available APIs:', {
    univoice: Object.keys(univoiceAPI),
    electron: Object.keys(legacyElectronAPI)
  });
}

// Type declarations for renderer process
declare global {
  interface Window {
    univoice: UniVoiceAPI;
    electron: LegacyElectronAPI;
    electronAPI: LegacyElectronAPI;
  }
}