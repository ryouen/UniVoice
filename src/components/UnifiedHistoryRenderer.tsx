/**
 * UnifiedHistoryRenderer - 履歴データの統一的なレンダリングコンポーネント
 * 
 * 設計原則:
 * - 単一のデータ構造から複数の表示形式に対応
 * - DRY原則に従い、レンダリングロジックを一元化
 * - 表示モードに応じたスタイルの切り替え
 * - メンテナンス性とコンシステンシーの向上
 */

import React from 'react';
import type { HistoryBlock } from '../utils/FlexibleHistoryGrouper';

export type DisplayMode = 'inline' | 'fullscreen' | 'export';

export interface UnifiedHistoryRendererProps {
  /** 表示する履歴ブロック */
  historyBlocks: HistoryBlock[];
  
  /** 表示モード */
  mode: DisplayMode;
  
  /** ブロッククリック時のハンドラー（inlineモードのみ） */
  onBlockClick?: (block: HistoryBlock) => void | undefined;
  
  /** カスタムクラス名 */
  className?: string;
  
  /** 時間表示を含めるか */
  showTimestamps?: boolean;
  
  /** ブロック番号を表示するか */
  showBlockNumbers?: boolean;
}

/**
 * 表示モードごとのスタイル定義
 */
const getModeStyles = (mode: DisplayMode) => {
  const baseStyles = {
    container: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    block: {
      background: '#fafafa',
      borderRadius: '6px',
      overflow: 'hidden',
      border: '1px solid #e0e0e0',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: '#f5f5f5',
      borderBottom: '1px solid #e0e0e0',
    },
    content: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      alignItems: 'stretch',
    },
    original: {
      borderRight: '1px solid #e0e0e0',
      color: '#333',
      wordWrap: 'break-word' as const,
    },
    translation: {
      color: '#0066cc',
      wordWrap: 'break-word' as const,
    }
  };

  // モード別のスタイル調整
  switch (mode) {
    case 'inline':
      return {
        ...baseStyles,
        container: {
          ...baseStyles.container,
          gap: '20px',
        },
        block: {
          ...baseStyles.block,
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        },
        header: {
          ...baseStyles.header,
          padding: '10px 15px',
          fontSize: '12px',
        },
        content: {
          ...baseStyles.content,
          gap: '20px',
          padding: '15px',
        },
        original: {
          ...baseStyles.original,
          paddingRight: '15px',
          fontSize: '14px',
          lineHeight: '1.7',
        },
        translation: {
          ...baseStyles.translation,
          paddingLeft: '15px',
          fontSize: '14px',
          lineHeight: '1.7',
        }
      };

    case 'fullscreen':
      return {
        ...baseStyles,
        container: {
          ...baseStyles.container,
          gap: '30px',
          padding: '20px',
        },
        block: {
          ...baseStyles.block,
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
        header: {
          ...baseStyles.header,
          padding: '15px 20px',
          fontSize: '14px',
          fontWeight: 600,
        },
        content: {
          ...baseStyles.content,
          gap: '30px',
          padding: '20px',
        },
        original: {
          ...baseStyles.original,
          paddingRight: '20px',
          fontSize: '16px',
          lineHeight: '1.8',
        },
        translation: {
          ...baseStyles.translation,
          paddingLeft: '20px',
          fontSize: '16px',
          lineHeight: '1.8',
        }
      };

    case 'export':
      return {
        ...baseStyles,
        container: {
          ...baseStyles.container,
          gap: '15px',
        },
        block: {
          ...baseStyles.block,
          background: '#fff',
          border: '1px solid #ccc',
          pageBreakInside: 'avoid' as const,
        },
        header: {
          ...baseStyles.header,
          padding: '8px 12px',
          fontSize: '11px',
          background: '#f0f0f0',
        },
        content: {
          ...baseStyles.content,
          gap: '15px',
          padding: '12px',
        },
        original: {
          ...baseStyles.original,
          paddingRight: '12px',
          fontSize: '12px',
          lineHeight: '1.6',
        },
        translation: {
          ...baseStyles.translation,
          paddingLeft: '12px',
          fontSize: '12px',
          lineHeight: '1.6',
        }
      };
  }
};

/**
 * 時間フォーマット関数
 */
const formatTimeRange = (block: HistoryBlock): string => {
  const startTime = new Date(block.createdAt).toLocaleTimeString('ja-JP');
  // 最後の文のタイムスタンプを終了時間として使用
  const lastSentence = block.sentences[block.sentences.length - 1];
  const endTime = lastSentence 
    ? new Date(lastSentence.timestamp).toLocaleTimeString('ja-JP')
    : startTime;
  return startTime === endTime ? startTime : `${startTime} - ${endTime}`;
};

