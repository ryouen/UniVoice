/**
 * UnifiedHistoryRenderer-Flow - より自然な流れを重視した履歴レンダラー
 * 
 * 設計コンセプト:
 * - ブロック境界を最小化し、読書体験を重視
 * - タイムスタンプは控えめに表示
 * - 会話の流れを自然に表現
 */

import React from 'react';
import type { HistoryBlock } from '../utils/FlexibleHistoryGrouper';

export type DisplayMode = 'flow' | 'compact' | 'fullscreen' | 'export';

export interface FlowHistoryRendererProps {
  historyBlocks: HistoryBlock[];
  mode: DisplayMode;
  onBlockClick?: (block: HistoryBlock) => void;
  className?: string;
  showTimestamps?: boolean;
  showSeparators?: boolean;
}

/**
 * フロー型スタイル定義
 */
const getFlowStyles = (mode: DisplayMode) => {
  const baseStyles = {
    container: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    segment: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      position: 'relative' as const,
    },
    original: {
      color: '#333',
      wordWrap: 'break-word' as const,
    },
    translation: {
      color: '#0066cc',
      wordWrap: 'break-word' as const,
    },
    timestamp: {
      position: 'absolute' as const,
      color: '#999',
      fontSize: '10px',
      opacity: 0.6,
    },
    separator: {
      height: '1px',
      background: 'linear-gradient(to right, transparent, #e0e0e0 20%, #e0e0e0 80%, transparent)',
      margin: '20px 0',
    }
  };

  switch (mode) {
    case 'flow':
      return {
        ...baseStyles,
        container: {
          ...baseStyles.container,
          padding: '10px 0',
        },
        segment: {
          ...baseStyles.segment,
          gap: '30px',
          padding: '20px 20px',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
          }
        },
        original: {
          ...baseStyles.original,
          paddingRight: '20px',
          fontSize: '15px',
          lineHeight: '1.8',
        },
        translation: {
          ...baseStyles.translation,
          paddingLeft: '20px',
          fontSize: '15px',
          lineHeight: '1.8',
          borderLeft: '1px solid rgba(0, 102, 204, 0.1)',
        },
        timestamp: {
          ...baseStyles.timestamp,
          top: '5px',
          left: '20px',
        }
      };

    case 'compact':
      return {
        ...baseStyles,
        container: {
          ...baseStyles.container,
          gap: '0',
        },
        segment: {
          ...baseStyles.segment,
          gap: '20px',
          padding: '12px 15px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        },
        original: {
          ...baseStyles.original,
          paddingRight: '15px',
          fontSize: '13px',
          lineHeight: '1.6',
        },
        translation: {
          ...baseStyles.translation,
          paddingLeft: '15px',
          fontSize: '13px',
          lineHeight: '1.6',
        },
        timestamp: {
          display: 'none',
        }
      };

    case 'fullscreen':
      return {
        ...baseStyles,
        container: {
          ...baseStyles.container,
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 20px',
        },
        segment: {
          ...baseStyles.segment,
          gap: '40px',
          padding: '30px 40px',
          marginBottom: '10px',
        },
        original: {
          ...baseStyles.original,
          paddingRight: '30px',
          fontSize: '18px',
          lineHeight: '2',
        },
        translation: {
          ...baseStyles.translation,
          paddingLeft: '30px',
          fontSize: '18px',
          lineHeight: '2',
          borderLeft: '2px solid rgba(0, 102, 204, 0.1)',
        },
        timestamp: {
          ...baseStyles.timestamp,
          top: '10px',
          right: '40px',
          fontSize: '12px',
        }
      };

    default:
      return baseStyles;
  }
};

/**
 * フロー型履歴レンダラー
 */
