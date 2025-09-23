import React, { useState } from 'react';
import { HistoryWindow } from '../windows/HistoryWindow';
import type { FullHistoryData } from '../types/history-window.types';

/**
 * HistoryView - 独立した履歴ウィンドウ用のラッパーコンポーネント
 *
 * 責務:
 * - HistoryWindowコンポーネントのラッパー
 * - 設定の管理（テーマ、フォントサイズ、表示モード）
 * - 独立ウィンドウとして動作
 */
const HistoryView: React.FC = () => {
  // ローカルストレージから設定を読み込み
  const [theme, setTheme] = useState<'light' | 'dark' | 'purple'>(
    (localStorage.getItem('theme') as 'light' | 'dark' | 'purple') || 'dark'
  );
  const [fontScale, setFontScale] = useState<number>(
    parseFloat(localStorage.getItem('fontScale') || '1')
  );
  const [displayMode, setDisplayMode] = useState<'both' | 'source' | 'target'>(
    (localStorage.getItem('displayMode') as 'both' | 'source' | 'target') || 'both'
  );

  // 設定変更ハンドラー
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'purple') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleFontScaleChange = (newScale: number) => {
    setFontScale(newScale);
    localStorage.setItem('fontScale', newScale.toString());
  };

  const handleDisplayModeChange = (newMode: 'both' | 'source' | 'target') => {
    setDisplayMode(newMode);
    localStorage.setItem('displayMode', newMode);
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <HistoryWindow
      currentTheme={theme}
      fontScale={fontScale}
      displayMode={displayMode}
      onThemeChange={handleThemeChange}
      onFontScaleChange={handleFontScaleChange}
      onDisplayModeChange={handleDisplayModeChange}
      onClose={handleClose}
    />
  );
};

export default HistoryView;