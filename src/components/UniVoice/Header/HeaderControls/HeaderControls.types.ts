/**
 * HeaderControls コンポーネントの型定義
 * Clean Architecture: Presentation Layer - Component Interface
 */

import { CSSProperties } from 'react';

/**
 * ヘッダーコントロールの表示状態
 */
export interface HeaderControlsState {
  showHeader: boolean;
  showSettings: boolean;
  isAlwaysOnTop: boolean;
}

/**
 * ヘッダーコントロールのイベントハンドラー
 */
export interface HeaderControlsHandlers {
  onExpandClick: () => void;
  onCollapseClick: () => void;
  onAlwaysOnTopToggle: () => Promise<void>;
  onClose: () => Promise<void>;
}

/**
 * テーマ関連のプロパティ
 */
export interface HeaderControlsTheme {
  getThemeClass: (baseClass: string, isActive?: boolean) => string;
  currentTheme: 'light' | 'dark' | 'purple';
}

/**
 * HeaderControlsコンポーネントのプロパティ
 */
export interface HeaderControlsProps extends 
  HeaderControlsState, 
  HeaderControlsHandlers,
  HeaderControlsTheme {
  /**
   * カスタムスタイル（オプション）
   */
  style?: CSSProperties;
  
  /**
   * カスタムクラス名（オプション）
   */
  className?: string;
}

/**
 * ボタンの設定情報
 */
export interface ButtonConfig {
  id: string;
  tooltip: string;
  isActive?: boolean;
  isVisible?: boolean; // ボタンの表示/非表示を制御
  onClick: () => void | Promise<void>;
  icon: JSX.Element;
  ariaLabel: string;
}