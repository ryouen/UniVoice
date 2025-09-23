/**
 * DisplayModeButtons - 表示モード切り替えボタン群
 * 
 * Clean Architecture:
 * - Presentation層の共通コンポーネント
 * - 表示モード（両方/原文のみ/翻訳のみ）の切り替え
 */

import React from 'react';
import classNames from 'classnames';
import { BaseButton } from './BaseButton';
import styles from './DisplayModeButtons.module.css';

export interface DisplayModeButtonsProps {
  /**
   * 現在の表示モード
   */
  mode: 'both' | 'source' | 'target';
  
  /**
   * 表示モード変更時のコールバック
   */
  onModeChange: (mode: 'both' | 'source' | 'target') => void;
  
  /**
   * 現在のテーマ
   */
  theme: 'light' | 'dark' | 'purple';
  
  /**
   * 追加のクラス名
   */
  className?: string;
}

/**
 * 表示モード切り替えボタン群
 */
export const DisplayModeButtons: React.FC<DisplayModeButtonsProps> = ({
  mode,
  onModeChange,
  theme,
  className
}) => {
  return (
    <div className={classNames(styles.buttonGroup, className)}>
      {/* 両方表示ボタン */}
      <BaseButton
        theme={theme}
        active={mode === 'both'}
        onClick={() => onModeChange('both')}
        title="両方表示 (Alt+B)"
      >
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
          <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
        </svg>
      </BaseButton>
      
      {/* 原文のみボタン */}
      <BaseButton
        theme={theme}
        active={mode === 'source'}
        onClick={() => onModeChange('source')}
        title="原文のみ (Alt+S)"
      >
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
          <rect x="10" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
        </svg>
      </BaseButton>
      
      {/* 翻訳のみボタン */}
      <BaseButton
        theme={theme}
        active={mode === 'target'}
        onClick={() => onModeChange('target')}
        title="翻訳のみ (Alt+T)"
      >
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <rect x="1" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
          <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
        </svg>
      </BaseButton>
    </div>
  );
};