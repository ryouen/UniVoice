"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracingService = exports.TracingService = void 0;
const events_1 = require("events");
const logger_1 = require("../../../utils/logger");
class TracingService extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.activeSpans = new Map();
        this.completedTraces = new Map();
        this.traceContextStack = [];
        this.config = {
            enabled: true,
            samplingRate: 1.0, // 100% sampling in development
            maxSpansPerTrace: 1000,
            maxTraceRetentionMs: 60 * 60 * 1000, // 1 hour
            enablePerformanceAnalysis: true,
            slowOperationThresholdMs: 1000,
            ...config
        };
        logger_1.logger.info('TracingService initialized', {
            component: 'TracingService',
            layer: 'adapters',
            config: this.config
        });
    }
    /**
     * Start a new trace
     */
    startTrace(operationName, correlationId) {
        if (!this.config.enabled || !this.shouldSample()) {
            return this.createNoOpContext();
        }
        const traceId = this.generateTraceId();
        const spanId = this.generateSpanId();
        const span = {
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
        const context = {
            traceId,
            spanId,
            correlationId
        };
        this.traceContextStack.push(context);
        logger_1.logger.debug('Trace started', {
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
    startSpan(operationName, parentContext) {
        if (!this.config.enabled) {
            return this.createNoOpContext();
        }
        const parent = parentContext || this.getCurrentContext();
        if (!parent) {
            return this.startTrace(operationName);
        }
        const spanId = this.generateSpanId();
        const span = {
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
        const context = {
            traceId: parent.traceId,
            spanId,
            correlationId: parent.correlationId
        };
        this.traceContextStack.push(context);
        logger_1.logger.debug('Span started', {
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
    finishSpan(context, status = 'completed') {
        if (!this.config.enabled || !context.spanId) {
            return;
        }
        const span = this.activeSpans.get(context.spanId);
        if (!span) {
            logger_1.logger.warn('Span not found for finishing', {
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
        logger_1.logger.debug('Span finished', {
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
    setTag(context, key, value) {
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
    addLog(context, level, message, fields) {
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
    getCurrentContext() {
        return this.traceContextStack.length > 0
            ? this.traceContextStack[this.traceContextStack.length - 1]
            : null;
    }
    /**
     * Get trace by ID
     */
    getTrace(traceId) {
        return this.completedTraces.get(traceId) || null;
    }
    /**
     * Get all traces
     */
    getAllTraces() {
        return new Map(this.completedTraces);
    }
    /**
     * Clear old traces
     */
    cleanup() {
        const cutoffTime = Date.now() - this.config.maxTraceRetentionMs;
        for (const [traceId, spans] of this.completedTraces.entries()) {
            const oldestSpan = spans.reduce((oldest, span) => span.startTime < oldest.startTime ? span : oldest);
            if (oldestSpan.startTime < cutoffTime) {
                this.completedTraces.delete(traceId);
            }
        }
        logger_1.logger.debug('Trace cleanup completed', {
            component: 'TracingService',
            remainingTraces: this.completedTraces.size
        });
    }
    /**
     * Get performance metrics
     */
    getMetrics() {
        const allSpans = Array.from(this.completedTraces.values()).flat();
        const durations = allSpans
            .filter(span => span.duration !== undefined)
            .map(span => span.duration);
        const avgSpanDuration = durations.length > 0
            ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
            : 0;
        const slowOperations = durations.filter(duration => duration > this.config.slowOperationThresholdMs).length;
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
    destroy() {
        this.activeSpans.clear();
        this.completedTraces.clear();
        this.traceContextStack = [];
        this.removeAllListeners();
        logger_1.logger.info('TracingService destroyed', {
            component: 'TracingService'
        });
    }
    // Private methods
    shouldSample() {
        return Math.random() < this.config.samplingRate;
    }
    generateTraceId() {
        return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
    }
    generateSpanId() {
        return `span-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
    }
    createNoOpContext() {
        return {
            traceId: 'noop',
            spanId: 'noop'
        };
    }
    analyzePerformance(span) {
        if (!span.duration)
            return;
        if (span.duration > this.config.slowOperationThresholdMs) {
            logger_1.logger.warn('Slow operation detected', {
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
    checkTraceCompletion(traceId) {
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
                logger_1.logger.debug('Trace completed', {
                    component: 'TracingService',
                    traceId,
                    spanCount: traceSpans.length,
                    totalDuration: this.calculateTraceDuration(traceSpans)
                });
            }
        }
    }
    calculateTraceDuration(spans) {
        if (spans.length === 0)
            return 0;
        const startTime = Math.min(...spans.map(span => span.startTime));
        const endTime = Math.max(...spans.map(span => span.endTime || span.startTime));
        return endTime - startTime;
    }
}
exports.TracingService = TracingService;
// Singleton instance
exports.tracingService = new TracingService();
