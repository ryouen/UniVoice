/**
 * ResizeHandle - 汎用リサイズハンドルコンポーネント
 * 
 * 責任:
 * - リサイズハンドルの表示
 * - マウスダウンイベントの処理
 * - カーソルスタイルの管理
 * 
 * Clean Architecture:
 * - 純粋なUIコンポーネント
 * - ビジネスロジックなし
 * - 再利用可能
 */

import React from 'react';

export interface ResizeHandleProps {
  /**
   * リサイズ方向
   */
  direction: 'horizontal' | 'vertical';
  
  /**
   * 配置位置
   */
  position: 'top' | 'bottom' | 'left' | 'right';
  
  /**
   * マウスダウンイベントハンドラー
   */
  onMouseDown: (e: React.MouseEvent) => void;
  
  /**
   * ハンドルの太さ（ピクセル）
   */
  thickness?: number;
  
  /**
   * カスタムスタイル
   */
  style?: React.CSSProperties;
  
  /**
   * CSSクラス名
   */
  className?: string;
}

/**
 * 汎用リサイズハンドル
 */
export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  direction,
  position,
  onMouseDown,
  thickness = 4,
  style = {},
  className = 'resize-handle'
}) => {
  // 方向と位置に基づいてスタイルを決定
  const getHandleStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      background: 'transparent',
      zIndex: 10,
      transition: 'background-color 0.2s ease'
    };
    
    if (direction === 'vertical') {
      // 垂直方向のリサイズ（上下）
      baseStyle.left = 0;
      baseStyle.right = 0;
      baseStyle.height = `${thickness}px`;
      baseStyle.cursor = 'ns-resize';
      
      if (position === 'top') {
        baseStyle.top = `-${thickness / 2}px`;
      } else {
        baseStyle.bottom = `-${thickness / 2}px`;
      }
    } else {
      // 水平方向のリサイズ（左右）
      baseStyle.top = 0;
      baseStyle.bottom = 0;
      baseStyle.width = `${thickness}px`;
      baseStyle.cursor = 'ew-resize';
      
      if (position === 'left') {
        baseStyle.left = `-${thickness / 2}px`;
      } else {
        baseStyle.right = `-${thickness / 2}px`;
      }
    }
    
    return { ...baseStyle, ...style };
  };
  
  return (
    <div
      className={className}
      onMouseDown={onMouseDown}
      style={getHandleStyle()}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    />
  );
};