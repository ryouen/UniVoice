/**
 * Monitoring System - Unified Export
 *
 * Architecture: Adapters Layer (Infrastructure)
 * Provides centralized access to all monitoring components
 */
import { MetricsCollector, metricsCollector } from './MetricsCollector';
import { TracingService, tracingService } from './TracingService';
import { HealthChecker, healthChecker } from './HealthChecker';
export { MetricsCollector, metricsCollector };
export { TracingService, tracingService };
export { HealthChecker, healthChecker };
export type { SystemMetrics, MetricsAlert, MetricsCollectorConfig, MetricPoint, MetricSeries } from './MetricsCollector';
export type { TraceSpan, TraceLog, TraceContext, TracingConfig } from './TracingService';
export type { HealthStatus, HealthCheckConfig, HealthAlert } from './HealthChecker';
/**
 * Initialize all monitoring services
 */
export declare function initializeMonitoring(): {
    metrics: MetricsCollector;
    tracing: TracingService;
    health: HealthChecker;
};
/**
 * Cleanup all monitoring services
 */
export declare function destroyMonitoring(): void;