/**
 * 統一履歴レンダラーコンポーネント
 */
export const UnifiedHistoryRenderer: React.FC<UnifiedHistoryRendererProps> = ({
  historyBlocks,
  mode,
  onBlockClick,
  className = '',
  showTimestamps = true,
  showBlockNumbers = true,
}) => {
  const [hoveredBlockId, setHoveredBlockId] = React.useState<string | null>(null);
  const styles = getModeStyles(mode);

  const handleBlockClick = (block: HistoryBlock) => {
    if (mode === 'inline' && onBlockClick) {
      onBlockClick(block);
    }
  };

  const handleMouseEnter = (blockId: string) => {
    if (mode === 'inline') {
      setHoveredBlockId(blockId);
    }
  };

  const handleMouseLeave = () => {
    if (mode === 'inline') {
      setHoveredBlockId(null);
    }
  };

  return (
    <div 
      className={`unified-history-renderer ${className} ${mode}-mode`}
      style={styles.container}
    >
      {historyBlocks.map((block, blockIndex) => {
        const isHovered = hoveredBlockId === block.id;
        const blockStyle = mode === 'inline' && isHovered
          ? {
              ...styles.block,
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }
          : styles.block;

        return (
          <div
            key={block.id}
            className="history-block"
            style={blockStyle}
            onClick={() => handleBlockClick(block)}
            onMouseEnter={() => handleMouseEnter(block.id)}
            onMouseLeave={handleMouseLeave}
          >
            {/* ヘッダー部分 */}
            {(showBlockNumbers || showTimestamps) && (
              <div className="block-header" style={styles.header}>
                {showBlockNumbers && (
                  <span className="block-number" style={{ fontWeight: 600, color: '#666' }}>
                    ブロック {blockIndex + 1}
                  </span>
                )}
                <span className="sentence-count" style={{ color: '#999', fontSize: '0.9em' }}>
                  {block.sentences.length}文
                </span>
                {showTimestamps && (
                  <span className="block-time" style={{ marginLeft: 'auto', color: '#999', fontSize: '0.9em' }}>
                    {mode === 'fullscreen' ? formatTimeRange(block) : new Date(block.createdAt).toLocaleTimeString('ja-JP')}
                  </span>
                )}
              </div>
            )}

            {/* コンテンツ部分 */}
            <div className="block-content" style={styles.content}>
              {/* 原文（英語） */}
              <div className="original-text" style={styles.original}>
                {block.sentences.map(sentence => sentence.original).join(' ')}
              </div>
              
              {/* 翻訳（日本語） */}
              <div className="translation-text" style={styles.translation}>
                {block.sentences.map(sentence => sentence.translation).join(' ')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * HTMLエクスポート用のヘルパー関数
 * モーダルで使用するHTML文字列を生成
 */
export const renderHistoryToHTML = (
  historyBlocks: HistoryBlock[],
  options: {
    showTimestamps?: boolean;
    showBlockNumbers?: boolean;
    title?: string;
  } = {}
): string => {
  const { showTimestamps = true, showBlockNumbers = true, title } = options;

  let html = '';
  
  if (title) {
    html += `<h2 style="margin-bottom: 20px; color: #333;">${title}</h2>`;
  }

  html += '<div class="history-export">';

  historyBlocks.forEach((block, index) => {
    html += `
      <div style="
        background: #fafafa;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
        margin-bottom: 20px;
        overflow: hidden;
      ">
    `;

    // ヘッダー
    if (showBlockNumbers || showTimestamps) {
      html += `
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
          font-size: 13px;
        ">
      `;
      
      if (showBlockNumbers) {
        html += `<span style="font-weight: 600; color: #666;">ブロック ${index + 1}</span>`;
      }
      
      html += `<span style="color: #999;">${block.sentences.length}文</span>`;
      
      if (showTimestamps) {
        html += `<span style="margin-left: auto; color: #999;">${formatTimeRange(block)}</span>`;
      }
      
      html += '</div>';
    }

    // コンテンツ
    html += `
      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        padding: 20px;
      ">
        <div style="
          padding-right: 20px;
          border-right: 1px solid #e0e0e0;
          line-height: 1.8;
          color: #333;
        ">
          ${block.sentences.map(s => s.original).join(' ')}
        </div>
        <div style="
          padding-left: 20px;
          line-height: 1.8;
          color: #0066cc;
        ">
          ${block.sentences.map(s => s.translation).join(' ')}
        </div>
      </div>
    `;

    html += '</div>';
  });

  html += '</div>';
  return html;
};