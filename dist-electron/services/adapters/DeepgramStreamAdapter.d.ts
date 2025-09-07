/**
 * DeepgramStreamAdapter
 *
 * Clean Architecture に基づいた Deepgram WebSocket 通信アダプター
 *
 * 責任:
 * - Deepgram WebSocket との通信管理
 * - 音声データの送信
 * - 転写結果の受信とパース
 * - エラーハンドリングとリトライ
 *
 * 責任外:
 * - 翻訳処理
 * - UI更新
 * - ビジネスロジック
 */
import { EventEmitter } from 'events';
export interface DeepgramAdapterConfig {
    apiKey: string;
    model: string;
    interim: boolean;
    endpointing: number;
    utteranceEndMs: number;
    smartFormat?: boolean;
    noDelay?: boolean;
    sampleRate: number;
    sourceLanguage: string;
}
export interface TranscriptResult {
    id: string;
    text: string;
    confidence: number;
    isFinal: boolean;
    timestamp: number;
    startMs?: number;
    endMs?: number;
    language: string;
}
export interface DeepgramError {
    code: string;
    message: string;
    recoverable: boolean;
    closeCode?: number;
}
export interface ConnectionMetrics {
    connected: boolean;
    connectionStartTime?: number;
    connectionEndTime?: number;
    bytesReceived: number;
    bytesSent: number;
    messagesReceived: number;
    messagesSent: number;
    lastActivityTime?: number;
}
export interface DeepgramStreamAdapterEvents {
    transcript: (result: TranscriptResult) => void;
    connected: () => void;
    disconnected: (reason?: string) => void;
    error: (error: DeepgramError) => void;
    metadata: (metadata: any) => void;
    utteranceEnd: (data: any) => void;
}
export declare interface DeepgramStreamAdapter {
    on<K extends keyof DeepgramStreamAdapterEvents>(event: K, listener: DeepgramStreamAdapterEvents[K]): this;
    emit<K extends keyof DeepgramStreamAdapterEvents>(event: K, ...args: Parameters<DeepgramStreamAdapterEvents[K]>): boolean;
}
/**
 * DeepgramStreamAdapter クラス
 */
export declare class DeepgramStreamAdapter extends EventEmitter {
    static readonly EVENTS: {
        TRANSCRIPT: "transcript";
        CONNECTED: "connected";
        DISCONNECTED: "disconnected";
        ERROR: "error";
        METADATA: "metadata";
        UTTERANCE_END: "utteranceEnd";
    };
    private config;
    private ws;
    private metrics;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private componentLogger;
    private keepAliveInterval;
    private keepAliveIntervalMs;
    constructor(config: DeepgramAdapterConfig);
    /**
     * Connect to Deepgram WebSocket
     */
    connect(): Promise<void>;
    /**
     * Disconnect from Deepgram
     */
    disconnect(): void;
    /**
     * Send audio data to Deepgram
     */
    sendAudio(buffer: Buffer): void;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Get connection metrics
     */
    getConnectionMetrics(): ConnectionMetrics;
    /**
     * Destroy the adapter
     */
    destroy(): void;
    private buildWebSocketUrl;
    private setupWebSocketHandlers;
    private handleMessage;
    private parseMessage;
    private extractTranscript;
    private handleDeepgramError;
    private handleWebSocketError;
    private createDeepgramError;
    private determineErrorCode;
    private formatErrorMessage;
    private isRecoverable;
    private emitError;
    private shouldReconnect;
    private attemptReconnection;
    private getCloseCodeMeaning;
    private resetMetrics;
    /**
     * Start KeepAlive timer to prevent Deepgram timeout
     */
    private startKeepAlive;
    /**
     * Stop KeepAlive timer
     */
    private stopKeepAlive;
    /**
     * Reset KeepAlive timer (called on audio activity)
     */
    private resetKeepAlive;
}
