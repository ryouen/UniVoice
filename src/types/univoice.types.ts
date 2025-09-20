/**
 * UniVoice Component Types
 * Clean Architecture: Domain/Entity Layer
 */

// Display related types
export enum DisplayMode {
  ORIGINAL = 'original',
  TRANSLATION = 'translation',
  BOTH = 'both'
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  PURPLE = 'purple'
}

// Session related types
export interface SessionData {
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp?: number;
}

// History entry type
export interface HistoryEntry {
  id: string;
  timestamp: Date;
  sourceText: string;
  targetText: string;
  isHighQuality?: boolean;
  sentenceId?: string;
  sentenceGroupId?: string;
  // 互換性のためのエイリアス
  original?: string;
  translation?: string;
  translationGptMini?: string;
}

// Mock update type for development
export interface MockUpdate {
  original: string;
  translation: string;
}

// Memo type
export interface Memo {
  text: string;
  translation: string;
  timestamp: Date;
}

// Window resize mode
export enum ResizeMode {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic'
}

// UniVoice component props
export interface UniVoiceProps {
  // Display overrides
  realtimeSegmentsOverride?: any[]; // DisplaySegment type
  historyOverride?: HistoryEntry[];
  summaryOverride?: { japanese: string; english: string };
  
  // Callbacks
  onUserTranslate?: (text: string, from: string, to: string) => Promise<string>;
  onStartSession?: () => Promise<void>;
  onStopSession?: () => Promise<void>;
  onClose?: () => void;
  
  // Settings overrides
  sourceLanguageOverride?: string;
  targetLanguageOverride?: string;
  sessionConfig?: {
    className: string;
    sourceLanguage: string;
    targetLanguage: string;
  } | null;
  
  // Initial values
  initialTheme?: Theme;
  initialDisplayMode?: DisplayMode;
}

// Section visibility state
export interface SectionVisibility {
  showHeader: boolean;
  showSettings: boolean;
  showQuestionSection: boolean;
  showProgressiveSummary: boolean;
  showHistoryPanel: boolean;
  showSummaryPanel: boolean;
}

// Display content structure
export interface DisplayContent {
  original: {
    recent?: string;
    older?: string;
    oldest?: string;
  };
  translation: {
    recent?: string;
    older?: string;
    oldest?: string;
  };
  opacity: {
    recent: number;
    older: number;
    oldest: number;
  };
}

// Theme configuration
export interface ThemeConfig {
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  borderColor: string;
}

// Language configuration (for consistency with existing LanguageConfig)
export interface LanguageOption {
  value: string;
  label: string;
}

// Section definition for layout management
export interface SectionDefinition {
  id: string;
  height: number;
  resizable: boolean;
  toggleable: boolean;
  displayName: string;
  minHeight?: number;
  maxHeight?: number;
}