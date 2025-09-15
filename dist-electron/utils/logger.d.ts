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
declare class Logger {
    private logLevel;
    private logDir;
    private logFile;
    private isDevelopment;
    constructor();
    debug(message: string, data?: Record<string, unknown>, correlationId?: string): void;
    info(message: string, data?: Record<string, unknown>, correlationId?: string): void;
    warn(message: string, data?: Record<string, unknown>, correlationId?: string): void;
    error(message: string, data?: Record<string, unknown>, correlationId?: string): void;
    /**
     * Log with performance metrics
     */
    performance(level: LogLevel, message: string, startTime: number, data?: Record<string, unknown>, correlationId?: string): void;
    /**
     * Create a child logger with component context
     */
    child(component: string): {
        debug: (message: string, data?: Record<string, unknown>, correlationId?: string) => void;
        info: (message: string, data?: Record<string, unknown>, correlationId?: string) => void;
        warn: (message: string, data?: Record<string, unknown>, correlationId?: string) => void;
        error: (message: string, data?: Record<string, unknown>, correlationId?: string) => void;
        performance: (level: LogLevel, message: string, startTime: number, data?: Record<string, unknown>, correlationId?: string) => void;
    };
    private log;
    private shouldLog;
    private logToConsole;
    private logToFile;
    private ensureLogDirectory;
    private getDateString;
    /**
     * Get log file path for external access
     */
    getLogFile(): string;
    /**
     * Read recent log entries
     */
    getRecentLogs(lines?: number): LogEntry[];
}
export declare const logger: Logger;
export {};
