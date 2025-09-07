/**
 * FlexibleHistoryDisplay - 3〜5文の柔軟な履歴表示コンポーネント
 * 
 * 設計原則:
 * 1. 3〜5文を1ブロックとして表示
 * 2. 各ブロック内で左右の高さを揃える
 * 3. ブロック間に視覚的な区切りを設ける
 * 4. 親フォルダのライトテーマデザインに準拠
 */

import React from 'react';
import { HistoryBlock } from '../utils/FlexibleHistoryGrouper';

interface FlexibleHistoryDisplayProps {
  historyBlocks: HistoryBlock[];
  className?: string;
  onBlockClick?: (block: HistoryBlock) => void;
}

export const FlexibleHistoryDisplay: React.FC<FlexibleHistoryDisplayProps> = ({
  historyBlocks,
  className = '',
  onBlockClick
}) => {
  return (
    <div className={`flexible-history-display ${className}`}>
      {historyBlocks.map((block, blockIndex) => (
        <div
          key={block.id}
          className="history-block"
          onClick={() => onBlockClick?.(block)}
        >
          {/* ブロックヘッダー */}
          <div className="block-header">
            <span className="block-number">ブロック {blockIndex + 1}</span>
            <span className="sentence-count">{block.sentences.length}文</span>
            <span className="block-time">
              {new Date(block.createdAt).toLocaleTimeString('ja-JP')}
            </span>
          </div>
          
          {/* 文のリスト */}
          <div className="sentences-container">
            {block.sentences.map((sentence) => (
              <div
                key={sentence.id}
                className="sentence-pair"
              >
                {/* 原文（英語） */}
                <div className="original-text">
                  {sentence.original}
                </div>
                
                {/* 翻訳（日本語） */}
                <div className="translation-text">
                  {sentence.translation}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <style>{`
        .flexible-history-display {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .history-block {
          background: #fafafa;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid #e0e0e0;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .history-block:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .block-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 15px;
          background: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
          font-size: 12px;
        }
        
        .block-number {
          font-weight: 600;
          color: #666;
        }
        
        .sentence-count {
          color: #999;
          font-size: 11px;
        }
        
        .block-time {
          margin-left: auto;
          color: #999;
          font-size: 11px;
        }
        
        .sentences-container {
          padding: 15px;
        }
        
        .sentence-pair {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: stretch;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .sentence-pair:last-child {
          border-bottom: none;
        }
        
        .sentence-number {
          display: none;
        }
        
        .original-text {
          padding-right: 15px;
          border-right: 1px solid #e0e0e0;
          font-size: 14px;
          line-height: 1.7;
          color: #333;
          word-wrap: break-word;
        }
        
        .translation-text {
          padding-left: 15px;
          font-size: 14px;
          line-height: 1.7;
          color: #0066cc;
          word-wrap: break-word;
        }
        
        /* タブレット対応 */
        @media (max-width: 768px) {
          .sentence-pair {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .original-text {
            padding-right: 0;
            padding-bottom: 10px;
            border-right: none;
            border-bottom: 1px solid #e0e0e0;
          }
          
          .translation-text {
            padding-left: 0;
            padding-top: 10px;
            border-left: 3px solid #e0e0e0;
            padding-left: 10px;
          }
        }
        
        /* モバイル対応 */
        @media (max-width: 640px) {
          .block-header {
            flex-wrap: wrap;
            gap: 5px;
            padding: 8px 12px;
          }
          
          .block-time {
            width: 100%;
            margin-left: 0;
            text-align: right;
            font-size: 10px;
          }
          
          .sentences-container {
            padding: 10px;
          }
          
          .sentence-pair {
            padding: 8px 0;
          }
          
          .original-text,
          .translation-text {
            font-size: 13px;
            line-height: 1.6;
          }
        }
      `}</style>
    </div>
  );
};