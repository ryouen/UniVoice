/**
 * UniVoice Main Process - Streaming UI Optimization
 * Clean Architecture with IPC Gateway and Domain Services
 */
import { UnifiedEvent } from './shared/ipcEvents';
/**
 * Emit unified event - Stage 0 implementation
 * This is a shadow implementation that does not change current behavior
 */
export declare function emitUnified(event: Omit<UnifiedEvent, 'id' | 'seq' | 'ts' | 'v'>): void;
