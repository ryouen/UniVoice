/**
 * RealtimeDisplayPresenter - リアルタイム表示のプレゼンテーションロジック
 * 
 * 責任:
 * - displayPairsからUI表示用のthreeLineDisplayへの変換
 * - 表示データの整形とフォーマット
 * - UIに関する計算（opacity、height等）
 * 
 * Clean Architecture:
 * - プレゼンテーション層の責任を明確化
 * - アプリケーション層（hooks）からUI関心事を分離
 * - テスト可能な純粋関数として実装
 */

import { SyncedDisplayPair } from '../../utils/SyncedRealtimeDisplayManager';

/**
 * 3段階表示の各行データ
 */
export interface ThreeLineItem {
  original: string;
  translation: string;
  opacity: number;
  height: number;
}

/**
 * 3段階表示データ構造
 */
export interface ThreeLineDisplay {
  oldest: ThreeLineItem | null;
  older: ThreeLineItem | null;
  recent: ThreeLineItem | null;
  maxHeight: number;
}

/**
 * リアルタイム表示用のプレゼンター
 */
export class RealtimeDisplayPresenter {
  /**
   * displayPairsからthreeLineDisplayを生成
   * 
   * @param displayPairs - SyncedRealtimeDisplayManagerからの表示ペア
   * @returns UI表示用の3段階表示データ
   */
  static createThreeLineDisplay(displayPairs: SyncedDisplayPair[]): ThreeLineDisplay {
    // displayPairsから最新3つを取得（古い順に並べ替え）
    const pairs = displayPairs.slice(0, 3).reverse();
    
    // 各ペアをThreeLineItemに変換
    const createItem = (pair: SyncedDisplayPair | undefined): ThreeLineItem | null => {
      if (!pair) return null;
      
      return {
        original: pair.original.text || '',
        translation: pair.translation.text || '',
        opacity: pair.display.opacity,
        height: pair.display.height || 40 // デフォルト高さ
      };
    };
    
    // 3段階表示データを構築
    const oldest = createItem(pairs[0]);
    const older = createItem(pairs[1]);
    const recent = createItem(pairs[2]);
    
    // 最大高さを計算
    const heights = [oldest, older, recent]
      .filter(item => item !== null)
      .map(item => item!.height);
    
    const maxHeight = heights.length > 0 ? Math.max(...heights) : 40;
    
    return {
      oldest,
      older,
      recent,
      maxHeight
    };
  }

  /**
   * 表示コンテンツと不透明度を分離して生成（レガシー互換性のため）
   * 
   * @param threeLineDisplay - 統合された3段階表示データ
   * @returns 分離されたコンテンツと不透明度オブジェクト
   */
  static separateContentAndOpacity(threeLineDisplay: ThreeLineDisplay): {
    displayContent: {
      original: {
        oldest?: string;
        older?: string;
        recent?: string;
      };
      translation: {
        oldest?: string;
        older?: string;
        recent?: string;
      };
    };
    displayOpacity: {
      original: {
        oldest?: number;
        older?: number;
        recent?: number;
      };
      translation: {
        oldest?: number;
        older?: number;
        recent?: number;
      };
    };
  } {
    const displayContent = {
      original: {
        ...(threeLineDisplay.oldest && { oldest: threeLineDisplay.oldest.original }),
        ...(threeLineDisplay.older && { older: threeLineDisplay.older.original }),
        ...(threeLineDisplay.recent && { recent: threeLineDisplay.recent.original })
      },
      translation: {
        ...(threeLineDisplay.oldest && { oldest: threeLineDisplay.oldest.translation }),
        ...(threeLineDisplay.older && { older: threeLineDisplay.older.translation }),
        ...(threeLineDisplay.recent && { recent: threeLineDisplay.recent.translation })
      }
    };

    const displayOpacity = {
      original: {
        ...(threeLineDisplay.oldest && { oldest: threeLineDisplay.oldest.opacity }),
        ...(threeLineDisplay.older && { older: threeLineDisplay.older.opacity }),
        ...(threeLineDisplay.recent && { recent: threeLineDisplay.recent.opacity })
      },
      translation: {
        ...(threeLineDisplay.oldest && { oldest: threeLineDisplay.oldest.opacity }),
        ...(threeLineDisplay.older && { older: threeLineDisplay.older.opacity }),
        ...(threeLineDisplay.recent && { recent: threeLineDisplay.recent.opacity })
      }
    };

    return { displayContent, displayOpacity };
  }

  /**
   * デバッグ情報を生成
   * 
   * @param displayPairs - 表示ペア
   * @param threeLineDisplay - 3段階表示データ
   * @returns デバッグ用の文字列
   */
  static createDebugInfo(displayPairs: SyncedDisplayPair[], threeLineDisplay: ThreeLineDisplay): string {
    const info = {
      displayPairsCount: displayPairs.length,
      hasOldest: !!threeLineDisplay.oldest,
      hasOlder: !!threeLineDisplay.older,
      hasRecent: !!threeLineDisplay.recent,
      maxHeight: threeLineDisplay.maxHeight,
      pairs: displayPairs.slice(0, 3).map(p => ({
        id: p.id,
        position: p.display.position,
        opacity: p.display.opacity,
        originalLength: p.original.text.length,
        translationLength: p.translation.text.length,
        isComplete: p.translation.isComplete
      }))
    };
    
    return JSON.stringify(info, null, 2);
  }

  /**
   * 高さの計算ロジック（文字数ベース）
   * 
   * @param text - テキスト
   * @param charsPerLine - 1行あたりの文字数（デフォルト: 40）
   * @param lineHeight - 1行の高さ（デフォルト: 24px）
   * @param padding - 上下パディング（デフォルト: 16px）
   * @returns 計算された高さ
   */
  static calculateHeight(
    text: string, 
    charsPerLine: number = 40,
    lineHeight: number = 24,
    padding: number = 16
  ): number {
    if (!text) return lineHeight + padding; // 最小高さ
    
    const lines = Math.ceil(text.length / charsPerLine);
    return lines * lineHeight + padding;
  }

  /**
   * 表示位置に基づく不透明度を取得
   * 
   * @param position - 表示位置
   * @returns 不透明度（0.3〜1.0）
   */
  static getOpacityForPosition(position: 'recent' | 'older' | 'oldest'): number {
    switch (position) {
      case 'recent':
        return 1.0;
      case 'older':
        return 0.6;
      case 'oldest':
        return 0.3;
      default:
        return 1.0;
    }
  }
}