import { EventEmitter } from 'events';
import { logger } from '../../../utils/logger';

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
  // Performance metrics
  performance: {
    firstPaintTime?: number;
    uiUpdateFrequency: number;
    uiUpdateReductionRate: number;
    avgProcessingTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: number;
  };
  // Streaming metrics
  streaming: {
    segmentsPerMinute: number;
    averageConfidence: number;
    totalSegments: number;
    suppressedUpdates: number;
    duplicateSuppressions: number;
    avgHoldTime: number;
  };
  // Error metrics
  errors: {
    errorRate: number;
    totalErrors: number;
    errorsByType: Record<string, number>;
    recoveryRate: number;
  };
  // Resource metrics
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

export class MetricsCollector extends EventEmitter {
  private config: MetricsCollectorConfig;
  private metricsHistory: SystemMetrics[] = [];
  private collectionTimer: NodeJS.Timeout | null = null;
  private startTime: number;
  private lastMetrics: SystemMetrics | null = null;

  // Cumulative counters
  private counters = {
    totalSegments: 0,
    totalErrors: 0,
    totalUIUpdates: 0,
    suppressedUIUpdates: 0,
    totalCoalescersCreated: 0,
    totalCoalescersDestroyed: 0,
    errorsByType: new Map<string, number>(),
    firstPaintTimes: [] as number[],
    processingTimes: [] as number[]
  };

  constructor(config: Partial<MetricsCollectorConfig> = {}) {
    super();
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

    logger.info('MetricsCollector initialized', {
      component: 'MetricsCollector',
      layer: 'adapters',
      config: this.config
    });
  }

  /**
   * Start metrics collection
   */
  start(): void {
    if (this.collectionTimer) {
      logger.warn('MetricsCollector already started', {
        component: 'MetricsCollector'
      });
      return;
    }

    this.collectionTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionIntervalMs);

    // Initial collection
    this.collectMetrics();

    logger.info('MetricsCollector started', {
      component: 'MetricsCollector',
      intervalMs: this.config.collectionIntervalMs
    });
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }

    logger.info('MetricsCollector stopped', {
      component: 'MetricsCollector'
    });
  }

  /**
   * Record segment processing event
   */
  recordSegmentProcessed(data: {
    processingTime: number;
    confidence: number;
    suppressed: boolean;
    correlationId?: string;
  }): void {
    this.counters.totalSegments++;
    this.counters.processingTimes.push(data.processingTime);
    
    if (data.suppressed) {
      this.counters.suppressedUIUpdates++;
    } else {
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
  recordFirstPaintTime(time: number, correlationId?: string): void {
    this.counters.firstPaintTimes.push(time);
    
    // Limit history (keep latest 100 entries)
    if (this.counters.firstPaintTimes.length > 100) {
      this.counters.firstPaintTimes = this.counters.firstPaintTimes.slice(-100);
    }

    logger.info('First Paint Time recorded', {
      component: 'MetricsCollector',
      firstPaintTime: time,
      correlationId
    });
  }

  /**
   * Record error event
   */
  recordError(errorType: string, correlationId?: string): void {
    this.counters.totalErrors++;
    const currentCount = this.counters.errorsByType.get(errorType) || 0;
    this.counters.errorsByType.set(errorType, currentCount + 1);

    logger.warn('Error recorded', {
      component: 'MetricsCollector',
      errorType,
      totalErrors: this.counters.totalErrors,
      correlationId
    });
  }

  /**
   * Record Coalescer creation
   */
  recordCoalescerCreated(): void {
    this.counters.totalCoalescersCreated++;
  }

  /**
   * Record Coalescer destruction
   */
  recordCoalescerDestroyed(): void {
    this.counters.totalCoalescersDestroyed++;
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
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

    const metrics: SystemMetrics = {
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

    logger.debug('Metrics collected', {
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
  private getCPUUsage(): number {
    // Simple CPU usage implementation
    // In production, use process.cpuUsage()
    return 0;
  }

  /**
   * Check alerts
   */
  private checkAlerts(metrics: SystemMetrics): void {
    const alerts: MetricsAlert[] = [];

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
      logger.warn('Alert triggered', {
        component: 'MetricsCollector',
        alert
      });
    });
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): SystemMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(fromTimestamp?: number, toTimestamp?: number): SystemMetrics[] {
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
  getSummaryStats(periodMs: number = 60 * 60 * 1000): {
    avgFirstPaintTime: number;
    avgUiUpdateReductionRate: number;
    avgErrorRate: number;
    avgMemoryUsageMB: number;
    totalSegments: number;
    totalErrors: number;
  } {
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
  destroy(): void {
    this.stop();
    this.metricsHistory = [];
    this.lastMetrics = null;
    this.removeAllListeners();

    logger.info('MetricsCollector destroyed', {
      component: 'MetricsCollector'
    });
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();