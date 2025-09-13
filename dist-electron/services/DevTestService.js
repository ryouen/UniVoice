"use strict";
/**
 * DevTestService - Development Testing and Logging Service
 *
 * 自動テスト実行とログ収集を担当する開発用サービス
 * - コンソールログ
 * - UI状態（HTML/CSS）
 * - スクリーンショット
 * - イベントフロー
 * - パフォーマンスメトリクス
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
exports.devTestService = exports.DevTestService = void 0;
const electron_1 = require("electron");
const events_1 = require("events");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
class DevTestService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.window = null;
        this.logBuffer = [];
        this.captureTimer = null;
        this.componentLogger = logger_1.logger.child('DevTestService');
        this.sessionId = this.generateSessionId();
        this.config = {
            autoRunTests: true,
            captureInterval: 5000, // 5秒ごと
            maxLogSize: 10 * 1024 * 1024, // 10MB
            testScenarios: this.getDefaultTestScenarios(),
            ...config
        };
        this.setupIpcHandlers();
        this.componentLogger.info('DevTestService initialized', { sessionId: this.sessionId });
    }
    /**
     * ウィンドウをアタッチして監視開始
     */
    attach(window) {
        this.window = window;
        // コンソールログをインターセプト
        this.injectLogCapture();
        // 定期的なUI状態キャプチャ
        if (this.config.captureInterval > 0) {
            this.startPeriodicCapture();
        }
        // 自動テスト実行
        if (this.config.autoRunTests) {
            setTimeout(() => {
                this.runDefaultTests();
            }, 3000); // ウィンドウロード後3秒待機
        }
        this.componentLogger.info('Attached to window', {
            sessionId: this.sessionId,
            autoRun: this.config.autoRunTests
        });
    }
    /**
     * デフォルトのテストシナリオ
     */
    getDefaultTestScenarios() {
        return [
            {
                id: 'basic-flow',
                name: 'Basic ASR and Translation Flow',
                steps: [
                    {
                        action: 'setup-listeners',
                        delay: 500
                    },
                    {
                        action: 'start-listening',
                        params: { sourceLanguage: 'en', targetLanguage: 'ja' },
                        delay: 1000
                    },
                    {
                        action: 'send-test-asr',
                        params: { text: 'Hello world, testing UniVoice' },
                        delay: 2000
                    },
                    {
                        action: 'capture-ui-state',
                        delay: 3000
                    }
                ],
                expectedResults: [
                    'currentOriginalUpdate event received',
                    'currentTranslationUpdate event received',
                    'No duplicate history entries'
                ]
            }
        ];
    }
    /**
     * ログキャプチャをインジェクト
     */
    async injectLogCapture() {
        if (!this.window)
            return;
        await this.window.webContents.executeJavaScript(`
      // Console log capture
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      
      console.log = (...args) => {
        originalLog(...args);
        window.electron.invoke('dev-log', {
          type: 'console',
          level: 'info',
          data: args
        });
      };
      
      console.warn = (...args) => {
        originalWarn(...args);
        window.electron.invoke('dev-log', {
          type: 'console',
          level: 'warn',
          data: args
        });
      };
      
      console.error = (...args) => {
        originalError(...args);
        window.electron.invoke('dev-log', {
          type: 'console',
          level: 'error',
          data: args
        });
      };
      
      // Event capture
      const eventTypes = ['pipeline-event', 'currentOriginalUpdate', 'currentTranslationUpdate'];
      eventTypes.forEach(eventType => {
        window.addEventListener(eventType, (event) => {
          window.electron.invoke('dev-log', {
            type: 'event',
            data: {
              eventType,
              detail: event.detail || event
            }
          });
        });
      });
      
      console.log('🔍 DevTest: Log capture injected');
    `);
    }
    /**
     * デフォルトテストを実行
     */
    async runDefaultTests() {
        const scenario = this.config.testScenarios[0];
        this.componentLogger.info('Running test scenario', {
            id: scenario.id,
            name: scenario.name
        });
        for (const step of scenario.steps) {
            await this.executeTestStep(step);
            if (step.delay) {
                await this.delay(step.delay);
            }
        }
        // テスト結果を保存
        await this.saveTestResults(scenario);
    }
    /**
     * テストステップを実行
     */
    async executeTestStep(step) {
        if (!this.window)
            return;
        this.logEntry({
            timestamp: Date.now(),
            type: 'event',
            data: { action: step.action, params: step.params }
        });
        switch (step.action) {
            case 'setup-listeners':
                await this.window.webContents.executeJavaScript(`
          window.devTestListeners = {
            original: [],
            translation: [],
            events: []
          };
          
          window.electron.on('currentOriginalUpdate', (event, data) => {
            console.log('🎤 DevTest: Original:', data);
            window.devTestListeners.original.push(data);
          });
          
          window.electron.on('currentTranslationUpdate', (event, text) => {
            console.log('🇯🇵 DevTest: Translation:', text);
            window.devTestListeners.translation.push(text);
          });
          
          console.log('✅ DevTest: Listeners setup complete');
        `);
                break;
            case 'start-listening':
                await this.window.webContents.executeJavaScript(`
          window.univoice.sendCommand({
            command: 'startListening',
            params: ${JSON.stringify(step.params)}
          }).then(result => {
            console.log('✅ DevTest: Started listening:', result);
          }).catch(err => {
            console.error('❌ DevTest: Failed to start:', err);
          });
        `);
                break;
            case 'send-test-asr':
                await this.window.webContents.executeJavaScript(`
          window.dispatchEvent(new CustomEvent('pipeline-event', {
            detail: {
              type: 'asr',
              correlationId: 'devtest-${Date.now()}',
              timestamp: Date.now(),
              data: {
                text: '${step.params.text}',
                isFinal: true,
                segmentId: 'devtest-segment-${Date.now()}',
                language: 'en',
                confidence: 0.95
              }
            }
          }));
          console.log('📤 DevTest: Test ASR event sent');
        `);
                break;
            case 'capture-ui-state':
                await this.captureCurrentState();
                break;
        }
    }
    /**
     * 現在のUI状態をキャプチャ
     */
    async captureCurrentState() {
        if (!this.window)
            return;
        try {
            // HTML/CSS状態を取得
            const uiState = await this.window.webContents.executeJavaScript(`
        ({
          html: document.documentElement.outerHTML,
          computedStyles: Array.from(document.querySelectorAll('.history-item, .current-display')).map(el => ({
            selector: el.className,
            styles: window.getComputedStyle(el).cssText
          })),
          historyCount: document.querySelectorAll('.history-item').length,
          currentOriginal: document.querySelector('.current-original')?.textContent || '',
          currentTranslation: document.querySelector('.current-translation')?.textContent || '',
          errors: window.devTestListeners?.errors || []
        })
      `);
            this.logEntry({
                timestamp: Date.now(),
                type: 'ui-state',
                data: uiState
            });
            // スクリーンショット - DISABLED (too many files)
            // const screenshot = await this.window.webContents.capturePage();
            // // 絶対パスを使用
            // const screenshotDir = path.join(__dirname, '..', '..', 'logs', 'screenshots');
            // await fs.mkdir(screenshotDir, { recursive: true });
            // 
            // const screenshotPath = path.join(
            //   screenshotDir, 
            //   `${this.sessionId}-${Date.now()}.png`
            // );
            // await fs.writeFile(screenshotPath, screenshot.toPNG());
            // 
            // this.logEntry({
            //   timestamp: Date.now(),
            //   type: 'screenshot',
            //   data: { path: screenshotPath }
            // });
        }
        catch (error) {
            this.componentLogger.error('Failed to capture UI state', { error });
        }
    }
    /**
     * 定期キャプチャを開始
     */
    startPeriodicCapture() {
        // DISABLED - Too many screenshots being taken
        // this.captureTimer = setInterval(() => {
        //   this.captureCurrentState();
        // }, this.config.captureInterval);
    }
    /**
     * IPCハンドラをセットアップ
     */
    setupIpcHandlers() {
        electron_1.ipcMain.handle('dev-log', async (_event, entry) => {
            this.logEntry({
                timestamp: Date.now(),
                ...entry
            });
        });
        electron_1.ipcMain.handle('dev-get-logs', async () => {
            return this.logBuffer;
        });
        electron_1.ipcMain.handle('dev-clear-logs', async () => {
            this.logBuffer = [];
            return { success: true };
        });
    }
    /**
     * ログエントリを追加
     */
    logEntry(entry) {
        this.logBuffer.push(entry);
        // バッファサイズ管理
        if (this.logBuffer.length > 10000) {
            this.logBuffer = this.logBuffer.slice(-5000);
        }
        this.emit('log', entry);
    }
    /**
     * テスト結果を保存
     */
    async saveTestResults(scenario) {
        // 絶対パスを使用
        const baseDir = path.join(__dirname, '..', '..', 'logs', 'dev-sessions');
        const sessionDir = path.join(baseDir, this.sessionId);
        await fs.mkdir(sessionDir, { recursive: true });
        // ログを保存
        const logPath = path.join(sessionDir, 'test-log.json');
        await fs.writeFile(logPath, JSON.stringify({
            sessionId: this.sessionId,
            scenario: scenario,
            logs: this.logBuffer,
            timestamp: Date.now()
        }, null, 2));
        // サマリーを生成
        const summary = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            scenario: scenario.name,
            totalLogs: this.logBuffer.length,
            errors: this.logBuffer.filter(l => l.level === 'error').length,
            warnings: this.logBuffer.filter(l => l.level === 'warn').length,
            events: this.logBuffer.filter(l => l.type === 'event').length,
            screenshots: this.logBuffer.filter(l => l.type === 'screenshot').length
        };
        const summaryPath = path.join(sessionDir, 'summary.json');
        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
        this.componentLogger.info('Test results saved', {
            sessionDir,
            summary
        });
        console.log(`\n📊 Test results saved to: ${sessionDir}`);
        console.log(`   View logs: ${logPath}`);
        console.log(`   Summary: ${summaryPath}\n`);
    }
    /**
     * セッションIDを生成
     */
    generateSessionId() {
        const now = new Date();
        return `dev-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    }
    /**
     * 遅延ヘルパー
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 最新のログを取得
     */
    async getLatestLogs(count = 100) {
        return this.logBuffer.slice(-count);
    }
    /**
     * カスタムテストを実行
     */
    async runCustomTest(steps) {
        for (const step of steps) {
            await this.executeTestStep(step);
            if (step.delay) {
                await this.delay(step.delay);
            }
        }
    }
    /**
     * クリーンアップ
     */
    destroy() {
        if (this.captureTimer) {
            clearInterval(this.captureTimer);
            this.captureTimer = null;
        }
        this.removeAllListeners();
        this.componentLogger.info('DevTestService destroyed');
    }
}
exports.DevTestService = DevTestService;
// シングルトンインスタンス
exports.devTestService = new DevTestService();
