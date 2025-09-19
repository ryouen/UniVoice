/**
 * ControlsSection Component
 * Clean Architecture: Presentation Layer
 * 責任: 設定とコントロールの管理
 */

import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import styles from './ControlsSection.module.css';

export interface ControlsSectionProps {
  // Display State
  isVisible: boolean;
  currentTheme: 'light' | 'dark' | 'purple';
  displayMode: 'both' | 'source' | 'target';
  fontScale: number;
  sourceLanguage: string;
  targetLanguage: string;

  // Event Handlers
  onThemeChange: (theme: 'light' | 'dark' | 'purple') => void;
  onDisplayModeChange: (mode: 'both' | 'source' | 'target') => void;
  onFontScaleChange: (scale: number) => void;
  onSourceLanguageChange: (language: string) => void;
  onTargetLanguageChange: (language: string) => void;
  onToggleVisibility: () => void;
}

// Language options
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'multi', label: 'Auto-detect' }
];

// Font scale limits
const MIN_FONT_SCALE = 0.5;
const MAX_FONT_SCALE = 2.0;
const FONT_SCALE_STEP = 0.1;

export const ControlsSection: React.FC<ControlsSectionProps> = ({
  isVisible,
  currentTheme,
  displayMode,
  fontScale,
  sourceLanguage,
  targetLanguage,
  onThemeChange,
  onDisplayModeChange,
  onFontScaleChange,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onToggleVisibility
}) => {
  // Responsive detection
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkCompact = () => {
      const match = window.matchMedia('(max-width: 768px)');
      setIsCompact(match.matches);
    };

    checkCompact();
    window.addEventListener('resize', checkCompact);
    return () => window.removeEventListener('resize', checkCompact);
  }, []);

  // Font scale handlers
  const handleFontScaleIncrease = useCallback(() => {
    const newScale = Math.min(fontScale + FONT_SCALE_STEP, MAX_FONT_SCALE);
    onFontScaleChange(Math.round(newScale * 10) / 10);
  }, [fontScale, onFontScaleChange]);

  const handleFontScaleDecrease = useCallback(() => {
    const newScale = Math.max(fontScale - FONT_SCALE_STEP, MIN_FONT_SCALE);
    onFontScaleChange(Math.round(newScale * 10) / 10);
  }, [fontScale, onFontScaleChange]);

  const handleFontScaleReset = useCallback(() => {
    onFontScaleChange(1);
  }, [onFontScaleChange]);

  // Language swap handler
  const handleSwapLanguages = useCallback(() => {
    onSourceLanguageChange(targetLanguage);
    onTargetLanguageChange(sourceLanguage);
  }, [sourceLanguage, targetLanguage, onSourceLanguageChange, onTargetLanguageChange]);

  const themeClass = `theme${currentTheme.charAt(0).toUpperCase()}${currentTheme.slice(1)}`;

  return (
    <div
      className={classNames(
        styles.controlsSection,
        styles[themeClass],
        { [styles.compact]: isCompact }
      )}
      role="region"
      aria-label="Controls and settings"
    >
      {/* Toggle Button */}
      <button
        className={styles.toggleButton}
        onClick={onToggleVisibility}
        data-testid="toggle-controls-button"
        aria-label={isVisible ? 'Hide controls' : 'Show controls'}
        aria-expanded={isVisible}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
          <path d="M10 3.5v-2m0 17v-2m6.5-6.5h2m-17 0h2m12.02-4.52l1.41-1.41M4.93 15.07l1.41-1.41m0-7.32L4.93 4.93m11.14 11.14l1.41 1.41"/>
        </svg>
        <span className={styles.toggleLabel}>Settings</span>
      </button>

      {/* Controls Content */}
      {isVisible && (
        <div className={styles.controlsContent} data-testid="controls-content">
          {/* Theme Selection */}
          <div
            className={styles.controlGroup}
            role="group"
            aria-label="Theme selection"
          >
            <label className={styles.controlLabel}>Theme</label>
            <div className={styles.buttonGroup}>
              <button
                className={classNames(
                  styles.themeButton,
                  { [styles.active]: currentTheme === 'light' }
                )}
                onClick={() => onThemeChange('light')}
                aria-label="Light theme"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="3"/>
                  <path d="M8 0v2m0 12v2m8-8h-2M2 8H0m11.3-5.3l-1.4 1.4M4.1 11.9l-1.4 1.4m0-8.5l1.4 1.4m7.2 7.2l1.4 1.4"/>
                </svg>
                Light
              </button>
              <button
                className={classNames(
                  styles.themeButton,
                  { [styles.active]: currentTheme === 'dark' }
                )}
                onClick={() => onThemeChange('dark')}
                aria-label="Dark theme"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6 0.278a8.001 8.001 0 1 0 7.723 7.723c-.572.183-1.189.278-1.834.278-3.48 0-6.302-2.821-6.302-6.302 0-.645.095-1.262.278-1.834A7.053 7.053 0 0 0 6 .278z"/>
                </svg>
                Dark
              </button>
              <button
                className={classNames(
                  styles.themeButton,
                  { [styles.active]: currentTheme === 'purple' }
                )}
                onClick={() => onThemeChange('purple')}
                aria-label="Purple theme"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="8" opacity="0.3"/>
                  <circle cx="8" cy="8" r="5"/>
                </svg>
                Purple
              </button>
            </div>
          </div>

          {/* Display Mode */}
          <div
            className={styles.controlGroup}
            role="group"
            aria-label="Display mode"
          >
            <label className={styles.controlLabel}>Display</label>
            <div className={styles.buttonGroup}>
              <button
                className={classNames(
                  styles.modeButton,
                  { [styles.active]: displayMode === 'both' }
                )}
                onClick={() => onDisplayModeChange('both')}
                aria-label="Both languages"
              >
                Both
              </button>
              <button
                className={classNames(
                  styles.modeButton,
                  { [styles.active]: displayMode === 'source' }
                )}
                onClick={() => onDisplayModeChange('source')}
                aria-label="Source only"
              >
                Source Only
              </button>
              <button
                className={classNames(
                  styles.modeButton,
                  { [styles.active]: displayMode === 'target' }
                )}
                onClick={() => onDisplayModeChange('target')}
                aria-label="Target only"
              >
                Target Only
              </button>
            </div>
          </div>

          {/* Font Scale */}
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Font Size</label>
            <div className={styles.fontScaleControl}>
              <button
                className={styles.scaleButton}
                onClick={handleFontScaleDecrease}
                disabled={fontScale <= MIN_FONT_SCALE}
                data-testid="font-scale-decrease"
                aria-label="Decrease font size"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M2 7h10"/>
                </svg>
              </button>
              <span className={styles.scaleValue}>
                {Math.round(fontScale * 100)}%
              </span>
              <button
                className={styles.scaleButton}
                onClick={handleFontScaleIncrease}
                disabled={fontScale >= MAX_FONT_SCALE}
                data-testid="font-scale-increase"
                aria-label="Increase font size"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M7 2v10M2 7h10"/>
                </svg>
              </button>
              {fontScale !== 1 && (
                <button
                  className={styles.resetButton}
                  onClick={handleFontScaleReset}
                  data-testid="font-scale-reset"
                  aria-label="Reset font size"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Language Selection */}
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Languages</label>
            <div className={styles.languageControl}>
              <div className={styles.languageSelect}>
                <label htmlFor="source-language" className={styles.srOnly}>
                  Source language
                </label>
                <select
                  id="source-language"
                  value={sourceLanguage}
                  onChange={(e) => onSourceLanguageChange(e.target.value)}
                  className={styles.selectInput}
                  aria-label="Source language"
                >
                  {LANGUAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className={styles.swapButton}
                onClick={handleSwapLanguages}
                data-testid="swap-languages-button"
                aria-label="Swap languages"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M0 4h12l-4-4m4 4l-4 4m4 4H4l4-4m-4 4l4 4"/>
                </svg>
              </button>

              <div className={styles.languageSelect}>
                <label htmlFor="target-language" className={styles.srOnly}>
                  Target language
                </label>
                <select
                  id="target-language"
                  value={targetLanguage}
                  onChange={(e) => onTargetLanguageChange(e.target.value)}
                  className={styles.selectInput}
                  aria-label="Target language"
                >
                  {LANGUAGE_OPTIONS.filter(opt => opt.value !== 'multi').map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Keyboard Shortcuts</label>
            <div className={styles.shortcutsList}>
              <div className={styles.shortcut}>
                <kbd>Space</kbd> Pause/Resume
              </div>
              <div className={styles.shortcut}>
                <kbd>Esc</kbd> End Session
              </div>
              <div className={styles.shortcut}>
                <kbd>Ctrl+S</kbd> Toggle Settings
              </div>
              <div className={styles.shortcut}>
                <kbd>Ctrl+T</kbd> Change Theme
              </div>
              <div className={styles.shortcut}>
                <kbd>Ctrl+D</kbd> Change Display Mode
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};