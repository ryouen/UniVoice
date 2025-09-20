import { useState, useMemo, useCallback } from 'react';

/**
 * ヘッダーコントロールの状態と振る舞いを管理するカスタムフック
 * Clean Architecture原則に従い、UIロジックをコンポーネントから分離
 * 
 * 状態遷移:
 * 1. 標準 (showHeader=true, showSettings=false)
 * 2. 設定バー表示 (showHeader=true, showSettings=true)
 * 3. コンパクト表示 (showHeader=false)
 */
export const useHeaderControls = (
  initialShowHeader = true,
  initialShowSettings = true,
  initialIsAlwaysOnTop = false
) => {
  // 状態管理
  const [showHeader, setShowHeader] = useState(initialShowHeader);
  const [showSettings, setShowSettings] = useState(initialShowSettings);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(initialIsAlwaysOnTop);

  // 折りたたみボタン(▲)のハンドラー
  // コンテキスト依存: 設定バーが開いていれば閉じる、そうでなければヘッダーを最小化
  const handleCollapseClick = useCallback(() => {
    if (showSettings) {
      setShowSettings(false);
    } else {
      setShowHeader(false);
    }
  }, [showSettings]);

  // 展開ボタン(▼)のハンドラー
  // コンテキスト依存: ヘッダーが最小化されていれば展開、そうでなければ設定バーを開く
  const handleExpandClick = useCallback(() => {
    if (!showHeader) {
      setShowHeader(true);
    } else {
      setShowSettings(true);
    }
  }, [showHeader]);

  // ヘッダーの表示/非表示を切り替える（既存機能との互換性維持）
  const toggleHeader = useCallback(() => {
    setShowHeader(prev => !prev);
  }, []);

  // 最前面固定の切り替え
  const toggleAlwaysOnTop = useCallback(async () => {
    const newState = !isAlwaysOnTop;
    const windowAPI = window.univoice?.window;
    if (windowAPI?.setAlwaysOnTop) {
      await windowAPI.setAlwaysOnTop(newState);
      setIsAlwaysOnTop(newState);
    }
    return newState;
  }, [isAlwaysOnTop]);

  // 動的ツールチップテキスト
  const tooltips = useMemo(() => ({
    expand: !showHeader ? 'ヘッダーを展開' : '設定バーを開く',
    collapse: showSettings ? '設定バーを閉じる' : 'ヘッダーを最小化',
    alwaysOnTop: isAlwaysOnTop ? '最前面固定を解除' : '最前面に固定',
    close: '閉じる'
  }), [showHeader, showSettings, isAlwaysOnTop]);

  // 展開ボタンの表示条件
  const shouldShowExpandButton = useMemo(() => {
    // 仕様書4.3より：設定バー表示中は非表示
    return !(showHeader && showSettings);
  }, [showHeader, showSettings]);

  // 折りたたみボタンの表示条件
  const shouldShowCollapseButton = useMemo(() => {
    // 仕様書4.3より：常に表示（コンパクト表示中も表示される）
    return true;
  }, []);

  return {
    // 状態
    showHeader,
    showSettings,
    isAlwaysOnTop,
    
    // ハンドラー
    handleCollapseClick,
    handleExpandClick,
    toggleHeader,
    toggleAlwaysOnTop,
    setShowHeader,
    setShowSettings,
    
    // UI表示制御
    tooltips,
    shouldShowExpandButton,
    shouldShowCollapseButton,
  };
};

export type UseHeaderControlsReturn = ReturnType<typeof useHeaderControls>;