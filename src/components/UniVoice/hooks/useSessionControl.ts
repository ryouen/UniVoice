/**
 * useSessionControl Hook
 * Clean Architecture: Application Layer
 * 責任: セッション管理ロジックの集約
 */

import { useCallback, useState, useRef } from 'react';
import { SessionConfiguration, SessionFactory, SessionStatus } from '../../../domain/models/Session';
import { sessionStorageService } from '../../../services/SessionStorageService';
import { WindowClient } from '../../../services/WindowClient';
import type { UseUnifiedPipelineReturn } from '../../../hooks/useUnifiedPipeline';
import type { UseSessionMemoryReturn } from '../../../hooks/useSessionMemory';

export interface UseSessionControlOptions {
  pipeline: UseUnifiedPipelineReturn;
  sessionMemory: UseSessionMemoryReturn;
  onSessionStart?: (className: string, sourceLang: string, targetLang: string) => void;
  onSessionEnd?: () => void;
  onSessionResume?: (className: string) => void;
}

export interface UseSessionControlReturn {
  // State
  activeSession: SessionState['activeSession'];
  previousSession: SessionState['previousSession'];
  isStartingPipeline: boolean;
  isPaused: boolean;
  recordingTime: number;
  showSetup: boolean;

  // Actions
  handleStartSession: (className: string, sourceLang: string, targetLang: string) => Promise<void>;
  handleResumeSession: (className: string) => Promise<void>;
  endSession: () => Promise<void>;
  nextClass: () => void;
  togglePause: () => void;

  // Refs
  recordingStartTimeRef: React.MutableRefObject<Date | null>;
}

interface SessionState {
  activeSession: {
    className: string;
    sourceLanguage: string;
    targetLanguage: string;
  } | null;
  previousSession: {
    className: string;
    sourceLanguage: string;
    targetLanguage: string;
    timestamp?: number;
  } | null;
}

