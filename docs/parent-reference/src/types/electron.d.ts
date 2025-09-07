export interface LectureExportData {
  title: string
  segments: Array<{ 
    text: string
    timestamp: number
    speaker?: string
    isStudentUtterance?: boolean 
  }>
  subject?: string
}

export interface LectureAnalysisPreview {
  totalSegments: number
  totalDuration: number
  studentUtterancesCount: number
  estimatedKeyPoints: number
  estimatedTerms: number
  wordCount: number
  hasMultipleLanguages: boolean
}

export interface LectureExportResult {
  success: boolean
  filePath?: string
  error?: string
  analysis?: {
    keyPointsCount: number
    termsCount: number
    studentUtterancesCount: number
    duration: number
  }
}

// UniVoice Platform Adapter Types
export interface TranslationRequest {
  text: string
  sourceLang: string
  targetLang: string
}

export interface TranslationResponse {
  success: boolean
  translatedText: string
  originalText: string
  sourceLang: string
  targetLang: string
  error?: string
}

export interface SessionData {
  title: string
  segments: Array<{ 
    text: string
    translation: string
    timestamp: number
    speaker?: string 
  }>
  metadata?: { 
    subject?: string
    duration?: number
    language?: string 
  }
}

export interface SessionResult {
  success: boolean
  filePath?: string
  error?: string
  segmentCount?: number
}

export interface EnvironmentCheck {
  success: boolean
  checks?: {
    geminiApiKey: boolean
    nodeVersion: string
    platform: string
    arch: string
  }
  isReady?: boolean
  error?: string
}

export interface AppVersion {
  success: boolean
  version: string
  name: string
}

export interface SupportedLanguages {
  success: boolean
  languages: Array<{
    code: string
    name: string
    nativeName: string
  }>
  defaultSource: string
  defaultTarget: string
}

export interface AudioAnalysisResult {
  text: string
  timestamp: number
  language?: 'japanese' | 'english'
  confidence?: number
  error?: string
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
}

// NEW: Real-time transcription types
export interface RealtimeTranscriptionResult {
  success: boolean
  text: string
  timestamp: number
  language?: 'japanese' | 'english'
  confidence?: number
  error?: string
}

export interface TranscriptionStatus {
  available: boolean
  isProcessing?: boolean
  queueSize?: number
  lastProcessTime?: number
  error?: string
}

export interface ElectronAPI {
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => () => void
  onSolutionsReady: (callback: (solutions: string) => void) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  takeScreenshot: () => Promise<void>
  moveWindowLeft: () => Promise<void>
  moveWindowRight: () => Promise<void>
  analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<AudioAnalysisResult>
  analyzeAudioFile: (path: string) => Promise<AudioAnalysisResult>
  
  // NEW: Real-time transcription APIs
  transcribeAudioRealtime: (audioBuffer: ArrayBuffer, mimeType: string) => Promise<RealtimeTranscriptionResult>
  getTranscriptionStatus: () => Promise<TranscriptionStatus>
  
  quitApp: () => Promise<void>
  onToggleRecording: (callback: () => void) => () => void
  
  // Word文書エクスポート機能
  exportLectureToWord: (lectureData: LectureExportData) => Promise<LectureExportResult>
  analyzeLecturePreview: (lectureData: Omit<LectureExportData, 'title'>) => Promise<{
    success: boolean
    preview?: LectureAnalysisPreview
    error?: string
  }>
  
  // UniVoice Platform Adapter APIs
  translateText: (request: TranslationRequest) => Promise<TranslationResponse>
  saveSession: (sessionData: SessionData) => Promise<SessionResult>
  loadSession: () => Promise<SessionResult & { sessionData?: SessionData }>
  getAppVersion: () => Promise<AppVersion>
  validateEnvironment: () => Promise<EnvironmentCheck>
  getSupportedLanguages: () => Promise<SupportedLanguages>
}

// NEW: Recording and translation status types for improved UI feedback
export interface RecordingStatusEvent {
  isRecording: boolean;
  status: 'starting' | 'active' | 'stopped' | 'error';
  error?: string;
}

export interface TranslationStatusEvent {
  status: 'idle' | 'translating';
  queueSize: number;
}

export interface TranslationErrorEvent {
  message: string;
  timestamp: number;
}

export interface TranslationResultEvent {
  original: string;
  translated: string;
  timestamp: number;
  language: string;
  confidence: number;
  processingTime: number;
}

// Enhanced Electron API with recording management
export interface ElectronRecordingAPI {
  // Recording control with improved status handling
  'start-recording': () => Promise<{ success: boolean; error?: string }>;
  'stop-recording': () => Promise<{ success: boolean; error?: string }>;
  'get-recording-status': () => Promise<{
    isRecording: boolean;
    queueSize: number;
    processingQueue: boolean;
  }>;
  
  // API key management
  'set-api-key': (apiKey: string) => Promise<{ success: boolean }>;
  'check-api-key': () => Promise<{ hasKey: boolean }>;
  
  // Event listeners for real-time updates
  on: (channel: 'translation-result', listener: (event: any, data: TranslationResultEvent) => void) => void;
  on: (channel: 'recording-status', listener: (event: any, data: RecordingStatusEvent) => void) => void;
  on: (channel: 'translation-status', listener: (event: any, data: TranslationStatusEvent) => void) => void;
  on: (channel: 'translation-error', listener: (event: any, data: TranslationErrorEvent) => void) => void;
  
  removeListener: (channel: string, listener: Function) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: ElectronRecordingAPI & { // For the recording-focused API
      // Additional methods for clean implementation
      startPipeline?: () => Promise<{ success: boolean; error?: string }>;
      stopPipeline?: () => Promise<{ success: boolean; metrics?: any }>;
      getMetrics?: () => Promise<any>;
      sendAudioChunk: (chunk: ArrayBuffer | Buffer) => void;
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
      removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
      removeAllListeners?: (channel: string) => void;
    }
  }
} 