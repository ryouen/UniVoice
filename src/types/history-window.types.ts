/**
 * HistoryWindow関連の型定義
 * 
 * Clean Architecture:
 * - ドメイン層の型定義
 * - UIに依存しない純粋なデータ構造
 */

import type { HistoryBlock } from '../utils/FlexibleHistoryGrouper';

/**
 * 履歴エントリーのデータ構造
 */
export interface HistoryEntry {
  id: string;
  original: string;
  translation: string;
  timestamp: number;
  segmentIds?: string[];
  speaker?: string;
  confidence?: number;
}

/**
 * 全文履歴データ
 */
export interface FullHistoryData {
  blocks: HistoryBlock[];
  entries: HistoryEntry[];
  metadata: {
    totalSegments: number;
    totalSentences: number;
    totalWords: number;
    duration: number;
    startTime?: number;
    endTime?: number;
  };
}

/**
 * HistoryWindowのプロパティ
 */
export interface HistoryWindowProps {
  historyData?: FullHistoryData;
  currentTheme: 'light' | 'dark' | 'purple';
  fontScale: number;
  displayMode: 'both' | 'source' | 'target';
  searchQuery?: string;
  onThemeChange: (theme: 'light' | 'dark' | 'purple') => void;
  onFontScaleChange: (scale: number) => void;
  onDisplayModeChange: (mode: 'both' | 'source' | 'target') => void;
  onSearchChange?: (query: string) => void;
  onExport?: () => void;
  onClose: () => void;
}

/**
 * 履歴フィルターオプション
 */
export interface HistoryFilterOptions {
  searchQuery?: string;
  startTime?: number;
  endTime?: number;
  speakerFilter?: string;
  minConfidence?: number;
}

/**
 * エクスポートオプション
 */
export interface HistoryExportOptions {
  format: 'json' | 'csv' | 'txt' | 'html';
  includeMetadata: boolean;
  includeTimestamps: boolean;
  separateLanguages: boolean;
}