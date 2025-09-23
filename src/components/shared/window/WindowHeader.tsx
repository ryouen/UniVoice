/**
 * WindowHeader - 共通ウィンドウヘッダーコンポーネント
 * 
 * Clean Architecture:
 * - Presentation層の共通コンポーネント
 * - 合成パターン（Composition）で柔軟性を確保
 * - 各ウィンドウが独自のセンターセクションを提供
 */

import React from 'react';
import classNames from 'classnames';
import styles from './WindowHeader.module.css';

export interface WindowHeaderProps {
  /**
   * 現在のテーマ
   */
  theme: 'light' | 'dark' | 'purple';
  
  /**
   * 左側のコンテンツ（display mode buttons + theme button など）
   */
  leftSection?: React.ReactNode;
  
  /**
   * 中央のコンテンツ（各ウィンドウ固有）
   */
  centerSection?: React.ReactNode;
  
  /**
   * 右側のコンテンツ（font size buttons + close button など）
   */
  rightSection?: React.ReactNode;
  
  /**
   * ヘッダーの追加クラス名
   */
  className?: string;
  
  /**
   * ドラッグ可能かどうか
   */
  draggable?: boolean;
}

/**
 * 共通ウィンドウヘッダー
 * 
 * 使用例:
 * ```tsx
 * <WindowHeader
 *   theme="dark"
 *   leftSection={<DisplayModeButtons />}
 *   centerSection={<SearchBox />}
 *   rightSection={<FontControls />}
 * />
 * ```
 */
export const WindowHeader: React.FC<WindowHeaderProps> = ({
  theme,
  leftSection,
  centerSection,
  rightSection,
  className,
  draggable = true
}) => {
  const getThemeClass = () => {
    const themeSuffix = theme.charAt(0).toUpperCase() + theme.slice(1);
    return classNames(
      styles.headerBar,
      styles[`headerBar${themeSuffix}`]
    );
  };

  return (
    <div 
      className={classNames(getThemeClass(), className)}
      style={draggable ? { WebkitAppRegion: 'drag' } : undefined}
    >
      {/* 左側セクション */}
      {leftSection && (
        <div className={styles.leftSection}>
          {leftSection}
        </div>
      )}
      
      {/* 中央セクション */}
      {centerSection && (
        <div className={styles.centerSection}>
          {centerSection}
        </div>
      )}
      
      {/* 右側セクション */}
      {rightSection && (
        <div className={styles.rightSection}>
          {rightSection}
        </div>
      )}
    </div>
  );
};