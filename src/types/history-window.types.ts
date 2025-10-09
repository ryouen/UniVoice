/**
 * History Window Types
 */

/**
 * 履歴エントリー
 */
export interface HistoryEntry {
  id: string;
  sourceText: string;
  targetText: string;
  timestamp?: number;
}

/**
 * 履歴データ
 */
export interface HistoryData {
  entries: HistoryEntry[];
  blocks?: any[];
  metadata?: {
    totalSegments: number;
    totalSentences: number;
    totalWords: number;
    duration: number;
    startTime?: number;
    endTime?: number;
  };
}

/**
 * HistoryWindow Props
 */
export interface HistoryWindowProps {
  currentTheme?: 'light' | 'dark' | 'purple';
  fontScale?: number;
  displayMode?: 'both' | 'source' | 'target';
  onThemeChange?: (theme: 'light' | 'dark' | 'purple') => void;
  onFontScaleChange?: (scale: number) => void;
  onDisplayModeChange?: (mode: 'both' | 'source' | 'target') => void;
  onClose?: () => void;
}
