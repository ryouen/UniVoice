/**
 * Window Resize Management Hook
 * Clean Architecture: Application Layer
 * 
 * ウィンドウリサイズとセクション高さ管理を担当
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { LAYOUT_HEIGHTS, WINDOW_RESIZE_DEBOUNCE_MS } from '../constants/layout.constants';
import { ResizeMode } from '../types/univoice.types';

interface UseWindowResizeProps {
  activeSession: any | null;
  showHeader: boolean;
  showSettings: boolean;
  showQuestionSection: boolean;
}

interface UseWindowResizeReturn {
  realtimeSectionHeight: number;
  resizeMode: ResizeMode;
  isResizing: boolean;
  
  // Actions
  executeWindowResize: () => void;
  updateRealtimeSectionHeight: (height: number) => void;
  setResizeMode: (mode: ResizeMode) => void;
}

export const useWindowResize = ({
  activeSession,
  showHeader,
  showSettings,
  showQuestionSection
}: UseWindowResizeProps): UseWindowResizeReturn => {
  const [realtimeSectionHeight, setRealtimeSectionHeight] = useState<number>(LAYOUT_HEIGHTS.defaultRealtime);
  const [resizeMode, setResizeMode] = useState<ResizeMode>(ResizeMode.AUTOMATIC);
  const [isResizing, setIsResizing] = useState(false);
  
  const resizeDebounceRef = useRef<NodeJS.Timeout>();
  const lastAutomaticHeightRef = useRef<number>(LAYOUT_HEIGHTS.defaultRealtime);

  /**
   * 固定セクションの高さを計算
   */
  const calculateFixedSectionsHeight = useCallback(() => {
    let fixedHeight = 0;
    
    // ヘッダー部分
    if (showHeader) {
      fixedHeight += LAYOUT_HEIGHTS.header;
    } else {
      fixedHeight += LAYOUT_HEIGHTS.minimalControl;
    }
    
    // 設定バー
    if (showSettings) {
      fixedHeight += LAYOUT_HEIGHTS.settingsBar;
    }
    
    // 質問セクション
    if (showQuestionSection) {
      fixedHeight += LAYOUT_HEIGHTS.questionSection;
    }
    
    return fixedHeight;
  }, [showHeader, showSettings, showQuestionSection]);

  /**
   * ウィンドウリサイズ実行
   */
  const executeWindowResize = useCallback(() => {
    if (!activeSession || !window.univoice?.window?.getSize) return;
    
    clearTimeout(resizeDebounceRef.current);
    
    resizeDebounceRef.current = setTimeout(async () => {
      setIsResizing(true);
      
      try {
        const windowSize = await window.univoice!.window!.getSize();
        
        if (windowSize && typeof windowSize.height === 'number') {
          const fixedHeight = calculateFixedSectionsHeight();
          const newRealtimeHeight = Math.max(
            LAYOUT_HEIGHTS.minRealtime,
            windowSize.height - fixedHeight
          );
          
          if (resizeMode === ResizeMode.AUTOMATIC) {
            setRealtimeSectionHeight(newRealtimeHeight);
            lastAutomaticHeightRef.current = newRealtimeHeight;
            console.log('[useWindowResize] Auto-adjusted realtime height:', newRealtimeHeight);
          }
        }
      } catch (error) {
        console.error('[useWindowResize] Error getting window size:', error);
      } finally {
        setIsResizing(false);
      }
    }, WINDOW_RESIZE_DEBOUNCE_MS);
  }, [activeSession, calculateFixedSectionsHeight, resizeMode]);

  /**
   * リアルタイムセクションの高さを手動更新
   */
  const updateRealtimeSectionHeight = useCallback((height: number) => {
    const validHeight = Math.max(
      LAYOUT_HEIGHTS.minRealtime,
      height  // 最大高さ制限なし (2025-09-19仕様変更)
    );

    setRealtimeSectionHeight(validHeight);
    setResizeMode(ResizeMode.MANUAL);

    console.log('[useWindowResize] Manual height set:', validHeight);
  }, []);

  /**
   * セクション表示状態の変更を監視
   */
  useEffect(() => {
    if (!activeSession || resizeMode !== ResizeMode.AUTOMATIC) return;
    
    executeWindowResize();
  }, [showHeader, showSettings, showQuestionSection, activeSession, resizeMode, executeWindowResize]);

  /**
   * ウィンドウリサイズイベントを監視
   */
  useEffect(() => {
    if (!activeSession) return;
    
    const handleResize = () => {
      if (resizeMode === ResizeMode.AUTOMATIC) {
        executeWindowResize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // 初回実行
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeDebounceRef.current);
    };
  }, [activeSession, resizeMode, executeWindowResize]);

  /**
   * リサイズモード変更時の処理
   */
  useEffect(() => {
    if (resizeMode === ResizeMode.AUTOMATIC && lastAutomaticHeightRef.current) {
      setRealtimeSectionHeight(lastAutomaticHeightRef.current);
    }
  }, [resizeMode]);

  return {
    realtimeSectionHeight,
    resizeMode,
    isResizing,
    
    executeWindowResize,
    updateRealtimeSectionHeight,
    setResizeMode
  };
};