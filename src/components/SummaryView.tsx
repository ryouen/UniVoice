/**
 * SummaryView - Summary Window のラッパーコンポーネント
 * 
 * ElectronのIPCから要約データと設定を受け取り、
 * SummaryWindowコンポーネントに渡す
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SummaryWindow } from '../windows/SummaryWindow';
import { convertToProgressiveSummaryData, type ProgressiveSummaryData } from '../types/summary-window.types';

const SummaryView: React.FC = () => {
  // 要約データ
  const [summaryData, setSummaryData] = useState<ProgressiveSummaryData[]>([]);
  
  // 設定
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'purple'>('light');
  const [fontScale, setFontScale] = useState(1);
  const [displayMode, setDisplayMode] = useState<'both' | 'source' | 'target'>('both');

  // IPCから初期データを受信
  useEffect(() => {
    if (!window.electron) return;

    const handleSummaryWindowData = (_event: any, data: {
      summaries: any[];
      settings: {
        theme: string;
        fontScale: number;
        displayMode: string;
      }
    }) => {
      console.log('[SummaryView] Received summary window data:', data);
      
      // 要約データを変換
      if (data.summaries) {
        const converted = convertToProgressiveSummaryData(data.summaries);
        setSummaryData(converted);
      }

      // 設定を反映
      if (data.settings) {
        setCurrentTheme(data.settings.theme as 'light' | 'dark' | 'purple');
        setFontScale(data.settings.fontScale);
        setDisplayMode(data.settings.displayMode as 'both' | 'source' | 'target');
      }
    };

    // 設定更新を受信
    const handleSettingsUpdated = (_event: any, settings: {
      theme?: string;
      fontScale?: number;
      displayMode?: string;
    }) => {
      console.log('[SummaryView] Settings updated:', settings);
      
      if (settings.theme) {
        setCurrentTheme(settings.theme as 'light' | 'dark' | 'purple');
      }
      if (settings.fontScale !== undefined) {
        setFontScale(settings.fontScale);
      }
      if (settings.displayMode) {
        setDisplayMode(settings.displayMode as 'both' | 'source' | 'target');
      }
    };

    window.electron.on('summary-window-data', handleSummaryWindowData);
    window.electron.on('settings-updated', handleSettingsUpdated);

    return () => {
      window.electron?.removeListener('summary-window-data', handleSummaryWindowData);
      window.electron?.removeListener('settings-updated', handleSettingsUpdated);
    };
  }, []);

  // 設定変更をメインウィンドウに通知
  const notifySettingsChange = useCallback((type: string, value: any) => {
    if (window.electron?.send) {
      window.electron.send('settings-updated', {
        [type]: value
      });
    }
  }, []);

  // テーマ変更ハンドラー
  const handleThemeChange = useCallback((theme: string) => {
    setCurrentTheme(theme as 'light' | 'dark' | 'purple');
    notifySettingsChange('theme', theme);
  }, [notifySettingsChange]);

  // フォントサイズ変更ハンドラー
  const handleFontScaleChange = useCallback((scale: number) => {
    setFontScale(scale);
    notifySettingsChange('fontScale', scale);
  }, [notifySettingsChange]);

  // 表示モード変更ハンドラー
  const handleDisplayModeChange = useCallback((mode: string) => {
    setDisplayMode(mode as 'both' | 'source' | 'target');
    notifySettingsChange('displayMode', mode);
  }, [notifySettingsChange]);

  // ウィンドウを閉じる
  const handleClose = useCallback(async () => {
    try {
      await window.electron?.invoke('window:close');
    } catch (error) {
      console.error('[SummaryView] Failed to close window:', error);
    }
  }, []);

  return (
    <SummaryWindow
      summaryData={summaryData}
      currentTheme={currentTheme}
      fontScale={fontScale}
      displayMode={displayMode}
      onThemeChange={handleThemeChange}
      onFontScaleChange={handleFontScaleChange}
      onDisplayModeChange={handleDisplayModeChange}
      onClose={handleClose}
    />
  );
};

export default SummaryView;