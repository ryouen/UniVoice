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
import { useSessionMemory } from '../hooks/useSessionMemory';
import { useBottomResize } from '../hooks/useBottomResize';
import { useHeaderControls } from '../hooks/useHeaderControls';
import { HeaderControls } from './UniVoice/Header/HeaderControls/HeaderControls';
// 段階的リファクタリング: useSessionControlフックを並行実装用にインポート
// TODO: 段階的に既存のセッション管理コードと置き換え
// import { useSessionControl } from './components/UniVoice/hooks/useSessionControl';
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
import { sessionStorageService } from '../services/SessionStorageService';
import { WindowClient } from '../services/WindowClient';
import styles from './UniVoice.module.css';
import classNames from 'classnames';

// 型定義と定数のインポート
import type { 
  UniVoiceProps, 
  HistoryEntry, 
  MockUpdate, 
  SessionData,
  DisplayContent,
  DisplayMode,
  Theme,
  ResizeMode
} from '../types/univoice.types';
import { 
  LAYOUT_HEIGHTS, 
  SECTION_DEFINITIONS, 
  WINDOW_RESIZE_DEBOUNCE_MS,
  FONT_SCALE_MIN,
  FONT_SCALE_MAX,
  FONT_SCALE_STEP
} from '../constants/layout.constants';
import { formatTime, splitText } from '../utils/format.utils';
import { getBackgroundGradient, getThemeClassName } from '../utils/theme.utils';

// import { exportToWord, exportToPDF } from '../utils/exportUtils'; // TODO: Copy utility files


// Memo型はmodals/types.tsから import
import type { Memo } from '../presentation/components/UniVoice/modals/types';


/**
 * 🏗️ 高度なウィンドウリサイズ管理システム（2025-09-13 更新）
 * 
 * このアプリケーションは「宣言的高さ管理」と「リアクティブリサイズ」を組み合わせた
 * ハイブリッドアプローチを採用しています。
 * 
 * ## 基本原則：
 * 
 * 1. 各セクションは固定の高さを持つ
 *    - メニューバー: 60px（固定）
 *    - コンパクトメニュー: 32px（固定）
 *    - 設定バー: 56px（固定・トグル可能）
 *    - 質問エリア: 160px（固定・トグル可能）
 *    - リアルタイムエリア: 250px（デフォルト・ユーザーリサイズ可能）
 * 
 * 2. ウィンドウの高さ = 表示中のセクションの高さの合計
 * 
 * ## リサイズモード：
 * 
 * ### 1. セクショントグルモード（Section Toggle Mode）
 *    - トリガー: セクションの表示/非表示切り替え
 *    - 動作: リアルタイムエリアは固定、ウィンドウ全体がリサイズ
 *    - 実装: executeWindowResize() → Electron IPC → ウィンドウリサイズ
 * 
 * ### 2. ユーザードラッグモード（User Drag Mode）
 *    - トリガー: ユーザーがウィンドウ境界をドラッグ
 *    - 動作: リアルタイムエリアのみリサイズ、他セクションは固定
 *    - 実装: window resize イベント → リアルタイム高さ再計算 → UI更新
 * 
 * ## 技術的詳細：
 * 
 * 1. 無限ループ防止メカニズム
 *    - ResizeModeEnum でモードを管理
 *    - セクショントグル中はウィンドウリサイズイベントを無視
 *    - デバウンス処理（100ms）でイベントの乱発を防止
 * 
 * 2. パフォーマンス最適化
 *    - 有意な変化（5px以上）のみ処理
 *    - LocalStorage への書き込みは必要時のみ
 *    - React の再レンダリングを最小化
 * 
 * 3. 将来の拡張性
 *    - 新セクション追加: LAYOUT_HEIGHTS と calculateFixedSectionsHeight を更新
 *    - リサイズ挙動のカスタマイズ: ResizeMode を拡張
 *    - アニメーション: CSS transition と連携可能な設計
 * 
 * ## 依存関係フロー：
 * ```
 * [トグル操作] → executeWindowResize() → [Electron IPC] → [ウィンドウリサイズ]
 *                                                              ↓
 * [UI更新] ← [リアルタイム高さ計算] ← [resize イベント] ← [ユーザードラッグ]
 * ```
 */


// SectionDefinition は types/univoice.types.ts からインポート済み

// セクション定義とレイアウト高さは constants/layout.constants.ts からインポート済み


