# 元のuseUnifiedPipeline.ts 完全分析ドキュメント

このドキュメントでは、コミット9c3d497時点のuseUnifiedPipeline.tsの実装を徹底的に分析し、
リファクタリング後のファイルとの比較を行います。

## 分析日時: 2025-01-21
## 対象コミット: 9c3d497

## ファイル概要
- **ファイルパス**: src/hooks/useUnifiedPipeline.ts
- **総行数**: 1596行
- **責任**: リアルタイム音声翻訳パイプラインの統合管理

## セクション別分析

### セクション1: インポートとコメント (1-29行)
```typescript
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
```

**リファクタリング後の状態**: 
- ✅ インポートは変更なし
- ✅ 依存関係は同じ

### セクション2: 型定義 (30-144行)

#### ThreeLineDisplay型 (30-59行)
```typescript
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
  older?: { /* 同様の構造 */ };
  recent?: { /* 同様の構造 */ };
  maxHeight?: number;  // 追加：3つのペアの最大高さ（左右統一用）
}
```
**リファクタリング後**: ✅ 変更なし - そのまま使用

#### Translation, Summary型 (62-82行)
```typescript
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
  timeRange: { start: number; end: number; };
  threshold?: number; // プログレッシブ要約用
}
```
**リファクタリング後**: ✅ 変更なし

#### UseUnifiedPipelineReturn型 (95-134行)
```typescript
export interface UseUnifiedPipelineReturn {
  // State (すべての状態を公開)
  isRunning, currentOriginal, currentTranslation,
  displayPairs, threeLineDisplay, historyBlocks,
  groupedHistory, realtimeSegments, history,
  summaries, error, vocabulary, finalReport, state,
  
  // Control functions
  startFromMicrophone, stop, translateUserInput,
  generateVocabulary, generateFinalReport,
  
  // Clear functions
  clearHistory, clearSummaries, clearError, clearAll,
  
  // Language management
  updateLanguages, currentSourceLanguage, currentTargetLanguage,
  
  // Compatibility
  startFromFile, refreshState
}
```
**リファクタリング後**: ✅ 変更なし

### セクション3: Hook本体の開始 (146-214行)

#### SessionMemory統合 (157-166行)
```typescript
const {
  startSession,
  completeSession,
  addTranslation,
  updateTranslation,
  addSummary,
  sessionState,
  isSessionActive
} = useSessionMemory();
```
**リファクタリング後**: ✅ 変更なし

#### 状態定義 (168-191行)
```typescript
// 基本状態
const [isRunning, setIsRunning] = useState(false);
const [currentOriginal, setCurrentOriginal] = useState('');
const [currentTranslation, setCurrentTranslation] = useState('');
const [displayPairs, setDisplayPairs] = useState<SyncedDisplayPair[]>([]);
const [threeLineDisplay, setThreeLineDisplay] = useState<ThreeLineDisplay>({});
const [history, setHistory] = useState<Translation[]>([]);
const [historyBlocks, setHistoryBlocks] = useState<HistoryBlock[]>([]);
const [summaries, setSummaries] = useState<Summary[]>([]);
const [error, setError] = useState<string | null>(null);
const [vocabulary, setVocabulary] = useState<{ term: string; definition: string; context?: string }[]>([]);
const [finalReport, setFinalReport] = useState<string | null>(null);
const [state, setState] = useState<PipelineState>({ /* 初期値 */ });

// 言語設定
const [currentSourceLanguage, setCurrentSourceLanguage] = useState(sourceLanguage || 'multi');
const [currentTargetLanguage, setCurrentTargetLanguage] = useState(targetLanguage || 'ja');
```
**リファクタリング後**: ✅ 変更なし

