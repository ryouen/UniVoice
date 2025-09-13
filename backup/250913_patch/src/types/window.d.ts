import type { 
  IPCCommand, 
  PipelineEvent,
  StartListeningCommand,
  StopListeningCommand,
  GetHistoryCommand,
  ClearHistoryCommand,
  GenerateVocabularyCommand,
  GenerateFinalReportCommand
} from '../shared/types/contracts';
import type { UnifiedEvent } from '../shared/types/ipcEvents';

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
}

/**
 * Type-safe IPC API for UniVoice 2.0
 * Following Clean Architecture principles
 */
interface UniVoiceAPI {
  // Acrylic effect support
  isAcrylicEnabled: () => boolean;
  
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
}

/**
 * Legacy Electron API for backward compatibility
 */
interface LegacyElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  sendAudioChunk: (chunk: ArrayBuffer | Buffer | ArrayBufferView) => void;
  send: (channel: string, ...args: any[]) => void;
}

declare global {
  interface Window {
    univoice?: UniVoiceAPI;
    electron?: LegacyElectronAPI;
    electronAPI?: LegacyElectronAPI;
  }
}

export {};