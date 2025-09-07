/**
 * IPC Events - Unified Event System Types
 * 
 * This file defines the unified event schema for IPC communication
 * between Main and Renderer processes.
 * 
 * Stage 0: Shadow implementation (no behavior changes)
 * Stage 1: Active implementation with coalescing
 * Stage 2: Legacy channel removal
 */

import { z } from "zod";

/**
 * Unified event schema with metadata for ordering, deduplication, and correlation
 */
export const UnifiedEventSchema = z.object({
  v: z.literal(1),                          // schema version
  id: z.string(),                           // unique identifier (for deduplication)
  seq: z.number().int().nonnegative(),      // monotonic sequence number
  ts: z.number().int().nonnegative(),       // epoch milliseconds at emit time
  corr: z.string().optional(),              // correlation/session id
  kind: z.enum([
    "partial",                              // ASR interim result
    "final",                                // ASR final result
    "utterance_end",                        // Deepgram utterance end event
    "translation_update",                   // Translation progress
    "translation_complete",                 // Translation completion
    "display_update",                       // Display segment update
    "summary",                              // Summary generation
    "vocabulary",                           // Vocabulary extraction
    "final_report",                         // Final report generation
    "error",                                // Error event
    "stats",                                // Performance statistics
    "status"                                // Pipeline status change
  ]),
  payload: z.record(z.any()).optional()     // Event-specific payload
});

export type UnifiedEvent = z.infer<typeof UnifiedEventSchema>;

/**
 * Unified channel name - single point of truth
 */
export const UNIFIED_CHANNEL = "univoice:event";

/**
 * Legacy channel names (for compatibility during migration)
 */
export const LEGACY_CHANNELS = {
  CURRENT_ORIGINAL_UPDATE: "current-original-update",
  CURRENT_TRANSLATION_UPDATE: "current-translation-update",
  DISPLAY_SEGMENT_UPDATE: "display-segment-update",
  ASR_EVENT: "asr-event",
  TRANSLATION_COMPLETE: "translation-complete",
  TRANSLATION_UPDATE: "translation-update"
} as const;

/**
 * Helper to generate unique event ID
 */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Type guards for event kinds
 */
export const isASREvent = (event: UnifiedEvent): boolean => 
  event.kind === "partial" || event.kind === "final";

export const isTranslationEvent = (event: UnifiedEvent): boolean =>
  event.kind === "translation_update" || event.kind === "translation_complete";

export const isStatusEvent = (event: UnifiedEvent): boolean =>
  event.kind === "status";

export const isErrorEvent = (event: UnifiedEvent): boolean =>
  event.kind === "error";