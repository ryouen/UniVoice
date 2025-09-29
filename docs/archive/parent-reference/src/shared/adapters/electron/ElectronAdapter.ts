// Electron Platform Adapter Implementation
// Handles desktop-specific audio processing, storage, and translation services

import { 
  PlatformAdapter, 
  AudioProcessor, 
  TranslationService, 
  StorageService,
  PlatformUIComponents,
  AudioProcessingResult,
  TranslationResult,
  PlatformError,
  DEFAULT_CONFIGS
} from '../index'
import { PlatformConfig } from '../../core/types/session'

// Electron-specific audio processor using whisper-node or MediaRecorder
export class ElectronAudioProcessor implements AudioProcessor {
  public isRecording: boolean = false
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm'
      })
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }
      
      this.mediaRecorder.start(640) // 640ms chunks as per UniVoice spec
      this.isRecording = true
      
      console.log('[Electron AudioProcessor] Started recording')
    } catch (error) {
      throw new PlatformError(
        `Failed to start recording: ${error}`,
        'electron',
        'AUDIO_START_FAILED',
        true
      )
    }
  }

  async stopRecording(): Promise<void> {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      this.stream?.getTracks().forEach(track => track.stop())
      this.isRecording = false
      
      console.log('[Electron AudioProcessor] Stopped recording')
    }
  }

  async processAudioChunk(audioData: Blob): Promise<AudioProcessingResult> {
    try {
      // Convert blob to base64 for Electron API
      const reader = new FileReader()
      
      return new Promise((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1]
            
            // Use Electron API for audio analysis (whisper integration)
            const result = await window.electronAPI.analyzeAudioFromBase64(base64Data, audioData.type)
            
            // Convert to standardized format
            const processedResult: AudioProcessingResult = {
              text: result.text || '',
              language: this.detectLanguageFromText(result.text || ''),
              confidence: result.confidence || 0.8,
              segments: result.segments || []
            }
            
            console.log('[Electron AudioProcessor] Processed chunk:', processedResult.text.substring(0, 50))
            resolve(processedResult)
            
          } catch (error) {
            reject(new PlatformError(
              `Audio processing failed: ${error}`,
              'electron',
              'AUDIO_PROCESS_FAILED',
              true
            ))
          }
        }
        
        reader.onerror = () => {
          reject(new PlatformError(
            'Failed to read audio data',
            'electron',
            'AUDIO_READ_FAILED',
            true
          ))
        }
        
        reader.readAsDataURL(audioData)
      })
      
    } catch (error) {
      throw new PlatformError(
        `Audio chunk processing failed: ${error}`,
        'electron',
        'AUDIO_CHUNK_FAILED',
        true
      )
    }
  }

  private detectLanguageFromText(text: string): 'ja' | 'en' | 'auto' {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
    const englishRegex = /[A-Za-z]/
    
    const hasJapanese = japaneseRegex.test(text)
    const hasEnglish = englishRegex.test(text)
    
    if (hasJapanese && hasEnglish) return 'auto'
    if (hasJapanese) return 'ja'
    if (hasEnglish) return 'en'
    return 'auto'
  }

  cleanup(): void {
    if (this.isRecording) {
      this.stopRecording()
    }
    this.audioChunks = []
    this.stream = null
    this.mediaRecorder = null
  }
}

// Electron translation service using Gemini API
export class ElectronTranslationService implements TranslationService {
  private apiKey: string | null = null

  constructor() {
    // Get API key from Electron secure storage or environment
    this.apiKey = process.env.GEMINI_API_KEY || null
  }

  async translateText(
    text: string, 
    sourceLanguage: 'ja' | 'en', 
    targetLanguage: 'ja' | 'en'
  ): Promise<TranslationResult> {
    if (!this.apiKey) {
      throw new PlatformError(
        'Gemini API key not configured',
        'electron',
        'API_KEY_MISSING',
        false
      )
    }

    try {
      // Use Electron API for secure Gemini translation
      const result = await window.electronAPI.translateText({
        text,
        sourceLang: sourceLanguage,
        targetLang: targetLanguage
      })

      if (!result.success) {
        throw new Error(result.error || 'Translation failed')
      }

      return {
        originalText: text,
        translatedText: result.translatedText,
        sourceLanguage,
        targetLanguage,
        confidence: 0.9 // Fixed confidence score
      }
      
    } catch (error) {
      throw new PlatformError(
        `Translation failed: ${error}`,
        'electron',
        'TRANSLATION_FAILED',
        true
      )
    }
  }

