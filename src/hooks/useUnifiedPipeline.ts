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
import { TranslationTimeoutManager } from '../utils/TranslationTimeoutManager';
import type { UnifiedEvent } from '../shared/types/ipcEvents';
import { useSessionMemory } from './useSessionMemory';
import type { IAudioProcessor, AudioProcessorMessage } from '../types/audio-processor.types';
import { AudioWorkletProcessor } from '../infrastructure/audio/AudioWorkletProcessor';

// ThreeLineDisplay型の定義
export interface ThreeLineDisplay {
  oldest?: {
    id: string;
    original: string;
    translation: string;
    status: 'active' | 'fading' | 'completed';
    timestamp: number;
    opacity?: number;
    height?: number;  // 追加：個別の高さ
  };
  older?: {
    id: string;
    original: string;
    translation: string;
    status: 'active' | 'fading' | 'completed';
    timestamp: number;
    opacity?: number;
    height?: number;  // 追加：個別の高さ
  };
  recent?: {
    id: string;
    original: string;
    translation: string;
    status: 'active' | 'fading' | 'completed';
    timestamp: number;
    opacity?: number;
    height?: number;  // 追加：個別の高さ
  };
  maxHeight?: number;  // 追加：3つのペアの最大高さ（左右統一用）
}

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
  threshold?: number; // Optional: present for progressive summaries (400, 800, 1600, 2400)
}

// Re-export types for UI compatibility
export type DisplayPair = SyncedDisplayPair;

export interface PipelineState {
  status: 'idle' | 'starting' | 'listening' | 'running' | 'processing' | 'stopping' | 'stopped';
  currentSegmentId: string | null;
  wordCount: number;
  duration: number;
  startTime: number | null;
}

// Return type for useUnifiedPipeline hook
export interface UseUnifiedPipelineReturn {
  // State
  isRunning: boolean;
  currentOriginal: string;
  currentTranslation: string;
  displayPairs: DisplayPair[];
  threeLineDisplay: ThreeLineDisplay;
  historyBlocks: HistoryBlock[];
  groupedHistory: Translation[][];
  realtimeSegments: any[];
  history: Translation[];
  summaries: Summary[];
  error: string | null;
  vocabulary: Array<{ term: string; definition: string }> | null;
  finalReport: string | null;
  state: PipelineState;
  
  // Control functions
  startFromMicrophone: () => Promise<void>;
  stop: () => Promise<void>;
  translateUserInput: (text: string) => Promise<string>;
  generateVocabulary: () => Promise<void>;
  generateFinalReport: () => Promise<void>;
  
  // Clear functions
  clearHistory: () => void;
  clearSummaries: () => void;
  clearError: () => void;
  clearAll: () => void;
  
  // Language management
  updateLanguages: (source: string, target: string) => void;
  currentSourceLanguage: string;
  currentTargetLanguage: string;
  
  // Compatibility
  startFromFile: () => Promise<void>;
  refreshState: () => Promise<void>;
}

interface UseUnifiedPipelineOptions {
  sourceLanguage?: string;
  targetLanguage?: string;
  className?: string | undefined; // セッション管理用のクラス名
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
  onTranslation?: (translation: Translation) => void;
  onSummary?: (summary: Summary) => void;
}

