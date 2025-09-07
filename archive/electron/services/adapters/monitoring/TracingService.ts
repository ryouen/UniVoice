import { EventEmitter } from 'events';
import { logger } from '../../../utils/logger';

/**
 * Distributed Tracing System
 * 
 * Architecture: Adapters Layer (Infrastructure)
 * Tracks processing flows and identifies bottlenecks for debugging support
 */
export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: TraceLog[];
  status: 'active' | 'completed' | 'error';
  correlationId?: string;
}

export interface TraceLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, any>;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  correlationId?: string;
}

export interface TracingConfig {
  enabled: boolean;
  samplingRate: number; // 0.0 - 1.0
  maxSpansPerTrace: number;
  maxTraceRetentionMs: number;
  enablePerformanceAnalysis: boolean;
  slowOperationThresholdMs: number;
}

export class TracingService extends EventEmitter {
  private config: TracingConfig;
  private activeSpans = new Map<string, TraceSpan>();
  private completedTraces = new Map<string, TraceSpan[]>();
  private traceContextStack: TraceContext[] = [];

  constructor(config: Partial<TracingConfig> = {}) {
    super();
    this.config = {
      enabled: true,
      samplingRate: 1.0, // 100% sampling in development
      maxSpansPerTrace: 1000,
      maxTraceRetentionMs: 60 * 60 * 1000, // 1 hour
      enablePerformanceAnalysis: true,
      slowOperationThresholdMs: 1000,
      ...config
    };

    logger.info('TracingService initialized', {
      component: 'TracingService',
      layer: 'adapters',
      config: this.config
    });
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string, correlationId?: string): TraceContext {
    if (!this.config.enabled || !this.shouldSample()) {
      return this.createNoOpContext();
    }

    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();

    const span: TraceSpan = {
      traceId,
      spanId,
      operationName,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: 'active',
      correlationId
    };

    this.activeSpans.set(spanId, span);

    const context: TraceContext = {
      traceId,
      spanId,
      correlationId
    };

    this.traceContextStack.push(context);

    logger.debug('Trace started', {
      component: 'TracingService',
      traceId,
      spanId,
      operationName,
      correlationId
    });

    return context;
  }

  /**
   * Start a child span
   */
  startSpan(operationName: string, parentContext?: TraceContext): TraceContext {
    if (!this.config.enabled) {
      return this.createNoOpContext();
    }

    const parent = parentContext || this.getCurrentContext();
    if (!parent) {
      return this.startTrace(operationName);
    }

    const spanId = this.generateSpanId();
    const span: TraceSpan = {
      traceId: parent.traceId,
      spanId,
      parentSpanId: parent.spanId,
      operationName,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: 'active',
      correlationId: parent.correlationId
    };

    this.activeSpans.set(spanId, span);

    const context: TraceContext = {
      traceId: parent.traceId,
      spanId,
      correlationId: parent.correlationId
    };

    this.traceContextStack.push(context);

    logger.debug('Span started', {
      component: 'TracingService',
      traceId: parent.traceId,
      spanId,
      parentSpanId: parent.spanId,
      operationName
    });

    return context;
  }

  /**
   * Finish a span
   */
  finishSpan(context: TraceContext, status: 'completed' | 'error' = 'completed'): void {
    if (!this.config.enabled || !context.spanId) {
      return;
    }

    const span = this.activeSpans.get(context.spanId);
    if (!span) {
      logger.warn('Span not found for finishing', {
        component: 'TracingService',
        spanId: context.spanId
      });
      return;
    }

    const endTime = Date.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = status;

    this.activeSpans.delete(context.spanId);

    // Add to trace
    const traceSpans = this.completedTraces.get(span.traceId) || [];
    traceSpans.push(span);
    this.completedTraces.set(span.traceId, traceSpans);

    // Remove from stack
    const stackIndex = this.traceContextStack.findIndex(ctx => ctx.spanId === context.spanId);
    if (stackIndex >= 0) {
      this.traceContextStack.splice(stackIndex, 1);
    }

    // Performance analysis
    if (this.config.enablePerformanceAnalysis && span.duration) {
      this.analyzePerformance(span);
    }

    // Emit event
    this.emit('spanFinished', span);

    logger.debug('Span finished', {
      component: 'TracingService',
      traceId: span.traceId,
      spanId: span.spanId,
      operationName: span.operationName,
      duration: span.duration,
      status
    });

    // Check trace completion
    this.checkTraceCompletion(span.traceId);
  }

