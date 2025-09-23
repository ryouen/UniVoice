/**
 * FontSizeButtons - フォントサイズ調整ボタン群
 * 
 * Clean Architecture:
 * - Presentation層の共通コンポーネント
 * - フォントサイズの拡大/縮小/リセット
 */

import React from 'react';
import classNames from 'classnames';
import { BaseButton } from './BaseButton';
import styles from './FontSizeButtons.module.css';

export interface FontSizeButtonsProps {
  /**
   * 現在のフォントスケール
   */
  fontScale: number;
  
  /**
   * フォントスケール変更時のコールバック
   */
  onFontScaleChange: (scale: number) => void;
  
  /**
   * 現在のテーマ
   */
  theme: 'light' | 'dark' | 'purple';
  
  /**
   * 追加のクラス名
   */
  className?: string;
  
  /**
   * 最小スケール値（デフォルト: 0.7）
   */
  minScale?: number;
  
  /**
   * 最大スケール値（デフォルト: 2.0）
   */
  maxScale?: number;
  
  /**
   * スケール変更の倍率（デフォルト: 1.1）
   */
  scaleStep?: number;
}

/**
 * フォントサイズ調整ボタン群
 */
export const FontSizeButtons: React.FC<FontSizeButtonsProps> = ({
  fontScale,
  onFontScaleChange,
  theme,
  className,
  minScale = 0.7,
  maxScale = 2.0,
  scaleStep = 1.1
}) => {
  const changeFontScale = (direction: -1 | 0 | 1) => {
    let newScale = fontScale;
    
    switch (direction) {
      case 0:
        // リセット
        newScale = 1;
        break;
      case 1:
        // 拡大
        newScale = Math.min(maxScale, fontScale * scaleStep);
        break;
      case -1:
        // 縮小
        newScale = Math.max(minScale, fontScale / scaleStep);
        break;
    }
    
    onFontScaleChange(newScale);
  };

  return (
    <div className={classNames(styles.buttonGroup, className)}>
      {/* 縮小ボタン */}
      <BaseButton
        theme={theme}
        onClick={() => changeFontScale(-1)}
        title="文字を小さく (Ctrl+-)"
        disabled={fontScale <= minScale}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </BaseButton>
      
      {/* リセットボタン */}
      <BaseButton
        theme={theme}
        onClick={() => changeFontScale(0)}
        title="リセット (Ctrl+0)"
      >
        <span style={{ fontSize: '14px', fontWeight: 600 }}>T</span>
      </BaseButton>
      
      {/* 拡大ボタン */}
      <BaseButton
        theme={theme}
        onClick={() => changeFontScale(1)}
        title="文字を大きく (Ctrl++)"
        disabled={fontScale >= maxScale}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 4 L9 14 M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </BaseButton>
    </div>
  );
};