#### Manager Refs (193-214行)
```typescript
// Manager instances
const displayManagerRef = useRef<SyncedRealtimeDisplayManager | null>(null);
const historyGrouperRef = useRef<FlexibleHistoryGrouper | null>(null);
const originalTextManagerRef = useRef<IncrementalTextManager | null>(null);
const translationTextManagerRef = useRef<IncrementalTextManager | null>(null);
const streamBatcherRef = useRef<StreamBatcher | null>(null);
const translationTimeoutManagerRef = useRef<TranslationTimeoutManager | null>(null);

// Maps and Sets
const highQualityTranslationsRef = useRef<Map<string, string>>(new Map());
const segmentTranslationMap = useRef<Map<string, { original: string; translation: string; combinedId?: string }>>(new Map());
const segmentToCombinedMap = useRef<Map<string, string>>(new Map());
const paragraphTranslationMap = useRef<Map<string, { original: string; translation: string; isParagraph?: boolean }>>(new Map());
const addedToGrouperSet = useRef<Set<string>>(new Set());

// Other refs
const cleanupFunctions = useRef<(() => void)[]>([]);
const currentCorrelationId = useRef<string | null>(null);
const _segmentBuffer = useRef<Map<string, { original?: string; translation?: string }>>(new Map());
```
**リファクタリング後**: 
- ❌ **問題**: translationTimeoutManagerRefがuseTranslationQueueに移動されたが、タイムアウト処理との統合が不完全

### セクション4: マネージャー初期化と言語設定 (224-400行)

#### setStateコールバックの最新化 (224-256行)
```typescript
// Update refs when setters change
useEffect(() => {
  setCurrentOriginalRef.current = setCurrentOriginal;
  if (originalTextManagerRef.current) {
    originalTextManagerRef.current.setOnUpdate((text, isStable) => {
      setCurrentOriginal(text);
    });
  }
}, [setCurrentOriginal]);

// 同様に translation 用も設定
```
**リファクタリング後**: ✅ 同じロジック

#### マネージャー初期化 (259-373行)
```typescript
// Initialize SyncedRealtimeDisplayManager
if (!displayManagerRef.current) {
  displayManagerRef.current = new SyncedRealtimeDisplayManager(
    (pairs) => {
      console.log('[SyncedRealtimeDisplayManager] Updating displayPairs:', pairs.length, pairs);
      setDisplayPairs(pairs);
    }
  );
}

// Initialize FlexibleHistoryGrouper
if (!historyGrouperRef.current) {
  historyGrouperRef.current = new FlexibleHistoryGrouper(
    (block) => {
      setHistoryBlocks(prev => [...prev, block]);
      if (window.electron?.send) {
        window.electron.send('history-block-created', block);
      }
    }
  );
}

// Initialize IncrementalTextManager (original & translation)
// Initialize StreamBatcher
// Initialize TranslationTimeoutManager
```
**リファクタリング後**: 
- ❌ **問題**: TranslationTimeoutManagerは移動されたが、統合が不十分
- ✅ 他のマネージャーは同じ

#### 言語設定同期 (375-400行)
```typescript
useEffect(() => {
  // パイプライン実行中は言語変更を無視
  if (state.status === 'running' || state.status === 'processing' || state.status === 'starting') {
    console.warn('[useUnifiedPipeline] Language change ignored during pipeline execution:', state.status);
    return;
  }
  
  // 実際に変更があった場合のみ更新
  if (sourceLanguage !== currentSourceLanguage || targetLanguage !== currentTargetLanguage) {
    setCurrentSourceLanguage(sourceLanguage);
    setCurrentTargetLanguage(targetLanguage);
    
    if (historyGrouperRef.current && (currentSourceLanguage || currentTargetLanguage)) {
      historyGrouperRef.current.reset();
    }
  }
}, [sourceLanguage, targetLanguage, state.status, currentSourceLanguage, currentTargetLanguage]);
```
**リファクタリング後**: ✅ 変更なし

### セクション5: displayPairsからthreeLineDisplayへの変換 (402-476行)

#### ThreeLineDisplayの構築
```typescript
useEffect(() => {
  // displayPairsのposition属性を使って直接3段階表示を構築
  const display: ThreeLineDisplay = {};
  let maxHeight = 0;
  
  displayPairs.forEach(pair => {
    const position = pair.display.position; // 'recent', 'older', 'oldest'
    const segment = {
      id: pair.id,
      original: pair.original.text,
      translation: pair.translation.text,
      status: 'active' as const,
      timestamp: pair.original.timestamp,
      opacity: pair.display.opacity,
      height: pair.display.height,
      // ... その他のプロパティ
    };
    
    maxHeight = Math.max(maxHeight, pair.display.height);
    
    switch (position) {
      case 'oldest': display.oldest = segment; break;
      case 'older': display.older = segment; break;
      case 'recent': display.recent = segment; break;
    }
  });
  
  display.maxHeight = maxHeight || 120;
  setThreeLineDisplay(display);
}, [displayPairs]);
```
**リファクタリング後**: ✅ 変更なし - 同じロジックで動作

