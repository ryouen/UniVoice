/**
 * SummaryWindow - プログレッシブ要約表示ウィンドウ
 * 
 * 共通コンポーネントを使用してリファクタリング済み
 * メイン画面と同じ設定（テーマ、フォントサイズ、表示モード）を共有
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import classNames from 'classnames';
import type { SummaryWindowProps, ProgressiveSummaryData } from '../types/summary-window.types';
import {
  WindowContainer,
  WindowHeader,
  DisplayModeButtons,
  ThemeButton,
  FontSizeButtons,
  CloseButton,
  BaseButton,
  ContentArea
} from '../components/shared/window';
import styles from './SummaryWindow.module.css';

/**
 * 要約ウィンドウコンポーネント
 */
export const SummaryWindow: React.FC<SummaryWindowProps> = ({
  summaryData,
  currentTheme,
  fontScale,
  displayMode,
  onThemeChange,
  onFontScaleChange,
  onDisplayModeChange,
  onClose
}) => {
  // 内部状態（プロップスと同期）
  const [internalTheme, setInternalTheme] = useState(currentTheme);
  const [internalFontScale, setInternalFontScale] = useState(fontScale);
  const [internalDisplayMode, setInternalDisplayMode] = useState(displayMode);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // プロップスの変更を内部状態に反映
  useEffect(() => {
    setInternalTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    setInternalFontScale(fontScale);
  }, [fontScale]);

  useEffect(() => {
    setInternalDisplayMode(displayMode);
  }, [displayMode]);

  // 現在のステージのデータ（データがない場合でも空のステージを表示）
  const currentStage = useMemo(() => {
    if (summaryData.length > 0 && summaryData[currentStageIndex]) {
      return summaryData[currentStageIndex];
    }
    // 空のステージを返す
    return {
      stage: 1,
      wordCount: 0,
      sourceText: [],
      targetText: [],
      timestamp: Date.now(),
      isProcessing: false
    };
  }, [summaryData, currentStageIndex]);

  // 表示モード変更ハンドラー
  const handleDisplayModeChange = useCallback((mode: 'both' | 'source' | 'target') => {
    setInternalDisplayMode(mode);
    onDisplayModeChange(mode);
    
    // メインウィンドウに設定変更を通知
    if (window.electronAPI) {
      window.electronAPI.send('settings-updated', {
        theme: internalTheme,
        fontScale: internalFontScale,
        displayMode: mode
      });
    }
  }, [internalTheme, internalFontScale, onDisplayModeChange]);

  // テーマ変更ハンドラー
  const handleThemeChange = useCallback((nextTheme: 'light' | 'dark' | 'purple') => {
    setInternalTheme(nextTheme);
    onThemeChange(nextTheme);
    
    // メインウィンドウに設定変更を通知
    if (window.electronAPI) {
      window.electronAPI.send('settings-updated', {
        theme: nextTheme,
        fontScale: internalFontScale,
        displayMode: internalDisplayMode
      });
    }
  }, [internalFontScale, internalDisplayMode, onThemeChange]);

  // フォントサイズ変更ハンドラー
  const handleFontScaleChange = useCallback((newScale: number) => {
    setInternalFontScale(newScale);
    onFontScaleChange(newScale);
    
    // メインウィンドウに設定変更を通知
    if (window.electronAPI) {
      window.electronAPI.send('settings-updated', {
        theme: internalTheme,
        fontScale: newScale,
        displayMode: internalDisplayMode
      });
    }
  }, [internalTheme, internalDisplayMode, onFontScaleChange]);

  // ステージナビゲーション
  const previousStage = useCallback(() => {
    setCurrentStageIndex(prev => Math.max(0, prev - 1));
  }, []);

  const nextStage = useCallback(() => {
    setCurrentStageIndex(prev => Math.min(summaryData.length - 1, prev + 1));
  }, [summaryData.length]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+B/S/T: 表示モード
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            handleDisplayModeChange('source');
            break;
          case 'b':
            handleDisplayModeChange('both');
            break;
          case 't':
            handleDisplayModeChange('target');
            break;
        }
      }
      
      // Ctrl/Cmd+0/+/-: フォントサイズ
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '0':
            handleFontScaleChange(1);
            break;
          case '+':
          case '=':
            handleFontScaleChange(Math.min(2.0, internalFontScale * 1.1));
            break;
          case '-':
            handleFontScaleChange(Math.max(0.7, internalFontScale / 1.1));
            break;
        }
      }
      
      // 矢印キー: ナビゲーション
      switch (e.key) {
        case 'ArrowLeft':
          previousStage();
          break;
        case 'ArrowRight':
          nextStage();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleDisplayModeChange, handleFontScaleChange, internalFontScale, previousStage, nextStage, onClose]);


  
  // メインウィンドウからの設定変更を受信
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const cleanup = window.electronAPI.on('settings-updated', (_event: any, settings: {
      theme?: string;
      fontScale?: number;
      displayMode?: string;
    }) => {
      if (settings.theme && settings.theme !== internalTheme) {
        setInternalTheme(settings.theme as 'light' | 'dark' | 'purple');
      }
      if (settings.fontScale && settings.fontScale !== internalFontScale) {
        setInternalFontScale(settings.fontScale);
      }
      if (settings.displayMode && settings.displayMode !== internalDisplayMode) {
        setInternalDisplayMode(settings.displayMode as 'both' | 'source' | 'target');
      }
    });
    
    return cleanup;
  }, [internalTheme, internalFontScale, internalDisplayMode]);

  return (
    <WindowContainer theme={internalTheme} fontScale={internalFontScale} className={styles.summaryWindow}>
      <WindowHeader
        theme={internalTheme}
        leftSection={
          <div style={{display: 'flex', alignItems: 'center', gap: 'var(--button-gap)'}}>
            <DisplayModeButtons
              mode={internalDisplayMode}
              onModeChange={handleDisplayModeChange}
              theme={internalTheme}
            />
            {/* テーマボタン - 56pxグループ間隔 */}
            <div style={{ marginLeft: 'calc(var(--group-gap) - var(--button-gap))' }}>
              <ThemeButton
                theme={internalTheme}
                onThemeChange={handleThemeChange}
              />
            </div>
          </div>
        }

        centerSection={
          <div className={styles.centerSection}>
            <BaseButton
              theme={internalTheme}
              className={styles.buttonNav}
              onClick={previousStage}
              disabled={currentStageIndex === 0 || summaryData.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </BaseButton>
            
            <span className={styles.stageInfo}>
              {summaryData.length > 0 ? (
                `Summary ${currentStageIndex + 1}/${summaryData.length}`
              ) : (
                'Summary'
              )}
            </span>
            
            <BaseButton
              theme={internalTheme}
              className={styles.buttonNav}
              onClick={nextStage}
              disabled={currentStageIndex === summaryData.length - 1 || summaryData.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </BaseButton>
          </div>
        }

        rightSection={
          <div className={styles.rightSection}>
            {/* フォントサイズボタン群 */}
            <FontSizeButtons
              fontScale={internalFontScale}
              onFontScaleChange={handleFontScaleChange}
              theme={internalTheme}
            />

            {/* 閉じるボタン - Chromeタブスタイル、56pxマージン */}
            <div style={{ marginLeft: 'calc(var(--group-gap) - var(--button-gap))' }}>
              <CloseButton
                theme={internalTheme}
                onClick={onClose}
              />
            </div>
          </div>
        }
      />

      {/* メインコンテンツ */}
      <ContentArea theme={internalTheme}>
        <div className={classNames(
          styles.summaryContent,
          styles[`mode-${internalDisplayMode}`]
        )}>
          {/* 左側: ソーステキスト */}
          {internalDisplayMode !== 'target' && (
            <div className={styles.sourceColumn}>
              {currentStage.sourceText.length > 0 ? (
                currentStage.sourceText.map((paragraph, index) => (
                  <div key={index} className={styles.paragraph}>
                    {paragraph}
                  </div>
                ))
              ) : (
                <div className={styles.emptyColumn}>
                  <span>まだデータがありません</span>
                </div>
              )}
            </div>
          )}

          {/* 中央の区切り線 */}
          {internalDisplayMode === 'both' && (
            <div className={styles.divider} />
          )}

          {/* 右側: ターゲットテキスト */}
          {internalDisplayMode !== 'source' && (
            <div className={styles.targetColumn}>
              {currentStage.targetText.length > 0 ? (
                currentStage.targetText.map((paragraph, index) => (
                  <div key={index} className={styles.paragraph}>
                    {paragraph}
                  </div>
                ))
              ) : (
                <div className={styles.emptyColumn}>
                  <span>まだデータがありません</span>
                </div>
              )}
            </div>
          )}
        </div>
      </ContentArea>
    </WindowContainer>
  );
};