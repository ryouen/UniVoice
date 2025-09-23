/**
 * WindowContainer - ウィンドウコンテナコンポーネント
 * 
 * Clean Architecture:
 * - Presentation層の共通コンポーネント
 * - Glassmorphism効果を持つウィンドウコンテナ
 */

import React from 'react';
import classNames from 'classnames';
import styles from './WindowContainer.module.css';

export interface WindowContainerProps {
  /**
   * 現在のテーマ
   */
  theme: 'light' | 'dark' | 'purple';
  
  /**
   * 子要素
   */
  children: React.ReactNode;
  
  /**
   * 追加のクラス名
   */
  className?: string;
  
  /**
   * フォントスケール（CSS変数として設定）
   */
  fontScale?: number;
}

/**
 * Glassmorphism効果を持つウィンドウコンテナ
 * 
 * 使用例:
 * ```tsx
 * <WindowContainer theme="dark" fontScale={1.2}>
 *   <WindowHeader />
 *   <WindowContent />
 * </WindowContainer>
 * ```
 */
export const WindowContainer: React.FC<WindowContainerProps> = ({
  theme,
  children,
  className,
  fontScale = 1
}) => {
  // フォントスケールのCSS変数設定
  React.useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', fontScale.toString());
  }, [fontScale]);

  const getContainerClass = () => {
    const themeSuffix = theme.charAt(0).toUpperCase() + theme.slice(1);
    return classNames(
      styles.windowContainer,
      styles.glassmorphism,
      styles[`window${themeSuffix}`],
      className
    );
  };

  return (
    <div className={getContainerClass()}>
      {children}
    </div>
  );
};