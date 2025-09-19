/**
 * Session Management Custom Hook
 * Clean Architecture: Application Layer
 * 
 * セッション管理に関する全てのロジックを集約
 */

import { useState, useCallback, useRef } from 'react';
import { sessionStorageService, SessionData } from '../services/SessionStorageService';
import { WindowClient } from '../services/WindowClient';
import type { UseUnifiedPipelineReturn } from './useUnifiedPipeline';
import type { UseSessionMemoryReturn } from './useSessionMemory';

interface UseSessionManagementProps {
  pipeline: UseUnifiedPipelineReturn;
  sessionMemory: UseSessionMemoryReturn;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}

interface UseSessionManagementReturn {
  // State
  activeSession: SessionData | null;
  isStartingPipeline: boolean;
  showSetup: boolean;
  
  // Actions
  startSession: (className: string, sourceLang: string, targetLang: string) => Promise<void>;
  resumeSession: (className: string) => Promise<void>;
  endSession: () => Promise<void>;
  nextClass: () => void;
  
  // UI Control
  setShowSetup: (show: boolean) => void;
}

export const useSessionManagement = ({
  pipeline,
  sessionMemory,
  onSessionStart,
  onSessionEnd
}: UseSessionManagementProps): UseSessionManagementReturn => {
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [isStartingPipeline, setIsStartingPipeline] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  
  const windowClient = useRef(WindowClient.getInstance());

  // セッション開始処理
  const startSession = useCallback(async (
    className: string, 
    sourceLang: string, 
    targetLang: string
  ) => {
    console.log('[useSessionManagement] Starting session:', { className, sourceLang, targetLang });
    
    if (isStartingPipeline || pipeline.isRunning) {
      console.warn('[useSessionManagement] Session already starting or running');
      return;
    }
    
    setIsStartingPipeline(true);
    
    try {
      // セッションデータを作成
      const newSession: SessionData = {
        className,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        timestamp: Date.now()
      };
      
      // 状態を更新
      setActiveSession(newSession);
      setShowSetup(false);
      
      // 永続化
      sessionStorageService.saveActiveSession(newSession);
      sessionStorageService.saveLanguagePreferences({
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      });
      
      // SessionMemoryサービスで新しいセッションを開始
      await sessionMemory.startSession(className, sourceLang, targetLang);
      
      // ウィンドウサイズ変更
      await windowClient.current.enterMain();
      
      // パイプライン開始
      pipeline.updateLanguages(sourceLang, targetLang);
      await pipeline.startFromMicrophone();
      
      // メタデータ送信
      if (window.electron?.send) {
        window.electron.send('session-metadata-update', newSession);
      }
      
      onSessionStart?.();
      console.log('[useSessionManagement] Session started successfully');
      
    } catch (error) {
      console.error('[useSessionManagement] Failed to start session:', error);
      
      // エラー時はロールバック
      setActiveSession(null);
      setShowSetup(true);
      sessionStorageService.clearActiveSession();
      
      throw error;
    } finally {
      setIsStartingPipeline(false);
    }
  }, [pipeline, sessionMemory, isStartingPipeline, onSessionStart]);

  // セッション再開処理
  const resumeSession = useCallback(async (className: string) => {
    console.log('[useSessionManagement] Resuming session for class:', className);
    
    try {
      // SessionMemoryから最新のセッションデータを取得
      const latestSession = await sessionMemory.getLatestSession(className);
      
      if (!latestSession) {
        console.warn('[useSessionManagement] No previous session found');
        return;
      }
      
      // 前回のセッションデータで開始
      await startSession(
        className,
        latestSession.sourceLanguage,
        latestSession.targetLanguage
      );
      
      // 履歴データを復元
      await sessionMemory.restoreSession(latestSession.id);
      
    } catch (error) {
      console.error('[useSessionManagement] Failed to resume session:', error);
      throw error;
    }
  }, [sessionMemory, startSession]);

  // セッション終了処理
  const endSession = useCallback(async () => {
    console.log('[useSessionManagement] Ending session');
    
    try {
      // パイプライン停止
      if (pipeline.isRunning) {
        await pipeline.stop();
      }
      
      // 終了通知
      if (window.electron?.send) {
        window.electron.send('session-end');
      }
      
      // 状態クリア
      pipeline.clearAll();
      setActiveSession(null);
      setShowSetup(true);
      sessionStorageService.clearActiveSession();
      
      // ウィンドウサイズリセット
      await windowClient.current.setBounds({ width: 600, height: 800 });
      
      onSessionEnd?.();
      
    } catch (error) {
      console.error('[useSessionManagement] Failed to end session:', error);
      throw error;
    }
  }, [pipeline, onSessionEnd]);

  // 次の授業へ
  const nextClass = useCallback(() => {
    console.log('[useSessionManagement] Moving to next class');
    endSession();
  }, [endSession]);

  return {
    // State
    activeSession,
    isStartingPipeline,
    showSetup,
    
    // Actions
    startSession,
    resumeSession,
    endSession,
    nextClass,
    
    // UI Control
    setShowSetup
  };
};