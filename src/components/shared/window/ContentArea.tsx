/**
 * ContentArea - ウィンドウコンテンツエリアコンポーネント
 * 
 * テーマに応じた背景色を適用するコンテンツエリア
 */

import React from 'react';
import classNames from 'classnames';
import styles from './ContentArea.module.css';

export interface ContentAreaProps {
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
}

/**
 * テーマ対応のコンテンツエリア
 */
export const ContentArea: React.FC<ContentAreaProps> = ({
  theme,
  children,
  className
}) => {
  const getContentClass = () => {
    const themeSuffix = theme.charAt(0).toUpperCase() + theme.slice(1);
    return classNames(
      styles.contentArea,
      styles[`contentArea${themeSuffix}`],
      className
    );
  };

  return (
    <div className={getContentClass()}>
      {children}
    </div>
  );
};