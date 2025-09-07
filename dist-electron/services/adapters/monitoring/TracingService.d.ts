import { EventEmitter } from 'events';
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
    samplingRate: number;
    maxSpansPerTrace: number;
    maxTraceRetentionMs: number;
    enablePerformanceAnalysis: boolean;
    slowOperationThresholdMs: number;
}
export declare class TracingService extends EventEmitter {
    private config;
    private activeSpans;
    private completedTraces;
    private traceContextStack;
    constructor(config?: Partial<TracingConfig>);
    /**
     * Start a new trace
     */
    startTrace(operationName: string, correlationId?: string): TraceContext;
    /**
     * Start a child span
     */
    startSpan(operationName: string, parentContext?: TraceContext): TraceContext;
    /**
     * Finish a span
     */
    finishSpan(context: TraceContext, status?: 'completed' | 'error'): void;
    /**
     * Add tag to span
     */
    setTag(context: TraceContext, key: string, value: any): void;
    /**
     * Add log to span
     */
    addLog(context: TraceContext, level: TraceLog['level'], message: string, fields?: Record<string, any>): void;
    /**
     * Get current trace context
     */
    getCurrentContext(): TraceContext | null;
    /**
     * Get trace by ID
     */
    getTrace(traceId: string): TraceSpan[] | null;
    /**
     * Get all traces
     */
    getAllTraces(): Map<string, TraceSpan[]>;
    /**
     * Clear old traces
     */
    cleanup(): void;
    /**
     * Get performance metrics
     */
    getMetrics(): {
        activeSpans: number;
        completedTraces: number;
        avgSpanDuration: number;
        slowOperations: number;
    };
    /**
     * Resource cleanup
     */
    destroy(): void;
    private shouldSample;
    private generateTraceId;
    private generateSpanId;
    private createNoOpContext;
    private analyzePerformance;
    private checkTraceCompletion;
    private calculateTraceDuration;
}
export declare const tracingService: TracingService;
