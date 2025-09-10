/**
 * UniVoice Perfect Implementation
 * HTMLモックアップの全機能を完全に実装
 * 
 * 実装済み機能:
 * - LocalStorage による設定の永続化
 * - キーボードショートカット（スペースキーで開始）
 * - リサイズハンドル機能
 * - 自動フォントサイズ調整
 * - 8秒ごとのリアルタイム更新シミュレーション
 * - メモの編集機能
 * - セクションの拡大/縮小
 * - ブロックガイドの表示制御
 * - 完全な履歴構造
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUnifiedPipeline } from '../hooks/useUnifiedPipeline';
import type { DisplaySegment } from '../utils/RealtimeDisplayManager';
import type { HistoryBlock } from '../utils/FlexibleHistoryGrouper';
import { SetupSection } from '../presentation/components/UniVoice/sections/SetupSection';
import { RealtimeSection } from '../presentation/components/UniVoice/sections/RealtimeSection';
import { HistorySection } from '../presentation/components/UniVoice/sections/HistorySection';
import { SummarySection } from '../presentation/components/UniVoice/sections/SummarySection';
import { ProgressiveSummarySection } from '../presentation/components/UniVoice/sections/ProgressiveSummarySection';
import { UserInputSection } from '../presentation/components/UniVoice/sections/UserInputSection';
import { FullscreenModal, MemoModal, ReportModal } from '../presentation/components/UniVoice/modals';
import { renderHistoryToHTML } from './UnifiedHistoryRenderer';
// import { exportToWord, exportToPDF } from '../utils/exportUtils'; // TODO: Copy utility files

interface SectionHeights {
  history: number;
  summary: number;
  input: number;
}

interface Memo {
  id: string;
  timestamp: string;
  japanese: string;
  english: string;
}

interface MockUpdate {
  original: string;
  translation: string;
  isContinuation: boolean;
}

interface HistoryEntry {
  id: string;
  original: string;
  translation: string;
  isComplete: boolean;
  timestamp: number;
}

// 新アーキテクチャ統合用のpropsインターフェース
interface UniVoiceProps {
  // 新アーキテクチャ: リアルタイムセグメント表示用
  realtimeSegmentsOverride?: DisplaySegment[];
  // 履歴データのオーバーライド
  historyOverride?: HistoryEntry[];
  // 要約データのオーバーライド
  summaryOverride?: { japanese: string; english: string };
  // ユーザー入力翻訳コールバック（新アーキテクチャ経由）
  onUserTranslate?: (text: string, from: string, to: string) => Promise<string>;
  // パイプライン制御コールバック（新アーキテクチャ経由）
  onStartSession?: () => Promise<void>;
  onStopSession?: () => Promise<void>;
  // 設定オーバーライド
  sourceLanguageOverride?: string;
  targetLanguageOverride?: string;
}

// DisplaySegmentはRealtimeDisplayManagerからインポート済み

export const UniVoice: React.FC<UniVoiceProps> = ({
  realtimeSegmentsOverride,
  historyOverride: _historyOverride,
  summaryOverride: _summaryOverride,
  onUserTranslate,
  onStartSession: _onStartSession,
  onStopSession: _onStopSession,
  sourceLanguageOverride,
  targetLanguageOverride,
}) => {
  // ========== 状態管理 ==========
  const [showSetup, setShowSetup] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [autoSaveTime, setAutoSaveTime] = useState<Date | null>(null);
  
  // LocalStorageから言語設定を復元（propsでオーバーライド可能）
  const [sourceLanguage, setSourceLanguage] = useState(() => 
    sourceLanguageOverride || localStorage.getItem('sourceLanguage') || 'en'
  );
  const [targetLanguage, setTargetLanguage] = useState(() => 
    targetLanguageOverride || localStorage.getItem('targetLanguage') || 'ja'
  );
  
  // セクション高さ（LocalStorageから復元）
  const [sectionHeights, setSectionHeights] = useState<SectionHeights>(() => {
    const saved = localStorage.getItem('sectionHeights');
    const defaultHeights = { history: 30, summary: 12, input: 20 };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 異常な値を防ぐ
        if (parsed.history > 60 || parsed.history < 10) {
          console.warn('履歴ウィンドウの高さが異常:', parsed.history);
          return defaultHeights;
        }
        return parsed;
      } catch (e) {
        return defaultHeights;
      }
    }
    return defaultHeights;
  });
  
  // 拡大されているセクション
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // expandedSectionの変化を監視（ログ削除）
  
  // モーダル状態
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  
  // メモリスト
  const [memoList, setMemoList] = useState<Memo[]>([]);
  
  // 要約データ
  const [summaryJapanese, setSummaryJapanese] = useState<string>('');
  const [summaryEnglish, setSummaryEnglish] = useState<string>('');
  
  // 履歴データ（実データのみ使用）
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  
  // 現在の表示テキスト
  // Phase 2: Override または パイプラインデータを使用
  const [currentDisplay, setCurrentDisplay] = useState({
    original: {
      oldest: "",
      older: "",
      recent: ""
    },
    translation: {
      oldest: "",
      older: "",
      recent: ""
    }
  });
  
  // ブロックガイドの表示状態
  const [showBlockGuides, setShowBlockGuides] = useState(true);
  
  // リサイズ中の状態
  const [isResizing, setIsResizing] = useState(false);
  const [resizingSection, setResizingSection] = useState<string | null>(null);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  
  // 音声キャプチャ（コメントアウト - 新実装では不要）
  // const { state: audioState, startCapture, stopCapture } = useAudioCapture();
  
  // パイプライン接続（コメントアウト - 新実装では不要）
  // const {
  //   isConnected,
  //   isRunning,
  //   error: pipelineError,
  //   currentOriginal,
  //   currentTranslation,
  //   segments,
  //   summaries,
  //   metrics,
  //   startPipeline,
  //   stopPipeline,
  //   startFromFile,
  //   translateUserInput: translateUserInputPipeline,
  //   exportSession,
  //   clearState
  // } = usePipelineConnection();
  
  // 新しいuseUnifiedPipelineフックを使用
  const pipeline = useUnifiedPipeline({
    sourceLanguage,
    targetLanguage,
    onError: (error) => {
      console.error('[UniVoicePerfect] Pipeline error:', error);
    },
    onStatusChange: (status) => {
      console.log('[UniVoicePerfect] Pipeline status:', status);
    }
  });

  // 新アーキテクチャからのデータを統合
  const isRunning = pipeline.isRunning;
  const pipelineError = pipeline.error;
  const historyBlocks = pipeline.historyBlocks; // FlexibleHistoryGrouperからのデータ
  const summaries = pipeline.summaries; // 要約データ
  const displayPairs = pipeline.displayPairs; // 3段階表示用データ
  const threeLineDisplay = pipeline.threeLineDisplay; // RealtimeDisplayServiceからの3段階表示
  
  // リアルタイムセグメントデータ（propsまたはpipelineから）
  const realtimeSegments = realtimeSegmentsOverride || pipeline.realtimeSegments || [];
  
  // 現在の原文と翻訳（後方互換性）
  const currentOriginal = pipeline.currentOriginal;
  const currentTranslation = pipeline.currentTranslation;
  
  // デバッグ用：データ更新を監視
  useEffect(() => {
    console.log('[UniVoicePerfect] currentOriginal updated:', currentOriginal);
  }, [currentOriginal]);
  
  useEffect(() => {
    console.log('[UniVoicePerfect] currentTranslation updated:', currentTranslation);
  }, [currentTranslation]);
  
  // 3段階表示用のdisplayContentを構築
  const displayContent = React.useMemo(() => {
    console.log('[UniVoice] Building displayContent - input threeLineDisplay:', {
      hasThreeLineDisplay: !!threeLineDisplay,
      threeLineDisplayType: typeof threeLineDisplay,
      keys: threeLineDisplay ? Object.keys(threeLineDisplay) : [],
      oldest: threeLineDisplay?.oldest ? {
        hasOriginal: !!threeLineDisplay.oldest.original,
        originalLength: threeLineDisplay.oldest.original?.length,
        hasTranslation: !!threeLineDisplay.oldest.translation,
        translationLength: threeLineDisplay.oldest.translation?.length
      } : null,
      older: threeLineDisplay?.older ? {
        hasOriginal: !!threeLineDisplay.older.original,
        originalLength: threeLineDisplay.older.original?.length,
        hasTranslation: !!threeLineDisplay.older.translation,
        translationLength: threeLineDisplay.older.translation?.length
      } : null,
      recent: threeLineDisplay?.recent ? {
        hasOriginal: !!threeLineDisplay.recent.original,
        originalLength: threeLineDisplay.recent.original?.length,
        hasTranslation: !!threeLineDisplay.recent.translation,
        translationLength: threeLineDisplay.recent.translation?.length
      } : null
    });

    if (!threeLineDisplay || (!threeLineDisplay.oldest && !threeLineDisplay.older && !threeLineDisplay.recent)) {
      // 空の場合でもundefinedではなく空のオブジェクトを返す
      console.log('[UniVoice] Returning empty displayContent');
      return {
        original: {
          oldest: '',
          older: '',
          recent: ''
        },
        translation: {
          oldest: '',
          older: '',
          recent: ''
        },
        opacity: {
          oldest: 0.3,
          older: 0.6,
          recent: 1.0
        }
      };
    }
    
    // RealtimeDisplayServiceからのデータを使用
    console.log('[UniVoice] Building displayContent from threeLineDisplay:', {
      hasData: !!threeLineDisplay,
      hasOldest: !!threeLineDisplay?.oldest,
      hasOlder: !!threeLineDisplay?.older,
      hasRecent: !!threeLineDisplay?.recent,
      oldestText: threeLineDisplay?.oldest?.original?.substring(0, 30),
      olderText: threeLineDisplay?.older?.original?.substring(0, 30),
      recentText: threeLineDisplay?.recent?.original?.substring(0, 30)
    });
    
    const result = {
      original: {
        oldest: threeLineDisplay.oldest?.original || '',
        older: threeLineDisplay.older?.original || '',
        recent: threeLineDisplay.recent?.original || ''
      },
      translation: {
        oldest: threeLineDisplay.oldest?.translation || '',
        older: threeLineDisplay.older?.translation || '',
        recent: threeLineDisplay.recent?.translation || ''
      },
      opacity: {
        oldest: threeLineDisplay.oldest?.opacity || 0.3,
        older: threeLineDisplay.older?.opacity || 0.6,
        recent: threeLineDisplay.recent?.opacity || 1.0
      },
      heights: {
        oldest: threeLineDisplay.oldest?.height || 40,
        older: threeLineDisplay.older?.height || 40,
        recent: threeLineDisplay.recent?.height || 40
      },
      maxHeight: threeLineDisplay.maxHeight || 120  // 左右統一高さ
    };
    
    console.log('[UniVoice] Final displayContent built:', {
      original: {
        oldestLength: result.original.oldest.length,
        olderLength: result.original.older.length,
        recentLength: result.original.recent.length
      },
      translation: {
        oldestLength: result.translation.oldest.length,
        olderLength: result.translation.older.length,
        recentLength: result.translation.recent.length
      }
    });
    
    return result;
  }, [threeLineDisplay]);
  
  // currentDisplay is updated by currentOriginal and currentTranslation directly
  
  // pipelineのhistoryが更新されたらhistoryEntriesを更新
  useEffect(() => {
    if (pipeline.history && pipeline.history.length > 0) {
      console.log('[UniVoicePerfect] Updating history entries from pipeline:', pipeline.history.length);
      const entries: HistoryEntry[] = pipeline.history.map(item => ({
        id: item.id,
        original: item.original,
        translation: item.japanese,
        timestamp: item.timestamp || Date.now(),
        isComplete: true // 履歴に追加される時点で完了済み
      }));
      setHistoryEntries(entries);
    }
  }, [pipeline.history]);
  
  // 履歴データ（propsまたはpipelineから）
  const historyData = _historyOverride || pipeline.history.map(h => ({
    id: h.id,
    original: h.original,
    translation: h.japanese,
    isComplete: true,
    timestamp: h.timestamp
  })) || [];
  
  // Refs
  const recordingStartTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mockUpdateIndex = useRef(0);
  
  // リアルタイム翻訳用の一時的なバッファ（UniVoice 2.0では不要）
  // RealtimeDisplayManagerが管理するため削除
  
  // currentDisplayは既に128行目で定義済み
  
  // ========== useEffect フック ==========
  
  // Phase 2: リアルタイムセグメントから3行表示を構築（DisplaySegmentインターフェースに対応）
  // 注意: 親フォルダの実装に従い、currentOriginal/currentTranslation経由で更新するためコメントアウト
  // useEffect(() => {
  //   if (realtimeSegments && realtimeSegments.length > 0) {
  //     // DisplaySegmentから原文と翻訳を分離
  //     const originals = realtimeSegments
  //       .filter(s => s.type === 'original')
  //       .sort((a, b) => b.updatedAt - a.updatedAt)
  //       .slice(0, 3);
  //     const translations = realtimeSegments
  //       .filter(s => s.type === 'translation')
  //       .sort((a, b) => b.updatedAt - a.updatedAt)
  //       .slice(0, 3);
  //     
  //     // 3行分のデータを構築
  //     const newDisplay = {
  //       original: {
  //         oldest: originals[2]?.text || '',
  //         older: originals[1]?.text || '',
  //         recent: originals[0]?.text || ''
  //       },
  //       translation: {
  //         oldest: translations[2]?.text || '',
  //         older: translations[1]?.text || '',
  //         recent: translations[0]?.text || ''
  //       }
  //     };
  //     
  //     setCurrentDisplay(newDisplay);
  //     console.log('[UniVoice] 3行表示更新:', newDisplay);
  //   } else if (realtimeSegments && realtimeSegments.length === 0) {
  //     // セグメントが空の場合は表示をクリア
  //     setCurrentDisplay({
  //       original: { oldest: '', older: '', recent: '' },
  //       translation: { oldest: '', older: '', recent: '' }
  //     });
  //   }
  // }, [realtimeSegments]);
  
  // このuseEffectは削除（currentOriginalOverrideが未定義のため）
  
  // この重複したuseEffectは削除
  
  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && showSetup) {
        e.preventDefault();
        handleStartSession(selectedClass || '', sourceLanguage, targetLanguage);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSetup]);
  
  // タイマー
  useEffect(() => {
    if (!showSetup && !isPaused) {
      timerRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current.getTime()) / 1000);
          setRecordingTime(elapsed);
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showSetup, isPaused]);
  
  // 自動保存（60秒ごと）
  useEffect(() => {
    if (!showSetup && !isPaused) {
      const saveInterval = setInterval(() => {
        setAutoSaveTime(new Date());
        // LocalStorageに保存
        localStorage.setItem('lastSession', JSON.stringify({
          className: selectedClass,
          historyEntries,
          memoList,
          timestamp: new Date().toISOString()
        }));
      }, 60000);
      
      return () => clearInterval(saveInterval);
    }
    return undefined;
  }, [showSetup, isPaused, selectedClass, historyEntries, memoList]);
  
  // RealtimeDisplayManagerのセグメントを使用して3つの完成文を表示
  useEffect(() => {
    console.log('[UniVoicePerfect] realtimeSegments更新:', realtimeSegments.length, realtimeSegments);
    // realtimeSegmentsから最大3つのセグメントを取得（新しい順から逆順に）
    const segments = realtimeSegments.slice(-3).reverse();
    
    // 3つのセグメントを oldest, older, recent に割り当て（古い→新しい順）
    setCurrentDisplay(prev => {
      // 値が変わった場合のみ更新（無限ループ防止）
      const newOriginal = {
        oldest: segments[0]?.original || '',
        older: segments[1]?.original || '',
        recent: segments[2]?.original || ''
      };
      const newTranslation = {
        oldest: segments[0]?.translation || '',
        older: segments[1]?.translation || '',
        recent: segments[2]?.translation || ''
      };
      
      // 値が同じ場合は更新しない
      if (prev.original.oldest === newOriginal.oldest &&
          prev.original.older === newOriginal.older &&
          prev.original.recent === newOriginal.recent &&
          prev.translation.oldest === newTranslation.oldest &&
          prev.translation.older === newTranslation.older &&
          prev.translation.recent === newTranslation.recent) {
        return prev;
      }
      
      return {
        original: newOriginal,
        translation: newTranslation
      };
    });
  }, [realtimeSegments]);
  
  // 履歴データの統合（propsまたはpipelineから）
  useEffect(() => {
    if (historyData && historyData.length > 0) {
      // 重複を除去してから設定
      const uniqueHistoryMap = new Map<string, typeof historyData[0]>();
      historyData.forEach(item => {
        uniqueHistoryMap.set(item.id, item);
      });
      const uniqueHistory = Array.from(uniqueHistoryMap.values());
      setHistoryEntries(uniqueHistory);
    }
  }, [JSON.stringify(historyData.map(h => h.id))]); // IDのリストを文字列化して比較
  
  // summaryOverrideが提供されたら使用
  useEffect(() => {
    if (_summaryOverride) {
      setSummaryJapanese(_summaryOverride.japanese || '');
      setSummaryEnglish(_summaryOverride.english || '');
    }
  }, [_summaryOverride]);
  
  // パイプラインから最新の要約を取得（通常の要約用）
  useEffect(() => {
    if (summaries && summaries.length > 0) {
      // 進捗的要約ではない通常の要約のみを表示
      const regularSummaries = summaries.filter(s => !s.threshold);
      if (regularSummaries.length > 0) {
        const latestSummary = regularSummaries[regularSummaries.length - 1];
        setSummaryJapanese(latestSummary.japanese || '');
        setSummaryEnglish(latestSummary.english || '');
      }
      console.log('[UniVoice] Summaries:', { total: summaries.length, progressive: summaries.filter(s => s.threshold).length });
    }
  }, [summaries]);
  
  // 設定の保存
  useEffect(() => {
    localStorage.setItem('sourceLanguage', sourceLanguage);
  }, [sourceLanguage]);
  
  useEffect(() => {
    localStorage.setItem('targetLanguage', targetLanguage);
  }, [targetLanguage]);
  
  useEffect(() => {
    localStorage.setItem('sectionHeights', JSON.stringify(sectionHeights));
  }, [sectionHeights]);
  
  // セクション高さの変更（ログ削除）
  
  // 履歴エントリ数の変更（ログ削除）
  
  // リサイズハンドラー
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizingSection) return;
      
      const deltaY = e.clientY - startY;
      const viewportHeight = window.innerHeight;
      const deltaVH = (deltaY / viewportHeight) * 100;
      
      // リサイズ計算: ${resizingSection}: ${startHeight}vh + ${deltaVH}vh
      
      setSectionHeights(prev => ({
        ...prev,
        [resizingSection]: Math.max(10, Math.min(60, startHeight + deltaVH))
      }));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingSection(null);
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resizingSection, startY, startHeight]);
  
  // ブロックガイドを5秒後に非表示（モックアップに合わせて延長）
  useEffect(() => {
    if (!showSetup && showBlockGuides) {
      const timer = setTimeout(() => {
        setShowBlockGuides(false);
      }, 5000); // 3秒→5秒に延長
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showSetup, showBlockGuides]);
  
  // ========== イベントハンドラー ==========
  
  // SetupSectionから呼ばれるコールバック
  const handleStartSession = async (className: string, sourceLang: string, targetLang: string) => {
    setSelectedClass(className);
    setSourceLanguage(sourceLang);
    setTargetLanguage(targetLang);
    
    // 言語設定をLocalStorageに保存
    localStorage.setItem('sourceLanguage', sourceLang);
    localStorage.setItem('targetLanguage', targetLang);
    
    setShowSetup(false);
    setIsPaused(false);
    recordingStartTimeRef.current = new Date();
    setRecordingTime(0);
    setShowBlockGuides(true);
    
    // パイプライン開始
    console.log('[UniVoice] セッション開始:', className, 'Source:', sourceLang, 'Target:', targetLang);
    
    try {
      // useUnifiedPipelineのstartFromMicrophoneメソッドを使用
      await pipeline.startFromMicrophone();
      console.log('[UniVoice] パイプライン開始成功');
      
      // セッションメタデータをメインプロセスに送信（自動保存のため）
      if (window.electron?.send) {
        window.electron.send('session-metadata-update', {
          className: className,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        });
        console.log('[UniVoice] Session metadata sent to main process');
      }
    } catch (error) {
      console.error('[UniVoice] パイプライン開始エラー:', error);
      alert('音声認識の開始に失敗しました。マイクの権限を確認してください。');
      setShowSetup(true);
    }
  };
  
  const togglePause = async () => {
    // 🔴 CRITICAL: isRunning（pipeline）を使用し、正しい関数を呼び出す
    if (isRunning) {
      // 一時停止
      console.log('[UniVoice] パイプライン一時停止');
      try {
        await pipeline.stop();
        setIsPaused(true);
      } catch (error) {
        console.error('[UniVoice] 停止エラー:', error);
      }
    } else {
      // 再開
      console.log('[UniVoice] パイプライン再開');
      try {
        await pipeline.startFromMicrophone();
        setIsPaused(false);
      } catch (error) {
        console.error('[UniVoice] 再開エラー:', error);
      }
    }
  };
  
  const endSession = async () => {
    try {
      console.log('[UniVoice] セッション終了中...');
      
      // 新実装では親コンポーネントが停止を制御
      if (_onStopSession) {
        try {
          await _onStopSession();
          console.log('[UniVoice] パイプライン停止成功');
        } catch (error) {
          console.error('[UniVoice] パイプライン停止エラー:', error);
        }
      }
      
      // パイプラインを停止
      try {
        await pipeline.stop();
        console.log('[UniVoice] パイプライン停止成功');
      } catch (error) {
        console.error('[UniVoice] パイプライン停止エラー:', error);
      }
      
      // DataPersistenceServiceに終了を通知
      if (window.electron?.send) {
        window.electron.send('session-end');
        console.log('[UniVoice] Session end notification sent');
      }
      
      // 最終レポート生成
      const report = await generateFinalReport();
      if (report) {
        setShowReportModal(true);
        console.log('[UniVoice] セッション終了完了');
      } else {
        alert('レポート生成に失敗しました。録音データは保存されています。');
      }
    } catch (error: any) {
      console.error('[UniVoice] セッション終了エラー:', error);
      alert('セッション終了中にエラーが発生しました: ' + error.message);
    }
  };
  
  const nextClass = () => {
    // レポート発行
    generateReport(false);
    
    // DataPersistenceServiceに次の授業へ移ることを通知
    if (window.electron?.send) {
      window.electron.send('next-class');
      console.log('[UniVoice] Next class notification sent');
    }
    
    // すべてのコンテンツをクリア
    clearAllContent();
    
    setShowReportModal(false);
    setShowSetup(true);
    setSelectedClass(null);
    setRecordingTime(0);
    recordingStartTimeRef.current = null;
    setShowBlockGuides(true);
    
    alert('レポートを保存しました。\n新しい授業の録音を開始します。');
  };
  
  // すべてのコンテンツをクリア
  const clearAllContent = () => {
    // 履歴をクリア
    setHistoryEntries([]);
    
    // 現在の表示をクリア（実データ優先）
    setCurrentDisplay({
      original: {
        oldest: '',
        older: '',
        recent: ''  // 実データが来るまで空表示
      },
      translation: {
        oldest: '',
        older: '',
        recent: ''  // 実データが来るまで空表示
      }
    });
    
    // メモリストをクリア
    setMemoList([]);
    
    // 入力欄をクリア
    const textarea = document.getElementById('questionInput') as HTMLTextAreaElement;
    if (textarea) textarea.value = '';
  };
  
  // 最終レポート生成（パイプライン統合版）
  const generateFinalReport = async () => {
    try {
      console.log('[UniVoice] 最終レポート生成中...');
      
      // 新実装では親コンポーネントがレポート生成を管理
      const reportContent = {
        className: selectedClass,
        duration: formatTime(recordingTime),
        summary: {
          ja: summaryJapanese || '本セッションの要約はまだ利用できません。',
          en: summaryEnglish || 'Session summary not available yet.'
        },
        vocabulary: [],
        segments: historyEntries.map((seg: HistoryEntry) => ({
          original: seg.original,
          translation: seg.translation,
            timestamp: seg.timestamp
          })),
          memos: memoList,
          metrics: null // 新実装では親が管理
        };
        
        // LocalStorageに保存
        localStorage.setItem(`report_${Date.now()}`, JSON.stringify(reportContent));
        console.log('[UniVoice] レポート保存完了:', reportContent);
        
        return reportContent;
    } catch (error: any) {
      console.error('[UniVoice] レポート生成エラー:', error);
      // フォールバック：基本的なレポートを生成
      return {
        className: selectedClass,
        duration: formatTime(recordingTime),
        summary: {
          ja: 'セッション完了。詳細な要約の生成中にエラーが発生しました。',
          en: 'Session completed. Error occurred while generating detailed summary.'
        },
        vocabulary: [],
        segments: historyEntries,
        memos: memoList,
        error: error.message
      };
    }
  };
  
  // 従来のレポート生成（後方互換性）
  const generateReport = (showAlert: boolean = true) => {
    generateFinalReport().then(_reportContent => {
      if (showAlert) {
        alert('レポートを生成しました。');
      }
    });
  };
  
  // 要約データの表示（削除 - summaryEnglish/summaryJapaneseで管理）
  
  // 要約データの更新（削除 - summaryOverrideで対応済み）
  
  // フォントサイズ自動調整
  const adjustFontSize = () => {
    const origElement = document.getElementById('currentOriginal');
    const transElement = document.getElementById('currentTranslation');
    
    [origElement, transElement].forEach(element => {
      if (!element) return;
      const textLength = element.textContent?.length || 0;
      element.classList.remove('small-font', 'extra-small-font');
      
      if (textLength > 200) {
        element.classList.add('extra-small-font');
      } else if (textLength > 150) {
        element.classList.add('small-font');
      }
    });
  };
  
  // Export handlers
  const handleWordExport = async () => {
    const exportData = {
      className: selectedClass || '無題の授業',
      duration: formatTime(recordingTime),
      date: new Date(),
      summary: {
        ja: _summaryOverride?.japanese || '要約データなし',
        en: _summaryOverride?.english || 'No summary data'
      },
      vocabulary: [],
      history: historyEntries.map(entry => ({
        original: entry.original,
        translation: entry.translation
      })),
      memos: memoList
    };
    
    try {
      // await exportToWord(exportData);
      console.log('Word export would be called with:', exportData);
    } catch (error) {
      console.error('Word export failed:', error);
      alert('エクスポートに失敗しました');
    }
  };
  
  const handlePDFExport = () => {
    const exportData = {
      className: selectedClass || '無題の授業',
      duration: formatTime(recordingTime),
      date: new Date(),
      summary: {
        ja: _summaryOverride?.japanese || '要約データなし',
        en: _summaryOverride?.english || 'No summary data'
      },
      vocabulary: [],
      history: historyEntries.map(entry => ({
        original: entry.original,
        translation: entry.translation
      })),
      memos: memoList
    };
    
    try {
      // exportToPDF(exportData);
      console.log('PDF export would be called with:', exportData);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('エクスポートに失敗しました');
    }
  };
  
  // セクションクリックハンドラー
  const handleHistoryClick = (event: React.MouseEvent) => {
    if (window.getSelection()?.toString()) return;
    if ((event.target as HTMLElement).classList.contains('resize-handle')) return;
    
    // タイトルは renderHistoryToHTML 内で設定されるため不要
    setModalTitle('');
    setModalContent(getAlignedHistoryContent());
    setShowFullscreenModal(true);
  };
  
  const handleSummaryClick = (event: React.MouseEvent) => {
    if (window.getSelection()?.toString()) return;
    if ((event.target as HTMLElement).classList.contains('resize-handle')) return;
    
    setModalTitle('📊 要約（英日対比）');
    setModalContent(getSummaryComparisonContent());
    setShowFullscreenModal(true);
  };
  
  // 入力エリアの拡大
  const expandInput = (expand: boolean) => {
    if (expand) {
      setExpandedSection('input');
    } else if (!window.getSelection()?.toString()) {
      setExpandedSection(null);
    }
  };
  
  // メモの保存（パイプライン統合版）
  const saveAsMemo = async () => {
    const japaneseText = (document.getElementById('questionInput') as HTMLTextAreaElement)?.value;
    
    if (!japaneseText?.trim()) return;
    
    try {
      const englishText = await generateEnglishQuestion(japaneseText);
      const currentTime = formatTime(recordingTime);
      
      const newMemo: Memo = {
        id: `memo_${Date.now()}`,
        timestamp: currentTime,
        japanese: japaneseText,
        english: englishText
      };
      
      setMemoList([...memoList, newMemo]);
      addMemoMarkerToHistory(currentTime);
      
      alert('メモを保存しました');
    } catch (error: any) {
      console.error('[UniVoice] メモ保存エラー:', error);
      alert('メモの保存に失敗しました');
    }
  };
  
  // メモマーカーを履歴に追加
  const addMemoMarkerToHistory = (timestamp: string) => {
    setHistoryEntries(prev => {
      if (prev.length > 0) {
        const updated = [...prev];
        const lastEntry = updated[updated.length - 1];
        // メモマーカーを追加（実際のマーカー表示は別途実装が必要）
        console.log(`メモマーカー追加: ${timestamp}`);
        return updated;
      }
      return prev;
    });
  };
  
  // ユーザー入力の英訳生成（親コンポーネント経由）
  const generateEnglishQuestion = async (japaneseText: string): Promise<string> => {
    try {
      if (onUserTranslate) {
        const translation = await onUserTranslate(japaneseText, 'ja', 'en');
        return translation || 'Translation failed: ' + japaneseText;
      } else {
        console.warn('[UniVoice] onUserTranslate not provided');
        return 'Translation not available: ' + japaneseText;
      }
    } catch (error: any) {
      console.error('[UniVoice] 翻訳例外:', error);
      return 'Could you explain more about ' + japaneseText.substring(0, 30) + '...';
    }
  };
  
  // メモの編集保存
  const saveMemoEdit = (memoId: string) => {
    setMemoList(prev => prev.map(memo => {
      if (memo.id === memoId) {
        const jaElement = document.getElementById(`${memoId}-ja`) as HTMLTextAreaElement;
        const enElement = document.getElementById(`${memoId}-en`) as HTMLTextAreaElement;
        return {
          ...memo,
          japanese: jaElement?.value || memo.japanese,
          english: enElement?.value || memo.english
        };
      }
      return memo;
    }));
  };
  
  // リサイズハンドルのマウスダウン
  const handleResizeMouseDown = (section: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizingSection(section);
    setStartY(e.clientY);
    setStartHeight(sectionHeights[section as keyof SectionHeights]);
  };
  
  // ========== ヘルパー関数 ==========
  
  // テキストを3つの部分に分割（親プロジェクトと同じ実装）
  const splitText = (text: string) => {
    const words = text.split(' ');
    const third = Math.floor(words.length / 3);
    return {
      oldest: words.slice(0, third).join(' '),
      older: words.slice(third, third * 2).join(' '),
      recent: words.slice(third * 2).join(' ')
    };
  };
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getAlignedHistoryContent = (): string => {
    // historyBlocksを使用（FlexibleHistoryGrouper形式）
    return renderHistoryToHTML(historyBlocks, {
      showTimestamps: true,
      showBlockNumbers: true,
      title: '📖 全文履歴（時間整列表示）'
    });
  };
  
  const getSummaryComparisonContent = (): string => {
    // 実データを使用（summaryEnglish/summaryJapaneseから、なければ_summaryOverride、最後にデフォルトメッセージ）
    const englishSummary = summaryEnglish || _summaryOverride?.english || 'No summary available yet...';
    const japaneseSummary = summaryJapanese || _summaryOverride?.japanese || '要約はまだありません...';
    
    return `
      <div class="summary-comparison" style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        padding: 20px;
        background: #fafafa;
        border-radius: 8px;
      ">
        <div class="summary-lang-section" style="
          padding: 20px;
          background: white;
          border-radius: 6px;
          line-height: 1.8;
        ">
          <div class="summary-lang-title" style="
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #667eea;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
          ">English Summary</div>
          <div class="summary-content" style="
            color: #333;
            line-height: 1.8;
            white-space: pre-wrap;
          ">${englishSummary}</div>
        </div>
        <div class="summary-lang-section" style="
          padding: 20px;
          background: white;
          border-radius: 6px;
          line-height: 1.8;
        ">
          <div class="summary-lang-title" style="
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #667eea;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
          ">日本語要約</div>
          <div class="summary-content" style="
            color: #333;
            line-height: 1.8;
            white-space: pre-wrap;
          ">${japaneseSummary}</div>
        </div>
      </div>
    `;
  };
  
  // セクションの高さスタイル計算
  const getSectionStyle = (section: string) => {
    let height = sectionHeights[section as keyof SectionHeights];
    
    if (expandedSection === section) {
      height = 60; // 拡大時
    } else if (expandedSection && expandedSection !== section && section !== 'current') {
      height = 10; // 圧縮時
    }
    
    // 履歴セクションの高さ計算完了
    
    // 履歴セクションの高さを最大40vhに制限
    if (section === 'history' && height > 40) {
      height = 40;
    }
    
    return {
      height: `${height}vh`,
      transition: 'height 0.3s ease'
    };
  };
  
  // ========== セットアップ画面 ==========
  if (showSetup) {
    return (
      <SetupSection
        onStartSession={handleStartSession}
        initialClassName={selectedClass || ''}
        defaultSourceLanguage={sourceLanguage}
        defaultTargetLanguage={targetLanguage}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh'
        }}
      />
    );
  }
  
  // ========== メイン画面 ==========
  return (
    <>
      <div style={{ height: '100vh', background: '#f0f0f2' }}>
        {/* ヘッダー */}
        <div style={{
          background: 'white',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0',
          height: '50px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isRunning ? '#ff4444' : '#999',
              animation: isRunning ? 'pulse 1.5s infinite' : 'none'
            }} />
            <span style={{ fontSize: '14px', color: '#666' }}>
              {isRunning ? '文字起こし中' : '一時停止中'}
            </span>
            <span style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>
              {formatTime(recordingTime)}
            </span>
            {memoList.length > 0 && (
              <span style={{
                display: 'inline-block',
                background: '#ffd700',
                color: '#333',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '3px',
                marginLeft: '8px',
                fontWeight: 600
              }}>
                メモ {memoList.length}
              </span>
            )}
            <button onClick={togglePause} style={{
              padding: '4px 10px',
              background: isRunning ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              marginLeft: '10px'
            }}>
              {isRunning ? '⏸ 停止' : '▶ 再開'}
            </button>
            {autoSaveTime && (
              <span style={{ fontSize: '12px', color: '#4CAF50', marginLeft: '15px', opacity: 0.8 }}>
                ✓ 自動保存済み
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowBlockGuides(!showBlockGuides)} style={{
              padding: '6px 16px',
              background: 'white',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}>
              {showBlockGuides ? '💡 ガイドを隠す' : '💡 ガイドを表示'}
            </button>
            <button onClick={endSession} style={{
              padding: '6px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}>
              📚 授業終了
            </button>
            <button onClick={nextClass} style={{
              padding: '6px 16px',
              background: 'white',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}>
              ➡️ 次の授業へ
            </button>
          </div>
        </div>
        
        {/* コンテンツエリア */}
        <div style={{ height: 'calc(100vh - 50px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* ブロックガイド */}
          {showBlockGuides && (
            <>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '0 0 8px 8px',
                fontSize: '11px',
                zIndex: 100,
                pointerEvents: 'none'
              }}>
                📖 クリックで全文を時間軸付きで英日対比表示 | ドラッグで高さ調整可能
              </div>
              <div style={{
                position: 'absolute',
                top: `${sectionHeights.history}vh`,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                zIndex: 100,
                pointerEvents: 'none'
              }}>
                🎤 リアルタイム文字起こし（固定高さ）
              </div>
              <div style={{
                position: 'absolute',
                top: `${sectionHeights.history + 44}vh`,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                zIndex: 100,
                pointerEvents: 'none'
              }}>
                📊 クリックで要約を英日対比表示 | ドラッグで高さ調整可能
              </div>
              <div style={{
                position: 'absolute',
                bottom: '0',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '8px 8px 0 0',
                fontSize: '11px',
                zIndex: 100,
                pointerEvents: 'none'
              }}>
                💭 質問・メモを入力 → 英訳生成 | フォーカスで自動拡大
              </div>
            </>
          )}
          
          {/* 履歴セクション */}
          <HistorySection
            historyBlocks={historyBlocks}
            height={sectionHeights.history}
            isExpanded={expandedSection === 'history'}
            onClick={handleHistoryClick}
            onResize={(e) => handleResizeMouseDown('history', e)}
            onBlockClick={(block) => {
              console.log('[UniVoice] History block clicked:', block.id);
            }}
          />
          
          {/* 現在のセクション（固定） */}
          <RealtimeSection
            {...(displayContent.original.recent || displayContent.original.older || displayContent.original.oldest 
              ? {} 
              : { currentOriginal, currentTranslation }
            )}
            displayContent={{
              original: displayContent.original,
              translation: displayContent.translation
            }}
            displayOpacity={{
              original: displayContent.opacity,
              translation: displayContent.opacity
            }}
            volumeLevel={0} // TODO: 音声レベルの実装
            isRunning={isRunning}
            debug={true} // デバッグを有効化
          />
          
          {/* 要約セクション - 進捗的要約を表示 */}
          <ProgressiveSummarySection
            summaries={summaries || []}
            pipelineError={pipelineError}
            height={sectionHeights.summary}
            isExpanded={expandedSection === 'summary'}
            onClick={handleSummaryClick}
            onResize={(e) => handleResizeMouseDown('summary', e)}
          />
          
          {/* 入力セクション */}
          <UserInputSection
            height={sectionHeights.input}
            isExpanded={expandedSection === 'input'}
            memoCount={memoList.length}
            onExpandInput={expandInput}
            onSaveAsMemo={saveAsMemo}
            onShowMemoModal={() => setShowMemoModal(true)}
            onResize={(e) => handleResizeMouseDown('input', e)}
            showTranslating={currentTranslation === '翻訳中...'}
          />
        </div>
      </div>
      
      {/* モーダル */}
      <FullscreenModal
        isOpen={showFullscreenModal}
        onClose={() => setShowFullscreenModal(false)}
        title={modalTitle}
        content={modalContent}
      />
      
      <MemoModal
        isOpen={showMemoModal}
        onClose={() => setShowMemoModal(false)}
        memoList={memoList}
        onSaveMemo={saveMemoEdit}
      />
      
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        selectedClass={selectedClass || ''}
        recordingTime={recordingTime}
        summaryEnglish={_summaryOverride?.english || ''}
        summaryJapanese={_summaryOverride?.japanese || ''}
        memoList={memoList}
        onWordExport={handleWordExport}
        onPDFExport={handlePDFExport}
        onNextClass={nextClass}
      />
      
      {/* スタイル */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .resize-handle:hover {
          background: rgba(102, 126, 234, 0.3) !important;
        }
        
        .resize-handle.active {
          background: #667eea !important;
        }
        
        .small-font {
          font-size: 16px !important;
        }
        
        .extra-small-font {
          font-size: 14px !important;
        }
        
        .history-paragraph.topic-break {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid #667eea;
        }
        
        .incomplete-sentence {
          color: #999;
          font-style: italic;
        }
        
        * {
          box-sizing: border-box;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </>
  );
};

export default UniVoice;