export const useUnifiedPipeline = (options: UseUnifiedPipelineOptions = {}) => {
  const {
    sourceLanguage = 'en',
    targetLanguage = 'ja',
    className,
    onError,
    onStatusChange,
    onTranslation,
    onSummary
  } = options;

  // SessionMemory hook for data persistence
  const {
    startSession,
    completeSession,
    addTranslation,
    updateTranslation,
    addSummary,
    sessionState,
    isSessionActive
  } = useSessionMemory();

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
  // デフォルト値を設定して空文字列を防ぐ
  const [currentSourceLanguage, setCurrentSourceLanguage] = useState(sourceLanguage || 'multi');
  const [currentTargetLanguage, setCurrentTargetLanguage] = useState(targetLanguage || 'ja');
  
  // Manager instances
  const displayManagerRef = useRef<SyncedRealtimeDisplayManager | null>(null);
  const historyGrouperRef = useRef<FlexibleHistoryGrouper | null>(null);
  const originalTextManagerRef = useRef<IncrementalTextManager | null>(null);
  const translationTextManagerRef = useRef<IncrementalTextManager | null>(null);
  const streamBatcherRef = useRef<StreamBatcher | null>(null);
  const translationTimeoutManagerRef = useRef<TranslationTimeoutManager | null>(null); // 翻訳タイムアウト管理
  
  // 高品質翻訳を格納するマップ（combinedId -> translation）
  const highQualityTranslationsRef = useRef<Map<string, string>>(new Map());
  
  // 結合文管理用のマップ
  const segmentTranslationMap = useRef<Map<string, { original: string; translation: string; combinedId?: string }>>(new Map());
  const segmentToCombinedMap = useRef<Map<string, string>>(new Map());
  
  // パラグラフ管理用のマップ
  const paragraphTranslationMap = useRef<Map<string, { original: string; translation: string; isParagraph?: boolean }>>(new Map());
  
  // 履歴グルーパーに追加済みのIDを追跡（重複防止）
  const addedToGrouperSet = useRef<Set<string>>(new Set());

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
          console.log('[DisplayFlow] SyncedRealtimeDisplayManager update:', {
            pairCount: pairs.length,
            pairs: pairs.map(p => ({
              id: p.id,
              position: p.display.position,
              opacity: p.display.opacity,
              originalText: p.original.text.substring(0, 30) + (p.original.text.length > 30 ? '...' : ''),
              translationText: p.translation.text.substring(0, 30) + (p.translation.text.length > 30 ? '...' : ''),
              isFinal: p.original.isFinal
            }))
          });
          console.log('[SyncedRealtimeDisplayManager] Updating displayPairs:', pairs.length, pairs);
          setDisplayPairs(pairs);
        }
      );
    }
    
    // RealtimeDisplayServiceは使用しない（displayPairsから直接変換）
    
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
    
    // Initialize TranslationTimeoutManager
    if (!translationTimeoutManagerRef.current) {
      translationTimeoutManagerRef.current = new TranslationTimeoutManager({
        defaultTimeout: 7000, // 7秒
        enableDynamicTimeout: true,
        maxTimeout: 10000 // 10秒
      });
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
      if (translationTimeoutManagerRef.current) {
        translationTimeoutManagerRef.current.destroy();
        translationTimeoutManagerRef.current = null;
      }
    };
  }, []);

  // 言語設定の同期（パイプライン実行中は無視）
  useEffect(() => {
    // パイプライン実行中は言語変更を無視
    if (state.status === 'running' || state.status === 'processing' || state.status === 'starting') {
      console.warn('[useUnifiedPipeline] Language change ignored during pipeline execution:', state.status);
      return;
    }
    
    // 実際に変更があった場合のみ更新
    if (sourceLanguage !== currentSourceLanguage || targetLanguage !== currentTargetLanguage) {
      console.log('[useUnifiedPipeline] 🔄 Updating language settings:', {
        from: { source: currentSourceLanguage, target: currentTargetLanguage },
        to: { source: sourceLanguage, target: targetLanguage },
        timestamp: new Date().toISOString()
      });
      
      setCurrentSourceLanguage(sourceLanguage);
      setCurrentTargetLanguage(targetLanguage);
      
      // マネージャーのリセット（必要な場合）
      if (historyGrouperRef.current && (currentSourceLanguage || currentTargetLanguage)) {
        console.log('[useUnifiedPipeline] Resetting history grouper due to language change');
        historyGrouperRef.current.reset();
      }
    }
  }, [sourceLanguage, targetLanguage, state.status, currentSourceLanguage, currentTargetLanguage]);

  // Update threeLineDisplay when displayPairs change
  useEffect(() => {
    console.log('[ThreeLineDebug] Building threeLineDisplay from displayPairs:', {
      pairCount: displayPairs.length,
      pairs: displayPairs.map(p => ({
        id: p.id,
        position: p.display.position,
        opacity: p.display.opacity,
        hasOriginal: !!p.original.text,
        hasTranslation: !!p.translation.text,
        originalText: p.original.text.substring(0, 30) + (p.original.text.length > 30 ? '...' : '')
      }))
    });
    
    // displayPairsのposition属性を使って直接3段階表示を構築
    const display: ThreeLineDisplay = {};
    
    // 最大高さを計算（左右統一用）
    let maxHeight = 0;
    
    // position属性に基づいて正確にマッピング
    displayPairs.forEach(pair => {
      const position = pair.display.position;
      const segment = {
        id: pair.id,
        original: pair.original.text,
        translation: pair.translation.text,
        status: 'active' as const,
        timestamp: pair.original.timestamp,
        displayStartTime: pair.display.startTime,
        translationStartTime: pair.display.translationCompleteTime,
        opacity: pair.display.opacity,
        height: pair.display.height,  // 高さ情報を保持
        isFinal: pair.original.isFinal,
        originalIsFinal: pair.original.isFinal,
        translationStarted: pair.translation.isComplete,
      };
      
      // 最大高さを更新
      maxHeight = Math.max(maxHeight, pair.display.height);
      
      console.log(`[ThreeLineDebug] Mapping pair to position '${position}':`, {
        id: pair.id,
        originalLength: pair.original.text.length,
        translationLength: pair.translation.text.length,
        height: pair.display.height
      });
      
      // positionに応じて適切なスロットに配置
      switch (position) {
        case 'oldest':
          display.oldest = segment;
          break;
        case 'older':
          display.older = segment;
          break;
        case 'recent':
          display.recent = segment;
          break;
      }
    });
    
    // 最大高さを設定
    display.maxHeight = maxHeight || 120;  // デフォルト最小高さ
    
    setThreeLineDisplay(display);
    console.log('[ThreeLineDebug] Final threeLineDisplay:', {
      hasOldest: !!display.oldest,
      hasOlder: !!display.older,
      hasRecent: !!display.recent,
      oldestText: display.oldest?.original.substring(0, 20) + '...',
      olderText: display.older?.original.substring(0, 20) + '...',
      recentText: display.recent?.original.substring(0, 20) + '...'
    });
  }, [displayPairs]);

  // Generate correlation ID
  const generateCorrelationId = useCallback(() => {
    return window.univoice?.generateCorrelationId?.() || `hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 履歴に追加済みのセグメントIDを追跡
  const addedToHistorySet = useRef<Set<string>>(new Set());

  // Handle translation timeout
  const handleTranslationTimeout = useCallback((segmentId: string) => {
    console.log('[useUnifiedPipeline] Handling translation timeout for segment:', segmentId);
    
    // Get segment data
    const segment = segmentTranslationMap.current.get(segmentId);
    if (!segment || !segment.original) {
      console.warn('[useUnifiedPipeline] Timeout for unknown segment:', segmentId);
      return;
    }
    
    // Mark as timeout in displays
    if (displayManagerRef.current) {
      displayManagerRef.current.updateTranslation('[翻訳タイムアウト]', segmentId);
      displayManagerRef.current.completeTranslation(segmentId);
    }
    
    // Add to history with timeout status
    if (!addedToHistorySet.current.has(segmentId)) {
      addedToHistorySet.current.add(segmentId);
      
      const translation: Translation = {
        id: segmentId,
        original: segment.original,
        japanese: '[翻訳タイムアウト]',
        timestamp: Date.now(),
        firstPaintMs: 0,
        completeMs: 7000 // タイムアウト時間
      };
      
      setHistory(prev => [...prev, translation]);
      
      // Add to flexible history grouper
      if (historyGrouperRef.current && !addedToGrouperSet.current.has(segmentId)) {
        historyGrouperRef.current.addSentence({
          id: segmentId,
          original: segment.original,
          translation: '[翻訳タイムアウト]',
          timestamp: Date.now()
        });
        addedToGrouperSet.current.add(segmentId);
      }
    }
    
    // Clean up segment map
    segmentTranslationMap.current.delete(segmentId);
    
    console.log('[useUnifiedPipeline] Translation timeout handled:', segmentId);
  }, []);

  // Event handlers
  const handlePipelineEvent = useCallback((event: PipelineEvent) => {
    // イベント受信ログ（デバッグ用）
    console.log('[useUnifiedPipeline] Event received:', event.type, event.correlationId, event.data);
    
    // ASRイベントのデバッグログを強化
    if (event.type === 'asr') {
      console.log('[ASR DEBUG] Full event:', JSON.stringify(event, null, 2));
      console.log('[ASR DEBUG] displayManagerRef exists:', !!displayManagerRef.current);
      console.log('[ASR DEBUG] displayPairs length:', displayPairs.length);
    }

    switch (event.type) {
      case 'asr':
        console.log('[ASR] displayManagerRef.current:', !!displayManagerRef.current, 'segmentId:', event.data.segmentId);
        console.log('[Display Debug] ASR Event:', {
          text: event.data.text?.substring(0, 50) + '...',
          isFinal: event.data.isFinal,
          currentOriginal: currentOriginal?.substring(0, 50) + '...'
        });
        
        // Final結果の特別なログ
        if (event.data.isFinal) {
          console.log('[ASR FINAL] Final result received:', {
            segmentId: event.data.segmentId,
            textLength: event.data.text?.length,
            text: event.data.text
          });
        }
        
        // Update display manager - now accepts interim results too
        if (displayManagerRef.current) {
          console.log('[ASR] Calling updateOriginal:', {
            textLength: event.data.text?.length,
            isFinal: event.data.isFinal,
            segmentId: event.data.segmentId,
            hasSegmentId: !!event.data.segmentId
          });
          displayManagerRef.current.updateOriginal(
            event.data.text, 
            event.data.isFinal, 
            event.data.segmentId || `interim_${Date.now()}` // Provide segmentId even for interim
          );
          
          // Track segment for translation pairing
          if (event.data.isFinal) {
            segmentTranslationMap.current.set(event.data.segmentId, {
              original: event.data.text,
              translation: ''
            });
            
            // Start translation timeout
            if (translationTimeoutManagerRef.current) {
              translationTimeoutManagerRef.current.startTimeout(
                event.data.segmentId,
                event.data.text,
                (timedOutSegmentId) => {
                  console.log('[useUnifiedPipeline] Translation timeout for segment:', timedOutSegmentId);
                  handleTranslationTimeout(timedOutSegmentId);
                }
              );
            }
          }
        } else {
          console.warn('[ASR] Cannot update - displayManager:', !!displayManagerRef.current, 'segmentId:', event.data.segmentId);
        }
        
        // Update current display (for compatibility)
        if (originalTextManagerRef.current) {
          console.log('[Display Debug] Updating currentOriginal:', event.data.text?.substring(0, 50) + '...', 'isFinal:', event.data.isFinal);
          originalTextManagerRef.current.update(event.data.text);
        }
        break;

      case 'translation':
        console.log('[useUnifiedPipeline] Translation event received:', event.data);
        console.log('[useUnifiedPipeline] Translation text:', event.data.translatedText);
        console.log('[useUnifiedPipeline] Translation text length:', event.data.translatedText?.length);
        console.log('[useUnifiedPipeline] Translation text char codes (first 10):', 
          event.data.translatedText ? [...event.data.translatedText.slice(0, 10)].map(c => c.charCodeAt(0)) : []);
        
        // 履歴用高品質翻訳またはパラグラフ翻訳の場合
        if (event.data.segmentId && 
            (event.data.segmentId.startsWith('history_') || 
             event.data.segmentId.startsWith('paragraph_'))) {
          const isParagraph = event.data.segmentId.startsWith('paragraph_');
          console.log(`[useUnifiedPipeline] ${isParagraph ? 'Paragraph' : 'History'} translation received:`, event.data.segmentId);
          
          // プレフィックスを削除して元のIDを取得
          const baseId = event.data.segmentId.replace(/^(history_|paragraph_)/, '');
          
          // パラグラフの場合はbaseIdをそのまま使用、履歴の場合はマッピングを確認
          const targetId = isParagraph ? baseId : (segmentToCombinedMap.current.get(baseId) || baseId);
          const translationText = event.data.translatedText || event.data.content;
          
          console.log(`[useUnifiedPipeline] Mapping ${isParagraph ? 'paragraph' : 'history'} translation:`, {
            segmentId: event.data.segmentId,
            baseId,
            targetId,
            isParagraph,
            hasMapping: !isParagraph && segmentToCombinedMap.current.has(baseId)
          });
          
          // 高品質翻訳を保存
          if (translationText) {
            highQualityTranslationsRef.current.set(targetId, translationText);
            console.log('[useUnifiedPipeline] High-quality translation stored:', targetId, translationText.substring(0, 50));
            
            // SessionMemoryService: 高品質翻訳で更新
            if (isSessionActive && !isParagraph) {
              try {
                updateTranslation(targetId, {
                  japanese: translationText,
                  completeMs: Date.now()
                });
                console.log('[useUnifiedPipeline] Translation updated in session memory:', targetId);
              } catch (error) {
                console.error('[useUnifiedPipeline] Failed to update translation in session memory:', error);
              }
            }
            
            // FlexibleHistoryGrouperの内部状態も更新
            if (historyGrouperRef.current) {
              if (isParagraph) {
                // パラグラフの場合
                historyGrouperRef.current.updateParagraphTranslation(targetId, translationText);
                console.log('[useUnifiedPipeline] Updated FlexibleHistoryGrouper paragraph translation:', targetId);
              } else {
                // 文の場合（Phase 1修正）
                historyGrouperRef.current.updateSentenceTranslation(targetId, translationText);
                console.log('[useUnifiedPipeline] Updated FlexibleHistoryGrouper sentence translation:', targetId);
              }
            }
            
            // 既存の履歴ブロックを更新
            setHistoryBlocks(prevBlocks => {
              return prevBlocks.map(block => {
                // 該当するセンテンスを含むブロックを探す
                const updatedSentences = block.sentences.map(sentence => {
                  if (sentence.id === targetId) {
                    console.log('[useUnifiedPipeline] Updating sentence translation:', sentence.id);
                    return {
                      ...sentence,
                      translation: translationText
                    };
                  }
                  return sentence;
                });
                
                // センテンスが更新された場合、ブロック全体を更新
                const hasUpdates = updatedSentences.some((s, i) => s.translation !== block.sentences[i].translation);
                if (hasUpdates) {
                  return {
                    ...block,
                    sentences: updatedSentences
                  };
                }
                return block;
              });
            });
          }
          
          // 通常の翻訳処理はスキップ
          break;
        }
        
        // Clear translation timeout if exists
        if (event.data.segmentId && translationTimeoutManagerRef.current) {
          translationTimeoutManagerRef.current.clearTimeout(event.data.segmentId);
        }
        
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
        
        // Handle translation completion
        if (event.data.isFinal && event.data.segmentId) {
          // Mark translation as complete (starts 1.5s removal timer)
          if (displayManagerRef.current) {
            displayManagerRef.current.completeTranslation(event.data.segmentId);
          }
          
          // パラグラフ翻訳の場合
          if (event.data.segmentId.startsWith('paragraph_')) {
            const paragraphId = event.data.segmentId.replace('paragraph_', '');
            const paragraphData = paragraphTranslationMap.current.get(paragraphId);
            
            if (paragraphData && historyGrouperRef.current) {
              console.log('[DataFlow-12p] Updating paragraph translation:', {
                paragraphId,
                translationLength: event.data.translatedText.length
              });
              
              // FlexibleHistoryGrouperのパラグラフ翻訳を更新
              historyGrouperRef.current.updateParagraphTranslation(
                paragraphId,
                event.data.translatedText
              );
              
              // マップも更新
              paragraphData.translation = event.data.translatedText;
            }
            return; // パラグラフ翻訳の場合はここで処理終了
          }
          
          // Get complete segment data
          const segment = segmentTranslationMap.current.get(event.data.segmentId);
          if (segment && segment.original && segment.translation) {
            // Add to FlexibleHistoryGrouper
            // 🔴 DISABLED: パラグラフモード優先のため、個別セグメントの履歴追加を無効化
            // パラグラフ形成（20-60秒）を待つため、ここでは追加しない
            /*
            if (historyGrouperRef.current && !addedToGrouperSet.current.has(event.data.segmentId)) {
              historyGrouperRef.current.addSentence({
                id: event.data.segmentId,
                original: segment.original,
                translation: segment.translation,
                timestamp: event.timestamp
              });
              addedToGrouperSet.current.add(event.data.segmentId);
            }
            */
            
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
          
          // 要約をメインプロセスに送信（自動保存のため）
          if (window.electron?.send) {
            window.electron.send('summary-created', summary);
            console.log('[useUnifiedPipeline] Summary sent to main process:', summary.id);
          }

          // SessionMemoryService: 要約を永続化
          if (isSessionActive) {
            try {
              addSummary(summary);
              console.log('[useUnifiedPipeline] Summary added to session memory:', summary.id);
            } catch (error) {
              console.error('[useUnifiedPipeline] Failed to add summary to session memory:', error);
            }
          }
          
          // Call callback if provided
          if (onSummary) {
            onSummary(summary);
          }
        }
        break;

      case 'progressiveSummary':
        // Handle progressive summarization (word count based)
        console.log('[useUnifiedPipeline] Progressive summary event:', event.data);
        
        if (event.data.english && event.data.japanese) {
          const summary: Summary = {
            id: `progressive-${Date.now()}`,
            english: event.data.english,
            japanese: event.data.japanese,
            wordCount: event.data.wordCount || 0,
            timestamp: event.timestamp,
            timeRange: {
              start: event.data.startTime || 0,
              end: event.data.endTime || Date.now()
            },
            threshold: event.data.threshold // Add threshold for progressive summaries
          };
          
          setSummaries(prev => [...prev, summary]);
          
          console.log(`[useUnifiedPipeline] Progressive summary added at ${summary.wordCount} words`);
          
          // Progressive summaries are also sent to main process for persistence
          if (window.electron?.send) {
            window.electron.send('summary-created', summary);
          }

          // SessionMemoryService: プログレッシブ要約を永続化
          if (isSessionActive) {
            try {
              addSummary(summary);
              console.log('[useUnifiedPipeline] Progressive summary added to session memory:', summary.id);
            } catch (error) {
              console.error('[useUnifiedPipeline] Failed to add progressive summary to session memory:', error);
            }
          }
          
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
        
      case 'combinedSentence':
        // 【Phase 2-3】CombinedSentenceEventの処理
        console.log('[useUnifiedPipeline] CombinedSentence event:', event.data);
        console.log('[DataFlow-11] CombinedSentence received in frontend:', {
          combinedId: event.data.combinedId,
          segmentIds: event.data.segmentIds,
          textLength: event.data.originalText.length,
          timestamp: Date.now()
        });
        
        // 結合された文をFlexibleHistoryGrouperに追加
        if (historyGrouperRef.current) {
          // 結合IDとセグメントIDのマッピングを保存
          event.data.segmentIds.forEach((segmentId: string) => {
            console.log(`[DataFlow-12] Mapping segment ${segmentId} to combined ${event.data.combinedId}`);
            // セグメントIDと結合IDのマッピングを保存（後で履歴翻訳が来た時に使用）
            segmentTranslationMap.current.set(segmentId, {
              original: event.data.originalText,
              translation: '',
              combinedId: event.data.combinedId  // 結合IDを追加
            });
            // 逆引きマップも保存（セグメントIDから結合IDを検索）
            segmentToCombinedMap.current.set(segmentId, event.data.combinedId);
          });
          
          // 結合された文として履歴に追加
          // 【Phase 1 復活】SentenceCombinerによる文単位の履歴追加を復活
          historyGrouperRef.current.addSentence({
            id: event.data.combinedId,
            original: event.data.originalText,
            translation: '', // 空文字列に変更（Phase 1修正）
            timestamp: event.data.timestamp
          });
          
          console.log('[DataFlow-13] Added combined sentence to history grouper');

          // SessionMemoryService: 文単位の履歴を永続化
          if (isSessionActive) {
            try {
              const translation: Translation = {
                id: event.data.combinedId,
                original: event.data.originalText,
                japanese: '', // 翻訳は後で更新される
                timestamp: event.data.timestamp,
                firstPaintMs: 0,
                completeMs: 0
              };
              addTranslation(translation);
              console.log('[useUnifiedPipeline] Translation added to session memory:', event.data.combinedId);
            } catch (error) {
              console.error('[useUnifiedPipeline] Failed to add translation to session memory:', error);
            }
          }
        }
        break;
        
      // 🔴 ParagraphBuilderを一時的に無効化
      // case 'paragraphComplete':
      //   // 【Phase 2-ParagraphBuilder】パラグラフ完成イベントの処理
      //   console.log('[DataFlow-11p] ParagraphCompleteEvent received:', {
      //     paragraphId: event.data.paragraphId,
      //     wordCount: event.data.wordCount,
      //     duration: event.data.duration,
      //     timestamp: Date.now()
      //   });
      //   
      //   if (historyGrouperRef.current) {
      //     // パラグラフを履歴に追加（初期は翻訳なし）
      //     historyGrouperRef.current.addParagraph({
      //       id: event.data.paragraphId,
      //       originalText: event.data.cleanedText || event.data.rawText,
      //       translation: '', // 初期は空（後で高品質翻訳が来る）
      //       timestamp: event.data.startTime
      //     });
      //     console.log('[DataFlow-13p] Added paragraph to history grouper');
      //   }
      //   break;

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

      // 🔴 ParagraphBuilderを一時的に無効化（重複定義の削除）
      // case 'paragraphComplete':
      //   // パラグラフ完了イベントの処理
      //   console.log('[useUnifiedPipeline] ParagraphComplete event:', event.data);
      //   console.log('[DataFlow-10p] ParagraphComplete received in frontend:', {
      //     paragraphId: event.data.paragraphId,
      //     segmentCount: event.data.segmentCount,
      //     duration: event.data.duration,
      //     wordCount: event.data.wordCount,
      //     timestamp: Date.now()
      //   });
      //   
      //   // パラグラフをFlexibleHistoryGrouperに追加
      //   if (historyGrouperRef.current && event.data.paragraph) {
      //     const paragraph = event.data.paragraph;
      //     
      //     // パラグラフを履歴に追加（翻訳は後で更新される）
      //     console.log('[DataFlow-11p] Adding paragraph to history:', {
      //       paragraphId: paragraph.id,
      //       textLength: paragraph.rawText.length,
      //       segmentCount: paragraph.segments.length
      //     });
      //     
      //     historyGrouperRef.current.addParagraph({
      //       id: paragraph.id,
      //       originalText: paragraph.rawText,
      //       translation: '',  // 翻訳は後で更新
      //       timestamp: paragraph.startTime
      //     });
      //     
      //     // パラグラフIDをマップに保存（後で翻訳が来た時に使用）
      //     paragraphTranslationMap.current.set(paragraph.id, {
      //       original: paragraph.rawText,
      //       translation: '',
      //       isParagraph: true
      //     });
      //   }
      //   break;

      default:
        console.warn('[useUnifiedPipeline] Unknown event type:', event);
    }
  }, [onError, onStatusChange, onTranslation, onSummary, isSessionActive, addTranslation, updateTranslation, addSummary]);

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
    const unsubscribe = window.univoice?.onPipelineEvent?.((event) => {
      handlePipelineEventRef.current(event);
    });
    if (unsubscribe) {
      cleanupFunctions.current.push(unsubscribe);
    }
    
    // リアルタイム表示用の直接イベントリスナー
    if (window.electron) {
      // 文字起こし結果の直接更新
      const originalUpdateHandler = (_event: any, data: any) => {
        console.log('[useUnifiedPipeline] current-original-update received:', data);
        if (originalTextManagerRef.current) {
          originalTextManagerRef.current.update(data.text);
        }
        setCurrentOriginal(data.text);
      };
      window.electron.on('current-original-update', originalUpdateHandler);
      cleanupFunctions.current.push(() => {
        window.electron?.removeListener('current-original-update', originalUpdateHandler);
      });
      
      // 翻訳結果の直接更新
      const translationUpdateHandler = (_event: any, text: string) => {
        console.log('[useUnifiedPipeline] current-translation-update received:', text);
        setCurrentTranslation(text);
      };
      window.electron.on('current-translation-update', translationUpdateHandler);
      cleanupFunctions.current.push(() => {
        window.electron?.removeListener('current-translation-update', translationUpdateHandler);
      });
      
      // プログレッシブ要約イベントのリスナー
      const progressiveSummaryHandler = (_event: any, summary: any) => {
        console.log('[useUnifiedPipeline] progressive-summary received:', summary);
        
        if (summary.data) {
          const summaryData: Summary = {
            id: `progressive-${Date.now()}`,
            english: summary.data.english,
            japanese: summary.data.japanese,
            wordCount: summary.data.wordCount || summary.data.threshold || 0,
            timestamp: Date.now(),
            timeRange: {
              start: summary.data.startTime || 0,
              end: summary.data.endTime || Date.now()
            }
          };
          
          setSummaries(prev => {
            // 同じ閾値の要約を更新（重複を避ける）
            const existingIndex = prev.findIndex(s => 
              s.wordCount === summaryData.wordCount
            );
            
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = summaryData;
              return updated;
            }
            
            return [...prev, summaryData];
          });
          
          console.log(`[useUnifiedPipeline] Progressive summary added/updated at ${summaryData.wordCount} words`);
          
          // コールバックを呼び出す
          if (onSummary) {
            onSummary(summaryData);
          }
        }
      };
      
      window.electron.on('progressive-summary', progressiveSummaryHandler);
      cleanupFunctions.current.push(() => {
        window.electron?.removeListener('progressive-summary', progressiveSummaryHandler);
      });
    }

    // Cleanup on unmount
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, []); // 空の依存配列に変更 - マウント時のみ実行

  // Control functions
  const startFromMicrophone = useCallback(async () => {
    // レース防止: 連打対策
    if (state.status === 'starting' || state.status === 'listening') {
      console.warn('[useUnifiedPipeline] startFromMicrophone ignored: already starting/listening');
      return;
    }

    try {
      setError(null);
      setState(prev => ({ ...prev, status: 'starting' }));

      const correlationId = generateCorrelationId();
      currentCorrelationId.current = correlationId;

      console.log('[useUnifiedPipeline] Starting microphone with correlation:', correlationId);
      console.log('[useUnifiedPipeline] Languages:', { source: currentSourceLanguage, target: currentTargetLanguage });

      // SessionMemoryService: セッション開始
      // classNameがない場合はデフォルト値を使用
      const sessionClassName = className || `session_${new Date().toISOString().split('T')[0]}`;
      if (!isSessionActive) {
        console.log('[useUnifiedPipeline] Starting new session:', sessionClassName);
        try {
          await startSession(sessionClassName, currentSourceLanguage, currentTargetLanguage);
        } catch (error) {
          console.error('[useUnifiedPipeline] Failed to start session memory:', error);
          // セッションメモリの失敗は致命的ではないため、パイプラインは継続
        }
      }

      const result = await window.univoice?.startListening?.({
        sourceLanguage: currentSourceLanguage,
        targetLanguage: currentTargetLanguage,
        correlationId
      });
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to start pipeline');
      }

      await startAudioCapture(); // 成功したら音声キャプチャ開始

      setIsRunning(true);
      setState(prev => ({ ...prev, status: 'listening', startTime: Date.now() }));
    } catch (err: any) {
      const msg = err?.message || 'Failed to start microphone';
      console.error('[useUnifiedPipeline] Start failed:', err);
      setError(msg);
      setIsRunning(false);
      setState(prev => ({ ...prev, status: 'idle' }));
      currentCorrelationId.current = null;
      
      if (onError) {
        onError(msg);
      }
    }
  }, [currentSourceLanguage, currentTargetLanguage, state.status, generateCorrelationId, onError, className, isSessionActive, startSession]);

  const stop = useCallback(async () => {
    // レース防止
    if (state.status !== 'listening' && state.status !== 'starting') {
      console.warn('[useUnifiedPipeline] stop ignored: not running');
      return;
    }
    setState(prev => ({ ...prev, status: 'stopping' }));

    try {
      if (currentCorrelationId.current) {
        const result = await window.univoice?.stopListening?.({
          correlationId: currentCorrelationId.current
        });
        if (!result?.success) console.warn('[useUnifiedPipeline] Stop warning:', result?.error);
      }

      stopAudioCapture();

      // SessionMemoryService: セッション完了
      if (isSessionActive) {
        console.log('[useUnifiedPipeline] Completing session');
        try {
          await completeSession();
        } catch (error) {
          console.error('[useUnifiedPipeline] Failed to complete session memory:', error);
          // セッションメモリの失敗は致命的ではないため、パイプラインの停止は継続
        }
      }

      setIsRunning(false);
      setState(prev => ({ ...prev, status: 'stopped' }));
      currentCorrelationId.current = null;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to stop pipeline';
      setError(errorMsg);
      setState(prev => ({ ...prev, status: 'idle' }));
      console.error('[useUnifiedPipeline] Stop failed:', err);
      
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [state.status, onError, isSessionActive, completeSession]);

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
  const processorRef = useRef<IAudioProcessor | null>(null);

  const startAudioCapture = useCallback(async () => {
    // 既に開始済みなら何もしない
    if (audioContextRef.current || mediaStreamRef.current) {
      console.warn('[useUnifiedPipeline] Audio capture already started');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,           // 希望値（実際は無視されること有）
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });
      mediaStreamRef.current = stream;

      // WebAudio 初期化
      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);

      // Create AudioWorkletProcessor with type safety
      let audioProcessCount = 0;
      
      const processor = await AudioWorkletProcessor.create(
        ctx,
        source,
        (event: MessageEvent<AudioProcessorMessage>) => {
          const { type, data } = event.data;

          switch (type) {
            case 'initialized':
              console.log('[useUnifiedPipeline] AudioWorklet initialized:', data);
              break;

            case 'audio':
              // PCM16データを受信
              const pcm16 = new Int16Array(data.pcm16);
              
              audioProcessCount++;
              if (audioProcessCount % 50 === 1) {
                console.log('[useUnifiedPipeline] Audio processing:', {
                  frameCount: audioProcessCount,
                  pcm16Length: pcm16.length,
                  sampleRate: data.sampleRate,
                  timestamp: data.timestamp,
                  hasElectronAPI: !!window.electron,
                  hasSendAudioChunk: !!window.electron?.sendAudioChunk
                });
              }
          
              if (window.electron?.sendAudioChunk) {
                window.electron.sendAudioChunk(pcm16);
                
                if (audioProcessCount % 50 === 1) {
                  console.log('[useUnifiedPipeline] Sending audio chunk to main process');
                }
              } else {
                if (audioProcessCount % 50 === 1) {
                  console.error('[useUnifiedPipeline] Cannot send audio - electron API not available');
                }
              }
              break;

            case 'error':
              console.error('[useUnifiedPipeline] AudioWorklet error:', data);
              break;
          }
        },
        {
          targetSampleRate: 16000,
          bufferSize: 512,
          debug: false
        }
      );
      
      processorRef.current = processor;
      console.log('[useUnifiedPipeline] Audio capture started. ctx.sampleRate=', ctx.sampleRate);
    } catch (err) {
      console.error('[useUnifiedPipeline] Audio capture failed:', err);
      throw err;
    }
  }, []);

  const stopAudioCapture = useCallback(() => {
    try {
      console.log('[useUnifiedPipeline] Stopping audio capture...');
      
      if (processorRef.current) {
        // Use the type-safe destroy method
        processorRef.current.destroy();
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
      await window.univoice?.clearHistory?.();
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
      
      const result = await window.univoice?.generateVocabulary?.({
        correlationId: currentCorrelationId.current
      });
      
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to generate vocabulary');
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
      
      const result = await window.univoice?.generateFinalReport?.({
        correlationId: currentCorrelationId.current
      });
      
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to generate final report');
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
    threeLineDisplay,
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
      console.log('[useUnifiedPipeline] realtimeSegments details:', segments.map(s => ({
        id: s.id,
        originalLength: s.original.length,
        translationLength: s.translation.length,
        isFinal: s.isFinal
      })));
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