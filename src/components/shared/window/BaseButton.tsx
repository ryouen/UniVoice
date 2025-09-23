/**
 * BaseButton - 基本ボタンコンポーネント
 * 
 * Clean Architecture:
 * - Presentation層の基底コンポーネント
 * - デザイントークンを使用した統一的なボタンスタイル
 */

import React from 'react';
import classNames from 'classnames';
import styles from './BaseButton.module.css';

export interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 現在のテーマ
   */
  theme: 'light' | 'dark' | 'purple';
  
  /**
   * アクティブ状態かどうか
   */
  active?: boolean;
  
  /**
   * ボタンサイズ（デフォルトは --button-size）
   */
  size?: 'default' | 'small' | 'large';
  
  /**
   * 子要素
   */
  children: React.ReactNode;
}

/**
 * 基本ボタンコンポーネント
 * 
 * デザイントークンを使用した統一的なボタンスタイルを提供
 */
export const BaseButton: React.FC<BaseButtonProps> = ({
  theme,
  active = false,
  size = 'default',
  className,
  children,
  style,
  ...props
}) => {
  const getButtonClass = () => {
    const themeSuffix = theme.charAt(0).toUpperCase() + theme.slice(1);
    return classNames(
      styles.button,
      styles[`button${themeSuffix}`],
      active && styles.active,
      size !== 'default' && styles[`size-${size}`],
      className
    );
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return '32px';
      case 'large':
        return '48px';
      default:
        return 'var(--button-size)';
    }
  };

  return (
    <button
      className={getButtonClass()}
      style={{
        width: getButtonSize(),
        height: getButtonSize(),
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
};