import React, { useMemo } from 'react';
import classNames from 'classnames';
import styles from './HeaderControls.module.css';
import { HeaderControlsProps, ButtonConfig } from './HeaderControls.types';

/**
 * HeaderControls コンポーネント
 * 
 * ヘッダーの右側に配置されるコントロールボタン群を管理します。
 * SPEC-HEADER-REFACTOR-20250915.md の仕様に基づいて実装。
 * 
 * Clean Architecture: Presentation Layer - UI Component
 */
export const HeaderControls: React.FC<HeaderControlsProps> = ({
  showHeader,
  showSettings,
  isAlwaysOnTop,
  onExpandClick,
  onCollapseClick,
  onAlwaysOnTopToggle,
  onClose,
  getThemeClass,
  currentTheme,
  style,
  className
}) => {
  // ツールチップテキストの動的生成
  const tooltips = useMemo(() => ({
    expand: !showHeader ? 'ヘッダーを展開' : '設定バーを開く',
    collapse: showSettings ? '設定バーを閉じる' : 'ヘッダーを最小化',
    alwaysOnTop: isAlwaysOnTop ? '最前面固定を解除' : '最前面に固定',
    close: '閉じる'
  }), [showHeader, showSettings, isAlwaysOnTop]);

  // ボタンの表示条件
  const shouldShowExpandButton = !(showHeader && showSettings);
  const shouldShowCollapseButton = showHeader || showSettings;

  // ボタン設定の配列（レンダリング順序を制御）
  const buttons: (ButtonConfig | null)[] = useMemo(() => [
    // 最前面固定ボタン
    {
      id: 'alwaysOnTop',
      tooltip: tooltips.alwaysOnTop,
      isActive: isAlwaysOnTop,
      onClick: onAlwaysOnTopToggle,
      ariaLabel: tooltips.alwaysOnTop,
      icon: (
        <svg 
          className={styles.icon} 
          viewBox="0 0 18 18" 
          fill={isAlwaysOnTop ? "currentColor" : "none"} 
          stroke="currentColor" 
          strokeWidth={isAlwaysOnTop ? "2" : "1.5"}
        >
          <path 
            d="M7 3 L11 3 L11 9 L13 11 L9 15 L5 11 L7 9 Z" 
            fill={isAlwaysOnTop ? "currentColor" : "none"} 
            opacity={isAlwaysOnTop ? "1" : "0.8"}
          />
          <line x1="9" y1="15" x2="9" y2="18" opacity={isAlwaysOnTop ? "0.5" : "1"}/>
          {isAlwaysOnTop && (
            <circle cx="9" cy="9" r="1.5" fill="currentColor" opacity="0.8"/>
          )}
        </svg>
      )
    },
    // 展開ボタン (▼) - 固定スロット
    {
      id: 'expand',
      tooltip: tooltips.expand,
      onClick: onExpandClick,
      ariaLabel: tooltips.expand,
      isVisible: shouldShowExpandButton,  // 表示条件を追加
      icon: (
        <svg 
          className={styles.icon} 
          viewBox="0 0 18 18" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="12" height="12" rx="1"/>
          <path d="M6 7 L9 10 L12 7" strokeLinecap="round"/>
        </svg>
      )
    },
    // 折りたたみボタン (▲) - 固定スロット
    {
      id: 'collapse',
      tooltip: tooltips.collapse,
      onClick: onCollapseClick,
      ariaLabel: tooltips.collapse,
      isVisible: shouldShowCollapseButton,  // 表示条件を追加
      icon: (
        <svg 
          className={styles.icon} 
          viewBox="0 0 18 18" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="12" height="12" rx="1"/>
          <path d="M6 10 L9 7 L12 10" strokeLinecap="round"/>
        </svg>
      )
    },
    // スペーサー（null で表現）
    null,
    // 閉じるボタン
    {
      id: 'close',
      tooltip: tooltips.close,
      onClick: onClose,
      ariaLabel: tooltips.close,
      icon: (
        <svg 
          className={styles.icon} 
          viewBox="0 0 16 16" 
          fill="currentColor"
        >
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      )
    }
  ], [
    isAlwaysOnTop,
    shouldShowExpandButton,
    shouldShowCollapseButton,
    tooltips,
    onAlwaysOnTopToggle,
    onExpandClick,
    onCollapseClick,
    onClose
  ]);

  return (
    <div 
      className={classNames(
        styles.container,
        styles[currentTheme],
        className
      )}
      style={{
        position: 'absolute',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        ...style
      }}
    >
      {buttons.map((button, index) => {
        // スペーサーの処理
        if (!button) {
          return <div key={`spacer-${index}`} className={styles.spacer} />;
        }

        // isVisibleがfalseの場合は、スペースを保持するために透明なボタンを表示
        return (
          <button
            key={button.id}
            className={classNames(
              getThemeClass('controlButton'),
              styles.button,
              button.isActive && styles.buttonActive
            )}
            onClick={button.onClick}
            aria-label={button.ariaLabel}
            type="button"
            style={{
              visibility: button.isVisible === false ? 'hidden' : 'visible'
            }}
            disabled={button.isVisible === false}
          >
            {button.icon}
            <span className={styles.tooltip}>
              {button.tooltip}
            </span>
          </button>
        );
      })}
    </div>
  );
};

HeaderControls.displayName = 'HeaderControls';