/**
 * IPC Events - Unified Event System Types (Electron side)
 * 
 * This is a simplified version of the shared types for electron process
 */

/**
 * Unified event types
 */
export type UnifiedEventKind = 
  | "partial"
  | "final"
  | "utterance_end"
  | "translation_update"
  | "translation_complete"
  | "display_update"
  | "summary"
  | "vocabulary"
  | "final_report"
  | "error"
  | "stats"
  | "status";

/**
 * Unified event structure
 */
export interface UnifiedEvent {
  v: 1;                              // schema version
  id: string;                        // unique identifier
  seq: number;                       // monotonic sequence number
  ts: number;                        // epoch milliseconds
  corr?: string;                     // correlation/session id
  kind: UnifiedEventKind;
  payload?: Record<string, any>;     // Event-specific payload
}

/**
 * Channel names
 */
export const UNIFIED_CHANNEL = "univoice:event";

/**
 * Helper to generate unique event ID
 */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}