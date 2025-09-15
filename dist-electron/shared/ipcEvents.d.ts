/**
 * IPC Events - Unified Event System Types (Electron side)
 *
 * This is a simplified version of the shared types for electron process
 */
/**
 * Unified event types
 */
export type UnifiedEventKind = "partial" | "final" | "utterance_end" | "translation_update" | "translation_complete" | "display_update" | "summary" | "vocabulary" | "final_report" | "error" | "stats" | "status";
/**
 * Unified event structure
 */
export interface UnifiedEvent {
    v: 1;
    id: string;
    seq: number;
    ts: number;
    corr?: string;
    kind: UnifiedEventKind;
    payload?: Record<string, any>;
}
/**
 * Channel names
 */
export declare const UNIFIED_CHANNEL = "univoice:event";
/**
 * Helper to generate unique event ID
 */
export declare function generateEventId(): string;
