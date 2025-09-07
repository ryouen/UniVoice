/**
 * HistorySection - Displays translation history blocks
 * Shows grouped history with original and translated text
 */

import React from 'react';
import { HistoryBlock, HistorySentence } from '../../utils/FlexibleHistoryGrouper';

interface HistorySectionProps {
  historyBlocks: HistoryBlock[];
  height: number;
  isExpanded?: boolean;
  onClick?: () => void;
  onResize?: (e: React.MouseEvent) => void;
  onBlockClick?: (block: HistoryBlock) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  historyBlocks,
  height,
  onClick,
  isExpanded,
  onResize,
  onBlockClick
}) => {
  return (
    <div 
      onClick={onClick}
      style={{
        display: 'flex',
        background: 'white',
        borderBottom: '1px solid #ddd',
        cursor: 'pointer',
        position: 'relative',
        height: `${height}vh`,
        transition: 'height 0.3s ease'
      }}
    >
      {/* Resize handle */}
      <div 
        className="resize-handle"
        onMouseDown={onResize}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '4px',
          bottom: '-2px',
          background: 'transparent',
          cursor: 'ns-resize',
          zIndex: 10
        }}
      />
      
      {/* Original text column */}
      <div style={{ 
        flex: 1, 
        padding: '15px 20px', 
        overflowY: 'auto', 
        borderRight: '1px solid #e0e0e0' 
      }}>
        {historyBlocks.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
            音声認識待機中...
          </div>
        ) : (
          historyBlocks.map((block) => (
            <div 
              key={block.id} 
              className="history-block"
              onClick={(e) => {
                e.stopPropagation();
                onBlockClick?.(block);
              }}
              style={{
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: '2px solid #f0f0f0',
                cursor: 'pointer'
              }}
            >
              {block.sentences.map((sentence: HistorySentence, i: number) => (
                <div key={sentence.id} style={{
                  marginBottom: i < block.sentences.length - 1 ? '8px' : 0,
                  lineHeight: '1.7',
                  fontSize: '13px'
                }}>
                  {sentence.original}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      
      {/* Translated text column */}
      <div style={{ 
        flex: 1, 
        padding: '15px 20px', 
        overflowY: 'auto' 
      }}>
        {historyBlocks.length === 0 ? (
          <div style={{ color: '#6699cc', textAlign: 'center', padding: '20px' }}>
            翻訳待機中...
          </div>
        ) : (
          historyBlocks.map((block) => (
            <div 
              key={block.id} 
              className="history-block"
              onClick={(e) => {
                e.stopPropagation();
                onBlockClick?.(block);
              }}
              style={{
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: '2px solid #f0f0f0',
                cursor: 'pointer'
              }}
            >
              {block.sentences.map((sentence: HistorySentence, i: number) => (
                <div key={sentence.id} style={{
                  marginBottom: i < block.sentences.length - 1 ? '8px' : 0,
                  lineHeight: '1.7',
                  fontSize: '13px',
                  color: '#0066cc'
                }}>
                  {sentence.translation}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};