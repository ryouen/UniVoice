// UniVoice Core Component - Platform Independent Lecture Session Manager
// Shared UI logic across Electron, Web PWA, and Capacitor platforms

import React, { useState, useEffect } from 'react'
import { Play, Square, BookOpen, FileText, Clock, Mic, Users } from 'lucide-react'
import { useLectureSession } from '../hooks/useLectureSession'
import { PlatformAdapter, AudioProcessingResult, TranslationResult } from '../../adapters'

interface LectureSessionManagerProps {
  platformAdapter: PlatformAdapter
  onAudioResult?: (result: AudioProcessingResult) => void
  onTranslationResult?: (result: TranslationResult) => void
  onError?: (error: Error) => void
}

export const LectureSessionManager: React.FC<LectureSessionManagerProps> = ({
  platformAdapter,
  onAudioResult,
  onTranslationResult,
  onError
}) => {
  const {
    currentSession,
    isRecording,
    setIsRecording,
    startSession,
    endSession,
    addSegment,
    updateSegmentTranslation,
    updateSessionMetadata,
    clearSession,
    getSessionStats,
    canExport,
    exportSessionData
  } = useLectureSession()

  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionSubject, setSessionSubject] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [latestRecognition, setLatestRecognition] = useState<string>('')
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const stats = getSessionStats()

  // Initialize platform adapter on mount and auto-start session
  useEffect(() => {
    const initializePlatform = async () => {
      try {
        await platformAdapter.initialize()
        const hasPermissions = await platformAdapter.requestPermissions()
        
        if (!hasPermissions) {
          onError?.(new Error('Audio permissions not granted'))
        }
        
        // Auto-start session with default title
        if (!currentSession) {
          const defaultTitle = `講義 ${new Date().toLocaleString('ja-JP', { 
            month: 'numeric', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: 'numeric' 
          })}`
          startSession(defaultTitle)
        }
      } catch (error) {
        onError?.(error as Error)
      }
    }

    initializePlatform()
  }, [platformAdapter, onError, currentSession, startSession])

  // Update recording duration
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      const interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000))
      }, 100) // Update every 100ms for smooth display
      
      return () => clearInterval(interval)
    }
  }, [isRecording, recordingStartTime])

  // Audio processing handler
  const handleRecordingToggle = async () => {
    if (!isRecording) {
      try {
        await platformAdapter.audioProcessor.startRecording()
        setIsRecording(true)
        setRecordingStartTime(Date.now())
        setRecordingDuration(0)
        console.log('[UniVoice Core] Started recording')
        
        // Set up audio chunk processing
        setupAudioProcessing()
        
      } catch (error) {
        console.error('[UniVoice Core] Failed to start recording:', error)
        onError?.(error as Error)
      }
    } else {
      try {
        await platformAdapter.audioProcessor.stopRecording()
        setIsRecording(false)
        setRecordingStartTime(null)
        console.log('[UniVoice Core] Stopped recording')
        
      } catch (error) {
        console.error('[UniVoice Core] Failed to stop recording:', error)
        onError?.(error as Error)
      }
    }
  }

  const setupAudioProcessing = () => {
    // This would be platform-specific implementation
    // For now, we'll use a simple polling approach
    const processAudioChunks = async () => {
      if (!isRecording || !currentSession) return

      try {
        setIsProcessing(true)
        
        // Platform adapter handles the actual audio processing
        // This is a simplified version - real implementation would handle
        // continuous audio stream processing
        
        setIsProcessing(false)
      } catch (error) {
        console.error('[UniVoice Core] Audio processing error:', error)
        setIsProcessing(false)
        onError?.(error as Error)
      }
    }

    // Set up interval for audio processing (this is simplified)
    const interval = setInterval(processAudioChunks, 1000)
    
    // Cleanup on unmount or recording stop
    return () => {
      clearInterval(interval)
    }
  }

  // Process audio result and add to session
  const handleAudioProcessingResult = async (result: AudioProcessingResult) => {
    if (!currentSession) return

    try {
      // Update latest recognition for real-time display
      setLatestRecognition(result.text)
      
      // Detect if this is a student utterance
      const isStudentUtterance = /質問|わからない|すみません|教えて|どう|なぜ|why|how|question/i.test(result.text)
      
      // Add segment to session
      const segment = addSegment(
        result.text,
        isStudentUtterance,
        undefined, // Translation will be added separately
        result.language
      )

      // Trigger translation if translation service is available
      if (platformAdapter.translationService.isAvailable() && segment) {
        await handleTranslation(result.text, result.language || 'auto')
      }

      // Notify parent component
      onAudioResult?.(result)
      
    } catch (error) {
      console.error('[UniVoice Core] Failed to process audio result:', error)
      onError?.(error as Error)
    }
  }

  // Handle translation of recognized text
  const handleTranslation = async (text: string, detectedLanguage: 'ja' | 'en' | 'auto') => {
    if (!platformAdapter.translationService.isAvailable()) return

    try {
      setIsTranslating(true)
      
      // Determine source and target languages
      let sourceLanguage: 'ja' | 'en' = 'en'
      let targetLanguage: 'ja' | 'en' = 'ja'
      
      if (detectedLanguage === 'ja') {
        sourceLanguage = 'ja'
        targetLanguage = 'en'
      } else if (detectedLanguage === 'auto') {
        // Use translation service's language detection
        const detectedLang = await platformAdapter.translationService.detectLanguage(text)
        sourceLanguage = detectedLang === 'auto' ? 'en' : detectedLang // Default to 'en' if still 'auto'
        targetLanguage = sourceLanguage === 'ja' ? 'en' : 'ja'
      }

      // Skip translation if source and target are the same
      if (sourceLanguage === targetLanguage) {
        setIsTranslating(false)
        return
      }

      // Perform translation
      const translationResult = await platformAdapter.translationService.translateText(
        text,
        sourceLanguage,
        targetLanguage
      )

      // Update the most recent segment with translation
      if (currentSession && currentSession.segments.length > 0) {
        const lastSegmentIndex = currentSession.segments.length - 1
        updateSegmentTranslation(lastSegmentIndex, translationResult.translatedText)
      }

      // Notify parent component
      onTranslationResult?.(translationResult)
      
      setIsTranslating(false)
      
    } catch (error) {
      console.error('[UniVoice Core] Translation failed:', error)
      setIsTranslating(false)
      onError?.(error as Error)
    }
  }

  const handleStartSession = () => {
    if (sessionTitle.trim()) {
      startSession(sessionTitle.trim(), sessionSubject.trim() || undefined)
      setShowSessionForm(false)
      setSessionTitle('')
      setSessionSubject('')
    }
  }

  const handleEndSession = () => {
    // Stop recording if active
    if (isRecording) {
      handleRecordingToggle()
    }
    
    const finalSession = endSession()
    if (finalSession) {
      console.log('[UniVoice Core] Session ended:', finalSession)
    }
  }

  const handleExport = async (format: 'json' | 'docx' | 'txt') => {
    if (!currentSession || !canExport()) return

    try {
      const sessionData = exportSessionData()
      if (sessionData) {
        const filePath = await platformAdapter.storageService.exportSession(
          sessionData.sessionId,
          format
        )
        console.log('[UniVoice Core] Session exported to:', filePath)
      }
    } catch (error) {
      console.error('[UniVoice Core] Export failed:', error)
      onError?.(error as Error)
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Real-time Recognition Display */}
      {isRecording && (
        <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-4 border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium flex items-center">
              <Mic className="w-4 h-4 mr-2 animate-pulse" />
              録音中 - {formatDuration(recordingDuration)}
            </h4>
          </div>
          {latestRecognition && (
            <div className="bg-black/20 rounded-lg p-3 text-white text-sm leading-relaxed">
              {latestRecognition}
            </div>
          )}
        </div>
      )}

      {/* Session Control */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
        {!currentSession ? (
          // Session Start Form
          <div className="space-y-3">
            {!showSessionForm ? (
              <button
                onClick={() => setShowSessionForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>講義セッション開始</span>
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="講義タイトル (例: 機械学習基礎 第3回)"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="科目名 (オプション: 例: コンピュータサイエンス)"
                  value={sessionSubject}
                  onChange={(e) => setSessionSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleStartSession}
                    disabled={!sessionTitle.trim()}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>開始</span>
                  </button>
                  <button
                    onClick={() => setShowSessionForm(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Active Session - 録音ボタンを最優先で表示
          <div className="space-y-3">
            {/* Recording Controls - 最初に表示 */}
            <div className="flex items-center justify-center">
              <button
                onClick={handleRecordingToggle}
                disabled={isProcessing}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium disabled:opacity-50`}
              >
                <Mic className="w-5 h-5" />
                <span>
                  {isProcessing ? '処理中...' : isRecording ? '録音停止' : '録音開始'}
                </span>
              </button>
            </div>

            {/* Session Info & Statistics */}
            <div className="text-center">
              <h3 className="text-white font-medium">{currentSession.title}</h3>
              {currentSession.subject && (
                <p className="text-white/70 text-sm">{currentSession.subject}</p>
              )}
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-white/10 rounded-lg p-2">
                <Clock className="w-4 h-4 mx-auto mb-1 text-white/70" />
                <div className="text-white text-sm font-medium">{formatDuration(stats.duration)}</div>
                <div className="text-white/70 text-xs">時間</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <FileText className="w-4 h-4 mx-auto mb-1 text-white/70" />
                <div className="text-white text-sm font-medium">{stats.totalSegments}</div>
                <div className="text-white/70 text-xs">セグメント</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <Users className="w-4 h-4 mx-auto mb-1 text-white/70" />
                <div className="text-white text-sm font-medium">{stats.studentUtterances}</div>
                <div className="text-white/70 text-xs">あなたの発言</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <BookOpen className="w-4 h-4 mx-auto mb-1 text-white/70" />
                <div className="text-white text-sm font-medium">{stats.wordCount}</div>
                <div className="text-white/70 text-xs">単語数</div>
              </div>
            </div>

            {/* Translation Status */}
            {isTranslating && (
              <div className="text-center text-white/70 text-sm">
                翻訳中...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Controls */}
      {canExport() && currentSession && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <h4 className="text-white font-medium mb-3">講義ノート作成</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('docx')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Word出力
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              JSON出力
            </button>
            <button
              onClick={() => handleExport('txt')}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              テキスト出力
            </button>
          </div>
        </div>
      )}
    </div>
  )
}