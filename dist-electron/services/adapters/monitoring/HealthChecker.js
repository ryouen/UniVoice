"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthChecker = exports.HealthChecker = void 0;
const events_1 = require("events");
const logger_1 = require("../../../utils/logger");
class HealthChecker extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.healthStatuses = new Map();
        this.checkTimers = new Map();
        this.recoveryTimers = new Map();
        this.isRunning = false;
        this.config = {
            enabled: true,
            checkIntervalMs: 30000, // 30 seconds
            timeoutMs: 5000, // 5 seconds
            maxErrorCount: 3,
            recoveryIntervalMs: 60000, // 1 minute
            maxRecoveryAttempts: 5,
            enableAutoRecovery: true,
            enableNotifications: true,
            ...config
        };
        logger_1.logger.info('HealthChecker initialized', {
            component: 'HealthChecker',
            layer: 'adapters',
            config: this.config
        });
    }
    /**
     * Start health monitoring
     */
    start() {
        if (this.isRunning) {
            logger_1.logger.warn('HealthChecker already running', {
                component: 'HealthChecker'
            });
            return;
        }
        this.isRunning = true;
        // Start health checks for all registered components
        for (const component of this.healthStatuses.keys()) {
            this.startHealthCheck(component);
        }
        logger_1.logger.info('HealthChecker started', {
            component: 'HealthChecker',
            monitoredComponents: Array.from(this.healthStatuses.keys())
        });
    }
    /**
     * Stop health monitoring
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        // Clear all timers
        for (const timer of this.checkTimers.values()) {
            clearInterval(timer);
        }
        for (const timer of this.recoveryTimers.values()) {
            clearTimeout(timer);
        }
        this.checkTimers.clear();
        this.recoveryTimers.clear();
        logger_1.logger.info('HealthChecker stopped', {
            component: 'HealthChecker'
        });
    }
    /**
     * Register a component for health monitoring
     */
    registerComponent(component, healthCheckFn, recoveryFn) {
        const status = {
            component,
            status: 'unknown',
            lastCheck: 0,
            errorCount: 0,
            recoveryAttempts: 0
        };
        this.healthStatuses.set(component, status);
        // Store health check and recovery functions
        this.setMaxListeners(this.getMaxListeners() + 2);
        this.on(`healthCheck:${component}`, healthCheckFn);
        if (recoveryFn) {
            this.on(`recovery:${component}`, recoveryFn);
        }
        // Start monitoring if already running
        if (this.isRunning) {
            this.startHealthCheck(component);
        }
        logger_1.logger.info('Component registered for health monitoring', {
            component: 'HealthChecker',
            monitoredComponent: component,
            hasRecoveryFn: !!recoveryFn
        });
    }
    /**
     * Unregister a component
     */
    unregisterComponent(component) {
        // Stop monitoring
        const timer = this.checkTimers.get(component);
        if (timer) {
            clearInterval(timer);
            this.checkTimers.delete(component);
        }
        const recoveryTimer = this.recoveryTimers.get(component);
        if (recoveryTimer) {
            clearTimeout(recoveryTimer);
            this.recoveryTimers.delete(component);
        }
        // Remove status and listeners
        this.healthStatuses.delete(component);
        this.removeAllListeners(`healthCheck:${component}`);
        this.removeAllListeners(`recovery:${component}`);
        logger_1.logger.info('Component unregistered from health monitoring', {
            component: 'HealthChecker',
            unregisteredComponent: component
        });
    }
    /**
     * Manually trigger health check for a component
     */
    async checkHealth(component) {
        const status = this.healthStatuses.get(component);
        if (!status) {
            logger_1.logger.warn('Component not registered for health monitoring', {
                component: 'HealthChecker',
                requestedComponent: component
            });
            return null;
        }
        await this.performHealthCheck(component);
        return this.healthStatuses.get(component) || null;
    }
    /**
     * Get health status for a component
     */
    getHealthStatus(component) {
        return this.healthStatuses.get(component) || null;
    }
    /**
     * Get health status for all components
     */
    getAllHealthStatuses() {
        return new Map(this.healthStatuses);
    }
    /**
     * Get overall system health
     */
    getSystemHealth() {
        const components = {};
        const summary = {
            total: 0,
            healthy: 0,
            degraded: 0,
            unhealthy: 0,
            unknown: 0
        };
        for (const [component, status] of this.healthStatuses.entries()) {
            components[component] = status;
            summary.total++;
            summary[status.status]++;
        }
        // Determine overall health
        let overall = 'healthy';
        if (summary.unhealthy > 0) {
            overall = 'unhealthy';
        }
        else if (summary.degraded > 0 || summary.unknown > 0) {
            overall = 'degraded';
        }
        return {
            overall,
            components,
            summary
        };
    }
    /**
     * Manually trigger recovery for a component
     */
    async triggerRecovery(component) {
        const status = this.healthStatuses.get(component);
        if (!status) {
            logger_1.logger.warn('Component not registered for recovery', {
                component: 'HealthChecker',
                requestedComponent: component
            });
            return false;
        }
        return await this.attemptRecovery(component);
    }
    /**
     * Resource cleanup
     */
    destroy() {
        this.stop();
        this.healthStatuses.clear();
        this.removeAllListeners();
        logger_1.logger.info('HealthChecker destroyed', {
            component: 'HealthChecker'
        });
    }
    // Private methods
    startHealthCheck(component) {
        if (!this.config.enabled) {
            return;
        }
        // Clear existing timer
        const existingTimer = this.checkTimers.get(component);
        if (existingTimer) {
            clearInterval(existingTimer);
        }
        // Start periodic health checks
        const timer = setInterval(async () => {
            await this.performHealthCheck(component);
        }, this.config.checkIntervalMs);
        this.checkTimers.set(component, timer);
        // Perform initial check
        setImmediate(() => this.performHealthCheck(component));
    }
    async performHealthCheck(component) {
        const status = this.healthStatuses.get(component);
        if (!status) {
            return;
        }
        const startTime = Date.now();
        try {
            // Execute health check with timeout
            const healthCheckPromise = this.executeHealthCheck(component);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Health check timeout')), this.config.timeoutMs);
            });
            const result = await Promise.race([healthCheckPromise, timeoutPromise]);
            const responseTime = Date.now() - startTime;
            // Update status
            status.lastCheck = Date.now();
            status.responseTime = responseTime;
            status.details = result.details;
            if (result.healthy) {
                // Reset error count on successful check
                status.errorCount = 0;
                status.status = 'healthy';
            }
            else {
                status.errorCount++;
                status.status = status.errorCount >= this.config.maxErrorCount ? 'unhealthy' : 'degraded';
            }
            // Emit health check event
            this.emit('healthCheck', {
                component,
                status: { ...status },
                responseTime
            });
            // Check if recovery is needed
            if (status.status === 'unhealthy' && this.config.enableAutoRecovery) {
                await this.scheduleRecovery(component);
            }
            logger_1.logger.debug('Health check completed', {
                component: 'HealthChecker',
                checkedComponent: component,
                status: status.status,
                responseTime,
                errorCount: status.errorCount
            });
        }
        catch (error) {
            // Handle health check failure
            status.lastCheck = Date.now();
            status.errorCount++;
            status.status = status.errorCount >= this.config.maxErrorCount ? 'unhealthy' : 'degraded';
            status.details = {
                error: error instanceof Error ? error.message : String(error)
            };
            logger_1.logger.error('Health check failed', {
                component: 'HealthChecker',
                checkedComponent: component,
                error: error instanceof Error ? error.message : String(error),
                errorCount: status.errorCount
            });
            // Emit health check failure event
            this.emit('healthCheckFailed', {
                component,
                status: { ...status },
                error
            });
            // Check if recovery is needed
            if (status.status === 'unhealthy' && this.config.enableAutoRecovery) {
                await this.scheduleRecovery(component);
            }
        }
        // Send notifications if enabled
        if (this.config.enableNotifications) {
            this.sendHealthAlert(component, status);
        }
    }
    async executeHealthCheck(component) {
        const listeners = this.listeners(`healthCheck:${component}`);
        if (listeners.length === 0) {
            throw new Error(`No health check function registered for component: ${component}`);
        }
        const healthCheckFn = listeners[0];
        return await healthCheckFn();
    }
    async scheduleRecovery(component) {
        const status = this.healthStatuses.get(component);
        if (!status) {
            return;
        }
        // Check if recovery is already scheduled
        if (this.recoveryTimers.has(component)) {
            return;
        }
        // Check if max recovery attempts reached
        if (status.recoveryAttempts >= this.config.maxRecoveryAttempts) {
            logger_1.logger.warn('Max recovery attempts reached', {
                component: 'HealthChecker',
                failedComponent: component,
                attempts: status.recoveryAttempts,
                maxAttempts: this.config.maxRecoveryAttempts
            });
            return;
        }
        // Schedule recovery
        const recoveryTimer = setTimeout(async () => {
            this.recoveryTimers.delete(component);
            await this.attemptRecovery(component);
        }, this.config.recoveryIntervalMs);
        this.recoveryTimers.set(component, recoveryTimer);
        logger_1.logger.info('Recovery scheduled', {
            component: 'HealthChecker',
            failedComponent: component,
            recoveryIn: this.config.recoveryIntervalMs
        });
    }
    async attemptRecovery(component) {
        const status = this.healthStatuses.get(component);
        if (!status) {
            return false;
        }
        status.recoveryAttempts++;
        status.lastRecoveryAttempt = Date.now();
        try {
            const listeners = this.listeners(`recovery:${component}`);
            if (listeners.length === 0) {
                logger_1.logger.warn('No recovery function registered', {
                    component: 'HealthChecker',
                    failedComponent: component
                });
                return false;
            }
            const recoveryFn = listeners[0];
            const recoveryResult = await recoveryFn();
            if (recoveryResult) {
                logger_1.logger.info('Recovery successful', {
                    component: 'HealthChecker',
                    recoveredComponent: component,
                    attempts: status.recoveryAttempts
                });
                // Reset error count and status
                status.errorCount = 0;
                status.status = 'healthy';
                // Emit recovery success event
                this.emit('recoverySuccess', {
                    component,
                    status: { ...status }
                });
                return true;
            }
            else {
                logger_1.logger.warn('Recovery failed', {
                    component: 'HealthChecker',
                    failedComponent: component,
                    attempts: status.recoveryAttempts
                });
                // Emit recovery failure event
                this.emit('recoveryFailed', {
                    component,
                    status: { ...status }
                });
                return false;
            }
        }
        catch (error) {
            logger_1.logger.error('Recovery attempt threw error', {
                component: 'HealthChecker',
                failedComponent: component,
                error: error instanceof Error ? error.message : String(error),
                attempts: status.recoveryAttempts
            });
            // Emit recovery error event
            this.emit('recoveryError', {
                component,
                status: { ...status },
                error
            });
            return false;
        }
    }
    sendHealthAlert(component, status) {
        // Only send alerts for status changes or critical issues
        const shouldAlert = status.status === 'unhealthy' ||
            (status.status === 'degraded' && status.errorCount === 1);
        if (!shouldAlert) {
            return;
        }
        const alert = {
            id: `health-${component}-${Date.now()}`,
            timestamp: Date.now(),
            severity: status.status === 'unhealthy' ? 'critical' : 'warning',
            component,
            message: this.generateAlertMessage(component, status),
            status: { ...status }
        };
        this.emit('healthAlert', alert);
        logger_1.logger.warn('Health alert sent', {
            component: 'HealthChecker',
            alert
        });
    }
    generateAlertMessage(component, status) {
        switch (status.status) {
            case 'unhealthy':
                return `Component ${component} is unhealthy (${status.errorCount} consecutive failures)`;
            case 'degraded':
                return `Component ${component} is degraded (${status.errorCount} recent failures)`;
            case 'healthy':
                return `Component ${component} has recovered`;
            default:
                return `Component ${component} status is ${status.status}`;
        }
    }
}
exports.HealthChecker = HealthChecker;
// Singleton instance
exports.healthChecker = new HealthChecker();
