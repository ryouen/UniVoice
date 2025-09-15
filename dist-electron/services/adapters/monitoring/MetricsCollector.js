"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = exports.MetricsCollector = void 0;
const events_1 = require("events");
const logger_1 = require("../../../utils/logger");
class MetricsCollector extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.metricsHistory = [];
        this.collectionTimer = null;
        this.lastMetrics = null;
        // Cumulative counters
        this.counters = {
            totalSegments: 0,
            totalErrors: 0,
            totalUIUpdates: 0,
            suppressedUIUpdates: 0,
            totalCoalescersCreated: 0,
            totalCoalescersDestroyed: 0,
            errorsByType: new Map(),
            firstPaintTimes: [],
            processingTimes: []
        };
        this.config = {
            collectionIntervalMs: 5000, // 5 seconds
            retentionPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
            alertThresholds: {
                firstPaintTimeMs: 1000,
                uiUpdateReductionRate: 0.5,
                errorRate: 0.05, // 5%
                memoryUsageMB: 500,
                cpuUsagePercent: 80
            },
            enableAlerts: true,
            enableDashboard: true,
            ...config
        };
        this.startTime = Date.now();
        logger_1.logger.info('MetricsCollector initialized', {
            component: 'MetricsCollector',
            layer: 'adapters',
            config: this.config
        });
    }
    /**
     * Start metrics collection
     */
    start() {
        if (this.collectionTimer) {
            logger_1.logger.warn('MetricsCollector already started', {
                component: 'MetricsCollector'
            });
            return;
        }
        this.collectionTimer = setInterval(() => {
            this.collectMetrics();
        }, this.config.collectionIntervalMs);
        // Initial collection
        this.collectMetrics();
        logger_1.logger.info('MetricsCollector started', {
            component: 'MetricsCollector',
            intervalMs: this.config.collectionIntervalMs
        });
    }
    /**
     * Stop metrics collection
     */
    stop() {
        if (this.collectionTimer) {
            clearInterval(this.collectionTimer);
            this.collectionTimer = null;
        }
        logger_1.logger.info('MetricsCollector stopped', {
            component: 'MetricsCollector'
        });
    }
    /**
     * Record segment processing event
     */
    recordSegmentProcessed(data) {
        this.counters.totalSegments++;
        this.counters.processingTimes.push(data.processingTime);
        if (data.suppressed) {
            this.counters.suppressedUIUpdates++;
        }
        else {
            this.counters.totalUIUpdates++;
        }
        // Limit processing time history (keep latest 1000 entries)
        if (this.counters.processingTimes.length > 1000) {
            this.counters.processingTimes = this.counters.processingTimes.slice(-1000);
        }
    }
    /**
     * Record First Paint Time
     */
    recordFirstPaintTime(time, correlationId) {
        this.counters.firstPaintTimes.push(time);
        // Limit history (keep latest 100 entries)
        if (this.counters.firstPaintTimes.length > 100) {
            this.counters.firstPaintTimes = this.counters.firstPaintTimes.slice(-100);
        }
        logger_1.logger.info('First Paint Time recorded', {
            component: 'MetricsCollector',
            firstPaintTime: time,
            correlationId
        });
    }
    /**
     * Record error event
     */
    recordError(errorType, correlationId) {
        this.counters.totalErrors++;
        const currentCount = this.counters.errorsByType.get(errorType) || 0;
        this.counters.errorsByType.set(errorType, currentCount + 1);
        logger_1.logger.warn('Error recorded', {
            component: 'MetricsCollector',
            errorType,
            totalErrors: this.counters.totalErrors,
            correlationId
        });
    }
    /**
     * Record Coalescer creation
     */
    recordCoalescerCreated() {
        this.counters.totalCoalescersCreated++;
    }
    /**
     * Record Coalescer destruction
     */
    recordCoalescerDestroyed() {
        this.counters.totalCoalescersDestroyed++;
    }
    /**
     * Collect current metrics
     */
    collectMetrics() {
        const now = Date.now();
        const memoryUsage = process.memoryUsage();
        // Calculate UI update reduction rate
        const totalUpdates = this.counters.totalUIUpdates + this.counters.suppressedUIUpdates;
        const uiUpdateReductionRate = totalUpdates > 0
            ? this.counters.suppressedUIUpdates / totalUpdates
            : 0;
        // Calculate average processing time
        const avgProcessingTime = this.counters.processingTimes.length > 0
            ? this.counters.processingTimes.reduce((a, b) => a + b, 0) / this.counters.processingTimes.length
            : 0;
        // Calculate error rate
        const errorRate = this.counters.totalSegments > 0
            ? this.counters.totalErrors / this.counters.totalSegments
            : 0;
        // Calculate segments per minute
        const runtimeMinutes = (now - this.startTime) / (1000 * 60);
        const segmentsPerMinute = runtimeMinutes > 0
            ? this.counters.totalSegments / runtimeMinutes
            : 0;
        const metrics = {
            timestamp: now,
            performance: {
                firstPaintTime: this.counters.firstPaintTimes.length > 0
                    ? this.counters.firstPaintTimes[this.counters.firstPaintTimes.length - 1]
                    : undefined,
                uiUpdateFrequency: this.counters.totalUIUpdates,
                uiUpdateReductionRate,
                avgProcessingTime,
                memoryUsage,
                cpuUsage: this.getCPUUsage()
            },
            streaming: {
                segmentsPerMinute,
                averageConfidence: 0.85, // TODO: Calculate from actual confidence values
                totalSegments: this.counters.totalSegments,
                suppressedUpdates: this.counters.suppressedUIUpdates,
                duplicateSuppressions: 0, // TODO: Implement
                avgHoldTime: avgProcessingTime
            },
            errors: {
                errorRate,
                totalErrors: this.counters.totalErrors,
                errorsByType: Object.fromEntries(this.counters.errorsByType),
                recoveryRate: 0.95 // TODO: Calculate from actual recovery data
            },
            resources: {
                activeCoalescers: this.counters.totalCoalescersCreated - this.counters.totalCoalescersDestroyed,
                totalCoalescersCreated: this.counters.totalCoalescersCreated,
                totalCoalescersDestroyed: this.counters.totalCoalescersDestroyed,
                activeConnections: 1, // TODO: Get actual connection count
                queueSize: 0 // TODO: Get actual queue size
            }
        };
        // Add to metrics history
        this.metricsHistory.push(metrics);
        this.lastMetrics = metrics;
        // Remove old metrics
        const cutoffTime = now - this.config.retentionPeriodMs;
        this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoffTime);
        // Emit event
        this.emit('metrics', metrics);
        // Check alerts
        if (this.config.enableAlerts) {
            this.checkAlerts(metrics);
        }
        logger_1.logger.debug('Metrics collected', {
            component: 'MetricsCollector',
            metrics: {
                totalSegments: metrics.streaming.totalSegments,
                uiUpdateReductionRate: metrics.performance.uiUpdateReductionRate,
                errorRate: metrics.errors.errorRate,
                memoryUsageMB: Math.round(metrics.performance.memoryUsage.heapUsed / 1024 / 1024)
            }
        });
    }
    /**
     * Get CPU usage (simplified implementation)
     */
    getCPUUsage() {
        // Simple CPU usage implementation
        // In production, use process.cpuUsage()
        return 0;
    }
    /**
     * Check alerts
     */
    checkAlerts(metrics) {
        const alerts = [];
        // First Paint Time check
        if (metrics.performance.firstPaintTime &&
            metrics.performance.firstPaintTime > this.config.alertThresholds.firstPaintTimeMs) {
            alerts.push({
                id: `first-paint-${Date.now()}`,
                timestamp: Date.now(),
                severity: 'high',
                type: 'PERFORMANCE_DEGRADATION',
                message: `First Paint Time exceeded threshold: ${metrics.performance.firstPaintTime}ms > ${this.config.alertThresholds.firstPaintTimeMs}ms`,
                metrics
            });
        }
        // UI update reduction rate check
        if (metrics.performance.uiUpdateReductionRate < this.config.alertThresholds.uiUpdateReductionRate) {
            alerts.push({
                id: `ui-reduction-${Date.now()}`,
                timestamp: Date.now(),
                severity: 'medium',
                type: 'OPTIMIZATION_UNDERPERFORMING',
                message: `UI update reduction rate below target: ${(metrics.performance.uiUpdateReductionRate * 100).toFixed(1)}% < ${(this.config.alertThresholds.uiUpdateReductionRate * 100)}%`,
                metrics
            });
        }
        // Error rate check
        if (metrics.errors.errorRate > this.config.alertThresholds.errorRate) {
            alerts.push({
                id: `error-rate-${Date.now()}`,
                timestamp: Date.now(),
                severity: 'critical',
                type: 'HIGH_ERROR_RATE',
                message: `Error rate exceeded threshold: ${(metrics.errors.errorRate * 100).toFixed(2)}% > ${(this.config.alertThresholds.errorRate * 100)}%`,
                metrics
            });
        }
        // Memory usage check
        const memoryUsageMB = metrics.performance.memoryUsage.heapUsed / 1024 / 1024;
        if (memoryUsageMB > this.config.alertThresholds.memoryUsageMB) {
            alerts.push({
                id: `memory-${Date.now()}`,
                timestamp: Date.now(),
                severity: 'high',
                type: 'HIGH_MEMORY_USAGE',
                message: `Memory usage exceeded threshold: ${memoryUsageMB.toFixed(1)}MB > ${this.config.alertThresholds.memoryUsageMB}MB`,
                metrics
            });
        }
        // Emit alerts
        alerts.forEach(alert => {
            this.emit('alert', alert);
            logger_1.logger.warn('Alert triggered', {
                component: 'MetricsCollector',
                alert
            });
        });
    }
    /**
     * Get current metrics
     */
    getCurrentMetrics() {
        return this.lastMetrics;
    }
    /**
     * Get metrics history
     */
    getMetricsHistory(fromTimestamp, toTimestamp) {
        let history = this.metricsHistory;
        if (fromTimestamp) {
            history = history.filter(m => m.timestamp >= fromTimestamp);
        }
        if (toTimestamp) {
            history = history.filter(m => m.timestamp <= toTimestamp);
        }
        return history;
    }
    /**
     * Get summary statistics
     */
    getSummaryStats(periodMs = 60 * 60 * 1000) {
        const cutoffTime = Date.now() - periodMs;
        const recentMetrics = this.metricsHistory.filter(m => m.timestamp > cutoffTime);
        if (recentMetrics.length === 0) {
            return {
                avgFirstPaintTime: 0,
                avgUiUpdateReductionRate: 0,
                avgErrorRate: 0,
                avgMemoryUsageMB: 0,
                totalSegments: 0,
                totalErrors: 0
            };
        }
        const avgFirstPaintTime = recentMetrics
            .filter(m => m.performance.firstPaintTime)
            .reduce((sum, m) => sum + (m.performance.firstPaintTime || 0), 0) / recentMetrics.length;
        const avgUiUpdateReductionRate = recentMetrics
            .reduce((sum, m) => sum + m.performance.uiUpdateReductionRate, 0) / recentMetrics.length;
        const avgErrorRate = recentMetrics
            .reduce((sum, m) => sum + m.errors.errorRate, 0) / recentMetrics.length;
        const avgMemoryUsageMB = recentMetrics
            .reduce((sum, m) => sum + (m.performance.memoryUsage.heapUsed / 1024 / 1024), 0) / recentMetrics.length;
        return {
            avgFirstPaintTime,
            avgUiUpdateReductionRate,
            avgErrorRate,
            avgMemoryUsageMB,
            totalSegments: this.counters.totalSegments,
            totalErrors: this.counters.totalErrors
        };
    }
    /**
     * Resource cleanup
     */
    destroy() {
        this.stop();
        this.metricsHistory = [];
        this.lastMetrics = null;
        this.removeAllListeners();
        logger_1.logger.info('MetricsCollector destroyed', {
            component: 'MetricsCollector'
        });
    }
}
exports.MetricsCollector = MetricsCollector;
// Singleton instance
exports.metricsCollector = new MetricsCollector();
