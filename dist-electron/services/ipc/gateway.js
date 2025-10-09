"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipcGateway = exports.IPCGateway = void 0;
const events_1 = require("events");
const contracts_1 = require("./contracts");
const logger_1 = require("../../utils/logger");
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
class IPCGateway extends events_1.EventEmitter {
    constructor() {
        super();
        this.correlationMap = new Map();
        this.CORRELATION_TIMEOUT_MS = 30000; // 30 seconds
        this.componentLogger = logger_1.logger.child('IPCGateway');
        this.setupCorrelationCleanup();
        this.componentLogger.info('IPC Gateway initialized');
    }
    /**
     * Handle incoming IPC command from UI
     */
    async handleCommand(rawCommand) {
        const correlationId = this.generateCorrelationId();
        try {
            // Validate command structure
            const command = (0, contracts_1.validateIPCCommand)(rawCommand);
            // Track correlation
            this.correlationMap.set(correlationId, {
                timestamp: Date.now(),
                command: command.command,
            });
            this.componentLogger.info('IPC command received', {
                correlationId,
                command: command.command,
                params: command.params,
            });
            // Route to appropriate handler
            await this.routeCommand(command, correlationId);
        }
        catch (error) {
            this.componentLogger.error('IPC command validation failed', {
                correlationId,
                error: error instanceof Error ? error.message : String(error),
                rawCommand,
            });
            // Emit error event
            this.emitEvent((0, contracts_1.createErrorEvent)({
                code: 'COMMAND_VALIDATION_ERROR',
                message: error instanceof Error ? error.message : 'Unknown validation error',
                details: { rawCommand },
                recoverable: true,
            }, correlationId));
        }
    }
    /**
     * Route command to appropriate domain service
     */
    async routeCommand(command, correlationId) {
        switch (command.command) {
            case 'startListening':
                this.emit('domain-command', {
                    type: 'startListening',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'stopListening':
                this.emit('domain-command', {
                    type: 'stopListening',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'getHistory':
                this.emit('domain-command', {
                    type: 'getHistory',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'getFullHistory':
                this.emit('domain-command', {
                    type: 'getFullHistory',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'clearHistory':
                this.emit('domain-command', {
                    type: 'clearHistory',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'generateVocabulary':
                this.emit('domain-command', {
                    type: 'generateVocabulary',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'generateFinalReport':
                this.emit('domain-command', {
                    type: 'generateFinalReport',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'getAvailableSessions':
                this.emit('domain-command', {
                    type: 'getAvailableSessions',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'loadSession':
                this.emit('domain-command', {
                    type: 'loadSession',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'startSession':
                this.emit('domain-command', {
                    type: 'startSession',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'saveHistoryBlock':
                this.emit('domain-command', {
                    type: 'saveHistoryBlock',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'saveSummary':
                this.emit('domain-command', {
                    type: 'saveSummary',
                    params: command.params,
                    correlationId,
                });
                break;
            case 'saveSession':
                this.emit('domain-command', {
                    type: 'saveSession',
                    params: command.params,
                    correlationId,
                });
                break;
            default:
                // TypeScript should prevent this, but handle gracefully
                this.componentLogger.error('Unknown command type', { command, correlationId });
                this.emitEvent((0, contracts_1.createErrorEvent)({
                    code: 'UNKNOWN_COMMAND',
                    message: `Unknown command type: ${command.command}`,
                    recoverable: true,
                }, correlationId));
        }
    }
    /**
     * Generate unique correlation ID
     */
    generateCorrelationId() {
        return `ipc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Setup periodic cleanup of old correlation entries
     */
    setupCorrelationCleanup() {
        setInterval(() => {
            const now = Date.now();
            const expiredKeys = [];
            for (const [key, value] of this.correlationMap.entries()) {
                if (now - value.timestamp > this.CORRELATION_TIMEOUT_MS) {
                    expiredKeys.push(key);
                }
            }
            expiredKeys.forEach(key => {
                this.correlationMap.delete(key);
            });
            if (expiredKeys.length > 0) {
                this.componentLogger.debug('Cleaned up expired correlations', {
                    count: expiredKeys.length,
                });
            }
        }, 10000); // Cleanup every 10 seconds
    }
    /**
     * Get correlation info for debugging
     */
    getCorrelationInfo(correlationId) {
        return this.correlationMap.get(correlationId);
    }
    /**
     * Get all active correlations for debugging
     */
    getActiveCorrelations() {
        return Array.from(this.correlationMap.entries()).map(([id, info]) => ({
            correlationId: id,
            ...info,
        }));
    }
    /**
     * Emit pipeline event to UI
     */
    emitEvent(event) {
        try {
            // Validate event
            const validatedEvent = (0, contracts_1.validatePipelineEvent)(event);
            console.log('[IPCGateway] Emitting pipelineEvent:', validatedEvent.type);
            // Emit to UI listeners
            this.emit('pipelineEvent', validatedEvent);
            // Log significant events
            if (event.type === 'asr' || event.type === 'error' || event.type === 'status') {
                this.componentLogger.debug('Emitting event', {
                    type: event.type,
                    correlationId: event.correlationId,
                });
            }
        }
        catch (error) {
            this.componentLogger.error('Failed to emit event', {
                error: error instanceof Error ? error.message : String(error),
                eventType: event?.type,
                correlationId: event?.correlationId,
            });
            this.emit('pipelineEvent', (0, contracts_1.createErrorEvent)({
                code: 'EVENT_VALIDATION_ERROR',
                message: error instanceof Error ? error.message : 'Unknown event validation error',
                details: { rawEvent: event },
                recoverable: true,
            }, event?.correlationId));
        }
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.correlationMap.clear();
        this.removeAllListeners();
        this.componentLogger.info('IPC Gateway destroyed');
    }
}
exports.IPCGateway = IPCGateway;
// Singleton instance
exports.ipcGateway = new IPCGateway();
