/**
 * SyncedRealtimeDisplay - 左右同期型リアルタイム表示コンポーネント
 * 
 * 設計原則:
 * 1. 原文（左）と翻訳（右）を同じ高さで表示
 * 2. interim結果は表示しない（finalのみ）
 * 3. 翻訳完了後1.5秒で両方同時に削除
 * 4. 3ペアまで表示（opacity段階: 0.3, 0.6, 1.0）
 */

import React from 'react';
import { SyncedDisplayPair } from '../utils/SyncedRealtimeDisplayManager';

interface SyncedRealtimeDisplayProps {
  displayPairs: SyncedDisplayPair[];
  className?: string;
}

export const SyncedRealtimeDisplay: React.FC<SyncedRealtimeDisplayProps> = ({
  displayPairs,
  className = ''
}) => {
  // 表示用のペアを最新3つに限定
  const visiblePairs = displayPairs.slice(0, 3);
  
  return (
    <div className={`synced-realtime-display ${className}`}>
      {/* 3行分の固定スペースを確保 */}
      <div className="display-container">
        {[0, 1, 2].map((index) => {
          const pair = visiblePairs[index];
          
          return (
            <div
              key={`row-${index}`}
              className={`display-row ${pair ? 'has-content' : 'empty'}`}
              style={{
                opacity: pair?.display.opacity || 0,
                minHeight: pair?.display.height || '40px',
                transition: 'opacity 0.3s ease-in-out'
              }}
            >
              {/* 左側：原文 */}
              <div className="original-column">
                <div className="text-content">
                  {pair?.original.text || ''}
                </div>
              </div>
              
              {/* 中央：区切り線 */}
              <div className="divider" />
              
              {/* 右側：翻訳 */}
              <div className="translation-column">
                <div className="text-content">
                  {pair?.translation.text || ''}
                  {pair && !pair.translation.text && pair.original.isFinal && (
                    <span className="translating-indicator">翻訳中...</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <style>{`
        .synced-realtime-display {
          width: 100%;
          background: #1a1a1a;
          border-radius: 12px;
          padding: 16px;
          overflow: hidden;
        }
        
        .display-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .display-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 16px;
          align-items: stretch;
          min-height: 40px;
          padding: 8px 0;
        }
        
        .display-row.empty {
          opacity: 0;
        }
        
        .original-column,
        .translation-column {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }
        
        .text-content {
          width: 100%;
          font-size: 16px;
          line-height: 1.5;
          color: #ffffff;
          word-wrap: break-word;
        }
        
        .divider {
          width: 2px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 8px;
        }
        
        .translating-indicator {
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
          font-size: 14px;
        }
        
        /* レスポンシブ対応 */
        @media (max-width: 768px) {
          .display-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          
          .divider {
            display: none;
          }
          
          .translation-column {
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            padding-top: 8px;
            margin-top: 8px;
          }
        }
      `}</style>
    </div>
  );
};