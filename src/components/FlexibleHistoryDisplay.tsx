/**
 * FlexibleHistoryDisplay - 3〜5文の柔軟な履歴表示コンポーネント
 * 
 * 設計変更：UnifiedHistoryRendererを使用して一元化
 * - レンダリングロジックを統一
 * - 表示の一貫性を保証
 * - メンテナンス性の向上
 */

import React from 'react';
import { HistoryBlock } from '../utils/FlexibleHistoryGrouper';
import { UnifiedHistoryRenderer } from './UnifiedHistoryRenderer';

interface FlexibleHistoryDisplayProps {
  historyBlocks: HistoryBlock[];
  className?: string;
  onBlockClick?: (block: HistoryBlock) => void;
}

/**
 * UnifiedHistoryRendererのラッパーコンポーネント
 * 後方互換性を保ちながら、新しい統一レンダラーを使用
 */
export const FlexibleHistoryDisplay: React.FC<FlexibleHistoryDisplayProps> = ({
  historyBlocks,
  className = '',
  onBlockClick
}) => {
  return (
    <UnifiedHistoryRenderer
      historyBlocks={historyBlocks}
      mode="inline"
      {...(onBlockClick ? { onBlockClick } : {})}
      className={`flexible-history-display ${className}`}
      showTimestamps={true}
      showBlockNumbers={true}
    />
  );
};