  /**
   * Add tag to span
   */
  setTag(context: TraceContext, key: string, value: any): void {
    if (!this.config.enabled || !context.spanId) {
      return;
    }

    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  /**
   * Add log to span
   */
  addLog(context: TraceContext, level: TraceLog['level'], message: string, fields?: Record<string, any>): void {
    if (!this.config.enabled || !context.spanId) {
      return;
    }

    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        level,
        message,
        fields
      });
    }
  }

  /**
   * Get current trace context
   */
  getCurrentContext(): TraceContext | null {
    return this.traceContextStack.length > 0 
      ? this.traceContextStack[this.traceContextStack.length - 1] 
      : null;
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): TraceSpan[] | null {
    return this.completedTraces.get(traceId) || null;
  }

  /**
   * Get all traces
   */
  getAllTraces(): Map<string, TraceSpan[]> {
    return new Map(this.completedTraces);
  }

  /**
   * Clear old traces
   */
  cleanup(): void {
    const cutoffTime = Date.now() - this.config.maxTraceRetentionMs;
    
    for (const [traceId, spans] of this.completedTraces.entries()) {
      const oldestSpan = spans.reduce((oldest, span) => 
        span.startTime < oldest.startTime ? span : oldest
      );
      
      if (oldestSpan.startTime < cutoffTime) {
        this.completedTraces.delete(traceId);
      }
    }

    logger.debug('Trace cleanup completed', {
      component: 'TracingService',
      remainingTraces: this.completedTraces.size
    });
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    activeSpans: number;
    completedTraces: number;
    avgSpanDuration: number;
    slowOperations: number;
  } {
    const allSpans = Array.from(this.completedTraces.values()).flat();
    const durations = allSpans
      .filter(span => span.duration !== undefined)
      .map(span => span.duration!);

    const avgSpanDuration = durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
      : 0;

    const slowOperations = durations.filter(duration => 
      duration > this.config.slowOperationThresholdMs
    ).length;

    return {
      activeSpans: this.activeSpans.size,
      completedTraces: this.completedTraces.size,
      avgSpanDuration,
      slowOperations
    };
  }

  /**
   * Resource cleanup
   */
  destroy(): void {
    this.activeSpans.clear();
    this.completedTraces.clear();
    this.traceContextStack = [];
    this.removeAllListeners();

    logger.info('TracingService destroyed', {
      component: 'TracingService'
    });
  }

  // Private methods

  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
  }

  private generateSpanId(): string {
    return `span-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
  }

  private createNoOpContext(): TraceContext {
    return {
      traceId: 'noop',
      spanId: 'noop'
    };
  }

  private analyzePerformance(span: TraceSpan): void {
    if (!span.duration) return;

    if (span.duration > this.config.slowOperationThresholdMs) {
      logger.warn('Slow operation detected', {
        component: 'TracingService',
        traceId: span.traceId,
        spanId: span.spanId,
        operationName: span.operationName,
        duration: span.duration,
        threshold: this.config.slowOperationThresholdMs
      });

      this.emit('slowOperation', {
        span,
        threshold: this.config.slowOperationThresholdMs
      });
    }
  }

  private checkTraceCompletion(traceId: string): void {
    // Check if all spans in trace are completed
    const hasActiveSpans = Array.from(this.activeSpans.values())
      .some(span => span.traceId === traceId);

    if (!hasActiveSpans) {
      const traceSpans = this.completedTraces.get(traceId);
      if (traceSpans) {
        this.emit('traceCompleted', {
          traceId,
          spans: traceSpans,
          totalDuration: this.calculateTraceDuration(traceSpans)
        });

        logger.debug('Trace completed', {
          component: 'TracingService',
          traceId,
          spanCount: traceSpans.length,
          totalDuration: this.calculateTraceDuration(traceSpans)
        });
      }
    }
  }

  private calculateTraceDuration(spans: TraceSpan[]): number {
    if (spans.length === 0) return 0;

    const startTime = Math.min(...spans.map(span => span.startTime));
    const endTime = Math.max(...spans.map(span => span.endTime || span.startTime));
    
    return endTime - startTime;
  }
}

// Singleton instance
export const tracingService = new TracingService();