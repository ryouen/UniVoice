import { EventEmitter } from 'events';
import { PipelineEvent } from './contracts';
/**
 * IPC Gateway - Type-safe bridge between UI and Domain services
 *
 * Responsibilities:
 * - Validate all incoming commands
 * - Route commands to appropriate domain services
 * - Emit validated events to UI
 * - Handle correlation IDs for request tracking
 * - Provide structured error handling
 */
export declare class IPCGateway extends EventEmitter {
    private correlationMap;
    private readonly CORRELATION_TIMEOUT_MS;
    private componentLogger;
    constructor();
    /**
     * Handle incoming IPC command from UI
     */
    handleCommand(rawCommand: unknown): Promise<void>;
    /**
     * Route command to appropriate domain service
     */
    private routeCommand;
    /**
     * Generate unique correlation ID
     */
    private generateCorrelationId;
    /**
     * Setup periodic cleanup of old correlation entries
     */
    private setupCorrelationCleanup;
    /**
     * Get correlation info for debugging
     */
    getCorrelationInfo(correlationId: string): {
        timestamp: number;
        command: string;
    } | undefined;
    /**
     * Get all active correlations for debugging
     */
    getActiveCorrelations(): {
        timestamp: number;
        command: string;
        correlationId: string;
    }[];
    /**
     * Emit pipeline event to UI
     */
    emitEvent(event: PipelineEvent): void;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
export declare const ipcGateway: IPCGateway;