### セクション6: 翻訳タイムアウト処理 (478-534行)

#### Correlation ID生成 (478-481行)
```typescript
const generateCorrelationId = useCallback(() => {
  return window.univoice?.generateCorrelationId?.() || `hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}, []);
```
**リファクタリング後**: ✅ 変更なし

#### handleTranslationTimeout関数 (486-534行)
```typescript
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
      historyGrouperRef.current.addSentence({...});
      addedToGrouperSet.current.add(segmentId);
    }
  }
  
  // Clean up segment map
  segmentTranslationMap.current.delete(segmentId);
}, []);
```
**リファクタリング後**: 
- ❌ **重大な問題**: この関数はuseTranslationQueueに移動されたが、displayManagerRefにアクセスできない

### セクション7: handlePipelineEvent - ASRイベント処理 (536-608行)

```typescript
const handlePipelineEvent = useCallback((event: PipelineEvent) => {
  switch (event.type) {
    case 'asr':
      // interimとfinal両方を受け入れ
      if (displayManagerRef.current) {
        displayManagerRef.current.updateOriginal(
          event.data.text, 
          event.data.isFinal, 
          event.data.segmentId || `interim_${Date.now()}`
        );
        
        // Finalの場合はセグメント追跡
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
                handleTranslationTimeout(timedOutSegmentId);
              }
            );
          }
        }
      }
      
      // Update current display (for compatibility)
      if (originalTextManagerRef.current) {
        originalTextManagerRef.current.update(event.data.text);
      }
      break;
```
**リファクタリング後**: 
- ❌ **重大な問題**: translationTimeoutManagerRefが存在しないため、タイムアウトが開始されない
- この部分がuseRealtimeTranscriptionとuseTranslationQueueに分割されたが、統合が不完全

### セクション8: handlePipelineEvent - Translationイベント処理 (610-800行)

```typescript
case 'translation':
  // 履歴用高品質翻訳またはパラグラフ翻訳の場合
  if (event.data.segmentId && 
      (event.data.segmentId.startsWith('history_') || 
       event.data.segmentId.startsWith('paragraph_'))) {
    const isParagraph = event.data.segmentId.startsWith('paragraph_');
    const baseId = event.data.segmentId.replace(/^(history_|paragraph_)/, '');
    const targetId = isParagraph ? baseId : (segmentToCombinedMap.current.get(baseId) || baseId);
    
    // 高品質翻訳を保存
    if (translationText) {
      highQualityTranslationsRef.current.set(targetId, translationText);
      
      // SessionMemoryService: 高品質翻訳で更新
      if (isSessionActive && !isParagraph) {
        updateTranslation(targetId, {
          japanese: translationText,
          completeMs: Date.now()
        });
      }
      
      // FlexibleHistoryGrouperの内部状態も更新
      if (historyGrouperRef.current) {
        if (isParagraph) {
          historyGrouperRef.current.updateParagraphTranslation(targetId, translationText);
        } else {
          historyGrouperRef.current.updateSentenceTranslation(targetId, translationText);
        }
      }
      
      // 既存の履歴ブロックを更新
      setHistoryBlocks(prevBlocks => {...});
    }
    break; // 通常の翻訳処理はスキップ
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
  }
  
  // Handle translation completion
  if (event.data.isFinal && event.data.segmentId) {
    if (displayManagerRef.current) {
      displayManagerRef.current.completeTranslation(event.data.segmentId);
    }
    
    // パラグラフ翻訳の場合は特別処理
    if (event.data.segmentId.startsWith('paragraph_')) {
      // ...
      return;
    }
    
    // 通常の履歴追加処理（パラグラフモードでは無効化）
    const segment = segmentTranslationMap.current.get(event.data.segmentId);
    if (segment && segment.original && segment.translation) {
      // 個別セグメントの履歴追加は無効化
      /*
      if (historyGrouperRef.current && !addedToGrouperSet.current.has(event.data.segmentId)) {
        historyGrouperRef.current.addSentence({...});
      }
      */
      
      // 通常の履歴には追加（後方互換性）
      if (!addedToHistorySet.current.has(event.data.segmentId)) {
        const translation: Translation = {...};
        setHistory(prev => [...prev, translation]);
        if (onTranslation) onTranslation(translation);
      }
    }
    
    // Clean up segment map
    segmentTranslationMap.current.delete(event.data.segmentId);
  }
  break;
