/**
 * HistorySection - 履歴表示セクション
 * 
 * 責任:
 * - 履歴ブロックの表示
 * - リサイズ機能
 * - クリックでモーダル表示
 * - 空状態の処理
 * 
 * Clean Architecture:
 * - UIロジックのみ（プレゼンテーション層）
 * - FlexibleHistoryDisplayを再利用
 * - イベント通知は親コンポーネントへ
 */

import React from 'react';
import { FlexibleHistoryDisplay } from '../../../../../components/FlexibleHistoryDisplay';
import type { HistoryBlock } from '../../../../../utils/FlexibleHistoryGrouper';
import { ResizeHandle } from '../../../common';
import { EmptyState } from './EmptyState';

export interface HistorySectionProps {
  /**
   * 履歴ブロックデータ
   */
  historyBlocks: HistoryBlock[];
  
  /**
   * セクションの高さ（vh単位）
   */
  height: number;
  
  /**
   * 拡大状態かどうか
   */
  isExpanded?: boolean;
  
  /**
   * セクションクリック時のハンドラー
   */
  onClick?: (event: React.MouseEvent) => void;
  
  /**
   * リサイズハンドラー
   */
  onResize?: (e: React.MouseEvent) => void;
  
  /**
   * 履歴ブロッククリック時のハンドラー
   */
  onBlockClick?: (block: HistoryBlock) => void;
  
  /**
   * 空状態のメッセージ
   */
  emptyMessage?: string;
  
  /**
   * リサイズ可能かどうか
   */
  resizable?: boolean;
  
  /**
   * カスタムスタイル
   */
  style?: React.CSSProperties;
}

/**
 * 履歴表示セクション
 */
export const HistorySection: React.FC<HistorySectionProps> = ({
  historyBlocks,
  height,
  isExpanded = false,
  onClick,
  onResize,
  onBlockClick,
  emptyMessage = '履歴が表示されます',
  resizable = true,
  style = {}
}) => {
  // セクションのスタイルを計算
  const getSectionStyle = (): React.CSSProperties => {
    let actualHeight = height;
    
    // 拡大/縮小状態の処理
    if (isExpanded) {
      actualHeight = 60; // 拡大時
    } else if (isExpanded === false && height > 40) {
      // 履歴セクションの高さを最大40vhに制限
      actualHeight = 40;
    }
    
    return {
      height: `${actualHeight}vh`,
      transition: 'height 0.3s ease',
      display: 'flex',
      background: 'white',
      borderBottom: '1px solid #ddd',
      cursor: 'pointer',
      position: 'relative',
      ...style
    };
  };
  
  // クリックハンドラー（リサイズハンドルとテキスト選択を除外）
  const handleClick = (event: React.MouseEvent) => {
    // テキスト選択中はクリックイベントを無視
    if (window.getSelection()?.toString()) return;
    
    // リサイズハンドルのクリックは無視
    const target = event.target as HTMLElement;
    if (target.classList.contains('resize-handle')) return;
    
    onClick?.(event);
  };
  
  return (
    <div 
      onClick={handleClick}
      style={getSectionStyle()}
      className="history-section"
    >
      {/* リサイズハンドル */}
      {resizable && onResize && (
        <ResizeHandle
          direction="vertical"
          position="bottom"
          onMouseDown={onResize}
        />
      )}
      
      {/* 履歴コンテンツ */}
      <div style={{ 
        width: '100%', 
        height: '100%', 
        overflowY: 'auto', 
        padding: '15px 20px'
      }}>
        {historyBlocks.length > 0 ? (
          <FlexibleHistoryDisplay 
            historyBlocks={historyBlocks}
            onBlockClick={(block) => {
              console.log('[HistorySection] Block clicked:', block.id);
              onBlockClick?.(block);
            }}
          />
        ) : (
          <EmptyState message={emptyMessage} />
        )}
      </div>
    </div>
  );
};