export function useSessionControl(options: UseSessionControlOptions): UseSessionControlReturn {
  const { pipeline, sessionMemory, onSessionStart, onSessionEnd, onSessionResume } = options;
  const windowClient = WindowClient.getInstance();

  // State management
  const [activeSession, setActiveSession] = useState<SessionState['activeSession']>(null);
  const [previousSession, setPreviousSession] = useState<SessionState['previousSession']>(() => {
    const stored = sessionStorageService.loadActiveSession();
    if (stored) {
      console.log('[SessionControl] Previous session found:', stored);
      return stored;
    }
    return null;
  });

  const [showSetup, setShowSetup] = useState(!activeSession);
  const [isStartingPipeline, setIsStartingPipeline] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Refs
  const recordingStartTimeRef = useRef<Date | null>(null);

  /**
   * 新規セッション開始
   * Clean Architecture: Use Case実装
   */
  const handleStartSession = useCallback(async (
    className: string,
    sourceLang: string,
    targetLang: string
  ) => {
    console.log('[SessionControl] Starting session:', { className, sourceLang, targetLang });

    // Guard: 重複開始防止
    if (isStartingPipeline) {
      console.warn('[SessionControl] Pipeline start already in progress');
      return;
    }

    if (pipeline.isRunning) {
      console.warn('[SessionControl] Pipeline already running');
      return;
    }

    setIsStartingPipeline(true);

    try {
      // Domain Model作成
      const config = new SessionConfiguration(className, sourceLang, targetLang);
      const newSession = {
        className: config.className,
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage
      };

      // State更新
      setActiveSession(newSession);
      setShowSetup(false);
      setIsPaused(false);
      recordingStartTimeRef.current = new Date();
      setRecordingTime(0);

      // 永続化
      sessionStorageService.saveLanguagePreferences({
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      });
      sessionStorageService.saveActiveSession(newSession);

      // Session Memory開始
      await sessionMemory.startSession(className, sourceLang, targetLang);

      // Window遷移
      await windowClient.enterMain();

      // Pipeline開始
      console.log('[SessionControl] Updating pipeline languages');
      pipeline.updateLanguages(sourceLang, targetLang);

      if (!pipeline.isRunning) {
        console.log('[SessionControl] Starting pipeline from microphone');
        await pipeline.startFromMicrophone();
        console.log('[SessionControl] ✅ Pipeline started successfully');
      }

      // IPC通信
      if (window.electron?.send) {
        window.electron.send('session-metadata-update', config.toMetadata());
        console.log('[SessionControl] Session metadata sent to main process');
      }

      // Callback実行
      onSessionStart?.(className, sourceLang, targetLang);

      console.log('[SessionControl] Session started successfully');

    } catch (error) {
      console.error('[SessionControl] Failed to start pipeline:', error);

      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      alert(`音声認識の開始に失敗しました。\n\nエラー: ${errorMessage}`);

      // Rollback
      setActiveSession(null);
      setShowSetup(true);
      sessionStorageService.clearActiveSession();

    } finally {
      setIsStartingPipeline(false);
    }
  }, [pipeline, isStartingPipeline, sessionMemory, onSessionStart]);

  /**
   * セッション再開
   * Clean Architecture: Use Case実装
   */
  const handleResumeSession = useCallback(async (className: string) => {
    console.log('[SessionControl] Resuming latest session for class:', className);

    // Guard: 重複開始防止
    if (isStartingPipeline) {
      console.warn('[SessionControl] Pipeline start already in progress');
      return;
    }

    if (pipeline.isRunning) {
      console.warn('[SessionControl] Pipeline already running');
      return;
    }

    setIsStartingPipeline(true);

    try {
      if (!window.electron?.invoke) {
        throw new Error('IPC not available');
      }

      // 最新セッション取得
      const availableSessions = await window.electron.invoke('get-available-sessions', {
        courseName: className,
        limit: 1
      });

      if (!availableSessions || availableSessions.length === 0) {
        alert(`${className}の過去のセッションが見つかりませんでした。`);
        return;
      }

      const latestCourse = availableSessions[0];
      const latestSession = latestCourse.sessions[0];

      // セッションデータ読込
      const sessionData = await window.electron.invoke('load-session', {
        courseName: className,
        dateStr: latestSession.date,
        sessionNumber: latestSession.sessionNumber
      });

      if (!sessionData) {
        throw new Error('No session data found');
      }

      console.log('[SessionControl] Session data loaded:', sessionData);

      // Session復元
      const config = new SessionConfiguration(
        sessionData.state.className,
        sessionData.state.sourceLanguage,
        sessionData.state.targetLanguage
      );

      const newSession = {
        className: config.className,
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage
      };

      // State更新
      setActiveSession(newSession);
      setShowSetup(false);
      setIsPaused(false);

      // 録音時間復元
      if (sessionData.state.duration) {
        const durationInSeconds = Math.floor(sessionData.state.duration / 1000);
        setRecordingTime(durationInSeconds);
        recordingStartTimeRef.current = new Date(Date.now() - sessionData.state.duration);
      }

      // データ復元（履歴、要約、メモ）
      if (sessionData.history?.length > 0) {
        sessionData.history.forEach((translation: any) => {
          sessionMemory.addTranslation(translation);
        });
      }

      if (sessionData.summaries?.length > 0) {
        sessionData.summaries.forEach((summary: any) => {
          sessionMemory.addSummary(summary);
        });
      }

      if (sessionData.memos?.length > 0) {
        sessionMemory.updateMemos(sessionData.memos);
      }

      // 永続化
      sessionStorageService.saveLanguagePreferences({
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage
      });
      sessionStorageService.saveActiveSession(newSession);

      // Session Memory再開
      await sessionMemory.resumeSession();

      // Window遷移
      await windowClient.enterMain();

      // Pipeline開始
      pipeline.updateLanguages(config.sourceLanguage, config.targetLanguage);

      if (!pipeline.isRunning) {
        await pipeline.startFromMicrophone();
        console.log('[SessionControl] ✅ Pipeline started for resumed session');
      }

      // IPC通信
      if (window.electron?.send) {
        window.electron.send('session-metadata-update', {
          ...config.toMetadata(),
          isResumed: true,
          sessionNumber: latestSession.sessionNumber
        });
      }

      // Callback実行
      onSessionResume?.(className);

      console.log('[SessionControl] Session resumed successfully');

    } catch (error) {
      console.error('[SessionControl] Failed to resume session:', error);

      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      alert(`セッションの再開に失敗しました。\n\nエラー: ${errorMessage}`);

      setActiveSession(null);
      setShowSetup(true);

    } finally {
      setIsStartingPipeline(false);
    }
  }, [pipeline, isStartingPipeline, sessionMemory, onSessionResume]);

  /**
   * セッション終了
   */
  const endSession = useCallback(async () => {
    console.log('[SessionControl] Ending session');

    if (activeSession) {
      try {
        // Pipeline停止
        await pipeline.stop();

        // Session Memory完了
        await sessionMemory.completeSession();

        // State更新
        setPreviousSession({
          ...activeSession,
          timestamp: Date.now()
        });
        setActiveSession(null);
        setShowSetup(true);
        setIsPaused(false);
        setRecordingTime(0);
        recordingStartTimeRef.current = null;

        // 永続化クリア
        sessionStorageService.clearActiveSession();

        // Callback実行
        onSessionEnd?.();

        console.log('[SessionControl] Session ended successfully');

      } catch (error) {
        console.error('[SessionControl] Error ending session:', error);
      }
    }
  }, [activeSession, pipeline, sessionMemory, onSessionEnd]);

  /**
   * 次のクラスへ移動
   */
  const nextClass = useCallback(() => {
    console.log('[SessionControl] Moving to next class');
    endSession();
  }, [endSession]);

  /**
   * 一時停止トグル
   */
  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const newState = !prev;
      console.log('[SessionControl] Pause toggled:', newState);

      // TODO: Implement pause/resume in pipeline
      // Currently pause/resume is not implemented in useUnifiedPipeline
      // This will need to be added to the pipeline interface
      /*
      if (pipeline.isRunning) {
        if (newState) {
          pipeline.pause();
        } else {
          pipeline.resume();
        }
      }
      */

      return newState;
    });
  }, []);

  return {
    // State
    activeSession,
    previousSession,
    isStartingPipeline,
    isPaused,
    recordingTime,
    showSetup,

    // Actions
    handleStartSession,
    handleResumeSession,
    endSession,
    nextClass,
    togglePause,

    // Refs
    recordingStartTimeRef
  };
}