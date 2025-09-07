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

import { BrowserWindow, ipcMain } from 'electron';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

interface TestConfig {
  autoRunTests: boolean;
  captureInterval: number; // ms
  maxLogSize: number; // bytes
  testScenarios: TestScenario[];
}

interface TestScenario {
  id: string;
  name: string;
  steps: TestStep[];
  expectedResults: string[];
}

interface TestStep {
  action: string;
  params?: any;
  delay?: number; // ms
}

interface LogEntry {
  timestamp: number;
  type: 'console' | 'event' | 'ui-state' | 'screenshot' | 'metric';
  level?: 'info' | 'warn' | 'error' | 'debug';
  data: any;
}

export class DevTestService extends EventEmitter {
  private window: BrowserWindow | null = null;
  private sessionId: string;
  private logBuffer: LogEntry[] = [];
  private config: TestConfig;
  private captureTimer: NodeJS.Timeout | null = null;
  private componentLogger = logger.child('DevTestService');
  
  constructor(config?: Partial<TestConfig>) {
    super();
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
  attach(window: BrowserWindow): void {
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
  private getDefaultTestScenarios(): TestScenario[] {
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
  private async injectLogCapture(): Promise<void> {
    if (!this.window) return;
    
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
  private async runDefaultTests(): Promise<void> {
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
  private async executeTestStep(step: TestStep): Promise<void> {
    if (!this.window) return;
    
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
  private async captureCurrentState(): Promise<void> {
    if (!this.window) return;
    
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
      
    } catch (error) {
      this.componentLogger.error('Failed to capture UI state', { error });
    }
  }
  
  /**
   * 定期キャプチャを開始
   */
  private startPeriodicCapture(): void {
    // DISABLED - Too many screenshots being taken
    // this.captureTimer = setInterval(() => {
    //   this.captureCurrentState();
    // }, this.config.captureInterval);
  }
  
  /**
   * IPCハンドラをセットアップ
   */
  private setupIpcHandlers(): void {
    ipcMain.handle('dev-log', async (_event, entry: any) => {
      this.logEntry({
        timestamp: Date.now(),
        ...entry
      });
    });
    
    ipcMain.handle('dev-get-logs', async () => {
      return this.logBuffer;
    });
    
    ipcMain.handle('dev-clear-logs', async () => {
      this.logBuffer = [];
      return { success: true };
    });
  }
  
  /**
   * ログエントリを追加
   */
  private logEntry(entry: LogEntry): void {
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
  private async saveTestResults(scenario: TestScenario): Promise<void> {
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
  private generateSessionId(): string {
    const now = new Date();
    return `dev-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  }
  
  /**
   * 遅延ヘルパー
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 最新のログを取得
   */
  async getLatestLogs(count: number = 100): Promise<LogEntry[]> {
    return this.logBuffer.slice(-count);
  }
  
  /**
   * カスタムテストを実行
   */
  async runCustomTest(steps: TestStep[]): Promise<void> {
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
  destroy(): void {
    if (this.captureTimer) {
      clearInterval(this.captureTimer);
      this.captureTimer = null;
    }
    
    this.removeAllListeners();
    this.componentLogger.info('DevTestService destroyed');
  }
}

// シングルトンインスタンス
export const devTestService = new DevTestService();