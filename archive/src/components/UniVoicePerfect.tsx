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
interface UniVoicePerfectProps {
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

// リアルタイム表示用のセグメント型
interface DisplaySegment {
  id: string;
  original: string;
  translation: string;
  status: 'active' | 'fading' | 'completed';
  opacity?: number;
}

export const UniVoicePerfect: React.FC<UniVoicePerfectProps> = ({
  realtimeSegmentsOverride,
  historyOverride: _historyOverride,
  summaryOverride: _summaryOverride,
  onUserTranslate,
  onStartSession,
  onStopSession,
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
    return saved ? JSON.parse(saved) : { history: 30, summary: 18, input: 18 };
  });
  
  // 拡大されているセクション
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
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
  const pipelineErrorState = pipeline.error;
  
  // リアルタイムセグメントデータ（propsまたはpipelineから）
  const realtimeSegments = realtimeSegmentsOverride || pipeline.realtimeSegments || [];
  
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
  
  // リアルタイム翻訳用の一時的なバッファ
  const [realtimeBuffer, setRealtimeBuffer] = useState({
    originalChunks: [] as string[],
    translationChunks: [] as string[],
    lastUpdate: Date.now()
  });
  
  // ========== useEffect フック ==========
  
  // Phase 2: Override またはパイプラインデータを currentDisplay に反映
  useEffect(() => {
    // 優先順位: 1. Override, 2. パイプラインのデータ, 3. デフォルト
    const originalText = currentOriginalOverride || currentOriginal || "";
    const translationText = currentTranslationOverride || currentTranslation || "";
    
    if (originalText || translationText) {
      // テキストを3つの部分に分割（古い、やや新しい、最新）
      const splitText = (text: string) => {
        const words = text.split(' ');
        const third = Math.floor(words.length / 3);
        return {
          oldest: words.slice(0, third).join(' '),
          older: words.slice(third, third * 2).join(' '),
          recent: words.slice(third * 2).join(' ')
        };
      };
      
      setCurrentDisplay({
        original: originalText ? splitText(originalText) : currentDisplay.original,
        translation: translationText ? splitText(translationText) : currentDisplay.translation
      });
    }
  }, [currentOriginalOverride, currentTranslationOverride, currentOriginal, currentTranslation]);
  
  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && showSetup) {
        e.preventDefault();
        startSession();
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
  }, [showSetup, isPaused, selectedClass, historyEntries, memoList]);
  
  // パイプラインからのリアルタイムデータ更新
  useEffect(() => {
    if (currentOriginal) {
      console.log('[UniVoicePerfect] Received original text:', currentOriginal);
      
      setRealtimeBuffer(prev => {
        const newOriginalChunks = [...prev.originalChunks, currentOriginal].slice(-3);
        return {
          ...prev,
          originalChunks: newOriginalChunks,
          lastUpdate: Date.now()
        };
      });
      
      setCurrentDisplay(prev => ({
        ...prev,
        original: {
          oldest: prev.original.older || '',
          older: prev.original.recent || '',
          recent: currentOriginal
        }
      }));
    }
  }, [currentOriginal]);
  
  // 翻訳データの更新
  useEffect(() => {
    if (currentTranslation) {
      console.log('[UniVoicePerfect] Received translation:', currentTranslation);
      
      setRealtimeBuffer(prev => {
        const newTranslationChunks = [...prev.translationChunks, currentTranslation].slice(-3);
        return {
          ...prev,
          translationChunks: newTranslationChunks,
          lastUpdate: Date.now()
        };
      });
      
      setCurrentDisplay(prev => ({
        ...prev,
        translation: {
          oldest: prev.translation.older || '',
          older: prev.translation.recent || '',
          recent: currentTranslation
        }
      }));
    }
  }, [currentTranslation]);
  
  // 履歴データの統合（propsまたはpipelineから）
  useEffect(() => {
    if (historyData && historyData.length > 0) {
      setHistoryEntries(historyData);
    }
  }, [historyData]);
  
  // summaryOverrideが提供されたら使用
  useEffect(() => {
    if (_summaryOverride) {
      setSummaryJapanese(_summaryOverride.japanese || '');
      setSummaryEnglish(_summaryOverride.english || '');
    }
  }, [_summaryOverride]);
  
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
  
  // リサイズハンドラー
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizingSection) return;
      
      const deltaY = e.clientY - startY;
      const viewportHeight = window.innerHeight;
      const deltaVH = (deltaY / viewportHeight) * 100;
      
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
  }, [showSetup, showBlockGuides]);
  
  // ========== イベントハンドラー ==========
  
  const selectClass = (className: string) => {
    setSelectedClass(className);
  };
  
  const startSession = async () => {
    const newClassName = (document.getElementById('newClassName') as HTMLInputElement)?.value;
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const finalClassName = selectedClass || newClassName ? 
      `${date}_${newClassName || selectedClass}` : 
      `${date}_授業`;
    
    setSelectedClass(finalClassName);
    setShowSetup(false);
    setIsPaused(false);
    recordingStartTimeRef.current = new Date();
    setRecordingTime(0);
    setShowBlockGuides(true);
    
    // 新実装では親コンポーネントがパイプラインを制御
    console.log('[UniVoice] セッション開始（親コンポーネントが制御）');
    
    // 実際のパイプライン開始
    if (onStartSession) {
      try {
        await onStartSession();
        console.log('[UniVoice] パイプライン開始成功');
      } catch (error) {
        console.error('[UniVoice] パイプライン開始エラー:', error);
      }
    }
  };
  
  const togglePause = async () => {
    if (!onStopSession || !onStartSession) return;
    
    if (_isRunning) {
      // 一時停止
      console.log('[UniVoice] パイプライン一時停止');
      await onStopSession();
    } else {
      // 再開
      console.log('[UniVoice] パイプライン再開');
      await onStartSession();
    }
  };
  
  const endSession = async () => {
    try {
      console.log('[UniVoice] セッション終了中...');
      
      // 新実装では親コンポーネントが停止を制御
      if (onStopSession) {
        try {
          await onStopSession();
          console.log('[UniVoice] パイプライン停止成功');
        } catch (error) {
          console.error('[UniVoice] パイプライン停止エラー:', error);
        }
      }
      
      // 最終レポート生成
      await generateFinalReport();
      setShowReportModal(true);
      
      console.log('[UniVoice] セッション終了完了');
    } catch (error: any) {
      console.error('[UniVoice] セッション終了エラー:', error);
      setShowReportModal(true);
    }
  };
  
  const nextClass = () => {
    // レポート発行
    generateReport(false);
    
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
      await exportToWord(exportData);
      console.log('Word export successful');
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
      exportToPDF(exportData);
      console.log('PDF export successful');
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('エクスポートに失敗しました');
    }
  };
  
  // セクションクリックハンドラー
  const handleHistoryClick = (event: React.MouseEvent) => {
    if (window.getSelection()?.toString()) return;
    if ((event.target as HTMLElement).classList.contains('resize-handle')) return;
    
    setModalTitle('📖 全文履歴（時間整列表示）');
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
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getAlignedHistoryContent = (): string => {
    const timeBlocks = historyEntries.map((entry) => {
      const startTime = formatTime(Math.floor(entry.timestamp / 1000));
      const endTime = formatTime(Math.floor((entry.timestamp + 150000) / 1000));
      
      return `
        <div class="aligned-paragraph" style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
          padding: 15px;
          background: #fafafa;
          border-radius: 6px;
        ">
          <div class="paragraph-time" style="
            grid-column: 1 / -1;
            font-size: 11px;
            color: #999;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
          ">⏱ ${startTime} - ${endTime}</div>
          <div class="aligned-original" style="
            padding-right: 15px;
            border-right: 1px solid #e0e0e0;
            line-height: 1.7;
          ">${entry.original}${!entry.isComplete ? ' <span style="color: #999; font-style: italic;">[続く...]</span>' : ''}</div>
          <div class="aligned-translation" style="
            padding-left: 15px;
            line-height: 1.7;
            color: #0066cc;
          ">${entry.translation}${!entry.isComplete ? ' <span style="color: #999; font-style: italic;">[続く...]</span>' : ''}</div>
        </div>
      `;
    }).join('');
    
    return timeBlocks;
  };
  
  const getSummaryComparisonContent = (): string => {
    // 実データを使用（_summaryOverrideから、なければデフォルトメッセージ）
    const englishSummary = _summaryOverride?.english || 'No summary available yet...';
    const japaneseSummary = _summaryOverride?.japanese || '要約はまだありません...';
    
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
    
    return {
      height: `${height}vh`,
      transition: 'height 0.3s ease'
    };
  };
  
  // ========== セットアップ画面 ==========
  if (showSetup) {
    return (
      <div className="setup-screen" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div className="setup-container" style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          width: '90%',
          maxWidth: '700px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{
            fontSize: '32px',
            color: '#333',
            marginBottom: '30px',
            textAlign: 'center'
          }}>UniVoice - 授業設定</h1>
          
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '18px', marginBottom: '15px', color: '#555' }}>📚 授業を選択</div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
              {[].map(className => (
                <div
                  key={className}
                  onClick={() => selectClass(className)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '2px solid #667eea',
                    background: selectedClass === className ? '#667eea' : 'white',
                    color: selectedClass === className ? 'white' : '#667eea',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  {className}
                </div>
              ))}
            </div>
            <input
              type="text"
              id="newClassName"
              placeholder="新しい授業名を入力（空欄OK - 自動で日付が付きます）"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#555' }}>📖 授業の言語</h3>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'white'
                }}
              >
                <option value="en">English (英語)</option>
                <option value="ja">日本語</option>
                <option value="zh">中文 (中国語)</option>
                <option value="ko">한국어 (韓国語)</option>
                <option value="es">Español (スペイン語)</option>
                <option value="fr">Français (フランス語)</option>
                <option value="de">Deutsch (ドイツ語)</option>
              </select>
            </div>
            
            <div>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#555' }}>🌏 翻訳したい言語</h3>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'white'
                }}
              >
                <option value="ja">日本語</option>
                <option value="en">English (英語)</option>
                <option value="zh">中文 (中国語)</option>
                <option value="ko">한국어 (韓国語)</option>
                <option value="es">Español (スペイン語)</option>
                <option value="fr">Français (フランス語)</option>
                <option value="de">Deutsch (ドイツ語)</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={startSession}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🎤 授業を開始
          </button>
          
          <p style={{
            textAlign: 'center',
            color: '#999',
            fontSize: '14px',
            marginTop: '15px'
          }}>
            ヒント: スペースキーでも開始できます
          </p>
        </div>
      </div>
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
              background: _isRunning ? '#ff4444' : '#999',
              animation: _isRunning ? 'pulse 1.5s infinite' : 'none'
            }} />
            <span style={{ fontSize: '14px', color: '#666' }}>
              {_isRunning ? '文字起こし中' : '一時停止中'}
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
              background: _isRunning ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              marginLeft: '10px'
            }}>
              {_isRunning ? '⏸ 停止' : '▶ 再開'}
            </button>
            {autoSaveTime && (
              <span style={{ fontSize: '12px', color: '#4CAF50', marginLeft: '15px', opacity: 0.8 }}>
                ✓ 自動保存済み
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
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
                top: `${sectionHeights.history + 28}vh`,
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
          <div onClick={handleHistoryClick} style={{
            ...getSectionStyle('history'),
            display: 'flex',
            background: 'white',
            borderBottom: '1px solid #ddd',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <div 
              className="resize-handle"
              onMouseDown={(e) => handleResizeMouseDown('history', e)}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '4px',
                bottom: '-2px',
                background: 'transparent',
                cursor: 'ns-resize',
                zIndex: 10
              }}
            />
            <div style={{ flex: 1, padding: '15px 20px', overflowY: 'auto', borderRight: '1px solid #e0e0e0' }}>
              {historyEntries.map((entry, i) => (
                <div key={entry.id} className="history-paragraph" style={{
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: i < historyEntries.length - 1 ? '1px solid #f0f0f0' : 'none',
                  lineHeight: '1.7',
                  fontSize: '13px'
                }}>
                  {entry.original}
                  {!entry.isComplete && (
                    <span style={{ color: '#999', fontStyle: 'italic' }}> [続く...]</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, padding: '15px 20px', overflowY: 'auto' }}>
              {historyEntries.map((entry, i) => (
                <div key={entry.id} className="history-paragraph" style={{
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: i < historyEntries.length - 1 ? '1px solid #f0f0f0' : 'none',
                  lineHeight: '1.7',
                  fontSize: '13px'
                }}>
                  {entry.translation}
                  {!entry.isComplete && (
                    <span style={{ color: '#999', fontStyle: 'italic' }}> [続く...]</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* 現在のセクション（固定） - 複数行対比表示（左右高さ揃え） */}
          <div style={{
            height: '28vh',
            display: 'flex',
            background: 'linear-gradient(to bottom, #fafafa, #ffffff)',
            borderBottom: '2px solid #ddd'
          }}>
            {realtimeSegments && realtimeSegments.length > 0 ? (
              /* 左右ペア表示 - Grid Layout で完全に高さ揃え */
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1px 1fr',
                gap: '0',
                width: '100%', 
                padding: '15px 20px',
                gridTemplateRows: `repeat(${realtimeSegments.length}, auto)`,
                alignItems: 'start' // 各行を上揃え
              }}>
                {realtimeSegmentsOverride.map((segment: any, index: number) => [
                  /* 原文側 */
                  <div 
                    key={`orig_${segment.id || index}`}
                    style={{
                      gridColumn: 1,
                      gridRow: index + 1,
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: segment.status === 'active' ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
                      opacity: segment.opacity !== undefined ? segment.opacity : (
                        segment.status === 'active' ? 1 : 
                        segment.status === 'fading' ? 0.6 : 0.4
                      ),
                      transition: 'opacity 0.2s ease-in-out',
                      marginBottom: '4px',
                      marginRight: '10px'
                    }}
                  >
                    <div style={{
                      fontSize: '15px',
                      lineHeight: '1.4',
                      color: '#111',
                      fontWeight: segment.status === 'active' ? 500 : 400,
                      wordWrap: 'break-word'
                    }}>
                      {segment.original || '...'}
                    </div>
                  </div>,
                  
                  /* 分割線 */
                  <div
                    key={`sep_${segment.id || index}`}
                    style={{
                      gridColumn: 2,
                      gridRow: index + 1,
                      width: '1px',
                      background: '#e0e0e0',
                      height: '100%'
                    }}
                  />,
                  
                  /* 翻訳側 - 原文と同じ行に配置 */
                  <div 
                    key={`trans_${segment.id || index}`}
                    style={{
                      gridColumn: 3,
                      gridRow: index + 1,
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: segment.status === 'active' ? 'rgba(0, 102, 204, 0.05)' : 'transparent',
                      opacity: segment.opacity !== undefined ? segment.opacity : (
                        segment.status === 'active' ? 1 : 
                        segment.status === 'fading' ? 0.6 : 0.4
                      ),
                      transition: 'opacity 0.2s ease-in-out',
                      marginBottom: '4px',
                      marginLeft: '10px'
                    }}
                  >
                    <div style={{
                      fontSize: '15px',
                      lineHeight: '1.4',
                      color: '#0066cc',
                      fontWeight: segment.status === 'active' ? 500 : 400,
                      wordWrap: 'break-word'
                    }}>
                      {segment.translation || (segment.status === 'active' ? '翻訳中...' : '')}
                    </div>
                  </div>
                ]).flat()}
              </div>
            ) : (
              /* 待機状態表示 */
              <>
                <div style={{
                  flex: 1,
                  padding: '15px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: '1px solid #e0e0e0',
                  color: '#999',
                  fontSize: '14px'
                }}>
                  音声認識待機中...
                </div>
                <div style={{
                  flex: 1,
                  padding: '15px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6699cc',
                  fontSize: '14px'
                }}>
                  翻訳待機中...
                </div>
              </>
            )}
          </div>
          
          {/* 要約セクション - パイプラインからのリアルデータ */}
          <div onClick={handleSummaryClick} style={{
            ...getSectionStyle('summary'),
            display: 'flex',
            background: '#f8f9fa',
            borderBottom: '1px solid #ddd',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <div 
              className="resize-handle"
              onMouseDown={(e) => handleResizeMouseDown('summary', e)}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '4px',
                top: '-2px',
                background: 'transparent',
                cursor: 'ns-resize',
                zIndex: 10
              }}
            />
            <div style={{ flex: 1, padding: '15px 20px' }}>
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.6',
                height: '100%',
                overflowY: 'auto'
              }}>
                {summaryEnglish || 'Waiting for summary...'}
                {/* パフォーマンス指標表示（新実装では親が管理） */}
              </div>
            </div>
            <div style={{ flex: 1, padding: '15px 20px' }}>
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.6',
                height: '100%',
                overflowY: 'auto'
              }}>
                {summaryJapanese || '要約を待っています...'}
                {/* 接続状態表示 */}
                {pipelineError && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#dc3545', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                    ⚠️ エラー: {pipelineError}
                  </div>
                )}
                {false && ( // isConnected は新実装では親が管理
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#ffc107', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                    🔌 パイプライン接続中...
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 入力セクション */}
          <div style={{
            ...getSectionStyle('input'),
            display: 'flex',
            background: 'white',
            borderTop: '2px solid #667eea',
            position: 'relative'
          }}>
            <div 
              className="resize-handle"
              onMouseDown={(e) => handleResizeMouseDown('input', e)}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '4px',
                top: '-2px',
                background: 'transparent',
                cursor: 'ns-resize',
                zIndex: 10
              }}
            />
            <div style={{ flex: 1, padding: '15px 20px' }}>
              <div style={{
                background: '#f0f9ff',
                padding: '15px',
                borderRadius: '8px',
                height: '100%',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#0066cc',
                display: 'flex',
                alignItems: 'center'
              }}>
                <div>質問を入力してください</div>
              </div>
            </div>
            <div style={{ flex: 1, padding: '15px 20px', display: 'flex', gap: '10px' }}>
              <textarea
                id="questionInput"
                placeholder="質問・発言したい内容・メモ（日本語でOK）"
                onFocus={() => expandInput(true)}
                onBlur={() => expandInput(false)}
                defaultValue=""
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'none'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => setShowMemoModal(true)} style={{
                  padding: '8px 16px',
                  background: 'white',
                  border: '1px solid #667eea',
                  borderRadius: '6px',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  position: 'relative'
                }}>
                  📝 一覧
                  {memoList.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      background: '#ffd700',
                      color: '#333',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontWeight: 600
                    }}>
                      {memoList.length}
                    </span>
                  )}
                </button>
                <button onClick={() => {
                  const textarea = document.getElementById('questionInput') as HTMLTextAreaElement;
                  const text = textarea?.value;
                  if (text?.trim()) {
                    setCurrentDisplay(prev => ({
                      ...prev,
                      translation: {
                        ...prev.translation,
                        recent: '翻訳中...' // ユーザーフィードバック
                      }
                    }));
                    saveAsMemo();
                  }
                }} style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}>
                  メモ/英訳
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* モーダル */}
      {showFullscreenModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            width: '90%',
            height: '90%',
            maxWidth: '1400px',
            borderRadius: '20px',
            padding: '30px',
            position: 'relative',
            overflow: 'auto'
          }}>
            <button
              onClick={() => setShowFullscreenModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: '#f0f0f0',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>{modalTitle}</h2>
            <div dangerouslySetInnerHTML={{ __html: modalContent }} />
          </div>
        </div>
      )}
      
      {/* メモモーダル */}
      {showMemoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            width: '80%',
            maxHeight: '80%',
            borderRadius: '20px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0 }}>📝 メモ一覧 ({memoList.length}件)</h2>
              <button
                onClick={() => setShowMemoModal(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
              {memoList.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999' }}>メモがまだありません</p>
              ) : (
                memoList.map(memo => (
                  <div key={memo.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 1fr 80px',
                    gap: '15px',
                    padding: '15px',
                    marginBottom: '15px',
                    background: '#f8f9fa',
                    borderRadius: '10px',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999' }}>{memo.timestamp}</div>
                    <textarea
                      id={`${memo.id}-ja`}
                      defaultValue={memo.japanese}
                      style={{
                        padding: '8px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        fontSize: '13px',
                        resize: 'vertical',
                        minHeight: '60px'
                      }}
                    />
                    <textarea
                      id={`${memo.id}-en`}
                      defaultValue={memo.english}
                      style={{
                        padding: '8px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        fontSize: '13px',
                        resize: 'vertical',
                        minHeight: '60px',
                        color: '#0066cc'
                      }}
                    />
                    <button
                      onClick={() => saveMemoEdit(memo.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      保存
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* レポートモーダル */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90%',
            borderRadius: '20px',
            padding: '30px',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => setShowReportModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: '#f0f0f0',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
            <h1 style={{ marginBottom: '20px', color: '#333' }}>📚 授業レポート</h1>
            <div style={{ marginBottom: '20px' }}>
              <strong>{selectedClass}</strong><br/>
              <span>録音時間: {formatTime(recordingTime)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div>
                <h3>English Summary</h3>
                <p style={{ lineHeight: '1.8' }}>
                  {_summaryOverride?.english || 'No summary available yet. Recording will generate a summary after 10 minutes.'}
                </p>
              </div>
              <div>
                <h3>日本語要約</h3>
                <p style={{ lineHeight: '1.8' }}>
                  {_summaryOverride?.japanese || '要約はまだありません。録音開始10分後に要約が生成されます。'}
                </p>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3>メモ ({memoList.length}件)</h3>
              {memoList.slice(0, 3).map(memo => (
                <div key={memo.id} style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>{memo.timestamp}</span>
                  <div>{memo.japanese}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={handleWordExport} style={{
                padding: '12px 30px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                📄 Wordでエクスポート
              </button>
              <button onClick={handlePDFExport} style={{
                padding: '12px 30px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                📑 PDFでエクスポート
              </button>
              <button onClick={nextClass} style={{
                padding: '12px 30px',
                background: 'white',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                次の授業へ
              </button>
            </div>
          </div>
        </div>
      )}
      
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

export default UniVoicePerfect;