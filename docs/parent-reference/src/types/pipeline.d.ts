/**
 * UniVoice Pipeline Type Definitions
 * 
 * Based on UnifiedPipelineService implementation
 * These types define the data structures for the real-time translation pipeline
 */

// Pipeline states
export type PipelineState = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

// Translation segment (completed translations for history blocks)
export interface TranslationSegment {
  id: string;
  timestamp: number;
  original: string;
  translation: string;
  confidence?: number;
  isInterim?: boolean;
  duration?: number;
}

// Summary data structure
export interface SummaryData {
  id: string;
  timestamp: number;
  timeRange: string;
  englishSummary: string;
  japaneseSummary: string;
  vocabulary: Array<{
    en: string;
    ja: string;
  }>;
  wordCount: number;
}

// User translation result
export interface UserTranslation {
  id: string;
  timestamp: number;
  original: string;
  translation: string;
  from: string;
  to: string;
  duration?: number;
}

// Final report structure
export interface FinalReport {
  id: string;
  timestamp: number;
  duration: number;
  sections: {
    overview: string;
    keyTopics: string[];
    detailedInsights: string;
    questionsAnswered: string[];
    conclusion: string;
  };
  metadata: {
    totalWords: number;
    totalSegments: number;
    averageConfidence: number;
    languages: string[];
  };
}

// Pipeline events
export interface PipelineEvents {
  // Pipeline lifecycle
  started: () => void;
  stopped: () => void;
  error: (error: Error) => void;
  
  // Connection status
  deepgramConnected: () => void;
  deepgramDisconnected: () => void;
  
  // Real-time updates
  currentOriginalUpdate: (text: string) => void;
  currentTranslationUpdate: (text: string) => void;
  
  // Completed data
  translationComplete: (segment: TranslationSegment) => void;
  summaryGenerated: (summary: SummaryData) => void;
  userTranslation: (result: UserTranslation) => void;
  finalReport: (report: FinalReport) => void;
}

// Pipeline API interface
export interface PipelineAPI {
  // Control methods
  startPipelineFile: (filePath: string) => Promise<void>;
  startPipelineMic: () => Promise<void>;
  stopPipeline: () => Promise<void>;
  translateUserInput: (text: string, from?: string, to?: string) => Promise<UserTranslation>;
  getPipelineState: () => Promise<{
    state: PipelineState;
    isRunning: boolean;
    error?: string;
  }>;
  
  // Event listeners (return cleanup function)
  onPipelineStarted: (callback: () => void) => () => void;
  onPipelineStopped: (callback: () => void) => () => void;
  onDeepgramConnected: (callback: () => void) => () => void;
  onCurrentOriginalUpdate: (callback: (text: string) => void) => () => void;
  onCurrentTranslationUpdate: (callback: (text: string) => void) => () => void;
  onTranslationComplete: (callback: (data: TranslationSegment) => void) => () => void;
  onSummaryGenerated: (callback: (data: SummaryData) => void) => () => void;
  onUserTranslation: (callback: (data: UserTranslation) => void) => () => void;
  onFinalReport: (callback: (report: FinalReport) => void) => () => void;
  onPipelineError: (callback: (error: string) => void) => () => void;
}

// Hook return type
export interface UseUnifiedPipelineReturn {
  // State
  isRunning: boolean;
  pipelineError: string | null;
  
  // Current blocks data
  currentOriginal: string;
  currentTranslation: string;
  
  // History data
  segments: TranslationSegment[];
  
  // Summary data
  summaries: SummaryData[];
  
  // Control methods
  startFromFile: (filePath: string) => Promise<void>;
  startFromMic: () => Promise<void>;
  stop: () => Promise<void>;
  translateUserInput: (text: string, from?: string, to?: string) => Promise<UserTranslation | null>;
  
  // Feature flag
  useMockData: boolean;
}

// Window type augmentation
declare global {
  interface Window {
    electronAPI: PipelineAPI & {
      // Legacy API (for backward compatibility)
      onResetView: (callback: () => void) => () => void;
      onSolutionStart: (callback: () => void) => () => void;
      onUnauthorized: (callback: () => void) => () => void;
      onProblemExtracted: (callback: (data: any) => void) => () => void;
    };
  }
}