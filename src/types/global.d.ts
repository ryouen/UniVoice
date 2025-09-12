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
      // Window control API
      window?: WindowAPI;
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