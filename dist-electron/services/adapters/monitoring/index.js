"use strict";
/**
 * Monitoring System - Unified Export
 *
 * Architecture: Adapters Layer (Infrastructure)
 * Provides centralized access to all monitoring components
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthChecker = exports.HealthChecker = exports.tracingService = exports.TracingService = exports.metricsCollector = exports.MetricsCollector = void 0;
exports.initializeMonitoring = initializeMonitoring;
exports.destroyMonitoring = destroyMonitoring;
const MetricsCollector_1 = require("./MetricsCollector");
Object.defineProperty(exports, "MetricsCollector", { enumerable: true, get: function () { return MetricsCollector_1.MetricsCollector; } });
Object.defineProperty(exports, "metricsCollector", { enumerable: true, get: function () { return MetricsCollector_1.metricsCollector; } });
const TracingService_1 = require("./TracingService");
Object.defineProperty(exports, "TracingService", { enumerable: true, get: function () { return TracingService_1.TracingService; } });
Object.defineProperty(exports, "tracingService", { enumerable: true, get: function () { return TracingService_1.tracingService; } });
const HealthChecker_1 = require("./HealthChecker");
Object.defineProperty(exports, "HealthChecker", { enumerable: true, get: function () { return HealthChecker_1.HealthChecker; } });
Object.defineProperty(exports, "healthChecker", { enumerable: true, get: function () { return HealthChecker_1.healthChecker; } });
/**
 * Initialize all monitoring services
 */
function initializeMonitoring() {
    // Start metrics collection
    MetricsCollector_1.metricsCollector.start();
    // Health checker will be started when components are registered
    // Tracing service is always ready
    return {
        metrics: MetricsCollector_1.metricsCollector,
        tracing: TracingService_1.tracingService,
        health: HealthChecker_1.healthChecker
    };
}
/**
 * Cleanup all monitoring services
 */
function destroyMonitoring() {
    MetricsCollector_1.metricsCollector.destroy();
    TracingService_1.tracingService.destroy();
    HealthChecker_1.healthChecker.destroy();
}
