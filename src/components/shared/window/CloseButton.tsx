/**
 * CloseButton - ウィンドウ閉じるボタン
 * 
 * Clean Architecture:
 * - Presentation層の共通コンポーネント
 * - Chrome タブスタイルの閉じるボタン
 */

import React from 'react';
import { BaseButton } from './BaseButton';

export interface CloseButtonProps {
  /**
   * 現在のテーマ
   */
  theme: 'light' | 'dark' | 'purple';
  
  /**
   * クリック時のコールバック
   */
  onClick: () => void;
  
  /**
   * ボタンサイズ
   */
  size?: 'default' | 'small' | 'large';
  
  /**
   * タイトル（ツールチップ）
   */
  title?: string;
}

/**
 * ウィンドウ閉じるボタン
 */
export const CloseButton: React.FC<CloseButtonProps> = ({
  theme,
  onClick,
  size = 'default',
  title = "閉じる (Esc)"
}) => {
  return (
    <BaseButton
      theme={theme}
      size={size}
      onClick={onClick}
      title={title}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" fill="currentColor" fillOpacity="0.1"/>
        <path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </BaseButton>
  );
};