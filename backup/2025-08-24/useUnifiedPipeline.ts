/**
 * useUnifiedPipeline - New Architecture Hook
 * 
 * Responsibilities:
 * - Interface with new type-safe univoice API
 * - Manage pipeline state and events
 * - Provide clean interface for UI components
 * - Handle correlation IDs and error states
 * 
 * Key Changes from Original:
 * - Uses new univoice API instead of electronAPI
 * - Simplified state management (StreamCoalescer handles complexity)
 * - Type-safe event handling
 * - Removed complex smoothing utilities (handled by backend)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
// Import from shared types
import type { PipelineEvent } from '../shared/types/contracts';
import { SyncedRealtimeDisplayManager, SyncedDisplayPair } from '../utils/SyncedRealtimeDisplayManager';
import { FlexibleHistoryGrouper, HistoryBlock, HistorySentence } from '../utils/FlexibleHistoryGrouper';
import { IncrementalTextManager } from '../utils/IncrementalTextManager';
import { StreamBatcher } from '../utils/StreamBatcher';
import { RealtimeDisplayService, ThreeLineDisplay, DisplaySegment } from '../domain/services/RealtimeDisplayService';

// Types for UI compatibility
export interface Translation {
  id: string;
  original: string;
  japanese: string;
  timestamp: number;
  firstPaintMs: number;
  completeMs: number;
}

export interface Summary {
  id: string;
  english: string;
  japanese: string;
  wordCount: number;
  timestamp: number;
  timeRange: {
    start: number;
    end: number;
  };
}

// Re-export types for UI compatibility
export type DisplayPair = SyncedDisplayPair;

export interface PipelineState {
  status: 'idle' | 'starting' | 'running' | 'stopping' | 'stopped';
  currentSegmentId: string | null;
  wordCount: number;
  duration: number;
  startTime: number | null;
}

interface UseUnifiedPipelineOptions {
  sourceLanguage?: string;
  targetLanguage?: string;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
  onTranslation?: (translation: Translation) => void;
  onSummary?: (summary: Summary) => void;
}

export const useUnifiedPipeline = (options: UseUnifiedPipelineOptions = {}) => {
  const {
    sourceLanguage = 'en',
    targetLanguage = 'ja',
    onError,
    onStatusChange,
    onTranslation,
    onSummary
  } = options;

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [currentOriginal, setCurrentOriginal] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [displayPairs, setDisplayPairs] = useState<SyncedDisplayPair[]>([]);
  const [threeLineDisplay, setThreeLineDisplay] = useState<ThreeLineDisplay>({}); // 3段階表示用
  const [history, setHistory] = useState<Translation[]>([]);
  const [historyBlocks, setHistoryBlocks] = useState<HistoryBlock[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [vocabulary, setVocabulary] = useState<{ term: string; definition: string; context?: string }[]>([]);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [state, setState] = useState<PipelineState>({
    status: 'idle',
    currentSegmentId: null,
    wordCount: 0,
    duration: 0,
    startTime: null
  });
  
  // 言語設定を状態として管理（動的更新対応）
  const [currentSourceLanguage, setCurrentSourceLanguage] = useState(sourceLanguage);
  const [currentTargetLanguage, setCurrentTargetLanguage] = useState(targetLanguage);
  
  // Manager instances
  const displayManagerRef = useRef<SyncedRealtimeDisplayManager | null>(null);
  const realtimeDisplayServiceRef = useRef<RealtimeDisplayService | null>(null); // 3段階表示用
  const historyGrouperRef = useRef<FlexibleHistoryGrouper | null>(null);
  const originalTextManagerRef = useRef<IncrementalTextManager | null>(null);
  const translationTextManagerRef = useRef<IncrementalTextManager | null>(null);
  const streamBatcherRef = useRef<StreamBatcher | null>(null);

  // Refs for cleanup and correlation
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const currentCorrelationId = useRef<string | null>(null);
  const _segmentBuffer = useRef<Map<string, { original?: string; translation?: string }>>(new Map());
  
  // Refs for state setters to avoid closure issues
  const setCurrentOriginalRef = useRef(setCurrentOriginal);
  const setCurrentTranslationRef = useRef(setCurrentTranslation);
  
  // Update refs when setters change
  useEffect(() => {
    setCurrentOriginalRef.current = setCurrentOriginal;
    
    // IncrementalTextManagerのコールバックも更新
    if (originalTextManagerRef.current) {
      originalTextManagerRef.current.setOnUpdate((text, isStable) => {
        console.log('[TextManager] Original text update (dynamic):', text?.substring(0, 50), isStable);
        setCurrentOriginal(text);
      });
    }
  }, [setCurrentOriginal]);
  
  useEffect(() => {
    setCurrentTranslationRef.current = setCurrentTranslation;
    
    // IncrementalTextManagerのコールバックも更新
    if (translationTextManagerRef.current) {
      translationTextManagerRef.current.setOnUpdate((text, isStable) => {
        console.log('[TextManager] Translation text update (dynamic):', text?.substring(0, 50), isStable);
        setCurrentTranslation(text);
      });
    }
    
    // StreamBatcherのコールバックも更新
    if (streamBatcherRef.current && translationTextManagerRef.current) {
      streamBatcherRef.current.setOnBatch((batch) => {
        if (translationTextManagerRef.current) {
          translationTextManagerRef.current.update(batch);
        }
      });
    }
  }, [setCurrentTranslation]);
  
  // Initialize Managers
  useEffect(() => {
    // Initialize SyncedRealtimeDisplayManager
    if (!displayManagerRef.current) {
      displayManagerRef.current = new SyncedRealtimeDisplayManager(
        (pairs) => {
          console.log('[useUnifiedPipeline] displayPairs更新:', pairs.length, pairs);
          setDisplayPairs(pairs);
        }
      );
    }
    
    // Initialize RealtimeDisplayService for 3-line display
    if (!realtimeDisplayServiceRef.current) {
      realtimeDisplayServiceRef.current = new RealtimeDisplayService(
        (display) => {
          console.log('[useUnifiedPipeline] 3段階表示更新:', display);
          setThreeLineDisplay(display);
        }
      );
    }
    
    // Initialize FlexibleHistoryGrouper
    if (!historyGrouperRef.current) {
      historyGrouperRef.current = new FlexibleHistoryGrouper(
        (block) => {
          setHistoryBlocks(prev => [...prev, block]);
          
          // 履歴ブロックをメインプロセスに送信（自動保存のため）
          if (window.electron?.send) {
            window.electron.send('history-block-created', block);
            console.log('[useUnifiedPipeline] History block sent to main process:', block.id);
          }
        }
      );
    }
    
    // Initialize IncrementalTextManager for original text
    if (!originalTextManagerRef.current) {
      originalTextManagerRef.current = new IncrementalTextManager(
        (text, isStable) => {
          console.log('[TextManager] Original text update (init):', text?.substring(0, 50), isStable);
          // 初期化時は直接setStateを使用（後でuseEffectで更新される）
          setCurrentOriginal(text);
        },
        800 // 0.8秒で確定
      );
    }
    
    // Initialize IncrementalTextManager for translation
    if (!translationTextManagerRef.current) {
      translationTextManagerRef.current = new IncrementalTextManager(
        (text, isStable) => {
          console.log('[TextManager] Translation text update (init):', text?.substring(0, 50), isStable);
          // 初期化時は直接setStateを使用（後でuseEffectで更新される）
          setCurrentTranslation(text);
        },
        1000 // 1秒で確定
      );
    }
    
    // Initialize StreamBatcher for translation streaming
    if (!streamBatcherRef.current) {
      streamBatcherRef.current = new StreamBatcher(
        (batch) => {
          if (translationTextManagerRef.current) {
            translationTextManagerRef.current.update(batch);
          }
        },
        {
          minInterval: 100,
          maxWait: 200,
          minChars: 2
        }
      );
    }
    
    return () => {
      if (displayManagerRef.current) {
        displayManagerRef.current.destroy();
        displayManagerRef.current = null;
      }
      if (historyGrouperRef.current) {
        historyGrouperRef.current.reset();
        historyGrouperRef.current = null;
      }
      if (originalTextManagerRef.current) {
        originalTextManagerRef.current.reset();
        originalTextManagerRef.current = null;
      }
      if (translationTextManagerRef.current) {
        translationTextManagerRef.current.reset();
        translationTextManagerRef.current = null;
      }
      if (streamBatcherRef.current) {
        streamBatcherRef.current.reset();
        streamBatcherRef.current = null;
      }
    };
  }, []);

  // Generate correlation ID
  const generateCorrelationId = useCallback(() => {
    return window.univoice?.generateCorrelationId() || `hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Segment tracking for translation completion
  const segmentTranslationMap = useRef<Map<string, { original: string; translation: string }>>(new Map());
  
  // 履歴に追加済みのセグメントIDを追跡
  const addedToHistorySet = useRef<Set<string>>(new Set());
  
  // FlexibleHistoryGrouperに追加済みのセグメントIDを追跡
  const addedToGrouperSet = useRef<Set<string>>(new Set());

  // Event handlers
  const handlePipelineEvent = useCallback((event: PipelineEvent) => {
    // イベント受信ログ（デバッグ用）
    console.log('[useUnifiedPipeline] Event received:', event.type, event.correlationId, event.data);

    switch (event.type) {
      case 'asr':
        console.log('[ASR] displayManagerRef.current:', !!displayManagerRef.current, 'segmentId:', event.data.segmentId);
        console.log('[Display Debug] ASR Event:', {
          text: event.data.text?.substring(0, 50) + '...',
          isFinal: event.data.isFinal,
          currentOriginal: currentOriginal?.substring(0, 50) + '...',
          threeLineRecent: threeLineDisplay.recent?.original?.substring(0, 50) + '...'
        });
        
        // Only update display when final (no interim noise)
        if (displayManagerRef.current && event.data.segmentId) {
          console.log('[ASR] Calling updateOriginal:', event.data.text, event.data.isFinal, event.data.segmentId);
          displayManagerRef.current.updateOriginal(
            event.data.text, 
            event.data.isFinal, 
            event.data.segmentId
          );
          
          // Track segment for translation pairing
          if (event.data.isFinal) {
            segmentTranslationMap.current.set(event.data.segmentId, {
              original: event.data.text,
              translation: ''
            });
          }
        } else {
          console.warn('[ASR] Cannot update - displayManager:', !!displayManagerRef.current, 'segmentId:', event.data.segmentId);
        }
        
        // Update RealtimeDisplayService for 3-line display
        if (realtimeDisplayServiceRef.current) {
          realtimeDisplayServiceRef.current.updateOriginal(event.data.text, event.data.isFinal);
        }
        
        // Update current display (for compatibility)
        if (originalTextManagerRef.current) {
          console.log('[Display Debug] Updating currentOriginal:', event.data.text?.substring(0, 50) + '...', 'isFinal:', event.data.isFinal);
          originalTextManagerRef.current.update(event.data.text);
        }
        break;

      case 'translation':
        console.log('[useUnifiedPipeline] Translation event received:', event.data);
        
        // Update display with translation
        if (displayManagerRef.current && event.data.translatedText && event.data.segmentId) {
          displayManagerRef.current.updateTranslation(
            event.data.translatedText,
            event.data.segmentId
          );
          
          // Update segment map
          const segment = segmentTranslationMap.current.get(event.data.segmentId);
          if (segment) {
            segment.translation = event.data.translatedText;
          }
        }
        
        // Update RealtimeDisplayService for 3-line display
        if (realtimeDisplayServiceRef.current && event.data.translatedText) {
          realtimeDisplayServiceRef.current.updateTranslation(event.data.translatedText);
        }

        // Handle translation completion
        if (event.data.isFinal && event.data.segmentId) {
          // Mark translation as complete (starts 1.5s removal timer)
          if (displayManagerRef.current) {
            displayManagerRef.current.completeTranslation(event.data.segmentId);
          }
          
          // Get complete segment data
          const segment = segmentTranslationMap.current.get(event.data.segmentId);
          if (segment && segment.original && segment.translation) {
            // Add to FlexibleHistoryGrouper
            if (historyGrouperRef.current && !addedToGrouperSet.current.has(event.data.segmentId)) {
              historyGrouperRef.current.addSentence({
                id: event.data.segmentId,
                original: segment.original,
                translation: segment.translation,
                timestamp: event.timestamp
              });
              addedToGrouperSet.current.add(event.data.segmentId);
            }
            
            // Add to regular history (for backward compatibility)
            if (!addedToHistorySet.current.has(event.data.segmentId)) {
              addedToHistorySet.current.add(event.data.segmentId);
              
              const translation: Translation = {
                id: event.data.segmentId,
                original: event.data.originalText,
                japanese: event.data.translatedText,
                timestamp: event.timestamp,
                firstPaintMs: 0,
                completeMs: Date.now()
              };
              
              setHistory(prev => {
                const exists = prev.some(item => item.id === translation.id);
                if (exists) {
                  console.log('[useUnifiedPipeline] Translation already in history, skipping:', translation.id);
                  return prev;
                }
                return [...prev, translation];
              });
              
              if (onTranslation) {
                onTranslation(translation);
              }
            }
          }
          
          // Clean up segment map
          segmentTranslationMap.current.delete(event.data.segmentId);
        }
        
        // Update current display for compatibility
        if (event.data.translatedText && translationTextManagerRef.current) {
          console.log('[Display Debug] Updating currentTranslation (all events):', {
            text: event.data.translatedText?.substring(0, 50) + '...',
            isFinal: event.data.isFinal
          });
          translationTextManagerRef.current.update(event.data.translatedText);
        }
        break;

      case 'segment':
        // Segment events are now handled through ASR/Translation events
        // 停止時の重複イベントをスキップ
        if (state.status === 'stopping' || state.status === 'stopped') {
          break;
        }
        console.log('[useUnifiedPipeline] Segment event (legacy):', event.data);
        break;
        
      case 'summary':
        // Handle progressive summarization
        console.log('[useUnifiedPipeline] Summary event:', event.data);
        
        if (event.data.english && event.data.japanese) {
          const summary: Summary = {
            id: `summary-${Date.now()}`,
            english: event.data.english,
            japanese: event.data.japanese,
            wordCount: event.data.wordCount || 0,
            timestamp: event.timestamp,
            timeRange: {
              start: event.data.startTime || 0,
              end: event.data.endTime || Date.now()
            }
          };
          
          setSummaries(prev => [...prev, summary]);
          
          // Call callback if provided
          if (onSummary) {
            onSummary(summary);
          }
        }
        break;

      case 'status':
        const newStatus = event.data.state;
        setState(prev => ({
          ...prev,
          status: newStatus as PipelineState['status']
        }));
        
        // 遷移状態（starting/stopping）でもisRunningを適切に管理
        setIsRunning(
          newStatus === 'listening' || 
          newStatus === 'processing' || 
          newStatus === 'starting' ||
          newStatus === 'stopping'
        );
        
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        break;

      case 'vocabulary':
        console.log('[useUnifiedPipeline] Vocabulary event:', event.data);
        
        if (event.data.items && Array.isArray(event.data.items)) {
          setVocabulary(event.data.items);
          console.log(`[useUnifiedPipeline] Vocabulary generated: ${event.data.totalTerms} terms`);
        }
        break;
        
      case 'finalReport':
        console.log('[useUnifiedPipeline] Final report event:', event.data);
        
        if (event.data.report) {
          setFinalReport(event.data.report);
          console.log(`[useUnifiedPipeline] Final report generated: ${event.data.totalWordCount} words`);
        }
        break;

      case 'error':
        const errorMessage = event.data.message;
        setError(errorMessage);
        setIsRunning(false);
        setState(prev => ({ ...prev, status: 'idle' }));
        
        if (onError) {
          onError(errorMessage);
        }
        
        console.error('[useUnifiedPipeline] Pipeline error:', errorMessage);
        break;

      default:
        console.warn('[useUnifiedPipeline] Unknown event type:', event);
    }
  }, [onError, onStatusChange, onTranslation, onSummary]);

  // handlePipelineEventへの最新の参照を保持
  const handlePipelineEventRef = useRef(handlePipelineEvent);
  handlePipelineEventRef.current = handlePipelineEvent;

  // Setup event listeners
  useEffect(() => {
    if (!window.univoice) {
      console.error('[useUnifiedPipeline] univoice API not available');
      setError('UniVoice API not available');
      return;
    }

    // Subscribe to pipeline events (refを使用)
    const unsubscribe = window.univoice.onPipelineEvent((event) => {
      handlePipelineEventRef.current(event);
    });
    cleanupFunctions.current.push(unsubscribe);
    
    // 親フォルダ互換イベントは削除済み
    // UniVoice 2.0は独立したアーキテクチャで動作

    // Cleanup on unmount
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, []); // 空の依存配列に変更 - マウント時のみ実行

  // Control functions
  const startFromMicrophone = useCallback(async () => {
    try {
      setError(null);
      setState(prev => ({ ...prev, status: 'starting' }));
      
      const correlationId = generateCorrelationId();
      currentCorrelationId.current = correlationId;
      
      console.log('[useUnifiedPipeline] Starting microphone with correlation:', correlationId);
      console.log('[useUnifiedPipeline] Languages:', { source: currentSourceLanguage, target: currentTargetLanguage });
      
      const result = await window.univoice.startListening({
        sourceLanguage: currentSourceLanguage,
        targetLanguage: currentTargetLanguage,
        correlationId
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to start listening');
      }
      
      // Start audio capture
      await startAudioCapture();
      
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start microphone';
      setError(errorMsg);
      setState(prev => ({ ...prev, status: 'idle' }));
      console.error('[useUnifiedPipeline] Start failed:', err);
      
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [currentSourceLanguage, currentTargetLanguage, generateCorrelationId, onError]);

  const stop = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'stopping' }));
      
      if (currentCorrelationId.current) {
        const result = await window.univoice.stopListening({
          correlationId: currentCorrelationId.current
        });
        
        if (!result.success) {
          console.warn('[useUnifiedPipeline] Stop warning:', result.error);
        }
      }
      
      // Stop audio capture
      stopAudioCapture();
      
      setIsRunning(false);
      setState(prev => ({ ...prev, status: 'stopped' }));
      currentCorrelationId.current = null;
      
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to stop pipeline';
      setError(errorMsg);
      console.error('[useUnifiedPipeline] Stop failed:', err);
      
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [onError]);

  const translateUserInput = useCallback(async (text: string, from: string = 'ja', to: string = 'en'): Promise<string> => {
    try {
      // For now, use a simple translation approach
      // In the future, this could be enhanced with the pipeline service
      console.log('[useUnifiedPipeline] Translating user input:', text);
      
      // Placeholder implementation - in real scenario, this would call the pipeline service
      if (from === 'ja' && to === 'en') {
        return `Could you explain more about "${text}"?`;
      } else if (from === 'en' && to === 'ja') {
        return `「${text}」について詳しく教えてください。`;
      }
      
      return `Translation: ${text}`;
      
    } catch (err: any) {
      const errorMsg = err.message || 'Translation failed';
      setError(errorMsg);
      console.error('[useUnifiedPipeline] User translation failed:', err);
      
      if (onError) {
        onError(errorMsg);
      }
      
      return '';
    }
  }, [onError]);

  // Audio capture functions
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startAudioCapture = useCallback(async () => {
    try {
      console.log('[useUnifiedPipeline] Starting audio capture...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          channelCount: 1, 
          sampleRate: 16000, 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: false
        }
      });
      
      mediaStreamRef.current = stream;
      
      // Setup Web Audio API
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = ctx;
      
      const source = ctx.createMediaStreamSource(stream);
      const frameSamples = 512; // 32ms @16k
      // TODO: AudioWorkletNodeへの移行を検討（ScriptProcessorNodeは非推奨）
      // 現在はScriptProcessorNodeを使用（互換性のため）
      const processor = ctx.createScriptProcessor(frameSamples, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const input = e.inputBuffer.getChannelData(0) as Float32Array;
        
        // Debug: 音声処理が呼ばれているか確認（1秒に1回程度）
        if (Math.random() < 0.02) {
          console.log('[AudioCapture] Processing audio, input length:', input.length);
        }
        
        // Convert Float32 [-1,1] to PCM16LE
        const buf = new ArrayBuffer(input.length * 2);
        const view = new DataView(buf);
        
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        
        // Send to main process
        if (window.electron?.sendAudioChunk) {
          window.electron.sendAudioChunk(buf);
          // Debug log - 1秒に1回程度
          if (Math.random() < 0.05) {
            console.log('[AudioCapture] Sending audio chunk:', buf.byteLength, 'bytes');
          }
        } else {
          console.error('[AudioCapture] window.electron.sendAudioChunk not available!');
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      
      console.log('[useUnifiedPipeline] Audio capture started successfully');
      
    } catch (err: any) {
      console.error('[useUnifiedPipeline] Audio capture failed:', err);
      throw err;
    }
  }, []);

  const stopAudioCapture = useCallback(() => {
    try {
      console.log('[useUnifiedPipeline] Stopping audio capture...');
      
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      console.log('[useUnifiedPipeline] Audio capture stopped');
      
    } catch (err: any) {
      console.error('[useUnifiedPipeline] Audio capture stop failed:', err);
    }
  }, []);

  // Clear functions
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryBlocks([]);
    if (historyGrouperRef.current) {
      historyGrouperRef.current.reset();
    }
  }, []);

  const clearSummaries = useCallback(() => {
    setSummaries([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await window.univoice.clearHistory();
      clearHistory();
      clearSummaries();
      clearError();
      setCurrentOriginal('');
      setCurrentTranslation('');
      setDisplayPairs([]);
      segmentTranslationMap.current.clear();
      addedToHistorySet.current.clear(); // 履歴追加済みセットもクリア
      addedToGrouperSet.current.clear(); // グルーパー追加済みセットもクリア
      
      // Reset managers
      if (displayManagerRef.current) {
        displayManagerRef.current.reset();
      }
      if (historyGrouperRef.current) {
        historyGrouperRef.current.reset();
      }
    } catch (err: any) {
      console.error('[useUnifiedPipeline] Clear all failed:', err);
    }
  }, [clearHistory, clearSummaries, clearError]);

  // Generate vocabulary from current session
  const generateVocabulary = useCallback(async () => {
    try {
      if (!currentCorrelationId.current) {
        console.error('[useUnifiedPipeline] No active session for vocabulary generation');
        return;
      }
      
      console.log('[useUnifiedPipeline] Generating vocabulary...');
      
      const result = await window.univoice.generateVocabulary({
        correlationId: currentCorrelationId.current
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate vocabulary');
      }
      
      console.log('[useUnifiedPipeline] Vocabulary generation initiated');
    } catch (err: any) {
      console.error('[useUnifiedPipeline] Generate vocabulary failed:', err);
      setError(err.message || 'Failed to generate vocabulary');
    }
  }, []);

  // Generate final report from current session
  const generateFinalReport = useCallback(async () => {
    try {
      if (!currentCorrelationId.current) {
        console.error('[useUnifiedPipeline] No active session for report generation');
        return;
      }
      
      console.log('[useUnifiedPipeline] Generating final report...');
      
      const result = await window.univoice.generateFinalReport({
        correlationId: currentCorrelationId.current
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate final report');
      }
      
      console.log('[useUnifiedPipeline] Final report generation initiated');
    } catch (err: any) {
      console.error('[useUnifiedPipeline] Generate final report failed:', err);
      setError(err.message || 'Failed to generate final report');
    }
  }, []);

  // 言語設定の更新関数
  const updateLanguages = useCallback((source: string, target: string) => {
    console.log('[useUnifiedPipeline] Updating languages:', { source, target });
    setCurrentSourceLanguage(source);
    setCurrentTargetLanguage(target);
  }, []);
  
  // optionsの言語設定が変更されたら内部状態も更新
  useEffect(() => {
    setCurrentSourceLanguage(sourceLanguage);
    setCurrentTargetLanguage(targetLanguage);
  }, [sourceLanguage, targetLanguage]);
  
  return {
    // State
    isRunning,
    currentOriginal,
    currentTranslation,
    displayPairs,
    threeLineDisplay, // 3段階表示用データ
    historyBlocks,
    groupedHistory: (() => {
      // Convert history to 3-item groups for legacy compatibility
      const groups: Translation[][] = [];
      for (let i = 0; i < history.length; i += 3) {
        groups.push(history.slice(i, i + 3));
      }
      return groups;
    })(), // Legacy compatibility - keep old format
    realtimeSegments: (() => {
      console.log('[useUnifiedPipeline] Converting displayPairs to realtimeSegments:', displayPairs.length);
      const segments = displayPairs.map(pair => ({
        id: pair.id,
        original: pair.original.text,
        translation: pair.translation.text,
        timestamp: pair.original.timestamp,
        isFinal: pair.original.isFinal
      }));
      console.log('[useUnifiedPipeline] Converted realtimeSegments:', segments);
      return segments;
    })(), // Legacy compatibility - convert to old format
    history,
    summaries,
    error,
    vocabulary,
    finalReport,
    state,
    
    // Control functions
    startFromMicrophone,
    stop,
    translateUserInput,
    generateVocabulary,
    generateFinalReport,
    
    // Clear functions
    clearHistory,
    clearSummaries,
    clearError,
    clearAll,
    
    // Language management
    updateLanguages,
    currentSourceLanguage,
    currentTargetLanguage,
    
    // Legacy compatibility (for existing UI)
    startFromFile: startFromMicrophone, // Fallback to microphone
    refreshState: async () => {}, // Not needed in new architecture
  };
};