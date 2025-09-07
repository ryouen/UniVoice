"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.logDir = path.join(process.cwd(), 'logs');
        this.logFile = path.join(this.logDir, `univoice-${this.getDateString()}.jsonl`);
        this.ensureLogDirectory();
    }
    debug(message, data, correlationId) {
        this.log('debug', message, data, correlationId);
    }
    info(message, data, correlationId) {
        this.log('info', message, data, correlationId);
    }
    warn(message, data, correlationId) {
        this.log('warn', message, data, correlationId);
    }
    error(message, data, correlationId) {
        this.log('error', message, data, correlationId);
    }
    /**
     * Log with performance metrics
     */
    performance(level, message, startTime, data, correlationId) {
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
    child(component) {
        return {
            debug: (message, data, correlationId) => this.log('debug', message, data, correlationId, undefined, component),
            info: (message, data, correlationId) => this.log('info', message, data, correlationId, undefined, component),
            warn: (message, data, correlationId) => this.log('warn', message, data, correlationId, undefined, component),
            error: (message, data, correlationId) => this.log('error', message, data, correlationId, undefined, component),
            performance: (level, message, startTime, data, correlationId) => this.performance(level, message, startTime, data, correlationId),
        };
    }
    log(level, message, data, correlationId, performance, component) {
        if (!this.shouldLog(level)) {
            return;
        }
        const logEntry = {
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
    shouldLog(level) {
        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
        };
        return levels[level] >= levels[this.logLevel];
    }
    logToConsole(entry) {
        const colorMap = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m', // Green
            warn: '\x1b[33m', // Yellow
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
    logToFile(entry) {
        try {
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.logFile, logLine, 'utf8');
        }
        catch (error) {
            // Fallback to console if file logging fails
            console.error('Failed to write to log file:', error);
            console.log('Log entry:', entry);
        }
    }
    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        }
        catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }
    getDateString() {
        return new Date().toISOString().split('T')[0];
    }
    /**
     * Get log file path for external access
     */
    getLogFile() {
        return this.logFile;
    }
    /**
     * Read recent log entries
     */
    getRecentLogs(lines = 100) {
        try {
            const content = fs.readFileSync(this.logFile, 'utf8');
            const logLines = content.trim().split('\n').slice(-lines);
            return logLines
                .filter(line => line.trim())
                .map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            })
                .filter((entry) => entry !== null);
        }
        catch (error) {
            console.error('Failed to read log file:', error);
            return [];
        }
    }
}
// Singleton instance
exports.logger = new Logger();