```
**リファクタリング後**: 
- ❌ **重大な問題**: translationTimeoutManagerRef.clearTimeoutが呼ばれない
- 翻訳イベント処理がuseTranslationQueueに移動されたが、displayManagerとの統合が不完全

### セクション9: handlePipelineEvent - その他のイベント (810-1077行)

#### segmentイベント (811-818行)
```typescript
case 'segment':
  // Segment events are now handled through ASR/Translation events
  // 停止時の重複イベントをスキップ
  if (state.status === 'stopping' || state.status === 'stopped') {
    break;
  }
  console.log('[useUnifiedPipeline] Segment event (legacy):', event.data);
  break;
```
**リファクタリング後**: ✅ 変更なし

#### summary / progressiveSummaryイベント (820-904行)
```typescript
case 'summary':
case 'progressiveSummary':
  // 要約の処理
  const summary: Summary = {
    id: `summary-${Date.now()}`,
    english: event.data.english,
    japanese: event.data.japanese,
    wordCount: event.data.wordCount || 0,
    timestamp: event.timestamp,
    timeRange: { start: event.data.startTime || 0, end: event.data.endTime || Date.now() },
    threshold: event.data.threshold // progressiveの場合
  };
  
  setSummaries(prev => [...prev, summary]);
  
  // メインプロセスに送信
  if (window.electron?.send) {
    window.electron.send('summary-created', summary);
  }
  
  // SessionMemoryServiceに永続化
  if (isSessionActive) {
    try {
      addSummary(summary);
    } catch (error) {
      console.error('[useUnifiedPipeline] Failed to add summary to session memory:', error);
    }
  }
  
  if (onSummary) onSummary(summary);
  break;
```
**リファクタリング後**: ✅ 変更なし

#### statusイベント (906-924行)
```typescript
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
```
**リファクタリング後**: ✅ 変更なし

#### vocabulary / finalReportイベント (926-942行)
```typescript
case 'vocabulary':
  if (event.data.items && Array.isArray(event.data.items)) {
    setVocabulary(event.data.items);
    console.log(`[useUnifiedPipeline] Vocabulary generated: ${event.data.totalTerms} terms`);
  }
  break;

case 'finalReport':
  if (event.data.report) {
    setFinalReport(event.data.report);
    console.log(`[useUnifiedPipeline] Final report generated: ${event.data.totalWordCount} words`);
  }
  break;
```
**リファクタリング後**: ✅ 変更なし

#### combinedSentenceイベント (944-998行)
```typescript
case 'combinedSentence':
  // 結合された文をFlexibleHistoryGrouperに追加
  if (historyGrouperRef.current) {
    // 結合IDとセグメントIDのマッピングを保存
    event.data.segmentIds.forEach((segmentId: string) => {
      segmentTranslationMap.current.set(segmentId, {
        original: event.data.originalText,
        translation: '',
        combinedId: event.data.combinedId
      });
      segmentToCombinedMap.current.set(segmentId, event.data.combinedId);
    });
    
    // 結合された文として履歴に追加
    historyGrouperRef.current.addSentence({
      id: event.data.combinedId,
      original: event.data.originalText,
      translation: '', // 空文字列に変更（Phase 1修正）
      timestamp: event.data.timestamp
    });
    
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
      } catch (error) {
        console.error('[useUnifiedPipeline] Failed to add translation to session memory:', error);
      }
    }
  }
  break;
