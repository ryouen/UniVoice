/**
 * ThemeButton - テーマ切り替えボタン
 * 
 * Clean Architecture:
 * - Presentation層の共通コンポーネント
 * - Light/Dark/Purple テーマの循環切り替え
 */

import React from 'react';
import { BaseButton } from './BaseButton';

export interface ThemeButtonProps {
  /**
   * 現在のテーマ
   */
  theme: 'light' | 'dark' | 'purple';
  
  /**
   * テーマ変更時のコールバック
   */
  onThemeChange: (theme: 'light' | 'dark' | 'purple') => void;
  
  /**
   * ボタンサイズ
   */
  size?: 'default' | 'small' | 'large';
}

/**
 * テーマ切り替えボタン
 */
export const ThemeButton: React.FC<ThemeButtonProps> = ({
  theme,
  onThemeChange,
  size = 'default'
}) => {
  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'purple'> = ['light', 'dark', 'purple'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    onThemeChange(nextTheme);
  };

  return (
    <BaseButton
      theme={theme}
      size={size}
      onClick={cycleTheme}
      title="テーマ切り替え"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M8 2 A6 6 0 0 1 8 14 A3 3 0 0 0 8 2" fill="currentColor"/>
      </svg>
    </BaseButton>
  );
};