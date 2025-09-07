/**
 * useResize - リサイズ機能のカスタムフック
 * 
 * 責任:
 * - リサイズ状態の管理
 * - マウスイベントの処理
 * - サイズ変更の計算
 * 
 * Clean Architecture:
 * - UIロジックの抽象化
 * - 再利用可能な状態管理
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseResizeOptions {
  /**
   * 最小サイズ（vh or vw）
   */
  minSize?: number;
  
  /**
   * 最大サイズ（vh or vw）
   */
  maxSize?: number;
  
  /**
   * リサイズ方向
   */
  direction?: 'horizontal' | 'vertical';
  
  /**
   * サイズ変更時のコールバック
   */
  onResize?: (newSize: number) => void;
}

export interface UseResizeReturn {
  /**
   * リサイズ中かどうか
   */
  isResizing: boolean;
  
  /**
   * リサイズ開始ハンドラー
   */
  handleMouseDown: (e: React.MouseEvent) => void;
  
  /**
   * 現在のサイズ
   */
  size: number;
  
  /**
   * サイズを設定
   */
  setSize: (size: number) => void;
}

/**
 * リサイズ機能を提供するカスタムフック
 */
export const useResize = (
  initialSize: number,
  options: UseResizeOptions = {}
): UseResizeReturn => {
  const {
    minSize = 10,
    maxSize = 60,
    direction = 'vertical',
    onResize
  } = options;
  
  const [size, setSize] = useState(initialSize);
  const [isResizing, setIsResizing] = useState(false);
  const [startPosition, setStartPosition] = useState(0);
  const [startSize, setStartSize] = useState(0);
  
  // リサイズ開始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartPosition(direction === 'vertical' ? e.clientY : e.clientX);
    setStartSize(size);
  }, [size, direction]);
  
  // リサイズ中の処理
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentPosition = direction === 'vertical' ? e.clientY : e.clientX;
      const delta = currentPosition - startPosition;
      
      // ビューポートのサイズを取得
      const viewportSize = direction === 'vertical' 
        ? window.innerHeight 
        : window.innerWidth;
      
      // deltaをvh/vwに変換
      const deltaInViewportUnits = (delta / viewportSize) * 100;
      
      // 新しいサイズを計算（制限付き）
      const newSize = Math.max(
        minSize,
        Math.min(maxSize, startSize + deltaInViewportUnits)
      );
      
      setSize(newSize);
      onResize?.(newSize);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    // イベントリスナーの登録
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // カーソルスタイルの設定
    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.cursor = direction === 'vertical' ? 'ns-resize' : 'ew-resize';
    document.body.style.userSelect = 'none';
    
    // クリーンアップ
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
    };
  }, [isResizing, startPosition, startSize, direction, minSize, maxSize, onResize]);
  
  return {
    isResizing,
    handleMouseDown,
    size,
    setSize
  };
};