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
  // スタイル定義（インラインスタイル）
  const styles = {
    container: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '20px'
    },
    historyBlock: {
      background: '#fafafa',
      borderRadius: '6px',
      overflow: 'hidden',
      cursor: 'pointer',
      border: '1px solid #e0e0e0',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    },
    historyBlockHover: {
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    },
    blockHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 15px',
      background: '#f5f5f5',
      borderBottom: '1px solid #e0e0e0',
      fontSize: '12px'
    },
    blockNumber: {
      fontWeight: 600,
      color: '#666'
    },
    sentenceCount: {
      color: '#999',
      fontSize: '11px'
    },
    blockTime: {
      marginLeft: 'auto',
      color: '#999',
      fontSize: '11px'
    },
    sentencesContainer: {
      padding: '15px'
    },
    sentencePair: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      alignItems: 'stretch',
      padding: '12px 0',
      borderBottom: '1px solid #f0f0f0'
    },
    originalText: {
      paddingRight: '15px',
      borderRight: '1px solid #e0e0e0',
      fontSize: '14px',
      lineHeight: '1.7',
      color: '#333',
      wordWrap: 'break-word' as const
    },
    translationText: {
      paddingLeft: '15px',
      fontSize: '14px',
      lineHeight: '1.7',
      color: '#0066cc',
      wordWrap: 'break-word' as const
    }
  };

  const [hoveredBlockId, setHoveredBlockId] = React.useState<string | null>(null);

  return (
    <div className={`flexible-history-display ${className}`} style={styles.container}>
      {historyBlocks.map((block, blockIndex) => (
        <div
          key={block.id}
          style={{
            ...styles.historyBlock,
            ...(hoveredBlockId === block.id ? styles.historyBlockHover : {})
          }}
          onClick={() => onBlockClick?.(block)}
          onMouseEnter={() => setHoveredBlockId(block.id)}
          onMouseLeave={() => setHoveredBlockId(null)}
        >
          {/* ブロックヘッダー */}
          <div style={styles.blockHeader}>
            <span style={styles.blockNumber}>ブロック {blockIndex + 1}</span>
            <span style={styles.sentenceCount}>{block.sentences.length}文</span>
            <span style={styles.blockTime}>
              {new Date(block.createdAt).toLocaleTimeString('ja-JP')}
            </span>
          </div>
          
          {/* 文のリスト - パラグラフ形式で表示 */}
          <div style={styles.sentencesContainer}>
            <div style={styles.sentencePair}>
              {/* 原文（英語） - すべての文を結合 */}
              <div style={styles.originalText}>
                {block.sentences.map(sentence => sentence.original).join(' ')}
              </div>
              
              {/* 翻訳（日本語） - すべての文を結合 */}
              <div style={styles.translationText}>
                {block.sentences.map(sentence => sentence.translation).join(' ')}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};