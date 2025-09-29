import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionLogger } from '../utils/sessionLogger';
import { TranslationSmoother } from '../utils/translationSmoother';
import { IncrementalTextManager } from '../utils/incrementalTextManager';
import { StreamBatcher } from '../utils/streamBatcher';
import { RealtimeDisplayManager, DisplaySegment } from '../utils/realtimeDisplayManager';

// Types
interface Translation {
  id: string;
  original: string;
  japanese: string;
  timestamp: number;
  firstPaintMs: number;
  completeMs: number;
}

interface Summary {
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

interface PipelineState {
  status: 'idle' | 'starting' | 'running' | 'stopping' | 'stopped';
  currentSegmentId: string | null;
  wordCount: number;
  duration: number;
  startTime: number | null;
}

export const useUnifiedPipeline = () => {
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [currentOriginal, setCurrentOriginal] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [smoothedTranslation, setSmoothedTranslation] = useState('');
  const [realtimeSegments, setRealtimeSegments] = useState<DisplaySegment[]>([]); // 複数行表示用
  const [history, setHistory] = useState<Translation[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<Translation[][]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [state, setState] = useState<PipelineState>({
    status: 'idle',
    currentSegmentId: null,
    wordCount: 0,
    duration: 0,
    startTime: null
  });
  
  // Cleanup functions for event listeners
  const cleanupFunctions = useRef<(() => void)[]>([]);
  
  // Session logger
  const sessionLogger = useRef<SessionLogger | null>(null);
  
  // Translation smoother
  const translationSmoother = useRef<TranslationSmoother | null>(null);
  
  // Incremental text managers
  const originalTextManager = useRef<IncrementalTextManager | null>(null);
  const translationTextManager = useRef<IncrementalTextManager | null>(null);
  
  // Stream batchers
  const translationBatcher = useRef<StreamBatcher | null>(null);
  
  // Realtime display manager
  const displayManager = useRef<RealtimeDisplayManager | null>(null);
  
  useEffect(() => {
    // Setup event listeners
    const unsubscribers = [
      window.electronAPI.onPipelineStarted(() => {
        setIsRunning(true);
        setState(prev => ({ ...prev, status: 'running' }));
        setError(null);
        // ログセッション開始
        sessionLogger.current = new SessionLogger();
        // 翻訳スムーザー初期化
        translationSmoother.current = new TranslationSmoother(
          (smoothedText, metadata) => {
            setSmoothedTranslation(smoothedText);
            if (metadata.isReset) {
              console.log(`🔄 [Smoother] Reset detected: confidence=${metadata.confidence}, text="${smoothedText}"`);
            }
          },
          {
            resetThreshold: 0.3,   // 30%以下に減少でリセット判定
            minLengthToSmooth: 5,  // 5文字以上でスムージング開始（安定性重視）
            debounceMs: 300        // 300ms デバウンス（調査結果推奨値）
          }
        );
        
        // 差分管理マネージャー初期化
        originalTextManager.current = new IncrementalTextManager(
          (text, isStable) => {
            setCurrentOriginal(text);
            console.log(`📝 [Original] ${isStable ? '✅ Stable' : '⏳ Updating'}: "${text}"`);
          },
          800 // 0.8秒で確定
        );
        
        translationTextManager.current = new IncrementalTextManager(
          (text, isStable) => {
            setSmoothedTranslation(text);
            // リアルタイム表示マネージャーに翻訳を通知
            if (displayManager.current) {
              displayManager.current.updateTranslation(text);
            }
            if (isStable || text.length > 20) {  // 安定時または20文字以上でのみログ
              console.log(`🈳 [Translation] ${isStable ? '✅ Stable' : '⏳ Updating'}: "${text}"`);
            }
          },
          1000 // 1秒で確定
        );
        
        // ストリームバッチャー初期化
        translationBatcher.current = new StreamBatcher(
          (batchedText) => {
            if (translationTextManager.current) {
              translationTextManager.current.update(batchedText);
            }
          },
          {
            minInterval: 100,   // 100ms間隔
            maxWait: 200,      // 最大200ms待機
            minChars: 2,       // 2文字以上
          }
        );
        
        // リアルタイム表示マネージャー初期化
        displayManager.current = new RealtimeDisplayManager(
          (segments) => {
            setRealtimeSegments(segments);
          }
        );
      }),
      
      window.electronAPI.onPipelineStopped(() => {
        setIsRunning(false);
        setState(prev => ({ ...prev, status: 'stopped' }));
        // ログセッション終了
        if (sessionLogger.current) {
          sessionLogger.current.endSession();
          sessionLogger.current = null;
        }
        // 翻訳スムーザー終了
        if (translationSmoother.current) {
          translationSmoother.current.destroy();
          translationSmoother.current = null;
        }
        // 差分管理マネージャー終了
        if (originalTextManager.current) {
          originalTextManager.current.destroy();
          originalTextManager.current = null;
        }
        if (translationTextManager.current) {
          translationTextManager.current.destroy();
          translationTextManager.current = null;
        }
        // ストリームバッチャー終了
        if (translationBatcher.current) {
          translationBatcher.current.destroy();
          translationBatcher.current = null;
        }
        // リアルタイム表示マネージャー終了
        if (displayManager.current) {
          displayManager.current.destroy();  // destroyを呼んでタイマーをクリーンアップ
          displayManager.current = null;
        }
      }),
      
      window.electronAPI.onDeepgramConnected(() => {
        console.log('[useUnifiedPipeline] Deepgram connected');
      }),
      
      window.electronAPI.onCurrentOriginalUpdate((data: string | { text: string; isFinal: boolean }) => {
        // 文字列かオブジェクトかを判定
        const text = typeof data === 'string' ? data : data.text;
        const isFinal = typeof data === 'object' ? data.isFinal : false;
        
        // 差分管理で更新
        if (originalTextManager.current) {
          originalTextManager.current.update(text);
        } else {
          setCurrentOriginal(text);
        }
        
        // リアルタイム表示マネージャーに通知（isFinal情報付き）
        if (displayManager.current) {
          displayManager.current.updateOriginal(text, isFinal);
        }
        
        // リアルタイムログ
        if (sessionLogger.current) {
          sessionLogger.current.logRealtimeUpdate('original', text);
        }
      }),
      
      window.electronAPI.onCurrentTranslationUpdate((text: string) => {
        setCurrentTranslation(text);
        
        // バッチャー経由で更新
        if (translationBatcher.current) {
          translationBatcher.current.add(text);
        } else if (translationTextManager.current) {
          // フォールバック：差分管理で直接更新
          translationTextManager.current.update(text);
        } else if (translationSmoother.current) {
          // フォールバック：スムーザーを使用
          translationSmoother.current.update(text);
        } else {
          // 最終フォールバック：直接設定
          setSmoothedTranslation(text);
        }
        
        // リアルタイムログ
        if (sessionLogger.current) {
          sessionLogger.current.logRealtimeUpdate('translation', text);
        }
      }),
      
      window.electronAPI.onTranslationComplete((data: Translation) => {
        setHistory(prev => {
          const newHistory = [...prev, data];
          // 履歴を数文ごとにグループ化（3文ずつ）
          groupHistorySegments(newHistory);
          return newHistory;
        });
        setCurrentOriginal('');
        setCurrentTranslation('');
        setSmoothedTranslation('');
        
        // リアルタイム表示マネージャーで現在のセグメントを完了
        if (displayManager.current) {
          displayManager.current.completeCurrentSegment();
        }
        
        // 差分管理マネージャーのリセット
        if (originalTextManager.current) {
          originalTextManager.current.reset();
        }
        if (translationTextManager.current) {
          translationTextManager.current.reset();
        }
        // バッチャーもリセット
        if (translationBatcher.current) {
          translationBatcher.current.reset();
        }
        
        // スムーザーの状態リセット
        if (translationSmoother.current) {
          translationSmoother.current.resetState();
        }
        
        // セグメント完了ログ
        if (sessionLogger.current) {
          sessionLogger.current.logSegment({
            original: data.original,
            japanese: data.japanese,
            firstPaintMs: data.firstPaintMs,
            completeMs: data.completeMs
          });
        }
      }),
      
      window.electronAPI.onSummaryGenerated((data: Summary) => {
        setSummaries(prev => [...prev, data]);
      }),
      
      window.electronAPI.onUserTranslation((_data: { translation: string }) => {
        // This is handled by the callback in translateUserInput
      }),
      
      window.electronAPI.onFinalReport((report: string) => {
        setFinalReport(report);
      }),
      
      window.electronAPI.onPipelineError((errorMsg: string) => {
        const errorStr = typeof errorMsg === 'object' ? JSON.stringify(errorMsg, null, 2) : errorMsg;
        console.error('[useUnifiedPipeline] Error:', errorStr);
        setError(errorStr);
        setIsRunning(false);
        setState(prev => ({ ...prev, status: 'idle' }));
      })
    ];
    
    cleanupFunctions.current = unsubscribers;
    
    // Cleanup on unmount
    return () => {
      unsubscribers.forEach(cleanup => cleanup && cleanup());
    };
  }, []);
  
  // 履歴を数文ごとにグループ化する関数
  const groupHistorySegments = useCallback((historyList: Translation[]) => {
    const groupSize = 3; // 3文ずつグループ化
    const groups: Translation[][] = [];
    
    for (let i = 0; i < historyList.length; i += groupSize) {
      const group = historyList.slice(i, i + groupSize);
      groups.push(group);
    }
    
    setGroupedHistory(groups);
  }, []);
  
  // Control functions
  const startFromFile = useCallback(async (filePath: string) => {
    try {
      setError(null);
      setState(prev => ({ ...prev, status: 'starting' }));
      await window.electronAPI.startPipelineFile(filePath);
      // isRunning will be set by onPipelineStarted event
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start pipeline';
      setError(errorMsg);
      setState(prev => ({ ...prev, status: 'idle' }));
      console.error('[useUnifiedPipeline] Start failed:', err);
    }
  }, []);
  
  const startFromMicrophone = useCallback(async () => {
    try {
      setError(null);
      setState(prev => ({ ...prev, status: 'starting' }));

      // 1) Pipeline（Deepgram接続）を先に開始
      await window.electronAPI.startPipelineMic();

      // 2) 16k/mono でのマイク取得（明示的な権限要求）
      console.log('[useUnifiedPipeline] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          channelCount: 1, 
          sampleRate: 16000, 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: false // AGC を無効化（より生音声に近づける）
        }
      });
      console.log('[useUnifiedPipeline] Microphone access granted');

      // 3) WebAudioで PCM16(16k) フレーム化（32ms=512サンプル=1024byte）
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      const source = ctx.createMediaStreamSource(stream);

      // ScriptProcessor は非推奨だが Electron では実用的に動作（まずは最短経路）
      const frameSamples = 512; // 32ms @16k (2のべき乗、最小の実用サイズ)
      const processor = ctx.createScriptProcessor(frameSamples, 1, 1);

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const input = (e.inputBuffer.getChannelData(0) as Float32Array);
        // Float32 [-1,1] → PCM16LE
        const buf = new ArrayBuffer(input.length * 2);
        const view = new DataView(buf);
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        // Renderer→Main→Deepgram
        (window as any).electron.sendAudioChunk(buf);
      };

      source.connect(processor);
      processor.connect(ctx.destination); // 必須でないが安定のため

      setIsRunning(true);
      setState(prev => ({ ...prev, status: 'running' }));

      // 終了ハンドラ用にクリーンアップを保持（ここでは省略可）
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start microphone';
      setError(errorMsg);
      setState(prev => ({ ...prev, status: 'idle' }));
      console.error('[useUnifiedPipeline] Mic start failed:', err);
    }
  }, []);
  
  const stop = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'stopping' }));
      await window.electronAPI.stopPipeline();
      // isRunning will be cleared by onPipelineStopped event
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to stop pipeline';
      setError(errorMsg);
      console.error('[useUnifiedPipeline] Stop failed:', err);
    }
  }, []);
  
  const translateUserInput = useCallback(async (text: string, from: string = 'ja', to: string = 'en'): Promise<string> => {
    try {
      const result = await window.electronAPI.translateUserInput(text, from, to);
      return result.translation || '';
    } catch (err: any) {
      const errorMsg = err.message || 'Translation failed';
      setError(errorMsg);
      console.error('[useUnifiedPipeline] User translation failed:', err);
      return '';
    }
  }, []);
  
  const refreshState = useCallback(async () => {
    try {
      const pipelineState = await window.electronAPI.getPipelineState();
      setState(pipelineState);
    } catch (err: any) {
      console.error('[useUnifiedPipeline] Failed to get state:', err);
    }
  }, []);
  
  // Clear functions
  const clearHistory = useCallback(() => {
    setHistory([]);
    setGroupedHistory([]);
  }, []);
  
  const clearSummaries = useCallback(() => {
    setSummaries([]);
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    // State
    isRunning,
    currentOriginal,      // ③ Current English
    currentTranslation: smoothedTranslation || currentTranslation,   // ④ Current Japanese (smoothed)
    realtimeSegments,    // 複数行対比表示用
    history,             // ①② History English/Japanese
    groupedHistory,      // 履歴をグループ化したもの
    summaries,           // ⑤⑥ Summary English/Japanese
    error,
    finalReport,
    state,
    
    // Control functions
    startFromFile,
    startFromMicrophone,
    stop,
    translateUserInput,   // ⑦⑧ User Input/Translation
    refreshState,
    
    // Clear functions
    clearHistory,
    clearSummaries,
    clearError
  };
};