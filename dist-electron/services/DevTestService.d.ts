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
import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
interface TestConfig {
    autoRunTests: boolean;
    captureInterval: number;
    maxLogSize: number;
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
    delay?: number;
}
interface LogEntry {
    timestamp: number;
    type: 'console' | 'event' | 'ui-state' | 'screenshot' | 'metric';
    level?: 'info' | 'warn' | 'error' | 'debug';
    data: any;
}
export declare class DevTestService extends EventEmitter {
    private window;
    private sessionId;
    private logBuffer;
    private config;
    private captureTimer;
    private componentLogger;
    constructor(config?: Partial<TestConfig>);
    /**
     * ウィンドウをアタッチして監視開始
     */
    attach(window: BrowserWindow): void;
    /**
     * デフォルトのテストシナリオ
     */
    private getDefaultTestScenarios;
    /**
     * ログキャプチャをインジェクト
     */
    private injectLogCapture;
    /**
     * デフォルトテストを実行
     */
    private runDefaultTests;
    /**
     * テストステップを実行
     */
    private executeTestStep;
    /**
     * 現在のUI状態をキャプチャ
     */
    private captureCurrentState;
    /**
     * 定期キャプチャを開始
     */
    private startPeriodicCapture;
    /**
     * IPCハンドラをセットアップ
     */
    private setupIpcHandlers;
    /**
     * ログエントリを追加
     */
    private logEntry;
    /**
     * テスト結果を保存
     */
    private saveTestResults;
    /**
     * セッションIDを生成
     */
    private generateSessionId;
    /**
     * 遅延ヘルパー
     */
    private delay;
    /**
     * 最新のログを取得
     */
    getLatestLogs(count?: number): Promise<LogEntry[]>;
    /**
     * カスタムテストを実行
     */
    runCustomTest(steps: TestStep[]): Promise<void>;
    /**
     * クリーンアップ
     */
    destroy(): void;
}
export declare const devTestService: DevTestService;
export {};
