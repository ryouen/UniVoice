/**
 * RealtimeSection - リアルタイム文字起こし・翻訳表示セクション
 * 
 * 責任:
 * - リアルタイム文字起こしの表示（左側）
 * - リアルタイム翻訳の表示（右側）
 * - 3段階の不透明度による段階的表示
 * - 音声レベルの視覚化（今後実装）
 * 
 * Clean Architecture:
 * - UIロジックのみ（プレゼンテーション層）
 * - ビジネスロジックは含まない
 * - 表示データは親コンポーネントから受け取る
 */

import React from 'react';
import { ThreeLineDisplay } from './ThreeLineDisplay';

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

export interface RealtimeSectionProps {
  /**
   * 現在の文字起こしテキスト（直接表示用）
   */
  currentOriginal?: string;
  
  /**
   * 現在の翻訳テキスト（直接表示用）
   */
  currentTranslation?: string;
  
  /**
   * 3段階表示用のコンテンツ
   */
  displayContent?: {
    original: DisplayContent;
    translation: DisplayContent;
  };
  
  /**
   * 3段階表示用の透明度
   */
  displayOpacity?: {
    original: DisplayOpacity;
    translation: DisplayOpacity;
  };
  
  /**
   * 音声レベル（0-1）
   */
  volumeLevel?: number;
  
  /**
   * 録音中かどうか
   */
  isRunning?: boolean;
  
  /**
   * デバッグモード
   */
  debug?: boolean;
  
  /**
   * フォントスケール
   */
  fontScale?: number;
  
  /**
   * 表示モード
   */
  displayMode?: 'both' | 'source' | 'target';
  
  /**
   * カスタムスタイル
   */
  style?: React.CSSProperties;
}

/**
 * リアルタイム表示セクションコンポーネント
 */