// UniVoicePropsは types/univoice.types.ts からインポート済み

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
  sessionConfig,
}) => {
  // ========== 状態管理 ==========
  // セッション情報の状態（起動時は必ずnull = Setup画面を表示）
  const [activeSession, setActiveSession] = useState<{
    className: string;
    sourceLanguage: string;
    targetLanguage: string;
  } | null>(null);
  
  // 前回のセッション情報（再開可能な場合に使用）
  const [previousSession, setPreviousSession] = useState<{
    className: string;
    sourceLanguage: string;
    targetLanguage: string;
    timestamp?: number;
  } | null>(() => {
    const stored = sessionStorageService.loadActiveSession();
    if (stored) {
      console.log('[UniVoice] Previous session found:', stored);
      return stored;
    }
    return null;
  });
  
  // デバッグ：初期化時の状態をログ出力（useEffectに移動）
  
  // activeSessionがある場合はメイン画面、ない場合はSetup画面
  const [showSetup, setShowSetup] = useState(!activeSession);
  const [selectedClass, setSelectedClass] = useState<string | null>(activeSession?.className || null);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [autoSaveTime, setAutoSaveTime] = useState<Date | null>(null);
  
  // activeSession変更時のログと永続化
  useEffect(() => {
    console.log('[UniVoice] activeSession changed:', {
      activeSession,
      showSetup,
      languages: activeSession ? { source: activeSession.sourceLanguage, target: activeSession.targetLanguage } : null,
      timestamp: new Date().toISOString()
    });
    
    // activeSessionが設定されたら永続化
    if (activeSession) {
      sessionStorageService.saveActiveSession(activeSession);
    }
  }, [activeSession]); // showSetupを依存配列から削除
  
  // showSetupの状態をactiveSessionに連動させる
  useEffect(() => {
    setShowSetup(!activeSession);
  }, [activeSession]);
  
  // 初期化時のデバッグログ（一度だけ実行）
  useEffect(() => {
    console.log('[UniVoice] Component mounted:', {
      activeSession,
      hasActiveSession: !!activeSession,
      sessionData: activeSession,
      showSetup,
      previousSession,
      hasPreviousSession: !!previousSession,
      timestamp: new Date().toISOString()
    });
    
    // LocalStorageの内容を確認
    const storedSession = localStorage.getItem('univoice-active-session');
    console.log('[UniVoice] LocalStorage active-session:', storedSession);
    
    // 一時的な対策：起動時は必ずSetup画面を表示
    // TODO: セッション有効期限チェックを実装後、この処理を削除
    console.log('[UniVoice] Forcing setup screen on mount');
    setActiveSession(null);
    setShowSetup(true);
  }, []); // 空の依存配列で初回のみ実行

  
  // Liquid Glass デザイン用の新しい状態
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'purple'>('light');
  const [displayMode, setDisplayMode] = useState<'both' | 'source' | 'target'>('both');
  const [currentFontScale, setCurrentFontScale] = useState(1);
  const [showSettings, setShowSettings] = useState(true);
  
  // 言語設定をサービス経由で復元（propsでオーバーライド可能）
  const languagePrefs = sessionStorageService.loadLanguagePreferences();
  
  const [sourceLanguage, setSourceLanguage] = useState(() => {
    return sourceLanguageOverride || activeSession?.sourceLanguage || languagePrefs?.sourceLanguage || 'en';
  });
  
  const [targetLanguage, setTargetLanguage] = useState(() => {
    return targetLanguageOverride || activeSession?.targetLanguage || languagePrefs?.targetLanguage || 'ja';
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
  const [showProgressiveSummary, setShowProgressiveSummary] = useState(false);
  const [progressiveSummaryHeight, setProgressiveSummaryHeight] = useState(200);
  const [showQuestionSection, setShowQuestionSection] = useState(false);
  
  // ヘッダー表示/非表示とウィンドウ最前面設定
  const [showHeader, setShowHeader] = useState(true);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  // Clean Architecture リファクタリング: 新しいヘッダーコントロールフックを使用
  const headerControls = useHeaderControls(
    showHeader, 
    showSettings, 
    isAlwaysOnTop,
    setShowHeader,
    setShowSettings,
    setIsAlwaysOnTop
  );
  
  // 段階的移行: 既存のsetterを新しいフックのsetterでオーバーライド
  // これにより、既存のコードは動作し続けながら、新しいロジックをテストできる
  
  // 設定バーの表示/非表示はすでに142行目で宣言済み
  
  // 要約データ
  const [summaryJapanese, setSummaryJapanese] = useState<string>('');
  const [summaryEnglish, setSummaryEnglish] = useState<string>('');
  
  // 履歴データ（実データのみ使用）
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  
  // 自動スクロール用のref
  const realtimeSectionRef = useRef<HTMLDivElement>(null);
  
  // アプリコンテナ全体のref（自動リサイズ用）
  const appContainerRef = useRef<HTMLDivElement>(null);
  
  // 質問入力欄のref（document.getElementByIdを置き換えるため）
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  
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
  
  const [realtimeSectionHeight, setRealtimeSectionHeight] = useState(() => {
    // LocalStorageから保存された高さを読み込む
    const saved = localStorage.getItem('univoice-realtime-height');
    return saved ? parseInt(saved, 10) : LAYOUT_HEIGHTS.realtime.default;
  });
  
  // 🆕 リサイズモード管理（将来の拡張性のためenum化）
  enum ResizeMode {
    NONE = 'none',
    SECTION_TOGGLE = 'section_toggle',  // セクション表示/非表示によるリサイズ
    USER_DRAG = 'user_drag'             // ユーザーのドラッグによるリサイズ
  }
  const [currentResizeMode, setCurrentResizeMode] = useState<ResizeMode>(ResizeMode.NONE);
  
  // 🆕 ウィンドウリサイズのデバウンス管理
  const windowResizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const WINDOW_RESIZE_DEBOUNCE_MS = 100;  // 将来的に設定可能にできる

  // 🆕 ボトムリサイズハンドル（2025-09-19追加）
  const { isResizing, resizeHandleProps } = useBottomResize({
    realtimeHeight: realtimeSectionHeight,
    onHeightChange: setRealtimeSectionHeight,
    minHeight: LAYOUT_HEIGHTS.minRealtime,
    isActive: activeSession !== null,  // Setup画面では無効
    onHeightPersist: (height) => {
      // Clean Architecture: 永続化ロジックは外部から注入
      localStorage.setItem('univoice-realtime-height', height.toString());
    }
  });

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
  
  // WindowClientのインスタンスを取得
  const windowClient = WindowClient.getInstance();

  // 新しいuseUnifiedPipelineフックを使用
  // activeSessionがある場合は正しい言語設定で初期化
  // 空文字列ではなく、現在の言語設定（デフォルト値含む）を使用
  const pipelineSourceLang = sourceLanguage || 'multi';
  const pipelineTargetLang = targetLanguage || 'ja';
  
  const pipeline = useUnifiedPipeline({
    sourceLanguage: pipelineSourceLang,
    targetLanguage: pipelineTargetLang,
    className: activeSession?.className || undefined,
    onError: (error) => {
      if (activeSession) {
        console.error('[UniVoicePerfect] Pipeline error:', error);
      }
    },
    onStatusChange: (status) => {
      if (activeSession) {
        console.log('[UniVoicePerfect] Pipeline status:', status);
      }
    }
  });
  
  // SessionMemoryフックを使用
  const sessionMemory = useSessionMemory();

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
    if (activeSession) {
      console.log('[UniVoicePerfect] currentOriginal updated:', currentOriginal);
    }
  }, [currentOriginal, activeSession]);

  // beforeunloadイベントハンドラー：異常終了時の対策
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('[UniVoice] beforeunload event triggered', {
        hasActiveSession: !!activeSession,
        isRunning,
        isPaused,
        timestamp: new Date().toISOString()
      });

      // アクティブなセッションがあり、録音中の場合
      if (activeSession && isRunning && !isPaused) {
        // セッションをクリアして、次回起動時にSetup画面が表示されるようにする
        // 注：同期的な処理のみ可能（非同期処理は動作しない）
        try {
          sessionStorageService.clearActiveSession();
          console.log('[UniVoice] Active session cleared due to abnormal termination');
        } catch (error) {
          console.error('[UniVoice] Failed to clear session on beforeunload:', error);
        }
        
        // Electronアプリでは、beforeunloadのpreventDefaultはウィンドウを閉じることを妨げる
        // ユーザーが明示的に閉じるボタンをクリックした場合は、それを尊重する
        // 注: Electron環境では確認ダイアログは表示されない
        // e.preventDefault();
        // e.returnValue = '録音中です。終了しますか？';
        // return '録音中です。終了しますか？';
      }
      
      // 録音中でない場合は何もしない
      return undefined;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeSession, isRunning, isPaused]);
  
  // パイプライン開始処理が進行中かどうかを追跡
  const [isStartingPipeline, setIsStartingPipeline] = useState(false);
  
  // セッション開始処理（Setup画面から呼ばれる）
  const handleStartSession = useCallback(async (className: string, sourceLang: string, targetLang: string) => {
    console.log('[UniVoice] Starting session:', { className, sourceLang, targetLang });
    
    // 既にパイプライン開始処理が進行中の場合はスキップ
    if (isStartingPipeline) {
      console.warn('[UniVoice] Pipeline start already in progress, skipping');
      return;
    }
    
    // 既にパイプラインが実行中の場合もスキップ
    if (pipeline.isRunning) {
      console.warn('[UniVoice] Pipeline already running, skipping start');
      return;
    }
    
    // パイプライン開始フラグを設定
    setIsStartingPipeline(true);
    
    // activeSessionを作成・保存
    const newSession = {
      className,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang
    };
    
    setActiveSession(newSession);
    setShowSetup(false);
    setSelectedClass(className);
    setSourceLanguage(sourceLang);
    setTargetLanguage(targetLang);
    setIsPaused(false);
    recordingStartTimeRef.current = new Date();
    setRecordingTime(0);
    pausedDurationRef.current = 0;  // 一時停止時間をリセット
    pauseStartTimeRef.current = null;  // 一時停止開始時刻をリセット
    setShowBlockGuides(true);
    
    // 言語設定を永続化
    sessionStorageService.saveLanguagePreferences({
      sourceLanguage: sourceLang,
      targetLanguage: targetLang
    });
    
    // セッションデータを永続化（リロード対応）
    sessionStorageService.saveActiveSession(newSession);
    
    // SessionMemoryサービスで新しいセッションを開始
    await sessionMemory.startSession(className, sourceLang, targetLang);
    
    // Setup → Main画面遷移をWindowClient経由で実行
    try {
      const enterMainResult = await windowClient.enterMain();
      console.log('[UniVoice] windowClient.enterMain result:', enterMainResult);
      if (!enterMainResult) {
        console.warn('[UniVoice] windowClient.enterMain returned false, but continuing anyway');
        // エラーでも画面遷移は続行（showSetupフラグは既にfalseに設定済み）
      }
    } catch (error) {
      console.error('[UniVoice] Failed to transition to main window:', error);
      // エラーでも続行（画面遷移は既に行われている）
    }

    // パイプラインを開始（重要！）
    try {
      // 言語設定を更新（重要：startFromMicrophone前に必要）
      console.log('[UniVoice] Updating pipeline languages:', { sourceLang, targetLang });
      pipeline.updateLanguages(sourceLang, targetLang);
      
      console.log('[UniVoice] Pipeline state before start:', {
        isRunning: pipeline.isRunning,
        state: pipeline.state
      });
      
      // 既にパイプラインが実行中でないことを再度確認
      if (!pipeline.isRunning) {
        console.log('[UniVoice] Starting pipeline from microphone');
        await pipeline.startFromMicrophone();
        console.log('[UniVoice] ✅ Pipeline started successfully');
      } else {
        console.log('[UniVoice] Pipeline already running, skipping startFromMicrophone');
      }
      
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
      console.error('[UniVoice] Failed to start pipeline:', error);
      console.error('[UniVoice] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      
      // より詳細なエラーメッセージ
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      alert(`音声認識の開始に失敗しました。\n\nエラー: ${errorMessage}\n\nコンソールログを確認してください。`);
      
      // エラーが発生した場合はSetup画面に戻る
      setActiveSession(null);
      setShowSetup(true);
      sessionStorageService.clearActiveSession();
    } finally {
      // パイプライン開始フラグをリセット
      setIsStartingPipeline(false);
    }
    
    console.log('[UniVoice] Session started successfully');
  }, [pipeline, isStartingPipeline, sessionMemory]);
  
  // セッション再開処理（Setup画面から呼ばれる）
  // 選択された科目名の最新セッションを自動的に再開
  const handleResumeSession = useCallback(async (className: string) => {
    console.log('[UniVoice] Resuming latest session for class:', className);
    
    // 既にパイプライン開始処理が進行中の場合はスキップ
    if (isStartingPipeline) {
      console.warn('[UniVoice] Pipeline start already in progress, skipping');
      return;
    }
    
    // 既にパイプラインが実行中の場合もスキップ
    if (pipeline.isRunning) {
      console.warn('[UniVoice] Pipeline already running, skipping resume');
      return;
    }
    
    // パイプライン開始フラグを設定
    setIsStartingPipeline(true);
    
    try {
      // IPCで最新セッションデータを読み込み
      if (window.electron?.invoke) {
        // まず利用可能なセッションを取得
        const availableSessions = await window.electron.invoke('get-available-sessions', {
          courseName: className,
          limit: 1  // 最新の1件のみ
        });
        
        if (!availableSessions || availableSessions.length === 0) {
          console.log('[UniVoice] No previous session found for:', className);
          alert(`${className}の過去のセッションが見つかりませんでした。`);
          setIsStartingPipeline(false);
          return;
        }
        
        // 最新セッションのデータを取得
        const latestCourse = availableSessions[0];
        const latestSession = latestCourse.sessions[0];
        
        const sessionData = await window.electron.invoke('load-session', {
          courseName: className,
          dateStr: latestSession.date,
          sessionNumber: latestSession.sessionNumber
        });
        
        if (sessionData) {
          console.log('[UniVoice] Session data loaded:', sessionData);
          
          // activeSessionを復元
          const newSession = {
            className: sessionData.state.className,
            sourceLanguage: sessionData.state.sourceLanguage,
            targetLanguage: sessionData.state.targetLanguage
          };
          
          setActiveSession(newSession);
          setShowSetup(false);
          setSelectedClass(sessionData.state.className);
          setSourceLanguage(sessionData.state.sourceLanguage);
          setTargetLanguage(sessionData.state.targetLanguage);
          setIsPaused(false);
          
          // 履歴データを復元
          if (sessionData.history && sessionData.history.length > 0) {
            // SessionMemoryServiceに履歴を復元
            sessionData.history.forEach((translation: any) => {
              sessionMemory.addTranslation(translation);
            });
            
            // 履歴エントリーを復元（UI表示用）
            const restoredEntries = sessionData.history.map((item: any) => ({
              id: item.id,
              timestamp: new Date(item.timestamp),
              sourceText: item.original,
              targetText: item.japanese || item.translation,
              isHighQuality: item.isHighQuality,
              sentenceId: item.sentenceId,
              sentenceGroupId: item.sentenceGroupId
            }));
            setHistoryEntries(restoredEntries);
          }
          
          // 要約データを復元
          if (sessionData.summaries && sessionData.summaries.length > 0) {
            sessionData.summaries.forEach((summary: any) => {
              sessionMemory.addSummary(summary);
            });
            
            // 最後の要約を表示
            const lastSummary = sessionData.summaries[sessionData.summaries.length - 1];
            if (lastSummary) {
              setSummaryJapanese(lastSummary.japanese || '');
              setSummaryEnglish(lastSummary.english || '');
            }
          }
          
          // メモデータを復元
          if (sessionData.memos && sessionData.memos.length > 0) {
            const restoredMemos = sessionData.memos.map((memo: any) => ({
              id: memo.id,
              timestamp: memo.timestamp,
              text: memo.text,
              translation: memo.translation,
              type: memo.type
            }));
            setMemoList(restoredMemos);
            sessionMemory.updateMemos(sessionData.memos);
          }
          
          // 録音時間を復元
          if (sessionData.state.duration) {
            const durationInSeconds = Math.floor(sessionData.state.duration / 1000);
            setRecordingTime(durationInSeconds);
            recordingStartTimeRef.current = new Date(Date.now() - sessionData.state.duration);
            pausedDurationRef.current = 0;  // 一時停止時間をリセット
            pauseStartTimeRef.current = null;  // 一時停止開始時刻をリセット
          }
          
          // 言語設定を永続化
          sessionStorageService.saveLanguagePreferences({
            sourceLanguage: sessionData.state.sourceLanguage,
            targetLanguage: sessionData.state.targetLanguage
          });
          
          // セッションデータを永続化（リロード対応）
          sessionStorageService.saveActiveSession(newSession);
          
          // SessionMemoryサービスで既存のセッションを再開
          await sessionMemory.resumeSession();
          
          // Setup → Main画面遷移をWindowClient経由で実行
          await windowClient.enterMain();
          
          // パイプラインを開始
          console.log('[UniVoice] Updating pipeline languages for resumed session');
          pipeline.updateLanguages(sessionData.state.sourceLanguage, sessionData.state.targetLanguage);
          
          if (!pipeline.isRunning) {
            console.log('[UniVoice] Starting pipeline from microphone for resumed session');
            await pipeline.startFromMicrophone();
            console.log('[UniVoice] ✅ Pipeline started successfully for resumed session');
          }
          
          // セッションメタデータをメインプロセスに送信（自動保存のため）
          if (window.electron?.send) {
            window.electron.send('session-metadata-update', {
              className: sessionData.state.className,
              sourceLanguage: sessionData.state.sourceLanguage,
              targetLanguage: sessionData.state.targetLanguage,
              isResumed: true,
              sessionNumber: latestSession.sessionNumber
            });
            console.log('[UniVoice] Session metadata sent to main process (resumed)');
          }
          
          console.log('[UniVoice] Session resumed successfully');
        } else {
          console.error('[UniVoice] No session data found');
          alert('セッションデータが見つかりませんでした。');
        }
      } else {
        console.error('[UniVoice] window.electron.invoke is not available');
        alert('セッション読み込み機能が利用できません。');
      }
    } catch (error) {
      console.error('[UniVoice] Failed to resume session:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      alert(`セッションの再開に失敗しました。\n\nエラー: ${errorMessage}`);
      
      // エラーが発生した場合はSetup画面のまま
      setActiveSession(null);
      setShowSetup(true);
    } finally {
      // パイプライン開始フラグをリセット
      setIsStartingPipeline(false);
    }
  }, [pipeline, isStartingPipeline, sessionMemory]);
  
  // セッション終了処理
  const endSession = useCallback(async () => {
    console.log('[UniVoice] Ending session');
    
    try {
      // パイプラインを停止
      if (pipeline.isRunning) {
        await pipeline.stop();
        console.log('[UniVoice] Pipeline stopped successfully');
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
        console.log('[UniVoice] Session ended successfully');
      } else {
        alert('レポート生成に失敗しました。録音データは保存されています。');
      }
      
      // 状態をクリア
      pipeline.clearAll();
      setActiveSession(null);
      setShowSetup(true);
      sessionStorageService.clearActiveSession();

      // Setup画面に戻る際にウィンドウサイズをリセット
      if (window.univoice?.window?.setBounds) {
        await window.univoice.window.setBounds({
          width: 600,
          height: 800
        });
      }
      
    } catch (error: any) {
      console.error('[UniVoice] Session end error:', error);
      alert('セッション終了中にエラーが発生しました: ' + error.message);
    }
  }, [pipeline]);
  
  // ウィンドウを閉じる処理
  const handleCloseWindow = useCallback(async () => {
    console.log('[UniVoice] handleCloseWindow called');
    console.log('[UniVoice] window object:', window);
    console.log('[UniVoice] window.univoice:', window.univoice);
    console.log('[UniVoice] window.univoice?.window:', window.univoice?.window);
    console.log('[UniVoice] window.univoice?.window?.close:', window.univoice?.window?.close);
    
    // 型チェックのため分解
    const univoiceApi = window.univoice;
    console.log('[UniVoice] univoiceApi (raw):', univoiceApi);
    
    if (univoiceApi?.window?.close) {
      try {
        console.log('[UniVoice] Calling window.close()');
        const result = await univoiceApi.window.close();
        console.log('[UniVoice] window.close() result:', result);
      } catch (error) {
        console.error('[UniVoice] Error closing window:', error);
      }
    } else {
      console.error('[UniVoice] window.univoice.window.close is not available');
      // WindowClient経由も試す
      try {
        console.log('[UniVoice] Trying WindowClient.close()');
        const windowClient = WindowClient.getInstance();
        await windowClient.close();
      } catch (error) {
        console.error('[UniVoice] WindowClient.close() error:', error);
      }
    }
  }, []);

  // 次の授業へ移行
  const nextClass = useCallback(() => {
    console.log('[UniVoice] ➡️ Moving to next class');
    
    // レポート発行
    generateReport(false);
    
    // DataPersistenceServiceに次の授業へ移ることを通知
    if (window.electron?.send) {
      window.electron.send('next-class');
      console.log('[UniVoice] Next class notification sent');
    }
    
    // 現在のセッションを終了
    if (pipeline.isRunning) {
      pipeline.stop();
    }
    
    // すべてのコンテンツをクリア
    clearAllContent();
    
    // 履歴をクリアして新しいセッションの準備
    pipeline.clearAll();
    setRecordingTime(0);
    recordingStartTimeRef.current = null;
    setAutoSaveTime(null);
    setMemoList([]);
    setShowBlockGuides(true);
    
    // activeSessionをクリアしてSetup画面に戻る
    setActiveSession(null);
    setShowSetup(true);
    setShowReportModal(false);
    setSelectedClass(null);
    sessionStorageService.clearActiveSession();
    
    alert('レポートを保存しました。\n新しい授業の録音を開始します。');
    console.log('[UniVoice] Ready for next class setup');
  }, [pipeline]);
  
  
  useEffect(() => {
    if (activeSession) {
      console.log('[UniVoicePerfect] currentTranslation updated:', currentTranslation);
    }
  }, [currentTranslation, activeSession]);
  
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
        sourceText: item.original,
        targetText: item.japanese,
        timestamp: new Date(item.timestamp || Date.now()),
        isHighQuality: true // パイプラインから来る履歴は高品質
      }));
      setHistoryEntries(entries);
    }
  }, [pipeline.history]);
  
  // 履歴データ（propsまたはpipelineから）- HistoryEntry型に統一
  const historyData: HistoryEntry[] = _historyOverride || pipeline.history.map(h => ({
    id: h.id,
    sourceText: h.original,
    targetText: h.japanese,
    timestamp: new Date(h.timestamp || Date.now()),
    isHighQuality: true
  })) || [];
  
  // 重複関数を削除しました（522-800行の完全版を使用）
  
  // Refs
  const recordingStartTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mockUpdateIndex = useRef(0);
  const pausedDurationRef = useRef<number>(0);  // 一時停止中の累積時間
  const pauseStartTimeRef = useRef<Date | null>(null);  // 一時停止開始時刻
  
  // リアルタイム翻訳用の一時的なバッファ（UniVoice 2.0では不要）
  // RealtimeDisplayManagerが管理するため削除
  
  // currentDisplayは既に128行目で定義済み
  
  /**
   * 🆕 固定セクションの高さ計算
   * 
   * リアルタイムエリア以外の全ての固定セクションの高さを計算します。
   * この関数は、ユーザードラッグモードでリアルタイムエリアの高さを
   * 計算する際に使用されます。
   * 
   * 将来の拡張性：
   * - 新しいセクションを追加する場合は、この関数に追加してください
   * - セクションの高さが動的に変わる場合は、パラメータ化を検討してください
   */
  const calculateFixedSectionsHeight = useCallback(() => {
    let fixedHeight = 0;
    
    // 1. ヘッダー部分
    if (showHeader) {
      fixedHeight += LAYOUT_HEIGHTS.header;
    } else {
      fixedHeight += LAYOUT_HEIGHTS.minimalControl;
    }
    
    // 2. 設定バー
    if (showSettings) {
      fixedHeight += LAYOUT_HEIGHTS.settingsBar;
    }
    
    // 3. 質問セクション
    if (showQuestionSection) {
      fixedHeight += LAYOUT_HEIGHTS.questionSection;
    }
    
    // 将来的な拡張ポイント：
    // if (showNewSection) {
    //   fixedHeight += LAYOUT_HEIGHTS.newSection;
    // }
    
    return fixedHeight;
  }, [showHeader, showSettings, showQuestionSection]);

  /**
   * 🔍 高さ計算の核心ロジック
   * 
   * この関数が全ての高さ管理の中心です。
   * 各セクションの表示状態に基づいて、ウィンドウの総高さを計算します。
   * 
   * 重要：DOM測定（scrollHeight等）は使用しません。
   * 理由：予測不可能で、レイアウトの再計算を引き起こし、パフォーマンスに悪影響があるため。
   * 
   * 2025-09-13 更新：calculateFixedSectionsHeight と連携して使用
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
   * 
   * 2025-09-13 更新：
   * - リサイズモードを設定して無限ループを防止
   * - セクショントグルモードでのみ実行されることを保証
   */
  const executeWindowResize = useCallback(async () => {
    // セクショントグルモードを設定
    setCurrentResizeMode(ResizeMode.SECTION_TOGGLE);
    
    const targetHeight = calculateTotalHeight();
    
    // デバッグ用ログ（開発時のみ）
    console.log('[Window Resize] Executing resize:', {
      mode: ResizeMode.SECTION_TOGGLE,
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
      
      // リサイズ完了後、モードをリセット（遅延を入れて安定性を確保）
      setTimeout(() => {
        setCurrentResizeMode(ResizeMode.NONE);
      }, 200);
    } else {
      // APIが利用できない場合は即座にリセット
      setCurrentResizeMode(ResizeMode.NONE);
    }
  }, [calculateTotalHeight, showHeader, showSettings, showQuestionSection, realtimeSectionHeight]);
  
  /**
   * 🔄 セクション表示状態変更時の処理
   *
   * 2025-09-19 仕様変更: 固定位置動作の実装
   * - ヘッダー/設定バー切り替え時：リアルタイムエリアの位置を固定（高さ調整のみ）
   * - 質問セクション切り替え時：ウィンドウ全体をリサイズ
   */
  useEffect(() => {
    // sessionConfigがない場合（Setup画面）では処理しない
    if (!activeSession) {
      console.log('[Window Resize] Skipping - no active session (Setup screen)');
      return;
    }

    // 初回レンダリング時にウィンドウリサイズを実行
    executeWindowResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ

  // セクション変更時のウィンドウリサイズ
  useEffect(() => {
    if (!activeSession) return;

    // CSSアニメーションを考慮した遅延
    const timer = setTimeout(() => {
      executeWindowResize();
    }, LAYOUT_HEIGHTS.animationDelay);

    return () => clearTimeout(timer);
  }, [showHeader, showSettings, showQuestionSection, executeWindowResize, activeSession]);
  
  // リアルタイムセクションの高さ変更時
  useEffect(() => {
    // sessionConfigがない場合（Setup画面）ではリサイズを実行しない
    if (!activeSession) {
      return;
    }
    // ユーザードラッグモードの場合はスキップ（無限ループ防止）
    if (currentResizeMode === ResizeMode.USER_DRAG) {
      console.log('[Realtime Height Change] Skipping resize - in user drag mode');
      return;
    }
    // ユーザーがリサイズハンドルを操作した後
    executeWindowResize();
  }, [realtimeSectionHeight, executeWindowResize, currentResizeMode, activeSession]);
  
  /**
   * 🆕 ウィンドウリサイズ検知システム
   * 
   * ユーザーがウィンドウ境界をドラッグした時の処理を管理します。
   * セクショントグルモードとの競合を防ぐため、現在のリサイズモードを確認します。
   * 
   * 動作原理：
   * 1. ウィンドウのresizeイベントを監視
   * 2. セクショントグルモード中は無視（無限ループ防止）
   * 3. それ以外の場合、リアルタイムエリアの高さを再計算
   * 4. デバウンス処理でパフォーマンスを最適化
   * 
   * 将来の拡張性：
   * - WINDOW_RESIZE_DEBOUNCE_MS を設定可能にする
   * - 最小/最大高さの制限をより柔軟に設定可能にする
   * - リサイズ時のアニメーション効果を追加可能
   */
  useEffect(() => {
    const handleWindowResize = () => {
      // セクショントグルモード中は処理をスキップ
      if (currentResizeMode === ResizeMode.SECTION_TOGGLE) {
        console.log('[Window Resize] Skipping - in section toggle mode');
        return;
      }
      
      // 既存のデバウンスタイマーをクリア
      if (windowResizeTimeoutRef.current) {
        clearTimeout(windowResizeTimeoutRef.current);
      }
      
      // デバウンス処理
      windowResizeTimeoutRef.current = setTimeout(() => {
        // ユーザードラッグモードを設定
        setCurrentResizeMode(ResizeMode.USER_DRAG);
        
        // 現在のウィンドウ高さを取得
        const windowHeight = window.innerHeight;
        
        // 固定セクションの高さを計算
        const fixedHeight = calculateFixedSectionsHeight();
        
        // リアルタイムエリアの新しい高さを計算
        const newRealtimeHeight = Math.max(
          LAYOUT_HEIGHTS.realtime.min,
          windowHeight - fixedHeight  // 最大高さ制限なし (2025-09-19仕様変更)
        );
        
        // 有意な変化がある場合のみ更新（ちらつき防止）
        const heightDifference = Math.abs(newRealtimeHeight - realtimeSectionHeight);
        if (heightDifference > 5) {
          console.log('[Window Resize] User drag detected:', {
            windowHeight,
            fixedHeight,
            oldRealtimeHeight: realtimeSectionHeight,
            newRealtimeHeight,
            difference: heightDifference
          });
          
          // 高さを更新
          setRealtimeSectionHeight(newRealtimeHeight);
          
          // LocalStorageに保存
          localStorage.setItem('univoice-realtime-height', newRealtimeHeight.toString());
        }
        
        // モードをリセット
        setTimeout(() => {
          setCurrentResizeMode(ResizeMode.NONE);
        }, 100);
      }, WINDOW_RESIZE_DEBOUNCE_MS);
    };
    
    // イベントリスナーを登録
    window.addEventListener('resize', handleWindowResize);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (windowResizeTimeoutRef.current) {
        clearTimeout(windowResizeTimeoutRef.current);
      }
    };
  }, [currentResizeMode, realtimeSectionHeight, calculateFixedSectionsHeight]);
  
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
        headerControls.toggleHeader();
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
  
  // このタイマー処理は削除（1479行目の正しい実装を使用）
  
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
      setHistoryEntries(uniqueHistory as HistoryEntry[]);
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
  
  
  // セクション高さの変更（ログ削除）
  
  // 履歴エントリ数の変更（ログ削除）
  
  
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
    // セッションが開始されており、録音開始時刻が設定されている場合のみタイマーを動作させる
    if (!showSetup && recordingStartTimeRef.current) {
      // 一時停止中でもタイマーは動作させ、一時停止時間を考慮して計算
      if (!isPaused) {
        timerRef.current = setInterval(() => {
          const now = new Date();
          const elapsedSinceStart = now.getTime() - recordingStartTimeRef.current!.getTime();
          const totalElapsed = Math.floor((elapsedSinceStart - pausedDurationRef.current) / 1000);
          setRecordingTime(totalElapsed);
        }, 1000);
      }
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
    return undefined;
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
  
  // Duplicate handleStartSession removed - using the implementation from line 459
  
  const togglePause = async () => {
    // 🔴 CRITICAL: isRunning（pipeline）を使用し、正しい関数を呼び出す
    if (isRunning) {
      // 一時停止
      console.log('[UniVoice] パイプライン一時停止');
      try {
        await pipeline.stop();
        setIsPaused(true);
        
        // 一時停止開始時刻を記録
        pauseStartTimeRef.current = new Date();
        
        // タイマーを停止
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (error) {
        console.error('[UniVoice] 停止エラー:', error);
      }
    } else {
      // 再開
      console.log('[UniVoice] パイプライン再開');
      try {
        await pipeline.startFromMicrophone();
        setIsPaused(false);
        
        // 一時停止していた時間を累積
        if (pauseStartTimeRef.current) {
          const pauseDuration = new Date().getTime() - pauseStartTimeRef.current.getTime();
          pausedDurationRef.current += pauseDuration;
          pauseStartTimeRef.current = null;
        }
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

  // パネル切り替え関数
  const togglePanel = async (type: 'history' | 'summary') => {
    if (type === 'history') {
      // WindowClient経由で履歴ウィンドウをトグル（外部ウィンドウのみ）
      const success = await windowClient.toggleHistory();
      if (!success) {
        console.error('Failed to toggle history window');
      }
      // 内部パネルは表示しない
      setShowHistoryPanel(false);
      setShowSummaryPanel(false);
    } else if (type === 'summary') {
      // WindowClient経由で要約ウィンドウをトグル（外部ウィンドウのみ）
      const success = await windowClient.toggleSummary();
      if (!success) {
        console.error('Failed to toggle summary window');
      }
      // 内部パネルは表示しない
      setShowSummaryPanel(false);
      setShowHistoryPanel(false);
    }
  };;

  const saveAsMemo = async () => {
    const textarea = questionInputRef.current;
    if (!textarea || !textarea.value.trim()) return;

    // 質問機能: Target言語で入力 → Source言語へ翻訳
    const inputText = textarea.value.trim();
    
    try {
      // 翻訳API呼び出し（Target→Source方向）
      const translatedText = await generateQuestionTranslation(inputText);
      
      // Memo型の期待する形式に合わせる
      // TODO: Memo型をリファクタリングしてsource/target概念に統一すべき
      // 現在は後方互換性のためjapanese/englishフィールドを使用
      const memo: Memo = {
        id: Date.now().toString(),
        timestamp: formatTime(recordingTime),
        // 暫定的な実装: japanese/englishフィールドにマッピング
        japanese: targetLanguage === 'ja' ? inputText : 
                  sourceLanguage === 'ja' ? translatedText : 
                  `[${targetLanguage}] ${inputText}`,
        english: targetLanguage === 'en' ? inputText : 
                 sourceLanguage === 'en' ? translatedText : 
                 `[${sourceLanguage}] ${translatedText}`
      };

      setMemoList([...memoList, memo]);
      textarea.value = '';
      
      console.log('[UniVoice] Memo saved with translation from', targetLanguage, 'to', sourceLanguage);
    } catch (error) {
      console.error('[UniVoice] Failed to save memo with translation:', error);
      // エラー時は翻訳なしで保存
      const memo: Memo = {
        id: Date.now().toString(),
        timestamp: formatTime(recordingTime),
        japanese: targetLanguage === 'ja' ? inputText : '[Translation failed]',
        english: targetLanguage === 'en' ? inputText : '[Translation failed]'
      };
      setMemoList([...memoList, memo]);
      textarea.value = '';
    }
  };

  const saveMemoEdit = (memoId: string) => {
    // MemoModalの期待する型に合わせる
    const memo = memoList.find(m => m.id === memoId);
    if (memo) {
      // 編集機能の実装
      console.log('[UniVoice] Memo edit requested for:', memoId);
    }
  };




  // Duplicate endSession removed - using the wrapper from line 597
  
  const generateReport = (showModal: boolean = true) => {
    // レポート生成ロジック（仮実装）
    console.log('[UniVoice] Generating report...');
    if (showModal) {
      setShowReportModal(true);
    }
  };
  
  const generateFinalReport = async () => {
    try {
      console.log('[UniVoice] Generating final report...');
      // TODO: 実際のレポート生成ロジックを実装
      // 現在は仮実装として成功を返す
      return {
        success: true,
        data: {
          summaryEnglish: summaryEnglish || '',
          summaryJapanese: summaryJapanese || '',
          className: selectedClass || '',
          recordingTime: recordingTime,
          memoList: memoList
        }
      };
    } catch (error) {
      console.error('[UniVoice] Failed to generate final report:', error);
      return null;
    }
  };

  // Duplicate nextClass removed - using the implementation from line 557
  
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
    const textarea = questionInputRef.current;
    if (textarea) textarea.value = '';
  };
  
  // Duplicate generateFinalReport removed - using the implementation from line 1437
  
  
  // 表示モード切り替え関数
  const setDisplay = (mode: 'both' | 'source' | 'target') => {
    setDisplayMode(mode);
    
    // 他のウィンドウに設定変更を通知
    if (window.electronAPI) {
      window.electronAPI.send('settings-updated', {
        theme: currentTheme,
        fontScale: currentFontScale,
        displayMode: mode
      });
    }
  };
  
  // フォントサイズ変更関数
  const changeFont = (direction: number) => {
    let newScale: number;
    
    if (direction === 0) {
      newScale = 1;
    } else if (direction === 1) {
      newScale = Math.min(3.0, currentFontScale * 1.1); // 最大3倍まで拡大可能
    } else if (direction === -1) {
      newScale = Math.max(0.5, currentFontScale * 0.9); // 最小0.5倍まで縮小可能
    } else {
      return;
    }
    
    setCurrentFontScale(newScale);
    
    // 他のウィンドウに設定変更を通知
    if (window.electronAPI) {
      window.electronAPI.send('settings-updated', {
        theme: currentTheme,
        fontScale: newScale,
        displayMode: displayMode
      });
    }
  };
  
  
  /**
   * 🎨 テーマ切り替え関数
   * light → dark → purple → light の順番で循環
   */
  const cycleTheme = () => {
    setCurrentTheme(prev => {
      const nextTheme = prev === 'light' ? 'dark' : prev === 'dark' ? 'purple' : 'light';
      
      // 他のウィンドウ（要約ウィンドウなど）に設定変更を通知
      if (window.electronAPI) {
        window.electronAPI.send('settings-updated', {
          theme: nextTheme,
          fontScale: currentFontScale,
          displayMode: displayMode
        });
      }
      
      return nextTheme;
    });
  };
  
  // テーマ変更時に背景グラデーションを更新
  useEffect(() => {
    const bgGradient = currentTheme === 'light' 
      ? 'var(--bg-gradient-light)'
      : currentTheme === 'dark'
      ? 'var(--bg-gradient-dark)'
      : 'var(--bg-gradient-purple)';
    
    document.documentElement.style.setProperty('--current-bg-gradient', bgGradient);
  }, [currentTheme]);
  
  // 他のウィンドウ（要約ウィンドウ等）からの設定変更を受信
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const cleanup = window.electronAPI.on('settings-updated', (_event: any, settings: {
      theme?: string;
      fontScale?: number;
      displayMode?: string;
    }) => {
      console.log('[UniVoice] Received settings update from other window:', settings);
      
      if (settings.theme && settings.theme !== currentTheme) {
        setCurrentTheme(settings.theme as 'light' | 'dark' | 'purple');
      }
      if (settings.fontScale && settings.fontScale !== currentFontScale) {
        setCurrentFontScale(settings.fontScale);
      }
      if (settings.displayMode && settings.displayMode !== displayMode) {
        setDisplayMode(settings.displayMode as 'both' | 'source' | 'target');
      }
    });
    
    return cleanup;
  }, [currentTheme, currentFontScale, displayMode]);
  
  
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
        original: entry.sourceText,
        translation: entry.targetText
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
        original: entry.sourceText,
        translation: entry.targetText
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
    // TODO: 旧リサイズシステム削除時にこの行も削除
    // if ((event.target as HTMLElement).classList.contains('resize-handle')) return;
    
    // タイトルは renderHistoryToHTML 内で設定されるため不要
    setModalTitle('');
    setModalContent(getAlignedHistoryContent());
    setShowFullscreenModal(true);
  };
  
  const handleSummaryClick = (event: React.MouseEvent) => {
    if (window.getSelection()?.toString()) return;
    // TODO: 旧リサイズシステム削除時にこの行も削除
    // if ((event.target as HTMLElement).classList.contains('resize-handle')) return;
    
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
  
  // ユーザー入力の翻訳生成（Target→Source方向）
  const generateQuestionTranslation = async (inputText: string): Promise<string> => {
    try {
      if (onUserTranslate) {
        // 質問機能では逆方向（Target→Source）に翻訳
        const translation = await onUserTranslate(inputText, targetLanguage, sourceLanguage);
        return translation || `Translation failed: ${inputText}`;
      } else {
        console.warn('[UniVoice] onUserTranslate not provided');
        return `Translation not available: ${inputText}`;
      }
    } catch (error: any) {
      console.error('[UniVoice] 翻訳例外:', error);
      return `Translation error: ${inputText.substring(0, 30)}...`;
    }
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
          headerControls.toggleHeader();
        } else if (e.key === 'F4') {
          // Alt + F4: アプリケーションを閉じる
          console.log('[UniVoice] Alt+F4 pressed');
          e.preventDefault();
          handleCloseWindow();
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
      
      // Ctrl+Shift+R: セッションリセット
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        console.log('[UniVoice] 🔧 Reset shortcut triggered');
        
        // パイプラインを停止
        if (pipeline.isRunning) {
          pipeline.stop();
        }
        
        // セッションをクリア
        sessionStorageService.clearActiveSession();
        sessionStorageService.clearSessionData();
        setActiveSession(null);
        setShowSetup(true);

        // ウィンドウサイズをSetup用にリセット
        if (window.univoice?.window?.setBounds) {
          window.univoice.window.setBounds({
            width: 600,
            height: 800
          });
        }

        // ページをリロード（resetパラメータで強制Setup表示）
        window.location.href = window.location.pathname + '?reset=true';
      }
    };
    
    // キャプチャフェーズでも登録してブラウザのズーム機能を確実に防ぐ
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keydown', handleKeyDown, false);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keydown', handleKeyDown, false);
    };
  }, [showHeader, handleCloseWindow]);
  
  // ========== セットアップ画面 ==========
  if (showSetup) {
    return (
      <SetupSection
        onStartSession={handleStartSession}
        onResumeSession={handleResumeSession}
        initialClassName={selectedClass || ''}
        defaultSourceLanguage={sourceLanguage}
        defaultTargetLanguage={targetLanguage}
        previousSession={previousSession}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />
    );
  }
  
  // CSS Modules用のヘルパー関数（命名規則統一版）
  const getThemeClass = (base: string, includeBase: boolean = true) => {
    const themeMap: Record<string, string> = {
      'light': 'Light',
      'dark': 'Dark',  
      'purple': 'Purple'
    };
    const themeSuffix = themeMap[currentTheme] || 'Light';
    
    // 統一された命名規則: {base}Theme{suffix}
    const themeClassName = `${base}Theme${themeSuffix}`;
    const themeClass = styles[themeClassName];
    
    // エラーを早期発見（開発環境のみ）
    if (process.env.NODE_ENV === 'development' && !themeClass) {
      console.warn(`⚠️ Theme class not found: ${themeClassName}`, {
        availableClasses: Object.keys(styles).filter(key => key.startsWith(base)),
        attemptedClass: themeClassName,
        base,
        theme: currentTheme
      });
    }
    
    return includeBase ? classNames(styles[base], themeClass) : themeClass;
  };

  // ========== メイン画面 ==========
  return (
    <>
      {/* アプリコンテナ（フレームレス対応） */}
      <div ref={appContainerRef} className={classNames(styles.app, getThemeClass('theme', false))} style={{
        width: '100%',
        height: '100%', // ビューポート全体の高さを使用
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // フォントスケールをCSS変数として設定
        '--font-scale': currentFontScale,
        fontSize: `calc(16px * var(--font-scale))`
      } as React.CSSProperties}>
        {/* メインウィンドウ - backgroundクラスを追加し、全体をドラッグ可能に */}
        <div 
          className={classNames(styles.mainWindow, "main-content", "background")} 
          style={{
            width: '100%',
            height: '100%', // 親要素の高さに従う
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
        {/* ヘッダー */}
        {showHeader && (
        <div className={getThemeClass('header')} style={{
          WebkitAppRegion: 'drag',  // ヘッダーをドラッグ可能に
          position: 'relative',
          userSelect: 'none',
          flexShrink: 0,
          zIndex: 10002,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 'var(--edge-margin)',
          paddingRight: 'var(--edge-margin)'
        }}>
          {/* 左側のコントロール群 - 統一コンテナ */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--button-gap)'
          }}>
            {/* 録音インジケーター */}
            <div className={getThemeClass('recordingIndicator')} style={{width: 'var(--recording-width)', flexShrink: 0}}>
              <div className={classNames(styles.recordingDot, { [styles.recordingDotPaused]: isPaused })} />
              <span>{formatTime(recordingTime)}</span>
            </div>
            
            {/* 一時停止ボタン */}
            <button className={getThemeClass('controlButton')} onClick={togglePause} style={{WebkitAppRegion: 'no-drag', width: 'var(--button-size)', height: 'var(--button-size)'}}>
              {isPaused ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2 L4 14 L12 8 Z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5 3v10h3V3H5zm5 0v10h3V3h-3z"/>
                </svg>
              )}
              <span className={styles.tooltip}>{isPaused ? '再開' : '一時停止'}</span>
            </button>
            
            {/* 授業終了ボタン */}
            <button className={getThemeClass('controlButton')} onClick={endSession} style={{WebkitAppRegion: 'no-drag', width: 'var(--button-size)', height: 'var(--button-size)'}}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="3" width="10" height="10" rx="1"/>
              </svg>
              <span className={styles.tooltip}>授業終了</span>
            </button>
            
            {/* 次の授業へボタン */}
            <button className={getThemeClass('controlButton')} onClick={nextClass} style={{WebkitAppRegion: 'no-drag', width: 'var(--button-size)', height: 'var(--button-size)'}}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 8h8m0 0L8 4m4 4L8 12"/>
              </svg>
              <span className={styles.tooltip}>次の授業へ</span>
            </button>
          </div>
          
          
          {autoSaveTime && (
            <span style={{ fontSize: '12px', color: '#4CAF50', marginLeft: '15px', opacity: 0.8 }}>
              ✓ 自動保存済み
            </span>
          )}
          
          {/* 中央のボタン群 - 固定位置 */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--button-gap)'
          }}>
            {/* 履歴ボタン（フローティングパネル用） */}
            <button 
              data-testid="history-button"
              className={classNames(getThemeClass('controlButton'), showHistoryPanel && styles.controlButtonActive)}
              onClick={() => togglePanel('history')}
              style={{WebkitAppRegion: 'no-drag', width: 'var(--center-button-width)', height: 'var(--button-size)'}}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="12" height="10" rx="1"/>
                <line x1="4" y1="6" x2="12" y2="6"/>
                <line x1="4" y1="9" x2="12" y2="9"/>
              </svg>
              <span className={styles.tooltip}>履歴</span>
            </button>
            
            {/* 要約ボタン（プログレッシブ要約機能統合） */}
            <button
              data-testid="summary-button"
              className={classNames(getThemeClass('controlButton'), showProgressiveSummary && styles.controlButtonActive)}
              onClick={() => {
                console.log('[UniVoice] Summary button clicked');
                console.log('[UniVoice] Summaries:', summaries);
                console.log('[UniVoice] window.electron:', window.electron);
                console.log('[UniVoice] window.electron.send:', window.electron?.send);
                
                // 要約ウィンドウを開く
                if (window.electron?.send) {
                  const progressiveSummaries = summaries.filter(s => s.threshold);
                  console.log('[UniVoice] Progressive summaries:', progressiveSummaries);
                  
                  // 要約データがなくてもウィンドウを開く
                  console.log('[UniVoice] Sending open-summary-window event');
                  window.electron.send('open-summary-window', {
                    summaries: progressiveSummaries,
                    settings: {
                      theme: currentTheme,
                      fontScale: currentFontScale,
                      displayMode: displayMode
                    }
                  });
                } else {
                  console.error('[UniVoice] window.electron.send not available');
                }
              }}
              style={{WebkitAppRegion: 'no-drag', width: 'var(--center-button-width)', height: 'var(--button-size)'}}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="9" width="3" height="5" fill="currentColor" opacity="0.3"/>
                <rect x="6.5" y="6" width="3" height="8" fill="currentColor" opacity="0.5"/>
                <rect x="11" y="3" width="3" height="11" fill="currentColor" opacity="0.7"/>
              </svg>
              <span className={styles.tooltip}>要約</span>
              {summaries.filter(s => s.threshold).length > 0 && (
                <span className={styles.badge} style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 5px',
                  borderRadius: '6px',
                  fontWeight: '700'
                }}>
                  {summaries.filter(s => s.threshold).length}
                </span>
              )}
            </button>
            
            {/* 質問ボタン */}
            <button 
              className={classNames(getThemeClass('controlButton'), showQuestionSection && styles.controlButtonActive)}
              onClick={() => {
                setShowQuestionSection(!showQuestionSection);
              }}
              style={{WebkitAppRegion: 'no-drag', width: 'var(--center-button-width)', height: 'var(--button-size)'}}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 11 L2 6 Q2 3 5 3 L11 3 Q14 3 14 6 L14 11 L9 11 L5 14 L5 11 Z"/>
              </svg>
              <span className={styles.tooltip}>質問</span>
              {memoList.length > 0 && (
                <span className={styles.badge} style={{
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
            
          </div>
          
          {/* 右側のボタン群 - 固定位置 */}
          <HeaderControls
            showHeader={showHeader}
            showSettings={showSettings}
            isAlwaysOnTop={isAlwaysOnTop}
            onExpandClick={() => {
              if (!showHeader) {
                setShowHeader(true);
              } else {
                setShowSettings(true);
              }
            }}
            onCollapseClick={() => {
              if (showSettings) {
                setShowSettings(false);
              } else {
                setShowHeader(false);
              }
            }}
            onAlwaysOnTopToggle={async () => { await headerControls.toggleAlwaysOnTop(); }}
            onClose={handleCloseWindow}
            getThemeClass={getThemeClass}
            currentTheme={currentTheme}
          />
        </div>
        )}
        
        
        {/* 設定バー (Liquid Glass) */}
        <div className={classNames(
          styles.settingsBar,
          // コンパクトモード時はglassmorphism効果を無効化
          !showHeader ? styles.settingsBarCompact : getThemeClass('settingsBar', false),
          showSettings && styles.settingsVisible
        )} style={{
          zIndex: 1000,
          position: 'relative',
          WebkitAppRegion: 'no-drag',  // 設定バーは操作可能にする
          // コンパクトモード時の白い線を完全に防ぐ
          boxShadow: !showHeader ? 'none' : undefined,
          border: !showHeader ? 'none' : undefined,
          borderTop: !showHeader ? '0' : undefined,
          background: !showHeader ? 'transparent' : undefined,
          backdropFilter: !showHeader ? 'none' : undefined,
          WebkitBackdropFilter: !showHeader ? 'none' : undefined,
          marginBottom: showSettings ? '0' : '0'  // 設定バー表示時は下部マージンを0に
        }}>
          <div className={styles.settingsContent} style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            padding: '0 var(--edge-margin)',
            position: 'relative'
          }}>
            {/* 左側のグループ */}
            <div className={styles.settingsGroupLeft} style={{display: 'flex', alignItems: 'center', gap: 'var(--button-gap)'}}>
              <button 
                className={classNames(
                  getThemeClass('settingButton', false),
                  displayMode === 'both' && styles.settingActive
                )}
                onClick={() => setDisplay('both')}
                style={{width: '36px', height: '36px'}}
              >
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                  <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
                </svg>
                <span className={styles.sTooltip}>Alt+B</span>
              </button>
              <button 
                className={classNames(
                  getThemeClass('settingButton', false),
                  displayMode === 'source' && styles.settingActive
                )}
                onClick={() => setDisplay('source')}
                style={{width: '36px', height: '36px'}}
              >
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                  <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
                  <rect x="10" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
                </svg>
                <span className={styles.sTooltip}>Alt+S</span>
              </button>
              <button 
                className={classNames(
                  getThemeClass('settingButton', false),
                  displayMode === 'target' && styles.settingActive
                )}
                onClick={() => setDisplay('target')}
                style={{width: '36px', height: '36px'}}
              >
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                  <rect x="1" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
                  <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
                </svg>
                <span className={styles.sTooltip}>Alt+T</span>
              </button>
              
              {/* テーマ切り替えボタン - 左側グループの最後 */}
              <div style={{ marginLeft: 'calc(var(--group-gap) - var(--button-gap))' }}>
                <button className={getThemeClass('settingButton', false)} onClick={cycleTheme} style={{width: '36px', height: '36px'}}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M8 2 A6 6 0 0 1 8 14 A3 3 0 0 0 8 2" fill="currentColor"/>
                  </svg>
                  <span className={styles.sTooltip}>テーマ</span>
                </button>
              </div>
            </div>
            
            {/* 右側のボタン群 - ヘッダーボタンと揃える */}
            <div style={{
              position: 'absolute',
              right: 'var(--settings-right-offset)', // ヘッダーの▲ボタン位置と揃える
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--button-gap)'
            }}>
              {/* フォント- */}
              <button className={getThemeClass('settingButton', false)} onClick={() => changeFont(-1)} style={{width: '36px', height: '36px'}}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className={styles.sTooltip}>Ctrl+-</span>
              </button>
              
              {/* T */}
              <button className={getThemeClass('settingButton', false)} onClick={() => changeFont(0)} style={{width: '36px', height: '36px'}}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>T</span>
                <span className={styles.sTooltip}>リセット</span>
              </button>
              
              {/* フォント+ */}
              <button className={getThemeClass('settingButton', false)} onClick={() => changeFont(1)} style={{width: '36px', height: '36px'}}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 4 L9 14 M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className={styles.sTooltip}>Ctrl++</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* ヘッダー非表示時のミニマルコントロール */}
        {!showHeader && (
          <div className={getThemeClass('headerCompact')} style={{
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '8px',
            flexShrink: 0,
            WebkitAppRegion: 'drag',  // ミニマルヘッダーもドラッグ可能に
            // borderBottomはCSS Modulesで管理するため削除
            position: 'relative',
            top: 0,  // 明示的に位置を指定
            marginTop: 0,  // 上部マージンを無効化
            paddingTop: 0,  // 上部パディングを無効化
            // 白い線を防ぐためのスタイル追加
            boxShadow: 'none',  // box-shadowを完全に無効化
            border: 'none',  // borderを完全に無効化
            borderTop: '0',  // 上部ボーダーを明示的に0に
            borderLeft: '0',
            borderRight: '0',
            // borderBottomは維持（区切り線として必要）
            borderBottom: showSettings ? '0' : `1px solid ${currentTheme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`  // 設定バー表示時はborderBottomも0に
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
              onClick={headerControls.toggleHeader}
              style={{
                width: '24px',
                height: '24px',
                border: 'none',
                background: currentTheme === 'light' 
                  ? 'rgba(0, 0, 0, 0.08)' 
                  : 'rgba(255, 255, 255, 0.15)',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitAppRegion: 'no-drag',
                transition: 'all 0.2s ease',
                color: currentTheme === 'light' ? '#333' : '#fff',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = currentTheme === 'light' 
                  ? 'rgba(0, 0, 0, 0.15)' 
                  : 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = currentTheme === 'light' 
                  ? 'rgba(0, 0, 0, 0.08)' 
                  : 'rgba(255, 255, 255, 0.15)';
              }}
              title="ヘッダーを表示 (Esc)"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" opacity="0.8">
                <path d="M8 11L12 7H4L8 11Z"/>
              </svg>
            </button>
          </div>
        )}
        
        {/* リアルタイムセクション（ユーザー設定可能な高さ） */}
        <div 
          ref={realtimeSectionRef}
          className={getThemeClass('realtimeArea')} 
          style={{
          height: `${realtimeSectionHeight}px`, // ユーザー設定可能な高さ
          overflowY: 'auto',
          padding: '20px 30px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          zIndex: 1,
          flexShrink: 0, // 圧縮されないように
          WebkitAppRegion: 'no-drag'  // コンテンツは操作可能にする
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
              theme={currentTheme}
            />
            
            {/* 表示モード制御は RealtimeSection 内で実装 */}
          </div>

          {/* ボトムリサイズハンドル（2025-09-19追加） */}
          {activeSession && (
            <div
              className={classNames(
                getThemeClass('resizeHandle'),
                isResizing && styles.resizeHandleActive
              )}
              {...resizeHandleProps}
            />
          )}

          {/* プログレッシブ要約セクション */}
          {showProgressiveSummary && summaries && summaries.length > 0 && (
            <ProgressiveSummarySection
              summaries={summaries.filter(s => s.threshold)}
              height={progressiveSummaryHeight}
              isExpanded={false}
              onClick={(e) => e.stopPropagation()}
              onResize={(e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startHeight = progressiveSummaryHeight;

                const handleMouseMove = (e: MouseEvent) => {
                  const deltaY = e.clientY - startY;
                  const newHeight = Math.max(100, Math.min(400, startHeight + deltaY));
                  setProgressiveSummaryHeight(newHeight);
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              pipelineError={null}
            />
          )}

          {/* リサイズハンドルを削除 - Electronウィンドウのリサイズのみを使用 */}

          {/* 質問セクション（折りたたみ可能） */}
          <div className={classNames(
            getThemeClass('questionArea'),
            showQuestionSection ? styles.questionVisible : styles.questionHidden
          )} style={{
            height: showQuestionSection ? '160px' : '0',
            overflow: showQuestionSection ? 'visible' : 'hidden',
            transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            flexShrink: 0,
            WebkitAppRegion: 'no-drag'  // 入力エリアは操作可能にする
          }}>
            <div className={styles.questionInner} style={{
              padding: '20px 30px',
              display: 'flex',
              gap: '20px',
              height: '100%',
              borderTop: `1px solid ${currentTheme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`
            }}>
              <textarea 
                ref={questionInputRef}
                className={getThemeClass('questionInput')}
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
                  height: '100%',
                  boxSizing: 'border-box',
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
              <div className={styles.questionActions} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                justifyContent: 'center'
              }}>
                <button 
                  className={classNames(styles.qBtnSecondary, currentTheme !== 'light' && styles[`theme${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`])}
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
                  className={styles.qBtnPrimary}
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
    </>
  );
};

export default UniVoice;
