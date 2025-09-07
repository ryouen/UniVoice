/**
 * SummarySection Component
 * 要約セクションを表示し、英日対比のサマリーを提供
 * 
 * 機能:
 * - 英語/日本語の2カラム表示
 * - クリックで全画面モーダル表示
 * - リサイズ可能
 * - エラー状態の表示
 */

import React from 'react';

interface SummarySectionProps {
  // データ
  summaryEnglish: string;
  summaryJapanese: string;
  pipelineError?: string | null;
  
  // セクション高さ制御
  height: number; // vh単位の高さ
  isExpanded: boolean;
  
  // イベントハンドラー
  onClick: (event: React.MouseEvent) => void;
  onResize: (event: React.MouseEvent) => void;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  summaryEnglish,
  summaryJapanese,
  pipelineError,
  height,
  isExpanded,
  onClick,
  onResize
}) => {
  // セクションの高さスタイル計算
  const getSectionStyle = () => {
    let calculatedHeight = height;
    
    if (isExpanded) {
      calculatedHeight = 60; // 拡大時
    } else if (isExpanded === false) { // 他のセクションが拡大されている場合
      calculatedHeight = 10; // 圧縮時
    }
    
    return {
      height: `${calculatedHeight}vh`,
      transition: 'height 0.3s ease'
    };
  };

  return (
    <div 
      onClick={onClick} 
      style={{
        ...getSectionStyle(),
        display: 'flex',
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
      
      {/* 英語要約カラム */}
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
          {summaryEnglish || 'Waiting for summary...'}
        </div>
      </div>
      
      {/* 日本語要約カラム */}
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
          {summaryJapanese || '要約を待っています...'}
          
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
  );
};