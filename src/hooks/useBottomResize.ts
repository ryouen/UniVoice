/**
 * Bottom Resize Handle Hook
 * Clean Architecture: Application Layer
 *
 * フレームレスウィンドウのボトムリサイズハンドル機能を提供
 * 2025-09-19 新規作成
 * 2025-09-19 Clean Architecture準拠に修正
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseBottomResizeProps {
  realtimeHeight: number;
  onHeightChange: (height: number) => void;
  minHeight?: number;
  isActive?: boolean;
  onHeightPersist?: (height: number) => void; // Clean Architecture: 永続化は外部から注入
}

interface UseBottomResizeReturn {
  isResizing: boolean;
  resizeHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
}

export const useBottomResize = ({
  realtimeHeight,
  onHeightChange,
  minHeight = 200,
  isActive = true,
  onHeightPersist
}: UseBottomResizeProps): UseBottomResizeReturn => {
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  /**
   * マウスダウン時の処理
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive) return;

    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = realtimeHeight;

    // カーソルと選択状態の管理（Clean Architecture: 将来的にCSS Modulesへ移行）
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    console.log('[useBottomResize] Resize started:', {
      startY: e.clientY,
      startHeight: realtimeHeight
    });
  }, [realtimeHeight, isActive]);

  /**
   * マウス移動時の処理
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    // 前のアニメーションフレームをキャンセル
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // requestAnimationFrameでスムーズな更新
    animationFrameRef.current = requestAnimationFrame(() => {
      const deltaY = startYRef.current - e.clientY;  // 上にドラッグでプラス、下にドラッグでマイナス
      const newHeight = Math.max(
        minHeight,
        startHeightRef.current + deltaY  // 最大高さ制限なし
      );

      // 5px以上の変化のみ適用（パフォーマンス最適化）
      if (Math.abs(newHeight - realtimeHeight) > 5) {
        onHeightChange(newHeight);

        console.log('[useBottomResize] Height updated:', {
          deltaY,
          oldHeight: realtimeHeight,
          newHeight
        });
      }
    });
  }, [isResizing, realtimeHeight, onHeightChange, minHeight]);

  /**
   * マウスアップ時の処理
   */
  const handleMouseUp = useCallback(() => {
    if (!isResizing) return;

    setIsResizing(false);

    // カーソルとユーザー選択を元に戻す
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    // アニメーションフレームをクリーンアップ
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // 永続化は外部に委譲（Clean Architecture）
    if (onHeightPersist) {
      onHeightPersist(realtimeHeight);
    }

    console.log('[useBottomResize] Resize ended:', {
      finalHeight: realtimeHeight
    });
  }, [isResizing, realtimeHeight, onHeightPersist]);

  /**
   * グローバルイベントリスナーの設定
   */
  useEffect(() => {
    if (!isResizing) return;

    // グローバルでマウスイベントを監視（ウィンドウ外でも追跡）
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // マウスがウィンドウを離れた場合も終了
    window.addEventListener('mouseleave', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  /**
   * コンポーネントアンマウント時のクリーンアップ
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, []);

  return {
    isResizing,
    resizeHandleProps: {
      onMouseDown: handleMouseDown,
      style: {
        cursor: 'ns-resize',
        WebkitAppRegion: 'no-drag' as any,  // Electronのドラッグ領域から除外
      }
    }
  };
};