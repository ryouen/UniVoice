/**
 * ThreeLineDisplay - 3段階不透明度表示コンポーネント
 * 
 * 責任:
 * - 古い・中間・最新の3段階でテキストを表示
 * - 各段階で異なる不透明度を適用
 * - 直接表示モードと段階表示モードの切り替え
 * 
 * 表示ロジック:
 * - oldest: opacity 0.4
 * - older: opacity 0.6
 * - recent: opacity 1.0, font-weight 500
 */

import React from 'react';

export interface DisplayContent {
  oldest?: string;
  older?: string;
  recent?: string;
}

export interface DisplayOpacity {
  oldest?: number;
  older?: number;
  recent?: number;
}

export interface ThreeLineDisplayProps {
  /**
   * DOM要素のID
   */
  id?: string;
  
  /**
   * CSSクラス名
   */
  className?: string;
  
  /**
   * 直接表示するコンテンツ（優先）
   */
  directContent?: string | undefined;
  
  /**
   * 3段階表示用のコンテンツ
   */
  displayContent?: DisplayContent | undefined;
  
  /**
   * 3段階表示用の透明度
   */
  displayOpacity?: DisplayOpacity | undefined;
  
  /**
   * デバッグモード
   */
  debug?: boolean;
  
  /**
   * デバッグ用のラベル
   */
  debugLabel?: string;
  
  /**
   * カスタムスタイル
   */
  style?: React.CSSProperties;
}

/**
 * 3段階不透明度表示コンポーネント
 */
export const ThreeLineDisplay: React.FC<ThreeLineDisplayProps> = ({
  id,
  className,
  directContent,
  displayContent,
  displayOpacity,
  debug = false,
  debugLabel = '',
  style = {}
}) => {
  // デバッグログ
  if (debug && debugLabel) {
    console.log(`[ThreeLineDisplay] Rendering ${debugLabel}:`, {
      directContent: directContent?.substring(0, 50) + (directContent && directContent.length > 50 ? '...' : ''),
      displayContent: displayContent ? {
        oldest: displayContent?.oldest?.substring(0, 30) + (displayContent?.oldest && displayContent.oldest.length > 30 ? '...' : ''),
        older: displayContent?.older?.substring(0, 30) + (displayContent?.older && displayContent.older.length > 30 ? '...' : ''),
        recent: displayContent?.recent?.substring(0, 30) + (displayContent?.recent && displayContent.recent.length > 30 ? '...' : '')
      } : null,
      willShowDirectContent: !!directContent,
      willShow3Lines: !directContent && !!displayContent,
      has3LineContent: displayContent && (displayContent.oldest || displayContent.older || displayContent.recent)
    });
  }
  
  return (
    <div id={id} className={className} style={style}>
      {(() => {
        // directContentが存在する場合は最優先で表示
        if (directContent) {
          if (debug && debugLabel) {
            console.log(`[ThreeLineDisplay] Showing direct content for ${debugLabel}`);
          }
          return (
            <span style={{ opacity: 1, fontWeight: 500 }}>
              {directContent}
            </span>
          );
        }
        
        // directContentがない場合、3段階表示をチェック
        const has3LineContent = displayContent && 
          (displayContent.oldest || displayContent.older || displayContent.recent);
        
        if (has3LineContent) {
          if (debug && debugLabel) {
            console.log(`[ThreeLineDisplay] Showing 3-line display for ${debugLabel}`);
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayContent.oldest && (
                <div style={{ opacity: displayOpacity?.oldest || 0.3, lineHeight: '1.6' }}>
                  {displayContent.oldest}
                </div>
              )}
              {displayContent.older && (
                <div style={{ opacity: displayOpacity?.older || 0.6, lineHeight: '1.6' }}>
                  {displayContent.older}
                </div>
              )}
              {displayContent.recent && (
                <div style={{ opacity: displayOpacity?.recent || 1, fontWeight: 500, lineHeight: '1.6' }}>
                  {displayContent.recent}
                </div>
              )}
            </div>
          );
        }
        
        // 何も表示するものがない場合
        return null;
      })()}
    </div>
  );
};