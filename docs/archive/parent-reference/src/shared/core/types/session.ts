// UniVoice Core Types - Platform Independent
// Shared across Electron, Web PWA, and Capacitor (iOS/Android)

export interface LectureSegment {
  text: string
  timestamp: number
  speaker?: string
  isStudentUtterance?: boolean
  translatedText?: string // Added for translation support
  language?: 'ja' | 'en' | 'auto' // Added for language detection
}

export interface LectureSession {
  title: string
  startTime: number
  endTime?: number
  segments: LectureSegment[]
  subject?: string
  sessionId: string // Added for unique identification
  version: string // Added for data migration support
}

export interface SessionStats {
  totalSegments: number
  studentUtterances: number
  duration: number
  wordCount: number
  averageSegmentLength?: number
  languageDistribution?: {
    japanese: number
    english: number
    mixed: number
  }
}

export interface AudioProcessingResult {
  text: string
  language?: 'ja' | 'en' | 'auto'
  confidence?: number
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
}

export interface TranslationResult {
  originalText: string
  translatedText: string
  sourceLanguage: 'ja' | 'en'
  targetLanguage: 'ja' | 'en'
  confidence?: number
}

// Platform capabilities interface
export interface PlatformCapabilities {
  audioRecording: boolean
  fileExport: boolean
  backgroundProcessing: boolean
  pushNotifications: boolean
  offlineMode: boolean
}

// Configuration interface for different platforms
export interface PlatformConfig {
  platform: 'electron' | 'web' | 'ios' | 'android'
  version: string
  capabilities: PlatformCapabilities
  audioSettings: {
    sampleRate: number
    chunkSize: number
    format: string
  }
}