export const UnifiedHistoryRendererFlow: React.FC<FlowHistoryRendererProps> = ({
  historyBlocks,
  mode = 'flow',
  onBlockClick,
  className = '',
  showTimestamps = true,
  showSeparators = false,
}) => {
  const styles = getFlowStyles(mode);
  const [hoveredBlockId, setHoveredBlockId] = React.useState<string | null>(null);

  // タイムスタンプの表示判定（5分以上の間隔がある場合のみ表示）
  const shouldShowTimestamp = (block: HistoryBlock, index: number, blocks: HistoryBlock[]) => {
    if (!showTimestamps || index === 0) return index === 0; // 最初のブロックは常に表示
    
    const prevBlock = blocks[index - 1];
    const timeDiff = block.createdAt - prevBlock.createdAt;
    return timeDiff > 5 * 60 * 1000; // 5分以上の間隔
  };

  // 自然な区切り判定（30分以上の間隔）
  const shouldShowSeparator = (block: HistoryBlock, index: number, blocks: HistoryBlock[]) => {
    if (!showSeparators || index === 0) return false;
    
    const prevBlock = blocks[index - 1];
    const timeDiff = block.createdAt - prevBlock.createdAt;
    return timeDiff > 30 * 60 * 1000; // 30分以上の間隔
  };

  return (
    <div 
      className={`unified-history-flow ${className} ${mode}-mode`}
      style={styles.container}
    >
      {historyBlocks.map((block, index) => (
        <React.Fragment key={block.id}>
          {/* 自然な区切り線 */}
          {shouldShowSeparator(block, index, historyBlocks) && (
            <div style={styles.separator} />
          )}

          {/* コンテンツ */}
          <div
            className="history-segment"
            style={{
              ...styles.segment,
              ...(hoveredBlockId === block.id && mode === 'flow' ? 
                { backgroundColor: 'rgba(0, 0, 0, 0.02)' } : {}
              )
            }}
            onClick={() => onBlockClick?.(block)}
            onMouseEnter={() => setHoveredBlockId(block.id)}
            onMouseLeave={() => setHoveredBlockId(null)}
          >
            {/* 控えめなタイムスタンプ */}
            {shouldShowTimestamp(block, index, historyBlocks) && (
              <div style={styles.timestamp}>
                {new Date(block.createdAt).toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}

            {/* 原文 */}
            <div style={styles.original}>
              {block.sentences.map(s => s.sourceText).join(' ')}
            </div>

            {/* 翻訳 */}
            <div style={styles.translation}>
              {block.sentences.map(s => s.targetText).join(' ')}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * 読みやすさを重視したHTML生成
 */
export const renderFlowHistoryToHTML = (
  historyBlocks: HistoryBlock[],
  options: {
    title?: string;
    showMinimalTimestamps?: boolean;
  } = {}
): string => {
  const { title, showMinimalTimestamps = true } = options;

  let html = '';
  
  if (title) {
    html += `<h2 style="text-align: center; color: #333; margin-bottom: 40px;">${title}</h2>`;
  }

  html += '<div style="max-width: 1000px; margin: 0 auto;">';

  let lastTimeLabel = '';

  historyBlocks.forEach((block, index) => {
    // 時間ラベル（1時間ごと）
    if (showMinimalTimestamps) {
      const timeLabel = new Date(block.createdAt).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      }).split(':')[0] + ':00';
      
      if (timeLabel !== lastTimeLabel) {
        html += `
          <div style="
            text-align: center;
            color: #999;
            font-size: 12px;
            margin: 30px 0 20px;
            position: relative;
          ">
            <span style="
              background: white;
              padding: 0 20px;
              position: relative;
              z-index: 1;
            ">${timeLabel}</span>
            <div style="
              position: absolute;
              top: 50%;
              left: 0;
              right: 0;
              height: 1px;
              background: #e0e0e0;
              z-index: 0;
            "></div>
          </div>
        `;
        lastTimeLabel = timeLabel;
      }
    }

    // コンテンツ
    html += `
      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        padding: 20px 0;
        position: relative;
      ">
        <div style="
          padding-right: 20px;
          line-height: 1.8;
          color: #333;
          font-size: 15px;
        ">
          ${block.sentences.map(s => s.sourceText).join(' ')}
        </div>
        <div style="
          padding-left: 20px;
          line-height: 1.8;
          color: #0066cc;
          font-size: 15px;
          border-left: 1px solid rgba(0, 102, 204, 0.15);
        ">
          ${block.sentences.map(s => s.targetText).join(' ')}
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
};