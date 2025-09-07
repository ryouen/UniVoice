import { EventEmitter } from 'events';
import { logger } from '../../../utils/logger';

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

export class HealthChecker extends EventEmitter {
  private config: HealthCheckConfig;
  private healthStatuses = new Map<string, HealthStatus>();
  private checkTimers = new Map<string, NodeJS.Timeout>();
  private recoveryTimers = new Map<string, NodeJS.Timeout>();
  private isRunning = false;

  constructor(config: Partial<HealthCheckConfig> = {}) {
    super();
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

    logger.info('HealthChecker initialized', {
      component: 'HealthChecker',
      layer: 'adapters',
      config: this.config
    });
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('HealthChecker already running', {
        component: 'HealthChecker'
      });
      return;
    }

    this.isRunning = true;

    // Start health checks for all registered components
    for (const component of this.healthStatuses.keys()) {
      this.startHealthCheck(component);
    }

    logger.info('HealthChecker started', {
      component: 'HealthChecker',
      monitoredComponents: Array.from(this.healthStatuses.keys())
    });
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
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

    logger.info('HealthChecker stopped', {
      component: 'HealthChecker'
    });
  }

  /**
   * Register a component for health monitoring
   */
  registerComponent(
    component: string,
    healthCheckFn: () => Promise<{ healthy: boolean; details?: Record<string, any> }>,
    recoveryFn?: () => Promise<boolean>
  ): void {
    const status: HealthStatus = {
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

    logger.info('Component registered for health monitoring', {
      component: 'HealthChecker',
      monitoredComponent: component,
      hasRecoveryFn: !!recoveryFn
    });
  }

  /**
   * Unregister a component
   */
  unregisterComponent(component: string): void {
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

    logger.info('Component unregistered from health monitoring', {
      component: 'HealthChecker',
      unregisteredComponent: component
    });
  }

  /**
   * Manually trigger health check for a component
   */
  async checkHealth(component: string): Promise<HealthStatus | null> {
    const status = this.healthStatuses.get(component);
    if (!status) {
      logger.warn('Component not registered for health monitoring', {
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
  getHealthStatus(component: string): HealthStatus | null {
    return this.healthStatuses.get(component) || null;
  }

  /**
   * Get health status for all components
   */
  getAllHealthStatuses(): Map<string, HealthStatus> {
    return new Map(this.healthStatuses);
  }

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
  } {
    const components: Record<string, HealthStatus> = {};
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
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      overall = 'unhealthy';
    } else if (summary.degraded > 0 || summary.unknown > 0) {
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
  async triggerRecovery(component: string): Promise<boolean> {
    const status = this.healthStatuses.get(component);
    if (!status) {
      logger.warn('Component not registered for recovery', {
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
  destroy(): void {
    this.stop();
    this.healthStatuses.clear();
    this.removeAllListeners();

    logger.info('HealthChecker destroyed', {
      component: 'HealthChecker'
    });
  }

  // Private methods

  private startHealthCheck(component: string): void {
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

  private async performHealthCheck(component: string): Promise<void> {
    const status = this.healthStatuses.get(component);
    if (!status) {
      return;
    }

    const startTime = Date.now();

    try {
      // Execute health check with timeout
      const healthCheckPromise = this.executeHealthCheck(component);
      const timeoutPromise = new Promise<never>((_, reject) => {
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
      } else {
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

      logger.debug('Health check completed', {
        component: 'HealthChecker',
        checkedComponent: component,
        status: status.status,
        responseTime,
        errorCount: status.errorCount
      });

    } catch (error) {
      // Handle health check failure
      status.lastCheck = Date.now();
      status.errorCount++;
      status.status = status.errorCount >= this.config.maxErrorCount ? 'unhealthy' : 'degraded';
      status.details = {
        error: error instanceof Error ? error.message : String(error)
      };

      logger.error('Health check failed', {
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

  private async executeHealthCheck(component: string): Promise<{ healthy: boolean; details?: Record<string, any> }> {
    const listeners = this.listeners(`healthCheck:${component}`);
    if (listeners.length === 0) {
      throw new Error(`No health check function registered for component: ${component}`);
    }

    const healthCheckFn = listeners[0] as () => Promise<{ healthy: boolean; details?: Record<string, any> }>;
    return await healthCheckFn();
  }

  private async scheduleRecovery(component: string): Promise<void> {
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
      logger.warn('Max recovery attempts reached', {
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

    logger.info('Recovery scheduled', {
      component: 'HealthChecker',
      failedComponent: component,
      recoveryIn: this.config.recoveryIntervalMs
    });
  }

  private async attemptRecovery(component: string): Promise<boolean> {
    const status = this.healthStatuses.get(component);
    if (!status) {
      return false;
    }

    status.recoveryAttempts++;
    status.lastRecoveryAttempt = Date.now();

    try {
      const listeners = this.listeners(`recovery:${component}`);
      if (listeners.length === 0) {
        logger.warn('No recovery function registered', {
          component: 'HealthChecker',
          failedComponent: component
        });
        return false;
      }

      const recoveryFn = listeners[0] as () => Promise<boolean>;
      const recoveryResult = await recoveryFn();

      if (recoveryResult) {
        logger.info('Recovery successful', {
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
      } else {
        logger.warn('Recovery failed', {
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

    } catch (error) {
      logger.error('Recovery attempt threw error', {
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

  private sendHealthAlert(component: string, status: HealthStatus): void {
    // Only send alerts for status changes or critical issues
    const shouldAlert = status.status === 'unhealthy' || 
                       (status.status === 'degraded' && status.errorCount === 1);

    if (!shouldAlert) {
      return;
    }

    const alert: HealthAlert = {
      id: `health-${component}-${Date.now()}`,
      timestamp: Date.now(),
      severity: status.status === 'unhealthy' ? 'critical' : 'warning',
      component,
      message: this.generateAlertMessage(component, status),
      status: { ...status }
    };

    this.emit('healthAlert', alert);

    logger.warn('Health alert sent', {
      component: 'HealthChecker',
      alert
    });
  }

  private generateAlertMessage(component: string, status: HealthStatus): string {
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

// Singleton instance
export const healthChecker = new HealthChecker();