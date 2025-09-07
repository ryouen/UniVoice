import fs from 'fs';
import path from 'path';

/**
 * Structured Logger for UniVoice
 * 
 * Features:
 * - JSONL format for easy parsing
 * - Correlation ID tracking
 * - Performance metrics
 * - File rotation
 * - Console output in development
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  component?: string;
  data?: Record<string, unknown>;
  performance?: {
    duration?: number;
    memory?: number;
  };
}

class Logger {
  private logLevel: LogLevel;
  private logDir: string;
  private logFile: string;
  private isDevelopment: boolean;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, `univoice-${this.getDateString()}.jsonl`);
    
    this.ensureLogDirectory();
  }

  debug(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.log('debug', message, data, correlationId);
  }

  info(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.log('info', message, data, correlationId);
  }

  warn(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.log('warn', message, data, correlationId);
  }

  error(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.log('error', message, data, correlationId);
  }

  /**
   * Log with performance metrics
   */
  performance(
    level: LogLevel,
    message: string,
    startTime: number,
    data?: Record<string, unknown>,
    correlationId?: string
  ): void {
    const duration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();
    
    this.log(level, message, data, correlationId, {
      duration,
      memory: memoryUsage.heapUsed,
    });
  }

  /**
   * Create a child logger with component context
   */
  child(component: string) {
    return {
      debug: (message: string, data?: Record<string, unknown>, correlationId?: string) =>
        this.log('debug', message, data, correlationId, undefined, component),
      info: (message: string, data?: Record<string, unknown>, correlationId?: string) =>
        this.log('info', message, data, correlationId, undefined, component),
      warn: (message: string, data?: Record<string, unknown>, correlationId?: string) =>
        this.log('warn', message, data, correlationId, undefined, component),
      error: (message: string, data?: Record<string, unknown>, correlationId?: string) =>
        this.log('error', message, data, correlationId, undefined, component),
      performance: (
        level: LogLevel,
        message: string,
        startTime: number,
        data?: Record<string, unknown>,
        correlationId?: string
      ) => this.performance(level, message, startTime, data, correlationId),
    };
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    correlationId?: string,
    performance?: { duration?: number; memory?: number },
    component?: string
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(correlationId && { correlationId }),
      ...(component && { component }),
      ...(data && { data }),
      ...(performance && { performance }),
    };

    // Console output in development
    if (this.isDevelopment) {
      this.logToConsole(logEntry);
    }

    // File output
    this.logToFile(logEntry);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private logToConsole(entry: LogEntry): void {
    const colorMap: Record<LogLevel, string> = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };

    const reset = '\x1b[0m';
    const color = colorMap[entry.level];
    
    const prefix = `${color}[${entry.timestamp}] ${entry.level.toUpperCase()}${reset}`;
    const correlationSuffix = entry.correlationId ? ` (${entry.correlationId})` : '';
    const componentSuffix = entry.component ? ` [${entry.component}]` : '';
    
    console.log(`${prefix}${componentSuffix}: ${entry.message}${correlationSuffix}`);
    
    if (entry.data) {
      console.log('  Data:', JSON.stringify(entry.data, null, 2));
    }
    
    if (entry.performance) {
      console.log('  Performance:', JSON.stringify(entry.performance, null, 2));
    }
  }

  private logToFile(entry: LogEntry): void {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, logLine, 'utf8');
    } catch (error) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', error);
      console.log('Log entry:', entry);
    }
  }

  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get log file path for external access
   */
  getLogFile(): string {
    return this.logFile;
  }

  /**
   * Read recent log entries
   */
  getRecentLogs(lines: number = 100): LogEntry[] {
    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.trim().split('\n').slice(-lines);
      
      return logLines
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is LogEntry => entry !== null);
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }
}

// Singleton instance
export const logger = new Logger();