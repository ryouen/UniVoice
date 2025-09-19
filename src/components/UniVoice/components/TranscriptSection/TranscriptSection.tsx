/**
 * TranscriptSection Component
 * Clean Architecture: Presentation Layer
 * 責任: リアルタイム文字起こし・翻訳の表示
 */

import React from 'react';
import classNames from 'classnames';
import styles from './TranscriptSection.module.css';

export interface DisplayContent {
  oldest?: string;
  older?: string;
  recent?: string;
}

export interface DisplayOpacity {
  oldest?: number;
  older?: number;
  recent?: number;
}

export interface TranscriptSectionProps {
  // Display State
  isRunning: boolean;
  displayContent: {
    original: DisplayContent;
    translation: DisplayContent;
  };
  displayOpacity: {
    original: DisplayOpacity;
    translation: DisplayOpacity;
  };

  // Display Options
  theme?: 'light' | 'dark' | 'purple';
  fontScale?: number;
  displayMode?: 'both' | 'source' | 'target';
  volumeLevel?: number;
  debug?: boolean;
  className?: string;
}

// テーマ別の色定義
const THEME_COLORS = {
  light: {
    source: '#333',
    target: '#0044cc',
    divider: '#333333'
  },
  dark: {
    source: '#ffffff',
    target: '#ffffff',
    divider: '#e0e0e0'
  },
  purple: {
    source: '#ffffff',
    target: '#ffffff',
    divider: '#e0e0e0'
  }
};

/**
 * TranscriptSection Component
 * リアルタイムトランスクリプト表示セクション
 */
export const TranscriptSection: React.FC<TranscriptSectionProps> = ({
  isRunning,
  displayContent,
  displayOpacity,
  theme = 'light',
  fontScale = 1,
  displayMode = 'both',
  volumeLevel = 0,
  debug = false,
  className
}) => {
  // テーマに応じた色を取得
  const colors = THEME_COLORS[theme];

  // デバッグログ
  React.useEffect(() => {
    if (debug) {
      console.log('[TranscriptSection] Props received:', {
        hasDisplayContent: !!displayContent,
        displayContentKeys: displayContent ? Object.keys(displayContent) : [],
        originalKeys: displayContent?.original ? Object.keys(displayContent.original) : [],
        translationKeys: displayContent?.translation ? Object.keys(displayContent.translation) : [],
        theme,
        displayMode,
        fontScale
      });
    }
  }, [displayContent, debug, theme, displayMode, fontScale]);

  // 3段階表示があるかチェック
  const hasThreeLineContent = displayContent &&
    (displayContent.original.oldest || displayContent.original.older || displayContent.original.recent ||
     displayContent.translation.oldest || displayContent.translation.older || displayContent.translation.recent);

  // グリッドカラム設定
  const gridTemplateColumns = displayMode === 'both' ? '1fr 1px 1fr' : '1fr';

  return (
    <div
      className={classNames(styles.transcriptSection, className)}
      data-testid="transcript-section"
      aria-label="Real-time transcript"
      role="region"
    >
      {hasThreeLineContent ? (
        /* 3段階表示モード - CSS Gridで左右の高さを自動同期 */
        <div
          className={styles.threeLineGrid}
          data-testid="three-line-grid"
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(3, auto)',
            gridTemplateColumns,
            gap: `${6 * fontScale}px 0`
          }}
        >
          {/* Oldest行 */}
          {displayMode !== 'target' && (
            <div
              className={classNames(styles.gridCell, styles.oldest)}
              style={{
                opacity: displayOpacity?.original?.oldest || 0.3,
                fontSize: `${20 * fontScale}px`,
                color: colors.source,
                minHeight: displayContent?.original?.oldest ? 'auto' : '32px'
              }}
            >
              {displayContent?.original?.oldest || ''}
            </div>
          )}

          {/* 中央の仕切り線 */}
          {displayMode === 'both' && (
            <div
              className={styles.divider}
              style={{ background: colors.divider }}
            />
          )}

          {displayMode !== 'source' && (
            <div
              className={classNames(styles.gridCell, styles.oldest)}
              style={{
                gridColumn: displayMode === 'both' ? 3 : 1,
                opacity: displayOpacity?.translation?.oldest || 0.3,
                fontSize: `${20 * fontScale}px`,
                color: colors.target,
                minHeight: displayContent?.translation?.oldest ? 'auto' : '32px'
              }}
            >
              {displayContent?.translation?.oldest || ''}
            </div>
          )}

          {/* Older行 */}
          {displayMode !== 'target' && (
            <div
              className={classNames(styles.gridCell, styles.older)}
              style={{
                opacity: displayOpacity?.original?.older || 0.6,
                fontSize: `${20 * fontScale}px`,
                color: colors.source,
                minHeight: displayContent?.original?.older ? 'auto' : '32px'
              }}
            >
              {displayContent?.original?.older || ''}
            </div>
          )}

          {displayMode !== 'source' && (
            <div
              className={classNames(styles.gridCell, styles.older)}
              style={{
                gridColumn: displayMode === 'both' ? 3 : 1,
                opacity: displayOpacity?.translation?.older || 0.6,
                fontSize: `${20 * fontScale}px`,
                color: colors.target,
                minHeight: displayContent?.translation?.older ? 'auto' : '32px'
              }}
            >
              {displayContent?.translation?.older || ''}
            </div>
          )}

          {/* Recent行 */}
          {displayMode !== 'target' && (
            <div
              className={classNames(styles.gridCell, styles.recent)}
              style={{
                opacity: displayOpacity?.original?.recent || 1,
                fontSize: `${20 * fontScale}px`,
                color: colors.source,
                minHeight: displayContent?.original?.recent ? 'auto' : '32px'
              }}
            >
              {displayContent?.original?.recent || ''}
            </div>
          )}

          {displayMode !== 'source' && (
            <div
              className={classNames(styles.gridCell, styles.recent)}
              style={{
                gridColumn: displayMode === 'both' ? 3 : 1,
                opacity: displayOpacity?.translation?.recent || 1,
                fontSize: `${20 * fontScale}px`,
                color: colors.target,
                minHeight: displayContent?.translation?.recent ? 'auto' : '32px'
              }}
            >
              {displayContent?.translation?.recent || ''}
            </div>
          )}
        </div>
      ) : (
        /* 空の状態 */
        <div className={styles.emptyState}>
          <div className={styles.emptyMessage}>
            {isRunning ? 'Waiting for speech...' : 'Ready to start'}
          </div>
        </div>
      )}

      {/* 音声レベルインジケーター */}
      {volumeLevel > 0 && (
        <div
          className={styles.volumeIndicator}
          data-testid="volume-indicator"
        >
          <div
            className={styles.volumeBar}
            style={{
              width: `${volumeLevel * 100}%`,
              background: isRunning ? '#4CAF50' : '#999'
            }}
          />
        </div>
      )}
    </div>
  );
};