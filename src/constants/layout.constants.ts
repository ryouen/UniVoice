/**
 * UniVoice Layout Constants
 * Clean Architecture: Infrastructure Layer
 */

// Section heights configuration
// 注意: これらの値は UniVoice.module.css の CSS変数と一致している必要があります
export const LAYOUT_HEIGHTS = {
  header: 60,           // CSS: --header-height: 60px (修正: 200 → 60)
  settingsBar: 56,      // CSS: --settings-bar-height: 56px (修正: 100 → 56)
  questionSection: 160, // CSS: --question-section-height: 160px
  minimalControl: 32,   // CSS: --header-compact-height: 32px
  defaultRealtime: 540, // デフォルトのリアルタイムセクション高さ
  minRealtime: 200,     // リアルタイムセクションの最小高さ
  // maxRealtime削除: 最大高さ制限なし (2025-09-19仕様変更)
  // 互換性のためのエイリアス
  realtime: {
    min: 200,
    default: 540,
    // max削除: 最大高さ制限なし
  },
  resizeHandle: 8,      // ボトムリサイズハンドルの高さ
  animationDelay: 450
} as const;

// Section definitions for keyboard shortcuts
export const SECTION_DEFINITIONS = {
  header: { key: 'h', toggle: 'showHeader' },
  settings: { key: 's', toggle: 'showSettings' },
  question: { key: 'q', toggle: 'showQuestionSection' },
} as const;

// Window resize constants
export const WINDOW_RESIZE_DEBOUNCE_MS = 100;
export const WINDOW_BOUNDS_SAVE_DELAY_MS = 500;

// Minimum window dimensions
export const MIN_WINDOW_WIDTH = 600;
export const MIN_WINDOW_HEIGHT = 400;

// Font scale constants
export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.5;
export const FONT_SCALE_STEP = 0.1;

// Animation durations
export const FADE_DURATION_MS = 300;
export const SECTION_TRANSITION_MS = 400;

// Auto-save intervals
export const AUTO_SAVE_INTERVAL_MS = 30000; // 30秒
export const SESSION_METADATA_UPDATE_DELAY_MS = 1000;

// Progressive summary thresholds (in seconds)
export const SUMMARY_THRESHOLDS = {
  FIRST: 180,    // 3分
  SECOND: 360,   // 6分
  THIRD: 600,    // 10分
  FOURTH: 900,   // 15分
  FINAL: 1200,   // 20分
} as const;

// Display content timing
export const DISPLAY_UPDATE_INTERVAL_MS = 50;
export const OPACITY_TRANSITION_DURATION_MS = 2000;

// Mock data update interval (for development)
export const MOCK_UPDATE_INTERVAL_MS = 10000;

// Theme configurations
export const THEME_CONFIGS = {
  light: {
    backgroundColor: '#ffffff',
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    textColor: '#333333',
    borderColor: 'rgba(0,0,0,0.06)',
  },
  dark: {
    backgroundColor: '#1a1a2e',
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    textColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  purple: {
    backgroundColor: '#f0f4f8',
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    textColor: '#333333',
    borderColor: 'rgba(102,126,234,0.1)',
  },
} as const;

// Export types
export type SectionKey = keyof typeof SECTION_DEFINITIONS;
export type ThemeKey = keyof typeof THEME_CONFIGS;