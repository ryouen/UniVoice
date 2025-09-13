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
import { FullscreenModal, FloatingPanel, MemoModal, ReportModal } from '../presentation/components/UniVoice/modals';
import { renderHistoryToHTML } from './UnifiedHistoryRenderer';
import { renderFlowHistoryToHTML } from './UnifiedHistoryRenderer-Flow';
// import { exportToWord, exportToPDF } from '../utils/exportUtils'; // TODO: Copy utility files
import styles from './UniVoice.module.css';

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

/**
 * 🏗️ 高さ管理システムの設計思想
 * 
 * このアプリケーションは「宣言的高さ管理」を採用しています。
 * 
 * 原則：
 * 1. 各セクションは固定の高さを持つ（リアルタイムセクションを除く）
 * 2. ウィンドウの高さ = 表示中のセクションの高さの合計
 * 3. トグル操作でセクションの表示/非表示が切り替わると、ウィンドウ全体がリサイズ
 * 4. リアルタイムセクションは、ユーザーが設定した高さを維持し、圧縮されない
 * 
 * 依存関係：
 * - セクション表示状態（showHeader, showSettings, showQuestionSection）
 *   ↓
 * - 高さ計算（calculateTotalHeight）
 *   ↓
 * - Electronウィンドウリサイズ（window:autoResize）
 */

// Layout Constants - 一元管理されたレイアウト定数
const LAYOUT_HEIGHTS = {
  // 固定高さセクション
  header: 60,              // メインヘッダー
  minimalControl: 32,      // ヘッダー非表示時のミニマルコントロール
  settingsBar: 56,         // 設定バー（推定値、将来的にDOM測定に置き換え可能）
  questionSection: 160,    // 質問セクション
  
  // リアルタイムセクション（可変）
  realtime: {
    min: 100,              // 最小高さ
    default: 250,          // デフォルト高さ
    max: 600               // 最大高さ（将来的な制限用）
  },
  
  // その他
  resizeHandle: 8,         // リサイズハンドル（現在は使用していない）
  animationDelay: 450      // CSSアニメーション完了待機時間
} as const;

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

