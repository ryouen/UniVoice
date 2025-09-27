/**
 * SummaryWindow関連の型定義
 * 
 * Clean Architecture:
 * - ドメイン層の型定義
 * - UIに依存しない純粋なデータ構造
 */

import type { Summary } from '../hooks/useUnifiedPipeline';

/**
 * プログレッシブ要約のデータ構造
 * 実装計画書に基づいた型定義
 */
export interface ProgressiveSummaryData {
  stage: number;           // 1-5 (400w, 800w, 1600w, 2400w, 3200w)
  wordCount: number;
  sourceText: string[];    // パラグラフ配列
  targetText: string[];    // 翻訳配列  
  timestamp: number;
  isProcessing: boolean;
}

/**
 * SummaryWindowのプロパティ
 */
export interface SummaryWindowProps {
  summaryData: ProgressiveSummaryData[];
  currentTheme: 'light' | 'dark' | 'purple';
  fontScale: number;
  displayMode: 'both' | 'source' | 'target';
  onThemeChange: (theme: string) => void;
  onFontScaleChange: (scale: number) => void;
  onDisplayModeChange: (mode: string) => void;
  onClose: () => void;
}

/**
 * Summaryからプログレッシブ要約データへの変換ヘルパー
 */
export function convertToProgressiveSummaryData(summaries: Summary[]): ProgressiveSummaryData[] {
  // 閾値をステージ番号に変換
  const thresholdToStage: Record<number, number> = {
    400: 1,
    800: 2, 
    1600: 3,
    2400: 4,
    3200: 5 // 将来の拡張用
  };

  return summaries
    .filter(s => s.threshold) // プログレッシブ要約のみ
    .map(s => ({
      stage: thresholdToStage[s.threshold!] || 0,
      wordCount: s.wordCount,
      // テキストをパラグラフ配列に変換（現在は1段落として扱う）
      sourceText: [s.sourceText],
      targetText: [s.targetText],
      timestamp: s.timestamp,
      isProcessing: false
    }))
    .sort((a, b) => a.stage - b.stage); // ステージ順にソート
}

/**
 * ステージ番号から閾値への変換
 */
export function getThresholdFromStage(stage: number): number {
  const stageToThreshold: Record<number, number> = {
    1: 400,
    2: 800,
    3: 1600,
    4: 2400,
    5: 3200
  };
  return stageToThreshold[stage] || 0;
}