```
**リファクタリング後**: ✅ 変更なし

#### errorイベント / default (1022-1077行)
```typescript
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
```
**リファクタリング後**: ✅ 変更なし

### セクション10: イベントリスナー設定 (1079-1176行)

#### Pipelineイベント購読 (1084-1097行)
```typescript
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
```
**リファクタリング後**: ✅ 変更なし

#### Electronイベントリスナー (1099-1169行)
```typescript
// リアルタイム表示用の直接イベントリスナー
if (window.electron) {
  // 文字起こし結果の直接更新
  const originalUpdateHandler = (_event: any, data: any) => {
    if (originalTextManagerRef.current) {
      originalTextManagerRef.current.update(data.text);
    }
    setCurrentOriginal(data.text);
  };
  window.electron.on('current-original-update', originalUpdateHandler);
  
  // 翻訳結果の直接更新
  const translationUpdateHandler = (_event: any, text: string) => {
    setCurrentTranslation(text);
  };
  window.electron.on('current-translation-update', translationUpdateHandler);
  
  // プログレッシブ要約イベントのリスナー
  const progressiveSummaryHandler = (_event: any, summary: any) => {
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
        // 同じ闾値の要約を更新（重複を避ける）
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
      
      if (onSummary) {
        onSummary(summaryData);
      }
    }
  };
  window.electron.on('progressive-summary', progressiveSummaryHandler);
  
  // クリーンアップ関数を登録
  cleanupFunctions.current.push(() => {
    window.electron?.removeListener('current-original-update', originalUpdateHandler);
    window.electron?.removeListener('current-translation-update', translationUpdateHandler);
    window.electron?.removeListener('progressive-summary', progressiveSummaryHandler);
  });
}
```
**リファクタリング後**: ✅ 変更なし

### セクション11: Control Functions (1178-1306行)

#### startFromMicrophone (1179-1234行)
```typescript
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

    // SessionMemoryService: セッション開始
    const sessionClassName = className || `session_${new Date().toISOString().split('T')[0]}`;
    if (!isSessionActive) {
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
    // エラー処理
  }
}, [currentSourceLanguage, currentTargetLanguage, state.status, generateCorrelationId, onError, className, isSessionActive, startSession]);
```
**リファクタリング後**: 
- ❌ **問題**: startAudioCaptureがuseAudioCaptureに切り出されたが、統合されていない

#### stop (1236-1278行)
```typescript
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
      try {
        await completeSession();
      } catch (error) {
        console.error('[useUnifiedPipeline] Failed to complete session memory:', error);
      }
    }

    setIsRunning(false);
    setState(prev => ({ ...prev, status: 'stopped' }));
    currentCorrelationId.current = null;
  } catch (err: any) {
    // エラー処理
  }
}, [state.status, onError, isSessionActive, completeSession]);
```
**リファクタリング後**: 
- ❌ **問題**: stopAudioCaptureがuseAudioCaptureに切り出されたが、統合されていない

#### translateUserInput (1280-1306行)
```typescript
const translateUserInput = useCallback(async (text: string, from: string = 'ja', to: string = 'en'): Promise<string> => {
  try {
    // Placeholder implementation - in real scenario, this would call the pipeline service
    console.log('[useUnifiedPipeline] Translating user input:', text);
    
    if (from === 'ja' && to === 'en') {
      return `Could you explain more about "${text}"?`;
    } else if (from === 'en' && to === 'ja') {
      return `「${text}」について詳しく教えてください。`;
    }
    
    return `Translation: ${text}`;
  } catch (err: any) {
    // エラー処理
  }
}, [onError]);
```
**リファクタリング後**: ✅ 変更なし

### セクション12: AudioCapture実装 (1308-1426行)

```typescript
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
        sampleRate: 16000,
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
```
**リファクタリング後**: 
- ❌ **問題**: この部分全体がuseAudioCapture.tsに切り出されたが、startFromMicrophoneとstopで呼び出されていない

### セクション13: Clear FunctionsとUtility Functions (1428-1532行)

#### Clear Functions (1428-1468行)
```typescript
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
    addedToHistorySet.current.clear();
    addedToGrouperSet.current.clear();
    
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
```
**リファクタリング後**: ✅ 変更なし

#### generateVocabulary / generateFinalReport (1470-1518行)
```typescript
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

