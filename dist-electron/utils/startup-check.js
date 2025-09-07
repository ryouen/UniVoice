"use strict";
/**
 * スタートアップチェック - アプリ起動時のクリーンアップ処理
 *
 * 責任:
 * - nulファイルの自動削除
 * - 環境の健全性チェック
 * - 初期化時のクリーンアップ
 */
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
exports.cleanupNulFile = cleanupNulFile;
exports.sanitizeLogPath = sanitizeLogPath;
exports.validateEnvironment = validateEnvironment;
exports.runStartupChecks = runStartupChecks;
exports.watchForNulCreation = watchForNulCreation;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
const startupLogger = logger_1.logger.child('StartupCheck');
/**
 * nulファイルのクリーンアップ
 * Windowsで誤って生成されるnulファイルを削除
 */
function cleanupNulFile() {
    // 複数の可能な場所をチェック
    const possiblePaths = [
        path.join(__dirname, '..', '..', 'nul'),
        path.join(__dirname, '..', '..', '..', 'nul'),
        path.join(process.cwd(), 'nul'),
        path.join(process.cwd(), '..', 'nul')
    ];
    for (const nulPath of possiblePaths) {
        try {
            if (fs.existsSync(nulPath)) {
                fs.unlinkSync(nulPath);
                startupLogger.info(`Removed nul file at: ${nulPath}`);
            }
        }
        catch (error) {
            // エラーは警告レベルで記録（致命的ではない）
            startupLogger.warn(`Failed to remove nul file at ${nulPath}:`, {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
}
/**
 * ログパスのサニタイズ
 * Windowsの予約語を回避
 */
function sanitizeLogPath(logPath) {
    const reserved = [
        'nul', 'con', 'prn', 'aux',
        'com1', 'com2', 'com3', 'com4',
        'lpt1', 'lpt2', 'lpt3', 'lpt4',
        'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
    ];
    const fileName = path.basename(logPath).toLowerCase();
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    if (reserved.includes(fileNameWithoutExt)) {
        const dir = path.dirname(logPath);
        const ext = path.extname(logPath);
        const newFileName = fileNameWithoutExt + '_file' + ext;
        return path.join(dir, newFileName);
    }
    return logPath;
}
/**
 * 環境変数の検証
 * 予約語を含む環境変数をチェック
 */
function validateEnvironment() {
    const envVarsToCheck = ['LOG_DIR', 'LOG_FILE', 'OUTPUT_DIR', 'TEMP_DIR'];
    for (const varName of envVarsToCheck) {
        const value = process.env[varName];
        if (value && value.toLowerCase().includes('nul')) {
            startupLogger.warn(`Environment variable ${varName} contains reserved word "nul"`, {
                originalValue: value
            });
            // デフォルト値に置き換え
            switch (varName) {
                case 'LOG_DIR':
                    process.env[varName] = './logs';
                    break;
                case 'LOG_FILE':
                    process.env[varName] = './logs/app.log';
                    break;
                case 'OUTPUT_DIR':
                    process.env[varName] = './output';
                    break;
                case 'TEMP_DIR':
                    process.env[varName] = './temp';
                    break;
            }
            startupLogger.info(`${varName} updated to: ${process.env[varName]}`);
        }
    }
}
/**
 * スタートアップチェックの実行
 * アプリ起動時に一度だけ実行
 */
function runStartupChecks() {
    startupLogger.info('Running startup checks...');
    try {
        // nulファイルのクリーンアップ
        cleanupNulFile();
        // 環境変数の検証
        validateEnvironment();
        // 定期的なクリーンアップは不要（起動時のみで十分）
        // setInterval(() => {
        //   cleanupNulFile();
        // }, 1800000);
        startupLogger.info('Startup checks completed successfully');
    }
    catch (error) {
        startupLogger.error('Startup checks failed:', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
/**
 * デバッグ用：nulファイル生成の監視
 * 開発環境でのみ使用
 */
function watchForNulCreation() {
    if (process.env.NODE_ENV !== 'development') {
        return undefined;
    }
    const watchPath = path.join(process.cwd(), '..');
    try {
        const watcher = fs.watch(watchPath, (eventType, filename) => {
            if (filename && filename.toLowerCase() === 'nul') {
                startupLogger.error('NUL file creation detected!', {
                    eventType,
                    filename,
                    stack: new Error().stack,
                    processInfo: {
                        pid: process.pid,
                        cwd: process.cwd(),
                        argv: process.argv,
                        logRelatedEnv: Object.entries(process.env)
                            .filter(([key]) => key.includes('LOG') || key.includes('OUT'))
                            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
                    }
                });
            }
        });
        startupLogger.info(`Watching for nul file creation at: ${watchPath}`);
        // クリーンアップ関数を返す
        return () => {
            watcher.close();
        };
    }
    catch (error) {
        startupLogger.warn('Failed to setup nul file watcher:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return undefined;
    }
}
