/**
 * ProgressiveSummarySection Component
 * 進捗的要約（400, 800, 1600, 2400語）をすべて表示するセクション
 */

import React, { useState } from 'react';

interface Summary {
  sourceText: string;
  targetText: string;
  threshold?: number;
  wordCount?: number;
  timestamp?: number;
}

interface ProgressiveSummarySectionProps {
  summaries: Summary[];
  height: number;
  isExpanded: boolean;
  onClick: (event: React.MouseEvent) => void;
  onResize: (event: React.MouseEvent) => void;
  pipelineError?: string | null;
}

export const ProgressiveSummarySection: React.FC<ProgressiveSummarySectionProps> = ({
  summaries,
  height,
  isExpanded,
  onClick,
  onResize,
  pipelineError
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(summaries.length - 1);
  
  // セクションの高さスタイル計算
  const getSectionStyle = () => {
    let calculatedHeight = height;
    
    if (isExpanded) {
      calculatedHeight = 60;
    } else if (isExpanded === false) {
      calculatedHeight = 10;
    }
    
    return {
      height: `${calculatedHeight}vh`,
      transition: 'height 0.3s ease'
    };
  };

  const currentSummary = summaries[selectedIndex] || { sourceText: '', targetText: '' };

  return (
    <div 
      onClick={onClick} 
      style={{
        ...getSectionStyle(),
        display: 'flex',
        flexDirection: 'column',
        background: '#f8f9fa',
        borderBottom: '1px solid #ddd',
        cursor: 'pointer',
        position: 'relative'
      }}
    >
      {/* リサイズハンドル */}
      <div 
        className="resize-handle"
        onMouseDown={onResize}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '4px',
          top: '-2px',
          background: 'transparent',
          cursor: 'ns-resize',
          zIndex: 10
        }}
      />
      
      {/* 進捗的要約のタブ */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e0e0e0',
        background: '#fff',
        padding: '0 10px',
        minHeight: '32px',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '12px', color: '#666', marginRight: '10px' }}>
          進捗的要約:
        </span>
        {summaries.map((summary, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(index);
            }}
            style={{
              padding: '4px 12px',
              background: selectedIndex === index ? '#0066cc' : 'transparent',
              color: selectedIndex === index ? 'white' : '#333',
              border: selectedIndex === index ? 'none' : '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
          >
            {summary.threshold || '---'}語
          </button>
        ))}
        {summaries.length === 0 && (
          <span style={{ fontSize: '12px', color: '#999' }}>
            要約待機中...
          </span>
        )}
      </div>
      
      {/* 要約内容の表示 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Source Text Summary Column */}
        <div className="summary-column" style={{
          flex: 1,
          padding: '15px 20px',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e0e0e0',
          overflow: 'hidden'
        }}>
          <div className="summary-content" style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#333',
            overflow: 'auto',
            maxHeight: '100%',
            paddingRight: '10px'
          }}>
            {currentSummary.sourceText || 'Waiting for summary...'}
          </div>
        </div>
        
        {/* Target Text Summary Column */}
        <div className="summary-column" style={{
          flex: 1,
          padding: '15px 20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div className="summary-content" style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#0066cc',
            overflow: 'auto',
            maxHeight: '100%',
            paddingRight: '10px'
          }}>
            {currentSummary.targetText || '要約を待っています...'}
            
            {/* エラー表示 */}
            {pipelineError && (
              <div style={{ 
                marginTop: '10px', 
                fontSize: '12px', 
                color: '#dc3545', 
                borderTop: '1px solid #eee', 
                paddingTop: '8px' 
              }}>
                ⚠️ エラー: {pipelineError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};