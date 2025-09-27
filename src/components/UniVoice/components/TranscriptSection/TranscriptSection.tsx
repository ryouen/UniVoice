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
    sourceText: DisplayContent;
    targetText: DisplayContent;
  };
  displayOpacity: {
    sourceText: DisplayOpacity;
    targetText: DisplayOpacity;
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
        originalKeys: displayContent?.sourceText ? Object.keys(displayContent.sourceText) : [],
        translationKeys: displayContent?.targetText ? Object.keys(displayContent.targetText) : [],
        theme,
        displayMode,
        fontScale
      });
    }
  }, [displayContent, debug, theme, displayMode, fontScale]);

  // 3段階表示があるかチェック
  const hasThreeLineContent = displayContent &&
    (displayContent.sourceText.oldest || displayContent.sourceText.older || displayContent.sourceText.recent ||
     displayContent.targetText.oldest || displayContent.targetText.older || displayContent.targetText.recent);

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
                opacity: displayOpacity?.sourceText?.oldest || 0.3,
                fontSize: `${20 * fontScale}px`,
                color: colors.source,
                minHeight: displayContent?.sourceText?.oldest ? 'auto' : '32px'
              }}
            >
              {displayContent?.sourceText?.oldest || ''}
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
                opacity: displayOpacity?.targetText?.oldest || 0.3,
                fontSize: `${20 * fontScale}px`,
                color: colors.target,
                minHeight: displayContent?.targetText?.oldest ? 'auto' : '32px'
              }}
            >
              {displayContent?.targetText?.oldest || ''}
            </div>
          )}

          {/* Older行 */}
          {displayMode !== 'target' && (
            <div
              className={classNames(styles.gridCell, styles.older)}
              style={{
                opacity: displayOpacity?.sourceText?.older || 0.6,
                fontSize: `${20 * fontScale}px`,
                color: colors.source,
                minHeight: displayContent?.sourceText?.older ? 'auto' : '32px'
              }}
            >
              {displayContent?.sourceText?.older || ''}
            </div>
          )}

          {displayMode !== 'source' && (
            <div
              className={classNames(styles.gridCell, styles.older)}
              style={{
                gridColumn: displayMode === 'both' ? 3 : 1,
                opacity: displayOpacity?.targetText?.older || 0.6,
                fontSize: `${20 * fontScale}px`,
                color: colors.target,
                minHeight: displayContent?.targetText?.older ? 'auto' : '32px'
              }}
            >
              {displayContent?.targetText?.older || ''}
            </div>
          )}

          {/* Recent行 */}
          {displayMode !== 'target' && (
            <div
              className={classNames(styles.gridCell, styles.recent)}
              style={{
                opacity: displayOpacity?.sourceText?.recent || 1,
                fontSize: `${20 * fontScale}px`,
                color: colors.source,
                minHeight: displayContent?.sourceText?.recent ? 'auto' : '32px'
              }}
            >
              {displayContent?.sourceText?.recent || ''}
            </div>
          )}

          {displayMode !== 'source' && (
            <div
              className={classNames(styles.gridCell, styles.recent)}
              style={{
                gridColumn: displayMode === 'both' ? 3 : 1,
                opacity: displayOpacity?.targetText?.recent || 1,
                fontSize: `${20 * fontScale}px`,
                color: colors.target,
                minHeight: displayContent?.targetText?.recent ? 'auto' : '32px'
              }}
            >
              {displayContent?.targetText?.recent || ''}
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