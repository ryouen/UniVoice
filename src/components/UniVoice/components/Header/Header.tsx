/**
 * Header Component
 * Clean Architecture: Presentation Layer
 * 責任: ヘッダー表示とコントロールボタンの管理
 */

import React from 'react';
import classNames from 'classnames';
import styles from './Header.module.css';

export interface HeaderProps {
  // Display State
  className?: string;
  recordingTime: number;
  isPaused: boolean;
  isAlwaysOnTop: boolean;
  showSettings: boolean;
  showHistoryPanel: boolean;
  showProgressiveSummary: boolean;
  showQuestionSection: boolean;
  memoCount: number;
  autoSaveTime: Date | null;

  // Event Handlers
  onPause: () => void;
  onEndSession: () => void;
  onNextClass: () => void;
  onToggleHistory: () => void;
  onToggleSummary: () => void;
  onToggleQuestion: () => void;
  onToggleSettings: () => void;
  onToggleAlwaysOnTop: (state: boolean) => Promise<void> | void;
}

/**
 * 時間フォーマット関数
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const Header: React.FC<HeaderProps> = ({
  className,
  recordingTime,
  isPaused,
  isAlwaysOnTop,
  showSettings,
  showHistoryPanel,
  showProgressiveSummary,
  showQuestionSection,
  memoCount,
  autoSaveTime,
  onPause,
  onEndSession,
  onNextClass,
  onToggleHistory,
  onToggleSummary,
  onToggleQuestion,
  onToggleSettings,
  onToggleAlwaysOnTop
}) => {
  const handleAlwaysOnTop = async () => {
    const newState = !isAlwaysOnTop;
    const windowAPI = window.univoice?.window;

    if (windowAPI?.setAlwaysOnTop) {
      await windowAPI.setAlwaysOnTop(newState);
    }

    await onToggleAlwaysOnTop(newState);
  };

  return (
    <div
      className={classNames(styles.header, className)}
    >
      {/* ドラッグ可能領域 - ボタン以外の領域をドラッグ可能に */}
      <div className={styles.dragHandle} />
      
      {/* 録音インジケーター */}
      <div className={styles.recordingIndicator}>
        <div
          data-testid="recording-indicator"
          className={classNames(
            styles.recordingDot,
            { [styles.paused]: isPaused }
          )}
        />
        <span className={styles.recordingTime}>
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* 制御ボタン群 */}
      <div className={styles.controlButtons}>
        {/* 一時停止ボタン */}
        <button
          className={styles.controlButton}
          onClick={onPause}
          aria-label={isPaused ? '再開' : '一時停止'}
        >
          {isPaused ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2 L4 14 L12 8 Z"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 3v10h3V3H5zm5 0v10h3V3h-3z"/>
            </svg>
          )}
          <span className={styles.tooltip}>
            {isPaused ? '再開' : '一時停止'}
          </span>
        </button>

        {/* 授業終了ボタン */}
        <button
          className={styles.controlButton}
          onClick={onEndSession}
          aria-label="授業終了"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="2" width="10" height="10" rx="1"/>
          </svg>
          <span className={styles.tooltip}>授業終了</span>
        </button>

        {/* 次の授業へボタン */}
        <button
          className={styles.controlButton}
          onClick={onNextClass}
          aria-label="次の授業へ"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7h8m0 0L7 3m4 4L7 11"/>
          </svg>
          <span className={styles.tooltip}>次の授業へ</span>
        </button>
      </div>

      {/* 自動保存インジケーター */}
      {autoSaveTime && (
        <span className={styles.autoSaveIndicator}>
          ✓ 自動保存済み
        </span>
      )}

      {/* 中央の機能ボタン群 */}
      <div className={styles.centerButtons}>
        {/* 履歴ボタン */}
        <button
          data-testid="history-button"
          className={classNames(
            styles.controlButton,
            { [styles.active]: showHistoryPanel }
          )}
          onClick={onToggleHistory}
          aria-label="履歴"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="12" height="10" rx="1"/>
            <line x1="6" y1="7" x2="12" y2="7"/>
            <line x1="6" y1="10" x2="12" y2="10"/>
          </svg>
          <span className={styles.tooltip}>履歴</span>
        </button>

        {/* 要約ボタン */}
        <button
          data-testid="summary-button"
          className={classNames(
            styles.controlButton,
            { [styles.active]: showProgressiveSummary }
          )}
          onClick={onToggleSummary}
          aria-label="要約"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="10" width="3" height="5" fill="currentColor" opacity="0.3"/>
            <rect x="8" y="7" width="3" height="8" fill="currentColor" opacity="0.5"/>
            <rect x="13" y="4" width="3" height="11" fill="currentColor" opacity="0.7"/>
          </svg>
          <span className={styles.tooltip}>要約</span>
        </button>

        {/* 質問ボタン */}
        <button
          data-testid="question-button"
          className={classNames(
            styles.controlButton,
            { [styles.active]: showQuestionSection }
          )}
          onClick={onToggleQuestion}
          aria-label="質問"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 12 L3 7 Q3 4 6 4 L12 4 Q15 4 15 7 L15 12 L10 12 L6 15 L6 12 Z"/>
          </svg>
          <span className={styles.tooltip}>質問</span>
          {memoCount > 0 && (
            <span className={styles.badge}>
              {memoCount}
            </span>
          )}
        </button>
      </div>

      {/* 右側の設定ボタン群 */}
      <div className={styles.rightButtons}>
        {/* 設定ボタン */}
        <button
          data-testid="settings-button"
          className={styles.controlButton}
          onClick={onToggleSettings}
          aria-label="設定"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
            <path d="M10 3.5v-2m0 17v-2m6.5-6.5h2m-17 0h2m12.02-4.52l1.41-1.41M4.93 15.07l1.41-1.41m0-7.32L4.93 4.93m11.14 11.14l1.41 1.41"/>
          </svg>
          <span className={styles.tooltip}>設定</span>
        </button>

        {/* 最前面固定ボタン */}
        <button
          data-testid="always-on-top-button"
          className={classNames(
            styles.controlButton,
            { [styles.active]: isAlwaysOnTop }
          )}
          onClick={handleAlwaysOnTop}
          aria-label={isAlwaysOnTop ? '最前面固定を解除' : '最前面に固定'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 18 18"
            fill={isAlwaysOnTop ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M7 3 L11 3 L11 9 L13 11 L9 15 L5 11 L7 9 Z"
              fill={isAlwaysOnTop ? "currentColor" : "none"}
              opacity={isAlwaysOnTop ? "0.3" : "1"}
            />
            <line x1="9" y1="15" x2="9" y2="18"/>
          </svg>
          <span className={styles.tooltip}>
            {isAlwaysOnTop ? '最前面固定を解除' : '最前面に固定'}
          </span>
        </button>
      </div>
    </div>
  );
};