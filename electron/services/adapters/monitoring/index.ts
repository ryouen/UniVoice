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

export type {
  SystemMetrics,
  MetricsAlert,
  MetricsCollectorConfig,
  MetricPoint,
  MetricSeries
} from './MetricsCollector';

export type {
  TraceSpan,
  TraceLog,
  TraceContext,
  TracingConfig
} from './TracingService';

export type {
  HealthStatus,
  HealthCheckConfig,
  HealthAlert
} from './HealthChecker';

/**
 * Initialize all monitoring services
 */
export function initializeMonitoring(): {
  metrics: MetricsCollector;
  tracing: TracingService;
  health: HealthChecker;
} {
  // Start metrics collection
  metricsCollector.start();
  
  // Health checker will be started when components are registered
  // Tracing service is always ready
  
  return {
    metrics: metricsCollector,
    tracing: tracingService,
    health: healthChecker
  };
}

/**
 * Cleanup all monitoring services
 */
export function destroyMonitoring(): void {
  metricsCollector.destroy();
  tracingService.destroy();
  healthChecker.destroy();
}