const generateFinalReport = useCallback(async () => {
  // 同様の実装
}, []);
```
**リファクタリング後**: ✅ 変更なし

#### updateLanguages (1520-1532行)
```typescript
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
```
**リファクタリング後**: ✅ 変更なし

### セクション14: Return値 (1533-1596行)

```typescript
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
```
**リファクタリング後**: ✅ Return値は変更なし

## リファクタリング後のファイル分析

### 1. 新規作成されたファイル

#### useAudioCapture.ts (263行)
- **責任**: 音声キャプチャロジックの管理
- **元の場所**: セクション12 (1308-1426行)
- **主な機能**:
  - MediaStream取得とAudioContext管理
  - AudioWorkletProcessor作成と制御
  - PCM16データの送信処理
  - リソースクリーンアップ
- **インターフェース**:
  ```typescript
  interface UseAudioCaptureReturn {
    isCapturing: boolean;
    error: Error | null;
    startCapture: () => Promise<void>;
    stopCapture: () => void;
    audioMetrics: { sampleRate: number; frameCount: number; };
  }
  ```

#### useRealtimeTranscription.ts (335行)
- **責任**: ASRイベント処理とリアルタイム表示管理
- **元の場所**: セクション7のASRイベント処理 (536-608行) + handleTranslationTimeout関数 (486-534行)
- **主な機能**:
  - ASRイベントの処理
  - SyncedRealtimeDisplayManagerの管理
  - IncrementalTextManagerの管理
  - TranslationTimeoutManagerの管理
- **インターフェース**:
  ```typescript
  interface UseRealtimeTranscriptionReturn {
    currentTranscription: string;
    pendingSegments: Map<string, SegmentInfo>;
    displayManager: SyncedRealtimeDisplayManager | null;
    textManager: IncrementalTextManager | null;
    handleASREvent: (event: PipelineEvent) => void;
    clearTranslationTimeout: (segmentId: string) => boolean;
    // ... その他
  }
  ```

#### useTranslationQueue.ts (287行)
- **責任**: 翻訳イベント処理とキュー管理
- **元の場所**: セクション8の翻訳イベント処理 (610-800行)
- **主な機能**:
  - 翻訳イベントの処理
  - 高品質翻訳の管理
  - セグメントマッピング
  - StreamBatcher管理
- **インターフェース**:
  ```typescript
  interface UseTranslationQueueReturn {
    activeTranslations: Map<string, TranslationSegment>;
    highQualityTranslations: Map<string, string>;
    streamBatcher: StreamBatcher | null;
    handleTranslationEvent: (event: PipelineEvent) => void;
    registerSegmentMapping: (segmentId: string, combinedId: string) => void;
    // ... その他
  }
  ```

### 2. 主要な統合問題

#### 🔴 問題1: TranslationTimeoutの統合不全
- **問題**: TranslationTimeoutManagerがuseRealtimeTranscriptionに移動されたが、翻訳イベント処理でタイムアウトをクリアする処理が統合されていない
- **影響**: 翻訳が来てもタイムアウトがクリアされず、誤ったタイムアウト処理が実行される可能性
- **必要な修正**:
  ```typescript
  // useUnifiedPipeline.tsのhandlePipelineEvent内で
  case 'translation':
    // clearTranslationTimeoutを呼び出す必要がある
    if (event.data.segmentId) {
      clearTranslationTimeout(event.data.segmentId);
    }
  ```

#### 🔴 問題2: AudioCaptureの統合不全
- **問題**: startAudioCaptureとstopAudioCaptureがuseAudioCaptureに移動されたが、startFromMicrophoneとstopメソッドで呼び出されていない
- **影響**: 音声キャプチャが開始/停止されない
- **必要な修正**:
  ```typescript
  // useAudioCaptureフックの使用
  const { startCapture, stopCapture } = useAudioCapture({...});
  
  // startFromMicrophone内で
  await startCapture();
  
  // stop内で
  stopCapture();
  ```

#### 🔴 問題3: DisplayManager統合の不整合
- **問題**: displayManagerRefがuseRealtimeTranscriptionに移動されたが、翻訳イベント処理でアクセスできない
- **影響**: 翻訳結果が画面に表示されない
- **必要な修正**: displayManager.updateTranslationとcompleteTranslationの呼び出しを適切に統合する

### 3. リファクタリング後のuseUnifiedPipeline.ts構造

現在のuseUnifiedPipeline.ts (1373行):
- セクション12 (AudioCapture) が削除され、useAudioCaptureフックを使用
- handleTranslationTimeout関数が削除
- 新しいフックのインポートと使用:
  ```typescript
  import { useAudioCapture } from './useAudioCapture';
  import { useRealtimeTranscription } from './useRealtimeTranscription';
  import { useTranslationQueue } from './useTranslationQueue';
  ```

### 4. 統合の推奨手順

1. **useAudioCaptureの統合**:
   ```typescript
   const { isCapturing, startCapture, stopCapture } = useAudioCapture({
     enabled: isEnabled,
     onError: (error) => {
       setError(error.message);
       if (onError) onError(error.message);
     }
   });
   ```

2. **useRealtimeTranscriptionの統合**:
   ```typescript
   const {
     displayManager,
     handleASREvent,
     clearTranslationTimeout,
     setDisplayPairsCallback
   } = useRealtimeTranscription({
     enabled: isEnabled,
     onTranslationTimeout: handleTranslationTimeout,
     // ...
   });
   
   // displayPairsコールバックを設定
   useEffect(() => {
     setDisplayPairsCallback(setDisplayPairs);
   }, [setDisplayPairsCallback, setDisplayPairs]);
   ```

3. **useTranslationQueueの統合**:
   ```typescript
   const {
     handleTranslationEvent,
     registerSegmentMapping,
     highQualityTranslations
   } = useTranslationQueue({
     enabled: isEnabled,
     onTranslationComplete: (segmentId, translation, original) => {
       // displayManagerと統合
       if (displayManager) {
         displayManager.updateTranslation(translation, segmentId);
         displayManager.completeTranslation(segmentId);
       }
       // タイムアウトをクリア
       clearTranslationTimeout(segmentId);
     },
     // ...
   });
   ```

4. **handlePipelineEventの簡略化**:
   ```typescript
   const handlePipelineEvent = useCallback((event: PipelineEvent) => {
     switch (event.type) {
       case 'asr':
         handleASREvent(event);
         break;
       case 'translation':
         handleTranslationEvent(event);
         break;
       // その他のイベントはそのまま
     }
   }, [handleASREvent, handleTranslationEvent]);
   ```

## 結論と推奨事項

### 🔴 重大な統合問題のサマリ

1. **TranslationTimeoutの統合不全**
   - useRealtimeTranscriptionでタイムアウトが開始される
   - useTranslationQueueで翻訳が処理される
   - しかしclearTranslationTimeoutが呼ばれない

2. **AudioCaptureの未接続**
   - useAudioCaptureフックは作成された
   - しかしstartFromMicrophoneとstopで使用されていない

3. **DisplayManagerの分断**
   - displayManagerはuseRealtimeTranscriptionに属する
   - しかし翻訳結果の更新はuseTranslationQueueで行われる
   - 両者の連携が不十分

### 推奨アクション

1. **即座に修正すべき点**:
   - useAudioCaptureのインテグレーション
   - clearTranslationTimeoutの呼び出し追加
   - displayManagerの更新ロジック統合

2. **テスト必須項目**:
   - 翻訳タイムアウト機能
   - 音声キャプチャの開始/停止
   - リアルタイム表示の同期

3. **将来的な改善提案**:
   - カスタムフック間のイベントバスまたはContextを使用した統合
   - 状態管理のuseReducerへの移行
   - さらなる責任分離（useSummaryGeneration等）

### 最終的なファイル構成

```
src/hooks/
├── useUnifiedPipeline.ts (1373行) - 統合フック
├── useAudioCapture.ts (263行) - 音声キャプチャ
├── useRealtimeTranscription.ts (335行) - ASR処理
├── useTranslationQueue.ts (287行) - 翻訳処理
└── useSessionMemory.ts - セッション管理
```

合計行数: 2258行（元の1596行から増加）
- 増加理由: インターフェース定義、ドキュメント、エラー処理の追加

このリファクタリングはClean Architectureの原則に従った良い方向性ですが、
統合不備による機能不全を早急に修正する必要があります。