  async detectLanguage(text: string): Promise<'ja' | 'en' | 'auto'> {
    // Use simple regex-based detection for now
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
    const englishRegex = /[A-Za-z]/
    
    const japaneseChars = (text.match(japaneseRegex) || []).length
    const englishChars = (text.match(englishRegex) || []).length
    
    if (japaneseChars > englishChars) return 'ja'
    if (englishChars > japaneseChars) return 'en'
    return 'auto'
  }

  isAvailable(): boolean {
    return this.apiKey !== null && typeof window.electronAPI?.translateText === 'function'
  }
}

// Electron storage service using local file system
export class ElectronStorageService implements StorageService {
  
  async saveSession(sessionData: any): Promise<string> {
    try {
      const result = await window.electronAPI.saveSession(sessionData)
      
      if (!result.success) {
        throw new Error(result.error || 'Save failed')
      }
      
      console.log('[Electron Storage] Saved session to:', result.filePath)
      return result.filePath || 'session_saved'
      
    } catch (error) {
      throw new PlatformError(
        `Failed to save session: ${error}`,
        'electron',
        'STORAGE_SAVE_FAILED',
        true
      )
    }
  }

  async loadSession(_sessionId: string): Promise<any> {
    try {
      const result = await window.electronAPI.loadSession()
      
      if (!result.success) {
        throw new Error(result.error || 'Load failed')
      }
      
      console.log('[Electron Storage] Loaded session from:', result.filePath)
      return result.sessionData
      
    } catch (error) {
      throw new PlatformError(
        `Failed to load session: ${error}`,
        'electron',
        'STORAGE_LOAD_FAILED',
        true
      )
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      // For now, deleteSession is not implemented in IPC
      // This would require additional file system operations
      console.log('[Electron Storage] Delete session not implemented:', sessionId)
      throw new Error('Delete session not implemented')
      
    } catch (error) {
      throw new PlatformError(
        `Failed to delete session: ${error}`,
        'electron',
        'STORAGE_DELETE_FAILED',
        true
      )
    }
  }

  async listSessions(): Promise<string[]> {
    try {
      // For now, listSessions is not implemented in IPC
      // This would require additional file system operations
      console.log('[Electron Storage] List sessions not implemented')
      return []
      
    } catch (error) {
      throw new PlatformError(
        `Failed to list sessions: ${error}`,
        'electron',
        'STORAGE_LIST_FAILED',
        true
      )
    }
  }

  async exportSession(sessionId: string, format: 'json' | 'docx' | 'txt'): Promise<string> {
    try {
      // For now, export is handled by the existing Word export functionality
      console.log(`[Electron Storage] Export session ${sessionId} to ${format} not implemented`)
      throw new Error('Export session not implemented - use exportLectureToWord instead')
      
    } catch (error) {
      throw new PlatformError(
        `Failed to export session: ${error}`,
        'electron',
        'STORAGE_EXPORT_FAILED',
        true
      )
    }
  }
}

// Main Electron adapter implementation
export class ElectronAdapter implements PlatformAdapter {
  public config: PlatformConfig
  public audioProcessor: AudioProcessor
  public translationService: TranslationService
  public storageService: StorageService

  constructor() {
    this.config = DEFAULT_CONFIGS.electron
    this.audioProcessor = new ElectronAudioProcessor()
    this.translationService = new ElectronTranslationService()
    this.storageService = new ElectronStorageService()
  }

  async initialize(): Promise<void> {
    try {
      // Check if all Electron APIs are available
      if (!window.electronAPI) {
        throw new Error('Electron APIs not available')
      }

      // Verify audio capabilities
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Audio recording not supported')
      }

      console.log('[Electron Adapter] Initialized successfully')
      
    } catch (error) {
      throw new PlatformError(
        `Electron adapter initialization failed: ${error}`,
        'electron',
        'INIT_FAILED',
        false
      )
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Test microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      return true
      
    } catch (error) {
      console.error('[Electron Adapter] Permission denied:', error)
      return false
    }
  }

  getUIComponents(): PlatformUIComponents {
    // Return Electron-specific UI components
    // These would be implemented separately
    return {
      AudioControls: {} as any, // TODO: Implement
      ExportButton: {} as any,  // TODO: Implement
      SessionManager: {} as any // TODO: Implement
    }
  }
}

// Export factory function
export function createElectronAdapter(): ElectronAdapter {
  return new ElectronAdapter()
}