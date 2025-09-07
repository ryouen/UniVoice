/**
 * UniVoice Preload Script - Type-safe IPC Bridge
 * Provides secure, type-safe communication between renderer and main process
 */
import type { PipelineEvent, StartListeningCommand, StopListeningCommand, GetHistoryCommand, GenerateVocabularyCommand, GenerateFinalReportCommand } from './services/ipc/contracts';
import type { UnifiedEvent } from './shared/ipcEvents';
/**
 * UniVoice API - Type-safe interface for renderer
 */
interface UniVoiceAPI {
    startListening: (params: StartListeningCommand['params']) => Promise<{
        success: boolean;
        error?: string;
    }>;
    stopListening: (params: StopListeningCommand['params']) => Promise<{
        success: boolean;
        error?: string;
    }>;
    getHistory: (params?: GetHistoryCommand['params']) => Promise<{
        success: boolean;
        error?: string;
    }>;
    clearHistory: () => Promise<{
        success: boolean;
        error?: string;
    }>;
    generateVocabulary: (params: GenerateVocabularyCommand['params']) => Promise<{
        success: boolean;
        error?: string;
    }>;
    generateFinalReport: (params: GenerateFinalReportCommand['params']) => Promise<{
        success: boolean;
        error?: string;
    }>;
    onPipelineEvent: (callback: (event: PipelineEvent) => void) => () => void;
    onASREvent: (callback: (event: PipelineEvent & {
        type: 'asr';
    }) => void) => () => void;
    onTranslationEvent: (callback: (event: PipelineEvent & {
        type: 'translation';
    }) => void) => () => void;
    onSegmentEvent: (callback: (event: PipelineEvent & {
        type: 'segment';
    }) => void) => () => void;
    onErrorEvent: (callback: (event: PipelineEvent & {
        type: 'error';
    }) => void) => () => void;
    onStatusEvent: (callback: (event: PipelineEvent & {
        type: 'status';
    }) => void) => () => void;
    generateCorrelationId: () => string;
    getDebugInfo?: () => Promise<any>;
    onUnifiedEvent?: (callback: (event: UnifiedEvent) => void) => () => void;
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
declare global {
    interface Window {
        univoice: UniVoiceAPI;
        electron: LegacyElectronAPI;
        electronAPI: LegacyElectronAPI;
    }
}
export {};
