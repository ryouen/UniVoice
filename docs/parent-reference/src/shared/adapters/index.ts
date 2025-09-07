// UniVoice Platform Adapters - Abstract interfaces for platform-specific implementations
// Supports Electron (Desktop), PWA (Web), and Capacitor (iOS/Android)

import { AudioProcessingResult, TranslationResult, PlatformConfig } from '../core/types/session'

// Re-export types for easier importing
export type { AudioProcessingResult, TranslationResult, PlatformConfig } from '../core/types/session'

// Base interface for audio processing across platforms
export interface AudioProcessor {
  isRecording: boolean
  startRecording(): Promise<void>
  stopRecording(): Promise<void>
  processAudioChunk(audioData: Blob | ArrayBuffer): Promise<AudioProcessingResult>
  cleanup(): void
}

// Translation service interface (shared across platforms)
export interface TranslationService {
  translateText(text: string, sourceLanguage: 'ja' | 'en', targetLanguage: 'ja' | 'en'): Promise<TranslationResult>
  detectLanguage(text: string): Promise<'ja' | 'en' | 'auto'>
  isAvailable(): boolean
}

// Storage interface for session persistence
export interface StorageService {
  saveSession(sessionData: any): Promise<string> // Returns saved session ID
  loadSession(sessionId: string): Promise<any>
  deleteSession(sessionId: string): Promise<void>
  listSessions(): Promise<string[]>
  exportSession(sessionId: string, format: 'json' | 'docx' | 'txt'): Promise<string> // Returns file path
}

// Platform-specific capabilities
export interface PlatformAdapter {
  config: PlatformConfig
  audioProcessor: AudioProcessor
  translationService: TranslationService
  storageService: StorageService
  
  // Platform-specific initialization
  initialize(): Promise<void>
  
  // Permission handling (especially for mobile)
  requestPermissions(): Promise<boolean>
  
  // Platform-specific UI adaptations
  getUIComponents(): PlatformUIComponents
}

// UI component interface for platform-specific implementations
export interface PlatformUIComponents {
  AudioControls: React.ComponentType<AudioControlsProps>
  ExportButton: React.ComponentType<ExportButtonProps>
  SessionManager: React.ComponentType<SessionManagerProps>
}

// Props interfaces for platform-specific components
export interface AudioControlsProps {
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  disabled?: boolean
}

export interface ExportButtonProps {
  sessionData: any
  onExport: (format: 'json' | 'docx' | 'txt') => void
  disabled?: boolean
}

export interface SessionManagerProps {
  onSessionStart: (title: string, subject?: string) => void
  onSessionEnd: () => void
  currentSession: any
}

// Platform factory function
export interface PlatformFactory {
  createAdapter(platformType: 'electron' | 'web' | 'ios' | 'android'): Promise<PlatformAdapter>
}

// Audio processing configuration
export interface AudioConfig {
  sampleRate: number
  chunkSize: number
  overlap: number
  format: 'webm' | 'wav' | 'mp4'
  useWebAudioAPI?: boolean
  useMediaRecorder?: boolean
  useNativeAudio?: boolean // For mobile platforms
}

// Error handling for platform-specific issues
export class PlatformError extends Error {
  constructor(
    message: string,
    public platform: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message)
    this.name = 'PlatformError'
  }
}

// Default configurations for each platform
export const DEFAULT_CONFIGS: Record<string, PlatformConfig> = {
  electron: {
    platform: 'electron',
    version: '1.0.0',
    capabilities: {
      audioRecording: true,
      fileExport: true,
      backgroundProcessing: true,
      pushNotifications: false,
      offlineMode: true
    },
    audioSettings: {
      sampleRate: 16000,
      chunkSize: 640,
      format: 'wav'
    }
  },
  web: {
    platform: 'web',
    version: '1.0.0',
    capabilities: {
      audioRecording: true,
      fileExport: true,
      backgroundProcessing: false,
      pushNotifications: true,
      offlineMode: false
    },
    audioSettings: {
      sampleRate: 16000,
      chunkSize: 640,
      format: 'webm'
    }
  },
  ios: {
    platform: 'ios',
    version: '1.0.0',
    capabilities: {
      audioRecording: true,
      fileExport: true,
      backgroundProcessing: false,
      pushNotifications: true,
      offlineMode: true
    },
    audioSettings: {
      sampleRate: 16000,
      chunkSize: 640,
      format: 'mp4'
    }
  },
  android: {
    platform: 'android',
    version: '1.0.0',
    capabilities: {
      audioRecording: true,
      fileExport: true,
      backgroundProcessing: true,
      pushNotifications: true,
      offlineMode: true
    },
    audioSettings: {
      sampleRate: 16000,
      chunkSize: 640,
      format: 'webm'
    }
  }
}