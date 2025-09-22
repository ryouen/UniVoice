/**
 * SummaryWindow - プログレッシブ要約表示ウィンドウ
 * 
 * 実装計画書に基づいた要約専用ウィンドウ
 * メイン画面と同じ設定（テーマ、フォントサイズ、表示モード）を共有
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import classNames from 'classnames';
import type { SummaryWindowProps, ProgressiveSummaryData } from '../types/summary-window.types';
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

  // テーマ切り替えハンドラー
  const cycleTheme = useCallback(() => {
    const themes: Array<'light' | 'dark' | 'purple'> = ['light', 'dark', 'purple'];
    const currentIndex = themes.indexOf(internalTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
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
  }, [internalTheme, internalFontScale, internalDisplayMode, onThemeChange]);

  // フォントサイズ変更ハンドラー
  const changeFontScale = useCallback((direction: -1 | 0 | 1) => {
    let newScale = internalFontScale;
    
    switch (direction) {
      case 0:
        newScale = 1;
        break;
      case 1:
        newScale = Math.min(2.0, internalFontScale * 1.1);
        break;
      case -1:
        newScale = Math.max(0.7, internalFontScale * 0.9);
        break;
    }
    
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
  }, [internalTheme, internalDisplayMode, internalFontScale, onFontScaleChange]);

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
            changeFontScale(0);
            break;
          case '+':
          case '=':
            changeFontScale(1);
            break;
          case '-':
            changeFontScale(-1);
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
  }, [handleDisplayModeChange, changeFontScale, previousStage, nextStage, onClose]);

  // テーマクラスの取得
  const getThemeClass = useCallback((baseClass: string) => {
    return classNames(
      styles[baseClass],
      styles[`${baseClass}${internalTheme.charAt(0).toUpperCase() + internalTheme.slice(1)}`]
    );
  }, [internalTheme]);

  // フォントスケールのCSS変数設定
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', internalFontScale.toString());
  }, [internalFontScale]);
  
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
    <div className={classNames(styles.summaryWindow, styles.glassmorphism, getThemeClass('window'))}>
      {/* ヘッダーバー */}
      <div className={getThemeClass('headerBar')}>
        {/* 左側: 表示モードボタン群 + テーマボタン */}
        <div className={styles.leftSection} style={{paddingLeft: '20px'}}>
          {/* 表示モードグループ */}
          <div className={styles.displayModeGroup} style={{gap: '10px'}}>
            <button
              className={classNames(
                getThemeClass('modeButton'),
                internalDisplayMode === 'both' && styles.active
              )}
              onClick={() => handleDisplayModeChange('both')}
              title="両方表示 (Alt+B)"
              style={{width: '36px', height: '36px'}}
            >
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
              </svg>
            </button>
            
            <button
              className={classNames(
                getThemeClass('modeButton'),
                internalDisplayMode === 'source' && styles.active
              )}
              onClick={() => handleDisplayModeChange('source')}
              title="原文のみ (Alt+S)"
              style={{width: '36px', height: '36px'}}
            >
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
                <rect x="10" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
              </svg>
            </button>
            
            <button
              className={classNames(
                getThemeClass('modeButton'),
                internalDisplayMode === 'target' && styles.active
              )}
              onClick={() => handleDisplayModeChange('target')}
              title="翻訳のみ (Alt+T)"
              style={{width: '36px', height: '36px'}}
            >
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                <rect x="1" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
                <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
              </svg>
            </button>
          </div>

          {/* テーマボタン - メインウィンドウと同じ20pxスペース */}
          <button className={getThemeClass('themeButton')} onClick={cycleTheme} title="テーマ切り替え" style={{ marginLeft: '20px', width: '36px', height: '36px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M8 2 A6 6 0 0 1 8 14 A3 3 0 0 0 8 2" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* 中央: ナビゲーション */}
        <div className={styles.centerSection}>
          <button
            className={styles.navButton}
            onClick={previousStage}
            disabled={currentStageIndex === 0 || summaryData.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>
          
          <span className={styles.stageInfo}>
            {summaryData.length > 0 ? (
              `Summary ${currentStageIndex + 1}/${summaryData.length}`
            ) : (
              'Summary'
            )}
          </span>
          
          <button
            className={styles.navButton}
            onClick={nextStage}
            disabled={currentStageIndex === summaryData.length - 1 || summaryData.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>
        </div>

        {/* 右側: フォントサイズ + 閉じるボタン */}
        <div className={styles.rightSection}>
          {/* フォントサイズボタン群 */}
          <div className={styles.fontButtonGroup}>
            <button className={getThemeClass('fontButton')} onClick={() => changeFontScale(-1)} title="文字を小さく (Ctrl+-)" style={{width: '36px', height: '36px'}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            <button className={getThemeClass('fontButton')} onClick={() => changeFontScale(0)} title="リセット (Ctrl+0)" style={{width: '36px', height: '36px'}}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>T</span>
            </button>
            
            <button className={getThemeClass('fontButton')} onClick={() => changeFontScale(1)} title="文字を大きく (Ctrl++)" style={{width: '36px', height: '36px'}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4 L9 14 M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* 閉じるボタン - Chromeタブスタイル、56pxマージン */}
          <button className={getThemeClass('closeButton')} onClick={onClose} title="閉じる (Esc)" style={{ marginLeft: '56px', width: '36px', height: '36px' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" fill="currentColor" fillOpacity="0.1"/>
              <path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className={styles.contentArea}>
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
      </div>
    </div>
  );
};