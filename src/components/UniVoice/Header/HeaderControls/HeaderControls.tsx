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
          width="16"
          height="16"
          viewBox="0 0 16 16" 
          fill={isAlwaysOnTop ? "currentColor" : "none"} 
          stroke="currentColor" 
          strokeWidth={isAlwaysOnTop ? "2" : "1.5"}
        >
          <path 
            d="M6 2 L10 2 L10 8 L12 10 L8 14 L4 10 L6 8 Z" 
            fill={isAlwaysOnTop ? "currentColor" : "none"} 
            opacity={isAlwaysOnTop ? "1" : "0.8"}
          />
          <line x1="8" y1="14" x2="8" y2="16" opacity={isAlwaysOnTop ? "0.5" : "1"}/>
          {isAlwaysOnTop && (
            <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity="0.8"/>
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
          width="16"
          height="16"
          viewBox="0 0 16 16" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5"
        >
          <rect x="2" y="2" width="12" height="12" rx="1"/>
          <path d="M5 6 L8 9 L11 6" strokeLinecap="round"/>
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
          width="16"
          height="16"
          viewBox="0 0 16 16" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5"
        >
          <rect x="2" y="2" width="12" height="12" rx="1"/>
          <path d="M5 9 L8 6 L11 9" strokeLinecap="round"/>
        </svg>
      )
    },
    // 閉じるボタン
    {
      id: 'close',
      tooltip: tooltips.close,
      onClick: onClose,
      ariaLabel: tooltips.close,
      icon: (
        <svg 
          className={styles.icon} 
          width="14"
          height="14"
          viewBox="0 0 14 14" 
          fill="currentColor"
        >
          <path d="M4 4 L10 10 M10 4 L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
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
          return <div key={`spacer-${index}`} className={styles.spacer} style={{ width: 'var(--group-gap)' }} />;
        }

        // isVisibleがfalseの場合は、スペースを保持するために透明なボタンを表示
        return (
          <button
            key={button.id}
            className={classNames(
              getThemeClass('button'),
              styles.button,
              button.isActive && styles.buttonActive
            )}
            onClick={() => {
              console.log(`[HeaderControls] Button clicked: ${button.id}`);
              button.onClick();
            }}
            aria-label={button.ariaLabel}
            type="button"
            style={{
              visibility: button.isVisible === false ? 'hidden' : 'visible',
              width: '36px',
              height: '36px',
              ...(button.id === 'close' && { marginLeft: 'calc(var(--group-gap) - var(--button-gap))' })
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