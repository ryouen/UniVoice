import { EventEmitter } from 'events';
/**
 * MetricsCollector - Centralized metrics collection and aggregation
 *
 * Architecture: Adapters Layer (Infrastructure)
 * Responsibilities:
 * - Collect performance metrics from all components
 * - Aggregate metrics over time windows
 * - Provide real-time metrics dashboard data
 * - Export metrics for external monitoring
 *
 * Key Features:
 * - Time-series data collection
 * - Configurable aggregation windows
 * - Memory-efficient circular buffers
 * - Real-time metric streaming
 */
export interface MetricPoint {
    timestamp: number;
    value: number;
    labels?: Record<string, string | number>;
}
export interface MetricSeries {
    name: string;
    points: MetricPoint[];
    aggregations: {
        count: number;
        sum: number;
        avg: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
        p99: number;
    };
}
export interface SystemMetrics {
    timestamp: number;
    correlationId?: string;
    performance: {
        firstPaintTime?: number;
        uiUpdateFrequency: number;
        uiUpdateReductionRate: number;
        avgProcessingTime: number;
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage?: number;
    };
    streaming: {
        segmentsPerMinute: number;
        averageConfidence: number;
        totalSegments: number;
        suppressedUpdates: number;
        duplicateSuppressions: number;
        avgHoldTime: number;
    };
    errors: {
        errorRate: number;
        totalErrors: number;
        errorsByType: Record<string, number>;
        recoveryRate: number;
    };
    resources: {
        activeCoalescers: number;
        totalCoalescersCreated: number;
        totalCoalescersDestroyed: number;
        activeConnections: number;
        queueSize: number;
    };
}
export interface MetricsAlert {
    id: string;
    timestamp: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    message: string;
    metrics: Partial<SystemMetrics>;
    correlationId?: string;
}
export interface MetricsCollectorConfig {
    collectionIntervalMs: number;
    retentionPeriodMs: number;
    alertThresholds: {
        firstPaintTimeMs: number;
        uiUpdateReductionRate: number;
        errorRate: number;
        memoryUsageMB: number;
        cpuUsagePercent: number;
    };
    enableAlerts: boolean;
    enableDashboard: boolean;
}
export declare class MetricsCollector extends EventEmitter {
    private config;
    private metricsHistory;
    private collectionTimer;
    private startTime;
    private lastMetrics;
    private counters;
    constructor(config?: Partial<MetricsCollectorConfig>);
    /**
     * Start metrics collection
     */
    start(): void;
    /**
     * Stop metrics collection
     */
    stop(): void;
    /**
     * Record segment processing event
     */
    recordSegmentProcessed(data: {
        processingTime: number;
        confidence: number;
        suppressed: boolean;
        correlationId?: string;
    }): void;
    /**
     * Record First Paint Time
     */
    recordFirstPaintTime(time: number, correlationId?: string): void;
    /**
     * Record error event
     */
    recordError(errorType: string, correlationId?: string): void;
    /**
     * Record Coalescer creation
     */
    recordCoalescerCreated(): void;
    /**
     * Record Coalescer destruction
     */
    recordCoalescerDestroyed(): void;
    /**
     * Collect current metrics
     */
    private collectMetrics;
    /**
     * Get CPU usage (simplified implementation)
     */
    private getCPUUsage;
    /**
     * Check alerts
     */
    private checkAlerts;
    /**
     * Get current metrics
     */
    getCurrentMetrics(): SystemMetrics | null;
    /**
     * Get metrics history
     */
    getMetricsHistory(fromTimestamp?: number, toTimestamp?: number): SystemMetrics[];
    /**
     * Get summary statistics
     */
    getSummaryStats(periodMs?: number): {
        avgFirstPaintTime: number;
        avgUiUpdateReductionRate: number;
        avgErrorRate: number;
        avgMemoryUsageMB: number;
        totalSegments: number;
        totalErrors: number;
    };
    /**
     * Resource cleanup
     */
    destroy(): void;
}
export declare const metricsCollector: MetricsCollector;
