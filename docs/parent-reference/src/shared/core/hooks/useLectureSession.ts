// UniVoice Core Hook - Platform Independent
// Shared state management for lecture sessions across all platforms

import { useState, useRef, useCallback } from 'react'
import { LectureSession, LectureSegment, SessionStats } from '../types/session'

export const useLectureSession = () => {
  const [currentSession, setCurrentSession] = useState<LectureSession | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const segmentCounter = useRef(0)

  // Generate unique session ID
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const startSession = useCallback((title: string, subject?: string) => {
    const session: LectureSession = {
      sessionId: generateSessionId(),
      title,
      subject,
      startTime: Date.now(),
      segments: [],
      version: '1.0.0' // Version for data migration support
    }
    setCurrentSession(session)
    segmentCounter.current = 0
    console.log('[UniVoice Core] Started new session:', title, 'ID:', session.sessionId)
  }, [generateSessionId])

  const endSession = useCallback(() => {
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        endTime: Date.now()
      }
      setCurrentSession(updatedSession)
      console.log('[UniVoice Core] Ended session with', updatedSession.segments.length, 'segments')
      return updatedSession
    }
    return null
  }, [currentSession])

  const addSegment = useCallback((
    text: string, 
    isStudentUtterance: boolean = false,
    translatedText?: string,
    language?: 'ja' | 'en' | 'auto'
  ) => {
    if (!currentSession) {
      console.warn('[UniVoice Core] No active session to add segment to')
      return
    }

    const timestamp = Date.now() - currentSession.startTime
    const segment: LectureSegment = {
      text,
      timestamp,
      speaker: isStudentUtterance ? 'student' : 'instructor',
      isStudentUtterance,
      translatedText,
      language
    }

    setCurrentSession(prev => {
      if (!prev) return prev
      
      const updatedSegments = [...prev.segments, segment]
      console.log(`[UniVoice Core] Added segment #${segmentCounter.current + 1}:`, text.substring(0, 50) + '...')
      segmentCounter.current++
      
      return {
        ...prev,
        segments: updatedSegments
      }
    })

    return segment
  }, [currentSession])

  const updateSegmentTranslation = useCallback((segmentIndex: number, translatedText: string) => {
    if (!currentSession) return

    setCurrentSession(prev => {
      if (!prev || segmentIndex >= prev.segments.length) return prev
      
      const updatedSegments = [...prev.segments]
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        translatedText
      }
      
      return {
        ...prev,
        segments: updatedSegments
      }
    })
  }, [currentSession])

  const updateSessionMetadata = useCallback((updates: Partial<Pick<LectureSession, 'title' | 'subject'>>) => {
    if (!currentSession) return

    setCurrentSession(prev => {
      if (!prev) return prev
      return { ...prev, ...updates }
    })
  }, [currentSession])

  const clearSession = useCallback(() => {
    setCurrentSession(null)
    segmentCounter.current = 0
    setIsRecording(false)
    console.log('[UniVoice Core] Cleared session')
  }, [])

  const getSessionDuration = useCallback(() => {
    if (!currentSession) return 0
    const endTime = currentSession.endTime || Date.now()
    return Math.floor((endTime - currentSession.startTime) / 1000)
  }, [currentSession])

  const getSessionStats = useCallback((): SessionStats => {
    if (!currentSession) {
      return {
        totalSegments: 0,
        studentUtterances: 0,
        duration: 0,
        wordCount: 0,
        averageSegmentLength: 0,
        languageDistribution: {
          japanese: 0,
          english: 0,
          mixed: 0
        }
      }
    }

    const studentUtterances = currentSession.segments.filter(s => s.isStudentUtterance).length
    const wordCount = currentSession.segments.reduce((total, segment) => {
      return total + segment.text.split(/\s+/).filter(word => word.length > 0).length
    }, 0)

    const averageSegmentLength = currentSession.segments.length > 0 
      ? wordCount / currentSession.segments.length 
      : 0

    // Language distribution analysis
    const languageDistribution = currentSession.segments.reduce((dist, segment) => {
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(segment.text)
      const hasEnglish = /[A-Za-z]/.test(segment.text)
      
      if (hasJapanese && hasEnglish) {
        dist.mixed++
      } else if (hasJapanese) {
        dist.japanese++
      } else if (hasEnglish) {
        dist.english++
      }
      
      return dist
    }, { japanese: 0, english: 0, mixed: 0 })

    return {
      totalSegments: currentSession.segments.length,
      studentUtterances,
      duration: getSessionDuration(),
      wordCount,
      averageSegmentLength: Math.round(averageSegmentLength * 100) / 100,
      languageDistribution
    }
  }, [currentSession, getSessionDuration])

  const canExport = useCallback(() => {
    return currentSession && currentSession.segments.length > 0
  }, [currentSession])

  const exportSessionData = useCallback(() => {
    if (!currentSession) return null
    
    return {
      ...currentSession,
      exportedAt: Date.now(),
      stats: getSessionStats()
    }
  }, [currentSession, getSessionStats])

  // Search functionality for segments
  const searchSegments = useCallback((query: string) => {
    if (!currentSession || !query.trim()) return []
    
    const lowercaseQuery = query.toLowerCase()
    return currentSession.segments.filter(segment => 
      segment.text.toLowerCase().includes(lowercaseQuery) ||
      segment.translatedText?.toLowerCase().includes(lowercaseQuery)
    )
  }, [currentSession])

  return {
    // Core state
    currentSession,
    isRecording,
    setIsRecording,
    
    // Session management
    startSession,
    endSession,
    clearSession,
    
    // Segment management
    addSegment,
    updateSegmentTranslation,
    searchSegments,
    
    // Metadata management
    updateSessionMetadata,
    
    // Analytics
    getSessionDuration,
    getSessionStats,
    
    // Export functionality
    canExport,
    exportSessionData
  }
}