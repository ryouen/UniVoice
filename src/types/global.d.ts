/**
 * Global type declarations
 */

// CSS property extensions for Electron
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
    WebkitUserSelect?: string;
  }
}

// Window API for frameless window controls
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
  getSize: () => Promise<{ width: number; height: number }>;
}

// Window Manager API for multi-window management
interface WindowManagerAPI {
  measureSetupContent: () => { width: number; height: number } | null;
  setSetupBounds: (width: number, height: number) => Promise<boolean>;
  enterMain: () => Promise<boolean>;
  toggleHistory: () => Promise<boolean>;
  toggleSummary: () => Promise<boolean>;
}

// Full History Data type
interface FullHistoryData {
  blocks: any[];
  entries: Array<{
    id: string;
    original: string;
    translation: string;
    timestamp: number;
    segmentIds?: string[];
    speaker?: string;
    confidence?: number;
  }>;
  metadata: {
    totalSegments: number;
    totalSentences: number;
    totalWords: number;
    duration: number;
    startTime?: number;
    endTime?: number;
  };
}

// Extend the UniVoiceAPI interface
declare global {
  interface Window {
    univoice?: {
      // Existing API methods...
      startListening?: (params: any) => Promise<{ success: boolean; error?: string }>;
      stopListening?: (params: any) => Promise<{ success: boolean; error?: string }>;
      getHistory?: (params?: any) => Promise<{ success: boolean; error?: string }>;
      clearHistory?: () => Promise<{ success: boolean; error?: string }>;
      generateVocabulary?: (params: any) => Promise<{ success: boolean; error?: string }>;
      generateFinalReport?: (params: any) => Promise<{ success: boolean; error?: string }>;
      onPipelineEvent?: (callback: (event: any) => void) => () => void;
      onASREvent?: (callback: (event: any) => void) => () => void;
      onTranslationEvent?: (callback: (event: any) => void) => () => void;
      onSegmentEvent?: (callback: (event: any) => void) => () => void;
      onErrorEvent?: (callback: (event: any) => void) => () => void;
      onStatusEvent?: (callback: (event: any) => void) => () => void;
      generateCorrelationId?: () => string;
      getDebugInfo?: () => Promise<any>;
      onUnifiedEvent?: (callback: (event: any) => void) => () => void;
      // Full history data API
      getFullHistory?: () => Promise<FullHistoryData>;
      // Window control API
      window?: WindowAPI;
      // Window manager API
      windowManager?: WindowManagerAPI;
    };
    electron?: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => () => void;
      removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
      sendAudioChunk: (chunk: ArrayBuffer | Buffer | ArrayBufferView) => void;
      send: (channel: string, ...args: any[]) => void;
    };
    electronAPI?: any; // Legacy alias
  }
}

export {};