// Liquid Glassスタイルを生成する関数
const getLiquidGlassStyles = (theme: 'light' | 'dark' | 'purple', fontScale: number) => {
  const baseStyles = `
    /* Liquid Glass ベーススタイル */
    .header {
      height: 60px;
      display: flex;
      align-items: center;
      padding: 12px 20px; /* Phase 2: 垂直パディング追加で要素の整合性向上 */
      gap: 10px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      position: relative;
      -webkit-app-region: drag; /* ヘッダーをドラッグ可能にする */
    }

    .header button {
      -webkit-app-region: no-drag; /* ボタンはドラッグ不可 */
    }

    /* 🟢 Light Theme - 白80%不透明度 */
    .glass-light {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
      color: rgba(0, 0, 0, 0.85);
    }

    /* 🌙 Dark Theme - 黒80%不透明度 */
    .glass-dark {
      background: rgba(30, 30, 30, 0.8);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
      color: rgba(255, 255, 255, 0.95);
    }

    /* 💜 Purple Theme - 紫40%不透明度 */
    .glass-purple {
      background: rgba(102, 51, 153, 0.4);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px 0 rgba(102, 51, 153, 0.3);
      color: rgba(255, 255, 255, 1);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .spacer {
      flex: 1;
    }

    .icon-btn {
      width: 36px; /* Phase 4: 固定サイズ追加 */
      height: 36px; /* Phase 4: 固定サイズ追加 */
      border-radius: 10px; /* Phase 4: より大きな角丸 */
      border: none;
      background: rgba(255, 255, 255, 0.15); /* Phase 4: 半透明背景 */
      color: white; /* Phase 4: デフォルトテキスト色 */
      cursor: pointer;
      display: flex; /* inline-flexから変更 */
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease; /* Phase 4: より包括的なトランジション */
      position: relative;
    }

    .icon-btn:hover {
      background: rgba(0, 0, 0, 0.1);
      transform: translateY(-2px); /* Phase 4: ホバー時の上方向移動エフェクト */
    }

    .glass-light .icon-btn {
      background: rgba(0, 0, 0, 0.06); /* Phase 4: lightテーマ用の背景色 */
      color: #333; /* Phase 4: lightテーマ用のテキスト色 */
    }

    .glass-light .icon-btn:hover {
      background: rgba(0, 0, 0, 0.1); /* lightテーマのホバー色を維持 */
    }

    .glass-dark .icon-btn:hover,
    .glass-purple .icon-btn:hover {
      background: rgba(255, 255, 255, 0.25); /* Phase 4: より強いホバー効果 */
      transform: translateY(-2px); /* Phase 4: 統一されたホバー移動 */
    }

    /* アクティブ状態のボタン */
    .glass-light .icon-btn.active {
      background: rgba(102, 126, 234, 0.15);
      box-shadow: 0 0 20px rgba(102, 126, 234, 0.2);
    }
    
    .glass-dark .icon-btn.active,
    .glass-purple .icon-btn.active {
      background: rgba(255, 255, 255, 0.35);
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
    }

    .tooltip {
      position: absolute;
      bottom: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      z-index: 10000;
    }

    .icon-btn:hover .tooltip {
      opacity: 1;
    }

    .recording-indicator-green {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px; /* Phase 3: 内部余白追加 */
      background: rgba(76, 175, 80, 0.2); /* Phase 3: 背景色追加 */
      border-radius: 10px; /* Phase 3: 角丸追加 */
      color: white; /* Phase 3: デフォルト色（テーマで上書き） */
      font-size: 14px;
      font-weight: 500;
      height: 36px; /* Phase 3: 高さ固定 */
    }

    .glass-light .recording-indicator-green {
      background: rgba(76, 175, 80, 0.15); /* Phase 3: lightテーマ用の背景色 */
      color: #2e7d32; /* Phase 3: lightテーマ用のテキスト色 */
    }

    .recording-dot-green {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4CAF50;
      animation: pulse 2s infinite;
    }

    .recording-dot-green.paused {
      background: #FFA500;
      animation: none;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    /* フォントサイズスケーリング */
    .app-container {
      font-size: ${16 * fontScale}px;
    }

    .settings-bar {
      height: 0;
      overflow: hidden;
      position: relative;
      z-index: 1000;
      border: none !important;
      visibility: hidden;
      opacity: 0;
      transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                  visibility 0.3s ease,
                  opacity 0.3s ease;
    }

    .settings-bar.show {
      height: 56px;
      visibility: visible;
      opacity: 1;
    }

    .settings-inner {
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
      min-height: 56px;
      overflow: hidden;
      position: relative;
    }
    
    /* テーマ別の設定バー内部背景 */
    .glass-light .settings-inner {
      background: rgba(0, 0, 0, 0.03);
    }
    
    .glass-dark .settings-inner {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .glass-purple .settings-inner {
      background: rgba(255, 255, 255, 0.08);
    }

    .settings-left, .settings-right {
      display: flex;
      gap: 6px;
    }

    .s-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      position: relative;
    }

    .glass-light .s-btn {
      background: rgba(0, 0, 0, 0.06);
      color: #333;
    }
    
    .glass-light .s-btn:hover {
      background: rgba(0, 0, 0, 0.12);
    }
    
    .glass-dark .s-btn {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    
    .glass-dark .s-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .glass-purple .s-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
    
    .glass-purple .s-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .s-btn.active {
      background: #667eea;
      color: white;
    }

    .s-tooltip {
      position: absolute;
      bottom: -32px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      z-index: 10000;
      visibility: hidden;
    }

    .settings-bar.show .s-btn:hover .s-tooltip {
      opacity: 1;
      visibility: visible;
    }
  `;

  return baseStyles;
};

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
  
  // Liquid Glass デザイン用の新しい状態
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'purple'>('light');
  const [displayMode, setDisplayMode] = useState<'both' | 'source' | 'target'>('both');
  const [currentFontScale, setCurrentFontScale] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  
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
  
  // フローティングパネルの状態（理想UI用）
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [showQuestionSection, setShowQuestionSection] = useState(false);
  
  // ヘッダー表示/非表示とウィンドウ最前面設定
  const [showHeader, setShowHeader] = useState(true);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  
  // 要約データ
  const [summaryJapanese, setSummaryJapanese] = useState<string>('');
  const [summaryEnglish, setSummaryEnglish] = useState<string>('');
  
  // 履歴データ（実データのみ使用）
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  
  // 自動スクロール用のref
  const realtimeSectionRef = useRef<HTMLDivElement>(null);
  
  // アプリコンテナ全体のref（自動リサイズ用）
  const appContainerRef = useRef<HTMLDivElement>(null);
  
  // 現在の表示テキスト（3行表示用）
  // Phase 2: Override または パイプラインデータを使用
  const [displayText, setDisplayText] = useState({
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
  const [realtimeSectionHeight, setRealtimeSectionHeight] = useState(() => {
    // LocalStorageから保存された高さを読み込む
    const saved = localStorage.getItem('univoice-realtime-height');
    return saved ? parseInt(saved, 10) : LAYOUT_HEIGHTS.realtime.default;
  });
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
  
  /**
   * 🔍 高さ計算の核心ロジック
   * 
   * この関数が全ての高さ管理の中心です。
   * 各セクションの表示状態に基づいて、ウィンドウの総高さを計算します。
   * 
   * 重要：DOM測定（scrollHeight等）は使用しません。
   * 理由：予測不可能で、レイアウトの再計算を引き起こし、パフォーマンスに悪影響があるため。
   */
  const calculateTotalHeight = useCallback(() => {
    let totalHeight = 0;
    
    // 1. ヘッダー部分（必ず何かが表示される）
    if (showHeader) {
      totalHeight += LAYOUT_HEIGHTS.header;
    } else {
      // ヘッダー非表示時でも最小限のコントロールバーを表示
      totalHeight += LAYOUT_HEIGHTS.minimalControl;
    }
    
    // 2. 設定バー（トグルで表示/非表示）
    if (showSettings) {
      totalHeight += LAYOUT_HEIGHTS.settingsBar;
    }
    
    // 3. リアルタイムセクション（常に表示、高さはユーザー設定）
    // これがメインコンテンツエリア - 絶対に圧縮されない
    totalHeight += realtimeSectionHeight;
    
    // 4. 質問セクション（トグルで表示/非表示）
    if (showQuestionSection) {
      totalHeight += LAYOUT_HEIGHTS.questionSection;
    }
    
    return totalHeight;
  }, [showHeader, showSettings, showQuestionSection, realtimeSectionHeight]);

  /**
   * 🎯 ウィンドウリサイズの実行
   * 
   * 計算された高さに基づいてElectronウィンドウをリサイズします。
   * この関数は副作用（IPC通信）を含むため、calculateTotalHeightとは分離しています。
   */
  const executeWindowResize = useCallback(async () => {
    const targetHeight = calculateTotalHeight();
    
    // デバッグ用ログ（開発時のみ）
    console.log('[Window Resize] Executing resize:', {
      sections: {
        header: showHeader ? LAYOUT_HEIGHTS.header : LAYOUT_HEIGHTS.minimalControl,
        settings: showSettings ? LAYOUT_HEIGHTS.settingsBar : 0,
        realtime: realtimeSectionHeight,
        question: showQuestionSection ? LAYOUT_HEIGHTS.questionSection : 0,
      },
      totalHeight: targetHeight
    });
    
    // ウィンドウリサイズをIPCで実行
    const windowAPI = window.univoice?.window;
    if (windowAPI?.autoResize) {
      await windowAPI.autoResize(targetHeight);
    }
  }, [calculateTotalHeight, showHeader, showSettings, showQuestionSection, realtimeSectionHeight]);
  
  /**
   * 🔄 セクション表示状態変更時のウィンドウリサイズ
   * 
   * 重要な設計判断：
   * - ResizeObserverは使用しない（予測不可能な動作を避けるため）
   * - セクションの状態変更を明示的に監視
   * - CSSアニメーションとの競合を避けるため、適切な遅延を設定
   */
  useEffect(() => {
    // 初回レンダリング時にもリサイズを実行
    executeWindowResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ - executeWindowResizeは依存関係に含めない（無限ループ防止）

  // セクション表示状態の変更を監視
  useEffect(() => {
    // アニメーションとの競合を避けるための遅延時間
    // 質問セクションは0.4秒のCSSトランジションがあるため、少し長めに待つ
    const delay = showQuestionSection !== undefined ? LAYOUT_HEIGHTS.animationDelay : 50;
    
    const timer = setTimeout(() => {
      executeWindowResize();
    }, delay);
    
    return () => clearTimeout(timer);
  }, [showSettings, showQuestionSection, showHeader, executeWindowResize]);
  
  // リアルタイムセクションの高さ変更時
  useEffect(() => {
    // ユーザーがリサイズハンドルを操作した後
    executeWindowResize();
  }, [realtimeSectionHeight, executeWindowResize]);
  
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
  
  // 自動スクロール（3秒ごと）
  useEffect(() => {
    const scrollToBottom = () => {
      if (realtimeSectionRef.current && !isPaused) {
        realtimeSectionRef.current.scrollTop = realtimeSectionRef.current.scrollHeight;
      }
    };

    const interval = setInterval(scrollToBottom, 3000);
    return () => clearInterval(interval);
  }, [isPaused]);
  
  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 既存のスペースキーショートカット
      if (e.code === 'Space' && showSetup) {
        e.preventDefault();
        handleStartSession(selectedClass || '', sourceLanguage, targetLanguage);
      }
      
      // Liquid Glass 表示モード切り替え（Alt + S/T/B）
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          setDisplay('source');
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          setDisplay('target');
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          setDisplay('both');
        }
      }
      
      // フォントサイズ変更（Ctrl + +/-）
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          changeFont(1);
        } else if (e.key === '-') {
          e.preventDefault();
          changeFont(-1);
        }
      }
      
      // ヘッダー表示/非表示切り替え（Alt + H）
      if (e.altKey && !e.ctrlKey && !e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        toggleHeader();
      }
      
      // Escキーでヘッダーを再表示
      if (e.key === 'Escape' && !showHeader) {
        e.preventDefault();
        setShowHeader(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSetup, sourceLanguage, targetLanguage, showHeader, isAlwaysOnTop]);
  
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
    setDisplayText(prev => {
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
  
  // 録音時間の自動更新
  useEffect(() => {
    if (!showSetup && !isPaused && recordingStartTimeRef.current) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - recordingStartTimeRef.current!.getTime()) / 1000);
        setRecordingTime(diff);
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return undefined;
    }
  }, [showSetup, isPaused]);
  
  // リアルタイムセクションの自動スクロール
  useEffect(() => {
    const scrollToBottom = () => {
      if (realtimeSectionRef.current && !userIsScrollingRef.current) {
        realtimeSectionRef.current.scrollTop = realtimeSectionRef.current.scrollHeight;
      }
    };
    
    // 3秒ごとに自動スクロール
    const scrollInterval = setInterval(scrollToBottom, 3000);
    
    // コンテンツが更新されたときもスクロール
    scrollToBottom();
    
    return () => clearInterval(scrollInterval);
  }, [displayContent, realtimeSegments]);
  
  // ユーザーがスクロールしているかどうかを検出
  useEffect(() => {
    const handleUserScroll = () => {
      userIsScrollingRef.current = true;
      // 5秒後に自動スクロールを再開
      setTimeout(() => {
        userIsScrollingRef.current = false;
      }, 5000);
    };
    
    const section = realtimeSectionRef.current;
    if (section) {
      section.addEventListener('wheel', handleUserScroll);
      section.addEventListener('touchmove', handleUserScroll);
      
      return () => {
        section.removeEventListener('wheel', handleUserScroll);
        section.removeEventListener('touchmove', handleUserScroll);
      };
    }
    return undefined;
  }, []);
  
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
  
  
  // 時間フォーマット関数
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
    setDisplayText({
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
  
  // 表示モード切り替え関数
  const setDisplay = (mode: 'both' | 'source' | 'target') => {
    setDisplayMode(mode);
  };
  
  // フォントサイズ変更関数
  const changeFont = (direction: number) => {
    if (direction === 0) {
      setCurrentFontScale(1);
    } else if (direction === 1) {
      setCurrentFontScale(prev => Math.min(3.0, prev * 1.1)); // 最大3倍まで拡大可能
    } else if (direction === -1) {
      setCurrentFontScale(prev => Math.max(0.5, prev * 0.9)); // 最小0.5倍まで縮小可能
    }
  };
  
  // パネル切り替え関数
  const togglePanel = (type: 'history' | 'summary') => {
    if (type === 'history') {
      setShowHistoryPanel(!showHistoryPanel);
      setShowSummaryPanel(false); // 他のパネルを閉じる
    } else if (type === 'summary') {
      setShowSummaryPanel(!showSummaryPanel);
      setShowHistoryPanel(false); // 他のパネルを閉じる
    }
  };
  
  // ヘッダー表示/非表示切り替え
  const toggleHeader = () => {
    setShowHeader(!showHeader);
  };
  
  /**
   * 🎨 テーマ切り替え関数
   * light → dark → purple → light の順番で循環
   */
  const cycleTheme = () => {
    setCurrentTheme(prev => {
      switch(prev) {
        case 'light': return 'dark';
        case 'dark': return 'purple';
        case 'purple': return 'light';
        default: return 'light';
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
  
  const getAlignedHistoryContent = (): string => {
    // フロー型レンダラーを使用（より自然な表示）
    return renderFlowHistoryToHTML(historyBlocks, {
      title: '📖 全文履歴',
      showMinimalTimestamps: true
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
  
  // ========== 自動スクロール制御 ==========
  const userIsScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // コンテンツ更新時の自動スクロール
  useEffect(() => {
    if (realtimeSectionRef.current && !userIsScrollingRef.current && threeLineDisplay) {
      // 新しいコンテンツが追加されたら最下部へスクロール
      const element = realtimeSectionRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [threeLineDisplay]);
  
  // スクロール操作の検出
  useEffect(() => {
    const handleUserScroll = () => {
      userIsScrollingRef.current = true;
      
      // 既存のタイマーをクリア
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // 5秒後に自動スクロールを再開
      scrollTimeoutRef.current = setTimeout(() => {
        userIsScrollingRef.current = false;
      }, 5000);
    };
    
    const element = realtimeSectionRef.current;
    if (element) {
      element.addEventListener('wheel', handleUserScroll);
      element.addEventListener('touchmove', handleUserScroll);
      element.addEventListener('mousedown', handleUserScroll); // スクロールバーのドラッグ検出
      
      return () => {
        element.removeEventListener('wheel', handleUserScroll);
        element.removeEventListener('touchmove', handleUserScroll);
        element.removeEventListener('mousedown', handleUserScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
    
    return undefined;
  }, []);
  
  // ========== キーボードショートカット ==========
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Alt + S/T/B: 表示モード切り替え
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          setDisplay('source');
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          setDisplay('target');
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          setDisplay('both');
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          toggleHeader();
        }
      }
      
      // Ctrl + +/-: フォントサイズ変更
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          e.stopPropagation();
          changeFont(1);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          e.stopPropagation();
          changeFont(-1);
        }
      }
      
      // Escape: ヘッダー再表示
      if (e.key === 'Escape' && !showHeader) {
        e.preventDefault();
        setShowHeader(true);
      }
    };
    
    // キャプチャフェーズでも登録してブラウザのズーム機能を確実に防ぐ
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keydown', handleKeyDown, false);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keydown', handleKeyDown, false);
    };
  }, [showHeader]);
  
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
      {/* Liquid Glass スタイル注入 - CSS Modules使用のため無効化 */}
      {/* <style>{getLiquidGlassStyles(currentTheme, currentFontScale)}</style> */}
      
      {/* アプリコンテナ（フレームレス対応） */}
      <div ref={appContainerRef} className="app-container" style={{
        width: '100%',
        height: 'auto', // コンテンツに合わせて高さを決定
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // グラスモーフィズム効果を強調するための背景グラデーション
        background: currentTheme === 'light' 
          ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' 
          : currentTheme === 'dark'
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        {/* メインウィンドウ */}
        <div className="main-window" style={{
          width: '100%',
          height: 'auto', // コンテンツに合わせて高さを自動調整
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
        {/* ヘッダー */}
        {showHeader && (
        <div className={`header glass-${currentTheme}`} style={{
          WebkitAppRegion: 'drag' as any,
          position: 'relative',
          userSelect: 'none',
          flexShrink: 0,
          zIndex: 10002
        }}>
          {/* 録音インジケーター */}
          <div className={`recording-indicator-green ${isPaused ? 'paused' : ''}`}>
            <div className={`recording-dot-green ${isPaused ? 'paused' : ''}`} />
            <span>{formatTime(recordingTime)}</span>
          </div>
          
          {/* 一時停止ボタン */}
          <button className="icon-btn" onClick={togglePause} style={{WebkitAppRegion: 'no-drag' as any}}>
            {isPaused ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2 L4 14 L12 8 Z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5 3v10h3V3H5zm5 0v10h3V3h-3z"/>
              </svg>
            )}
            <span className="tooltip">{isPaused ? '再開' : '一時停止'}</span>
          </button>
          
          {/* 授業終了ボタン */}
          <button className="icon-btn" onClick={endSession} style={{WebkitAppRegion: 'no-drag' as any}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="2" width="10" height="10" rx="1"/>
            </svg>
            <span className="tooltip">授業終了</span>
          </button>
          
          {/* 次の授業へボタン */}
          <button className="icon-btn" onClick={nextClass} style={{WebkitAppRegion: 'no-drag' as any}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7h8m0 0L7 3m4 4L7 11"/>
            </svg>
            <span className="tooltip">次の授業へ</span>
          </button>
          
          {/* メモカウンター */}
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
          
          {autoSaveTime && (
            <span style={{ fontSize: '12px', color: '#4CAF50', marginLeft: '15px', opacity: 0.8 }}>
              ✓ 自動保存済み
            </span>
          )}
          
          {/* スペーサー */}
          <div className="spacer" />
          
          {/* 履歴ボタン（フローティングパネル用） */}
          <button 
            className={`icon-btn ${showHistoryPanel ? 'active' : ''}`}
            onClick={() => togglePanel('history')}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="12" height="10" rx="1"/>
              <line x1="6" y1="7" x2="12" y2="7"/>
              <line x1="6" y1="10" x2="12" y2="10"/>
            </svg>
            <span className="tooltip">履歴</span>
          </button>
          
          {/* 要約ボタン（フローティングパネル用） */}
          <button 
            className={`icon-btn ${showSummaryPanel ? 'active' : ''}`}
            onClick={() => togglePanel('summary')}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="10" width="3" height="5" fill="currentColor" opacity="0.3"/>
              <rect x="8" y="7" width="3" height="8" fill="currentColor" opacity="0.5"/>
              <rect x="13" y="4" width="3" height="11" fill="currentColor" opacity="0.7"/>
            </svg>
            <span className="tooltip">要約</span>
          </button>
          
          {/* 質問ボタン */}
          <button 
            className={`icon-btn ${showQuestionSection ? 'active' : ''}`}
            onClick={() => {
              setShowQuestionSection(!showQuestionSection);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12 L3 7 Q3 4 6 4 L12 4 Q15 4 15 7 L15 12 L10 12 L6 15 L6 12 Z"/>
            </svg>
            <span className="tooltip">質問</span>
            {memoList.length > 0 && (
              <span className="badge" style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
                color: 'white',
                fontSize: '10px',
                padding: '2px 5px',
                borderRadius: '6px',
                fontWeight: '700'
              }}>
                {memoList.length}
              </span>
            )}
          </button>
          
          <div className="spacer" />
          
          {/* テーマ切り替えボタン */}
          <button className="icon-btn" onClick={cycleTheme} style={{WebkitAppRegion: 'no-drag' as any}}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M8 2 A6 6 0 0 1 8 14 A3 3 0 0 0 8 2" fill="currentColor"/>
            </svg>
            <span className="tooltip">テーマ</span>
          </button>
          
          {/* 設定ボタン */}
          <button className="icon-btn" onClick={() => {
            setShowSettings(!showSettings);
          }} style={{WebkitAppRegion: 'no-drag' as any}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
              <path d="M10 3.5v-2m0 17v-2m6.5-6.5h2m-17 0h2m12.02-4.52l1.41-1.41M4.93 15.07l1.41-1.41m0-7.32L4.93 4.93m11.14 11.14l1.41 1.41"/>
            </svg>
            <span className="tooltip">設定</span>
          </button>
          
          <div style={{ flex: 1 }} />
          
          {/* 最前面固定ボタン */}
          <button 
            className={`icon-btn ${isAlwaysOnTop ? 'active' : ''}`}
            onClick={async () => {
              const newState = !isAlwaysOnTop;
              const windowAPI = window.univoice?.window;
              if (windowAPI?.setAlwaysOnTop) {
                await windowAPI.setAlwaysOnTop(newState);
                setIsAlwaysOnTop(newState);
              }
            }}
            style={{ WebkitAppRegion: 'no-drag' as any }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" 
              fill={isAlwaysOnTop ? "currentColor" : "none"} 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <path d="M7 3 L11 3 L11 9 L13 11 L9 15 L5 11 L7 9 Z" 
                fill={isAlwaysOnTop ? "currentColor" : "none"} 
                opacity={isAlwaysOnTop ? "0.3" : "1"}
              />
              <line x1="9" y1="15" x2="9" y2="18"/>
            </svg>
            <span className="tooltip">最前面に固定</span>
          </button>
          
          {/* メニューを隠すボタン */}
          <button 
            className="icon-btn"
            onClick={() => {
              setShowHeader(false);
            }}
            style={{ WebkitAppRegion: 'no-drag' as any }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="12" height="12" rx="1"/>
              <path d="M6 7 L9 10 L12 7" strokeLinecap="round"/>
            </svg>
            <span className="tooltip">メニューを隠す (Esc で戻る)</span>
          </button>
          
          <div style={{ width: '10px' }} />
          
          {/* 閉じるボタン */}
          <button 
            className="icon-btn" 
            onClick={() => window.univoice?.window?.close()}
            style={{ marginRight: '30px', marginLeft: '20px', WebkitAppRegion: 'no-drag' as any }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
            <span className="tooltip">閉じる</span>
          </button>
        </div>
        )}
        
        
        {/* 設定バー (Liquid Glass) */}
        <div className={`settings-bar glass-${currentTheme} ${showSettings ? 'show' : ''}`} style={{
          zIndex: 1000
        }}>
          <div className="settings-inner">
            <div className="settings-left">
              <button 
                className={`s-btn ${displayMode === 'both' ? 'active' : ''}`}
                onClick={() => setDisplay('both')}
              >
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                  <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
                </svg>
                <span className="s-tooltip">Alt+B</span>
              </button>
              <button 
                className={`s-btn ${displayMode === 'source' ? 'active' : ''}`}
                onClick={() => setDisplay('source')}
              >
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                  <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
                  <rect x="10" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
                </svg>
                <span className="s-tooltip">Alt+S</span>
              </button>
              <button 
                className={`s-btn ${displayMode === 'target' ? 'active' : ''}`}
                onClick={() => setDisplay('target')}
              >
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                  <rect x="1" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
                  <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
                </svg>
                <span className="s-tooltip">Alt+T</span>
              </button>
            </div>
            <div className="settings-right">
              <button className="s-btn" onClick={() => changeFont(-1)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="s-tooltip">Ctrl+-</span>
              </button>
              <button className="s-btn" onClick={() => changeFont(0)}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>T</span>
                <span className="s-tooltip">リセット</span>
              </button>
              <button className="s-btn" onClick={() => changeFont(1)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 4 L9 14 M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="s-tooltip">Ctrl++</span>
              </button>
              <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)', margin: '0 8px' }} />
              <button 
                className={`s-btn ${!showHeader ? 'active' : ''}`}
                onClick={toggleHeader}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="3" y="3" width="12" height="2" fill="currentColor" opacity={showHeader ? 1 : 0.3}/>
                  <rect x="3" y="7" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <circle cx="9" cy="11" r="2" fill="currentColor" opacity="0.6"/>
                </svg>
                <span className="s-tooltip">ヘッダー表示/非表示 (Alt+H)</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* ヘッダー非表示時のミニマルコントロール */}
        {!showHeader && (
          <div className={`minimal-control glass-${currentTheme}`} style={{
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '8px',
            borderBottom: `1px solid ${currentTheme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
            flexShrink: 0,
            WebkitAppRegion: 'drag' as any
          }}>
            {/* 録音状態 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isPaused ? '#FFA500' : '#4CAF50' }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: isPaused ? '#FFA500' : '#4CAF50',
                animation: isPaused ? 'none' : 'pulse 2s infinite'
              }} />
              <span>{formatTime(recordingTime)}</span>
            </div>
            
            <div style={{ flex: 1 }} />
            
            
            {/* ヘッダー復元ボタン */}
            <button 
              onClick={toggleHeader}
              style={{
                width: '24px',
                height: '24px',
                border: 'none',
                background: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitAppRegion: 'no-drag' as any
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" opacity="0.6">
                <path d="M8 11L12 7H4L8 11Z"/>
              </svg>
            </button>
          </div>
        )}
        
        {/* リアルタイムセクション（固定高さ） */}
        <div 
          ref={realtimeSectionRef}
          className={`realtime-section glass-${currentTheme}`} 
          style={{
          height: `${realtimeSectionHeight}px`, // 固定高さ
          overflowY: 'auto',
          padding: '20px 30px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          zIndex: 1,
          flexShrink: 0 // 圧縮されないように
        }}>
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
              fontScale={currentFontScale}
              displayMode={displayMode}
            />
            
            {/* 表示モード制御は RealtimeSection 内で実装 */}
          </div>
          
          {/* リサイズハンドルを削除 - Electronウィンドウのリサイズのみを使用 */}
          
          {/* 質問セクション（折りたたみ可能） */}
          <div className={`question-section glass-${currentTheme} ${showQuestionSection ? 'open' : ''}`} style={{
            height: showQuestionSection ? '160px' : '0',
            overflow: showQuestionSection ? 'visible' : 'hidden',
            transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            flexShrink: 0
          }}>
            <div className="question-inner" style={{
              padding: '20px 30px',
              display: 'flex',
              gap: '20px',
              height: '100%',
              borderTop: `1px solid ${currentTheme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`
            }}>
              <textarea 
                id="questionInput"
                className="question-input"
                placeholder="質問・発言したい内容・メモを入力（日本語でOK）"
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '2px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#333',
                  resize: 'none',
                  height: 'calc(100% - 8px)',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.6)';
                  e.currentTarget.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                }}
              />
              <div className="question-actions" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                justifyContent: 'center'
              }}>
                <button 
                  className="q-btn secondary"
                  onClick={() => setShowMemoModal(true)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    background: 'rgba(0, 0, 0, 0.05)',
                    color: '#666'
                  }}
                >
                  メモ一覧
                </button>
                <button 
                  className="q-btn primary"
                  onClick={saveAsMemo}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white'
                  }}
                >
                  英訳して保存
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* フローティングパネル */}
      <FloatingPanel
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        title="📖 全文履歴"
        position="left"
        theme={currentTheme}
        htmlContent={getAlignedHistoryContent()}
      />
      
      <FloatingPanel
        isOpen={showSummaryPanel}
        onClose={() => setShowSummaryPanel(false)}
        title="📊 進捗的要約"
        position="right"
        theme={currentTheme}
        htmlContent={getSummaryComparisonContent()}
      />
      
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
        
        /* Glassmorphism Base Styles */
        .glass-light {
          background: rgba(255, 255, 255, 0.8) !important;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
        }
        
        .glass-dark {
          background: rgba(30, 30, 30, 0.8) !important;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
          color: #fff;
        }
        
        .glass-purple {
          background: rgba(102, 51, 153, 0.4) !important;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px 0 rgba(102, 51, 153, 0.3);
          color: #fff;
        }
        
        /* Header specific glassmorphism */
        .header.glass-light {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 240, 240, 0.8)) !important;
        }
        
        .header.glass-dark {
          background: linear-gradient(135deg, rgba(40, 40, 40, 0.9), rgba(20, 20, 20, 0.8)) !important;
        }
        
        .header.glass-purple {
          background: linear-gradient(135deg, rgba(120, 70, 180, 0.5), rgba(80, 40, 140, 0.4)) !important;
        }
        
        /* Settings bar glassmorphism */
        .settings-bar.glass-light {
          background: rgba(248, 248, 248, 0.85) !important;
        }
        
        .settings-bar.glass-dark {
          background: rgba(40, 40, 40, 0.85) !important;
        }
        
        .settings-bar.glass-purple {
          background: rgba(110, 60, 160, 0.45) !important;
        }
        
        /* Realtime section glassmorphism */
        .realtime-section.glass-light {
          background: rgba(255, 255, 255, 0.75) !important;
        }
        
        .realtime-section.glass-dark {
          background: rgba(25, 25, 25, 0.75) !important;
        }
        
        .realtime-section.glass-purple {
          background: rgba(90, 45, 145, 0.35) !important;
        }
        
        /* Question section glassmorphism */
        .question-section.glass-light {
          background: rgba(252, 252, 252, 0.85) !important;
        }
        
        .question-section.glass-dark {
          background: rgba(35, 35, 35, 0.85) !important;
        }
        
        .question-section.glass-purple {
          background: rgba(100, 50, 150, 0.4) !important;
        }
        
        /* Button adjustments for glass themes */
        .glass-dark .icon-btn,
        .glass-purple .icon-btn {
          color: rgba(255, 255, 255, 0.9);
        }
        
        .glass-dark .icon-btn:hover,
        .glass-purple .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
        
        .glass-dark .s-btn,
        .glass-purple .s-btn {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.05);
        }
        
        .glass-dark .s-btn:hover,
        .glass-purple .s-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
        }
        
        .glass-dark .s-btn.active,
        .glass-purple .s-btn.active {
          background: rgba(255, 255, 255, 0.2) !important;
        }
        
        /* Input adjustments for dark/purple themes */
        .glass-dark .question-input,
        .glass-purple .question-input {
          background: rgba(255, 255, 255, 0.1) !important;
          color: #fff !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }
        
        .glass-dark .question-input::placeholder,
        .glass-purple .question-input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
        
        .glass-dark .question-input:focus,
        .glass-purple .question-input:focus {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
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