import { EventEmitter } from 'events';
/**
 * System Health Monitoring and Auto-Recovery
 *
 * Architecture: Adapters Layer (Infrastructure)
 * Monitors system health and provides automatic recovery capabilities
 */
export interface HealthStatus {
    component: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    lastCheck: number;
    responseTime?: number;
    errorCount: number;
    details?: Record<string, any>;
    recoveryAttempts: number;
    lastRecoveryAttempt?: number;
}
export interface HealthCheckConfig {
    enabled: boolean;
    checkIntervalMs: number;
    timeoutMs: number;
    maxErrorCount: number;
    recoveryIntervalMs: number;
    maxRecoveryAttempts: number;
    enableAutoRecovery: boolean;
    enableNotifications: boolean;
}
export interface HealthAlert {
    id: string;
    timestamp: number;
    severity: 'info' | 'warning' | 'error' | 'critical';
    component: string;
    message: string;
    status: HealthStatus;
    correlationId?: string;
}
export declare class HealthChecker extends EventEmitter {
    private config;
    private healthStatuses;
    private checkTimers;
    private recoveryTimers;
    private isRunning;
    constructor(config?: Partial<HealthCheckConfig>);
    /**
     * Start health monitoring
     */
    start(): void;
    /**
     * Stop health monitoring
     */
    stop(): void;
    /**
     * Register a component for health monitoring
     */
    registerComponent(component: string, healthCheckFn: () => Promise<{
        healthy: boolean;
        details?: Record<string, any>;
    }>, recoveryFn?: () => Promise<boolean>): void;
    /**
     * Unregister a component
     */
    unregisterComponent(component: string): void;
    /**
     * Manually trigger health check for a component
     */
    checkHealth(component: string): Promise<HealthStatus | null>;
    /**
     * Get health status for a component
     */
    getHealthStatus(component: string): HealthStatus | null;
    /**
     * Get health status for all components
     */
    getAllHealthStatuses(): Map<string, HealthStatus>;
    /**
     * Get overall system health
     */
    getSystemHealth(): {
        overall: 'healthy' | 'degraded' | 'unhealthy';
        components: Record<string, HealthStatus>;
        summary: {
            total: number;
            healthy: number;
            degraded: number;
            unhealthy: number;
            unknown: number;
        };
    };
    /**
     * Manually trigger recovery for a component
     */
    triggerRecovery(component: string): Promise<boolean>;
    /**
     * Resource cleanup
     */
    destroy(): void;
    private startHealthCheck;
    private performHealthCheck;
    private executeHealthCheck;
    private scheduleRecovery;
    private attemptRecovery;
    private sendHealthAlert;
    private generateAlertMessage;
}
export declare const healthChecker: HealthChecker;