export const RealtimeSection: React.FC<RealtimeSectionProps> = ({
  currentOriginal,
  currentTranslation,
  displayContent,
  displayOpacity,
  volumeLevel = 0,
  isRunning = false,
  debug = false,
  fontScale = 1,
  displayMode = 'both',
  style = {}
}) => {
  // デバッグログ
  if (debug) {
    console.log('[RealtimeSection] Props received:', {
      hasCurrentOriginal: !!currentOriginal,
      hasCurrentTranslation: !!currentTranslation,
      hasDisplayContent: !!displayContent,
      displayContentKeys: displayContent ? Object.keys(displayContent) : [],
      originalKeys: displayContent?.original ? Object.keys(displayContent.original) : [],
      translationKeys: displayContent?.translation ? Object.keys(displayContent.translation) : []
    });
  }
  // 3段階表示があるかチェック
  const hasThreeLineContent = displayContent && 
    (displayContent.original.oldest || displayContent.original.older || displayContent.original.recent ||
     displayContent.translation.oldest || displayContent.translation.older || displayContent.translation.recent);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      ...style
    }}>
      {hasThreeLineContent ? (
        /* 3段階表示モード - CSS Gridで左右の高さを自動同期 */
        <div style={{ 
          display: 'grid',
          gridTemplateRows: 'repeat(3, auto)',
          gridTemplateColumns: displayMode === 'both' ? '1fr 1px 1fr' : '1fr',
          gap: `${6 * fontScale}px 0`, // 12px→6pxに半減、フォントサイズに連動
          height: '100%',
          alignContent: 'flex-end' // 下から埋める
        }}>
          {/* Oldest行 */}
          <div style={{
            gridColumn: 1,
            gridRow: 1,
            opacity: displayOpacity?.original?.oldest || 0.3,
            fontSize: `${20 * fontScale}px`,
            lineHeight: '1.6',
            color: '#111',
            wordWrap: 'break-word',
            padding: '8px 16px',
            minHeight: displayContent?.original?.oldest ? 'auto' : '32px',
            display: displayMode === 'target' ? 'none' : 'block'
          }}>
            {displayContent?.original?.oldest || ''}
          </div>
          {displayMode === 'both' && (
            <div style={{
              gridColumn: 2,
              gridRow: '1 / -1',
              background: '#e0e0e0'
            }} />
          )}
          <div style={{
            gridColumn: displayMode === 'both' ? 3 : 1,
            gridRow: 1,
            opacity: displayOpacity?.translation?.oldest || 0.3,
            fontSize: `${20 * fontScale}px`,
            lineHeight: '1.6',
            color: '#0066cc',
            wordWrap: 'break-word',
            padding: '8px 16px',
            minHeight: displayContent?.translation?.oldest ? 'auto' : '32px',
            display: displayMode === 'source' ? 'none' : 'block'
          }}>
            {displayContent?.translation?.oldest || ''}
          </div>
          
          {/* Older行 */}
          <div style={{
            gridColumn: 1,
            gridRow: 2,
            opacity: displayOpacity?.original?.older || 0.6,
            fontSize: `${20 * fontScale}px`,
            lineHeight: '1.6',
            color: '#111',
            wordWrap: 'break-word',
            padding: '8px 16px',
            minHeight: displayContent?.original?.older ? 'auto' : '32px',
            display: displayMode === 'target' ? 'none' : 'block'
          }}>
            {displayContent?.original?.older || ''}
          </div>
          <div style={{
            gridColumn: displayMode === 'both' ? 3 : 1,
            gridRow: 2,
            opacity: displayOpacity?.translation?.older || 0.6,
            fontSize: `${20 * fontScale}px`,
            lineHeight: '1.6',
            color: '#0066cc',
            wordWrap: 'break-word',
            padding: '8px 16px',
            minHeight: displayContent?.translation?.older ? 'auto' : '32px',
            display: displayMode === 'source' ? 'none' : 'block'
          }}>
            {displayContent?.translation?.older || ''}
          </div>
          
          {/* Recent行 */}
          <div style={{
            gridColumn: 1,
            gridRow: 3,
            opacity: displayOpacity?.original?.recent || 1,
            fontSize: `${20 * fontScale}px`,
            lineHeight: '1.6',
            color: '#111',
            fontWeight: 500,
            wordWrap: 'break-word',
            padding: '8px 16px',
            minHeight: displayContent?.original?.recent ? 'auto' : '32px',
            display: displayMode === 'target' ? 'none' : 'block'
          }}>
            {displayContent?.original?.recent || ''}
          </div>
          <div style={{
            gridColumn: displayMode === 'both' ? 3 : 1,
            gridRow: 3,
            opacity: displayOpacity?.translation?.recent || 1,
            fontSize: `${20 * fontScale}px`,
            lineHeight: '1.6',
            color: '#0066cc',
            fontWeight: 500,
            wordWrap: 'break-word',
            padding: '8px 16px',
            minHeight: displayContent?.translation?.recent ? 'auto' : '32px',
            display: displayMode === 'source' ? 'none' : 'block'
          }}>
            {displayContent?.translation?.recent || ''}
          </div>
        </div>
      ) : (
        /* 直接表示モード - 従来のFlexbox */
        <div style={{ display: 'flex', height: '100%' }}>
          {/* 左側: リアルタイム文字起こし */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderRight: '1px solid #e0e0e0',
            paddingRight: '30px'
          }}>
            <ThreeLineDisplay
              id="currentOriginal"
              className="current-text"
              directContent={currentOriginal}
              displayContent={displayContent?.original}
              displayOpacity={displayOpacity?.original}
              debug={debug}
              debugLabel="currentOriginal"
              style={{
                fontSize: `${20 * fontScale}px`,
                lineHeight: '1.6',
                color: '#111',
                fontWeight: 400,
                wordWrap: 'break-word'
              }}
            />
          </div>
          
          {/* 右側: リアルタイム翻訳 */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: '30px'
          }}>
            <ThreeLineDisplay
              id="currentTranslation"
              className="current-text translation"
              directContent={currentTranslation}
              displayContent={displayContent?.translation}
              displayOpacity={displayOpacity?.translation}
              debug={debug}
              debugLabel="currentTranslation"
              style={{
                fontSize: `${20 * fontScale}px`,
                lineHeight: '1.6',
                color: '#0066cc',
                fontWeight: 400,
                wordWrap: 'break-word'
              }}
            />
          </div>
        </div>
      )}
      
      {/* 音声レベルインジケーター（今後実装） */}
      {volumeLevel > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '4px',
          background: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${volumeLevel * 100}%`,
            height: '100%',
            background: isRunning ? '#4CAF50' : '#999',
            transition: 'width 0.1s ease-out'
          }} />
        </div>
      )}
    </div>
  );
};