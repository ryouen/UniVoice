import { EventEmitter } from 'events';
import {
  IPCCommand,
  PipelineEvent,
  validateIPCCommand,
  validatePipelineEvent,
  createErrorEvent,
} from './contracts';
import { logger } from '../../utils/logger';

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
export class IPCGateway extends EventEmitter {
  private correlationMap = new Map<string, { timestamp: number; command: string }>();
  private readonly CORRELATION_TIMEOUT_MS = 30000; // 30 seconds
  private componentLogger = logger.child('IPCGateway');

  constructor() {
    super();
    this.setupCorrelationCleanup();
    
    this.componentLogger.info('IPC Gateway initialized');
  }

  /**
   * Handle incoming IPC command from UI
   */
  async handleCommand(rawCommand: unknown): Promise<void> {
    const correlationId = this.generateCorrelationId();
    
    try {
      // Validate command structure
      const command = validateIPCCommand(rawCommand);
      
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
      
    } catch (error) {
      this.componentLogger.error('IPC command validation failed', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        rawCommand,
      });

      // Emit error event
      this.emitEvent(createErrorEvent({
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
  private async routeCommand(command: IPCCommand, correlationId: string): Promise<void> {
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
        this.emitEvent(createErrorEvent({
          code: 'UNKNOWN_COMMAND',
          message: `Unknown command type: ${(command as any).command}`,
          recoverable: true,
        }, correlationId));
    }
  }

  /**
   * Generate unique correlation ID
   */
  private generateCorrelationId(): string {
    return `ipc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup periodic cleanup of old correlation entries
   */
  private setupCorrelationCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

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
  getCorrelationInfo(correlationId: string) {
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
  emitEvent(event: PipelineEvent): void {
    try {
      // Validate event
      const validatedEvent = validatePipelineEvent(event);
      
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
    } catch (error) {
      this.componentLogger.error('Failed to emit event', {
        error: error instanceof Error ? error.message : String(error),
        eventType: event?.type,
        correlationId: event?.correlationId,
      });
      this.emit('pipelineEvent', createErrorEvent({
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
  destroy(): void {
    this.correlationMap.clear();
    this.removeAllListeners();
    
    this.componentLogger.info('IPC Gateway destroyed');
  }
}

// Singleton instance
export const ipcGateway = new IPCGateway();
