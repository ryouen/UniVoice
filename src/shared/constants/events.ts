/**
 * UniVoice Event Constants
 * 
 * イベント名を一元管理して、命名の不一致を防ぐ
 * 
 * 命名規則:
 * - kebab-case を使用（Electron IPC の慣例）
 * - 名前空間を明確にする（pipeline:, univoice: など）
 * - 動詞-名詞 の順序（update-original, complete-translation）
 */

/**
 * パイプライン関連イベント
 */
export const PIPELINE_EVENTS = {
  // 状態管理
  STARTED: 'pipeline:started',
  STOPPED: 'pipeline:stopped',
  ERROR: 'pipeline:error',
  
  // Deepgram関連
  DEEPGRAM_CONNECTED: 'pipeline:deepgramConnected',
  
  // リアルタイム更新
  CURRENT_ORIGINAL_UPDATE: 'current-original-update',
  CURRENT_TRANSLATION_UPDATE: 'current-translation-update',
  
  // 完了イベント
  TRANSLATION_COMPLETE: 'translation-complete',
  
  // 高度な機能
  SUMMARY_GENERATED: 'summary-generated',
  USER_TRANSLATION: 'user-translation',
  VOCABULARY_GENERATED: 'vocabulary-generated',
  FINAL_REPORT: 'final-report',
  
  // 音声関連
  AUDIO_PROGRESS: 'audio-progress',
  AUDIO_CHUNK: 'audio-chunk',
} as const;

/**
 * UniVoice IPC イベント
 */
export const UNIVOICE_EVENTS = {
  // コマンド
  COMMAND: 'univoice:command',
  
  // イベント
  EVENT: 'univoice:event',
} as const;

/**
 * UI関連イベント
 */
export const UI_EVENTS = {
  // モーダル
  SHOW_HISTORY_MODAL: 'ui:show-history-modal',
  SHOW_VOCABULARY_MODAL: 'ui:show-vocabulary-modal',
  SHOW_REPORT_MODAL: 'ui:show-report-modal',
  
  // セクション
  RESIZE_SECTION: 'ui:resize-section',
  TOGGLE_SECTION: 'ui:toggle-section',
  
  // 設定
  UPDATE_SETTINGS: 'ui:update-settings',
  SAVE_SETTINGS: 'ui:save-settings',
} as const;

/**
 * ドメインイベント
 */
export const DOMAIN_EVENTS = {
  // セッション
  SESSION_STARTED: 'domain:session-started',
  SESSION_STOPPED: 'domain:session-stopped',
  SESSION_PAUSED: 'domain:session-paused',
  SESSION_RESUMED: 'domain:session-resumed',
  
  // 翻訳
  TRANSLATION_REQUESTED: 'domain:translation-requested',
  TRANSLATION_COMPLETED: 'domain:translation-completed',
  TRANSLATION_FAILED: 'domain:translation-failed',
  
  // 要約
  SUMMARY_REQUESTED: 'domain:summary-requested',
  SUMMARY_COMPLETED: 'domain:summary-completed',
  SUMMARY_FAILED: 'domain:summary-failed',
  
  // 履歴
  HISTORY_ENTRY_ADDED: 'domain:history-entry-added',
  HISTORY_CLEARED: 'domain:history-cleared',
  HISTORY_EXPORTED: 'domain:history-exported',
} as const;

/**
 * 全イベントの統合型
 */
export const EVENTS = {
  ...PIPELINE_EVENTS,
  ...UNIVOICE_EVENTS,
  ...UI_EVENTS,
  ...DOMAIN_EVENTS,
} as const;

/**
 * イベント名の型
 */
export type EventName = typeof EVENTS[keyof typeof EVENTS];
export type PipelineEventName = typeof PIPELINE_EVENTS[keyof typeof PIPELINE_EVENTS];
export type UniVoiceEventName = typeof UNIVOICE_EVENTS[keyof typeof UNIVOICE_EVENTS];
export type UIEventName = typeof UI_EVENTS[keyof typeof UI_EVENTS];
export type DomainEventName = typeof DOMAIN_EVENTS[keyof typeof DOMAIN_EVENTS];

/**
 * イベントペイロードの型定義
 * 各イベントに対応するペイロードを定義
 */
export interface EventPayloads {
  // Pipeline Events
  [PIPELINE_EVENTS.STARTED]: void;
  [PIPELINE_EVENTS.STOPPED]: void;
  [PIPELINE_EVENTS.ERROR]: { message: string; code?: string };
  [PIPELINE_EVENTS.DEEPGRAM_CONNECTED]: void;
  [PIPELINE_EVENTS.CURRENT_ORIGINAL_UPDATE]: { text: string; isFinal: boolean };
  [PIPELINE_EVENTS.CURRENT_TRANSLATION_UPDATE]: string;
  [PIPELINE_EVENTS.TRANSLATION_COMPLETE]: {
    id: string;
    original: string;
    japanese: string;
    timestamp: number;
    firstPaintMs?: number;
    completeMs?: number;
  };
  [PIPELINE_EVENTS.SUMMARY_GENERATED]: {
    id: string;
    english: string;
    japanese: string;
    wordCount: number;
    timestamp: number;
  };
  [PIPELINE_EVENTS.USER_TRANSLATION]: {
    original: string;
    translated: string;
  };
  [PIPELINE_EVENTS.VOCABULARY_GENERATED]: {
    items: Array<{ term: string; definition: string; context?: string }>;
    totalTerms: number;
  };
  [PIPELINE_EVENTS.FINAL_REPORT]: string;
  [PIPELINE_EVENTS.AUDIO_PROGRESS]: {
    duration: number;
    processed: number;
  };
  [PIPELINE_EVENTS.AUDIO_CHUNK]: ArrayBuffer;
  
  // UI Events
  [UI_EVENTS.RESIZE_SECTION]: {
    section: string;
    height: number;
  };
  [UI_EVENTS.TOGGLE_SECTION]: {
    section: string;
    visible: boolean;
  };
  
  // Domain Events
  [DOMAIN_EVENTS.SESSION_STARTED]: {
    sessionId: string;
    className: string;
    timestamp: number;
  };
  [DOMAIN_EVENTS.SESSION_STOPPED]: {
    sessionId: string;
    duration: number;
  };
  [DOMAIN_EVENTS.TRANSLATION_COMPLETED]: {
    id: string;
    original: string;
    translated: string;
  };
  [DOMAIN_EVENTS.SUMMARY_COMPLETED]: {
    id: string;
    content: string;
  };
  [DOMAIN_EVENTS.HISTORY_ENTRY_ADDED]: {
    entry: {
      id: string;
      original: string;
      translation: string;
      timestamp: number;
    };
  };
}

/**
 * 型安全なイベント発行ヘルパー
 */
export function createTypedEvent<K extends keyof EventPayloads>(
  type: K,
  payload: EventPayloads[K]
): { type: K; payload: EventPayloads[K] } {
  return { type, payload };
}