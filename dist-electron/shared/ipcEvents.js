"use strict";
/**
 * IPC Events - Unified Event System Types (Electron side)
 *
 * This is a simplified version of the shared types for electron process
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIFIED_CHANNEL = void 0;
exports.generateEventId = generateEventId;
/**
 * Channel names
 */
exports.UNIFIED_CHANNEL = "univoice:event";
/**
 * Helper to generate unique event ID
 */
function generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
