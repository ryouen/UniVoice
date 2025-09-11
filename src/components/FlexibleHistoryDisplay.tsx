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
import { UnifiedHistoryRendererFlow } from './UnifiedHistoryRenderer-Flow';

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
  // フロー型デザインを使用（より自然な表示）
  const useFlowDesign = true; // 設定で切り替え可能
  
  if (useFlowDesign) {
    return (
      <UnifiedHistoryRendererFlow
        historyBlocks={historyBlocks}
        mode="flow"
        {...(onBlockClick ? { onBlockClick } : {})}
        className={`flexible-history-display ${className}`}
        showTimestamps={true}
        showSeparators={true}
      />
    );
  }
  
  // 従来のブロック型デザイン
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