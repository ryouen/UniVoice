"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepgramStreamAdapter = void 0;
const events_1 = require("events");
const ws_1 = require("ws");
const logger_1 = require("../../utils/logger");
/**
 * DeepgramStreamAdapter クラス
 */
class DeepgramStreamAdapter extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 1000; // ms
        this.componentLogger = logger_1.logger.child('DeepgramStreamAdapter');
        this.keepAliveInterval = null;
        this.keepAliveIntervalMs = 8000; // Send KeepAlive every 8 seconds
        this.config = config;
        this.metrics = this.resetMetrics();
    }
    /**
     * Connect to Deepgram WebSocket
     */
    async connect() {
        if (this.ws && this.ws.readyState === ws_1.WebSocket.OPEN) {
            throw new Error('Already connected to Deepgram');
        }
        return new Promise((resolve, reject) => {
            const wsUrl = this.buildWebSocketUrl();
            this.componentLogger?.info('Connecting to Deepgram', { url: wsUrl.replace(this.config.apiKey, '***') });
            this.ws = new ws_1.WebSocket(wsUrl, {
                headers: {
                    'Authorization': `Token ${this.config.apiKey}`,
                },
            });
            this.setupWebSocketHandlers(resolve, reject);
            this.metrics.connectionStartTime = Date.now();
        });
    }
    /**
     * Disconnect from Deepgram
     */
    disconnect() {
        if (!this.ws)
            return;
        this.componentLogger?.info('Disconnecting from Deepgram');
        this.stopKeepAlive();
        // Send finalize and close messages
        if (this.ws.readyState === ws_1.WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify({ type: 'Finalize' }));
                this.ws.send(JSON.stringify({ type: 'CloseStream' }));
            }
            catch (error) {
                this.componentLogger?.error('Error sending close messages', { error });
            }
        }
        this.ws.close();
        this.ws = null;
        this.metrics.connectionEndTime = Date.now();
        this.emit(DeepgramStreamAdapter.EVENTS.DISCONNECTED, 'Manual disconnect');
    }
    /**
     * Send audio data to Deepgram
     */
    sendAudio(buffer) {
        if (!this.isConnected()) {
            this.componentLogger?.warn('Cannot send audio - not connected');
            return;
        }
        try {
            this.ws.send(buffer);
            this.metrics.bytesSent += buffer.length;
            this.metrics.messagesSent++;
            this.metrics.lastActivityTime = Date.now();
            // Reset KeepAlive timer on audio activity
            this.resetKeepAlive();
        }
        catch (error) {
            this.componentLogger?.error('Failed to send audio', {
                error: error instanceof Error ? error.message : String(error),
                bufferSize: buffer.length
            });
            this.emitError('SEND_ERROR', 'Failed to send audio data', true);
        }
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.ws !== null && this.ws.readyState === ws_1.WebSocket.OPEN;
    }
    /**
     * Get connection metrics
     */
    getConnectionMetrics() {
        return {
            ...this.metrics,
            connected: this.isConnected()
        };
    }
    /**
     * Destroy the adapter
     */
    destroy() {
        this.stopKeepAlive();
        this.disconnect();
        this.removeAllListeners();
        this.componentLogger?.info('DeepgramStreamAdapter destroyed');
    }
    // ===== Private Methods =====
    buildWebSocketUrl() {
        const params = new URLSearchParams({
            model: this.config.model,
            interim_results: String(this.config.interim),
            endpointing: String(this.config.endpointing),
            utterance_end_ms: String(this.config.utteranceEndMs),
            language: this.config.sourceLanguage,
            sample_rate: String(this.config.sampleRate),
            channels: '1',
            encoding: 'linear16',
            punctuate: 'true'
        });
        if (this.config.smartFormat) {
            params.append('smart_format', 'true');
        }
        if (this.config.noDelay) {
            params.append('no_delay', 'true');
        }
        return `wss://api.deepgram.com/v1/listen?${params}`;
    }
    setupWebSocketHandlers(resolve, reject) {
        if (!this.ws)
            return;
        this.ws.on('open', () => {
            this.componentLogger?.info('Deepgram WebSocket connected');
            this.reconnectAttempts = 0;
            this.startKeepAlive();
            this.emit(DeepgramStreamAdapter.EVENTS.CONNECTED);
            resolve();
        });
        this.ws.on('message', (data) => {
            this.handleMessage(data);
        });
        this.ws.on('error', (error) => {
            this.componentLogger?.error('Deepgram WebSocket error', {
                error: error.message,
                code: error.code
            });
            this.handleWebSocketError(error);
            reject(error);
        });
        this.ws.on('close', (code, reason) => {
            this.componentLogger?.info('Deepgram WebSocket closed', {
                code,
                reason: reason?.toString(),
                meaning: this.getCloseCodeMeaning(code)
            });
            this.ws = null;
            this.stopKeepAlive(); // Stop KeepAlive timer on close
            this.metrics.connectionEndTime = Date.now();
            // Attempt reconnection for recoverable errors
            if (code !== 1000 && code !== 1001 && this.shouldReconnect()) {
                this.attemptReconnection();
            }
            else {
                this.emit(DeepgramStreamAdapter.EVENTS.DISCONNECTED, reason?.toString());
            }
        });
    }
    handleMessage(data) {
        this.metrics.messagesReceived++;
        this.metrics.lastActivityTime = Date.now();
        try {
            const message = this.parseMessage(data);
            if (message.type === 'Error' || message.error) {
                this.handleDeepgramError(message);
                return;
            }
            // Handle UtteranceEnd event
            if (message.type === 'UtteranceEnd') {
                this.emit(DeepgramStreamAdapter.EVENTS.UTTERANCE_END, message);
                return;
            }
            // Handle transcript
            if (message.channel?.alternatives?.[0]) {
                const transcript = this.extractTranscript(message);
                if (transcript) {
                    this.emit(DeepgramStreamAdapter.EVENTS.TRANSCRIPT, transcript);
                }
            }
            // Handle metadata
            else if (message.type === 'Metadata') {
                this.emit(DeepgramStreamAdapter.EVENTS.METADATA, message);
            }
        }
        catch (error) {
            this.componentLogger?.error('Failed to parse Deepgram message', { error });
            this.emitError('PARSE_ERROR', 'Failed to parse message', true);
        }
    }
    parseMessage(data) {
        let dataStr;
        if (Buffer.isBuffer(data)) {
            dataStr = data.toString();
            this.metrics.bytesReceived += data.length;
        }
        else if (data instanceof ArrayBuffer) {
            dataStr = Buffer.from(data).toString();
            this.metrics.bytesReceived += data.byteLength;
        }
        else {
            const buffer = Buffer.concat(data);
            dataStr = buffer.toString();
            this.metrics.bytesReceived += buffer.length;
        }
        return JSON.parse(dataStr);
    }
    extractTranscript(message) {
        const alternative = message.channel.alternatives[0];
        if (!alternative.transcript)
            return null;
        return {
            id: `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: alternative.transcript,
            confidence: alternative.confidence || 0,
            isFinal: message.is_final || false,
            timestamp: Date.now(),
            startMs: message.start ? Math.round(message.start * 1000) : undefined,
            endMs: message.end ? Math.round(message.end * 1000) : undefined,
            language: this.config.sourceLanguage
        };
    }
    handleDeepgramError(message) {
        const errorMessage = message.error || message.message || 'Unknown error';
        this.componentLogger?.error('Deepgram error message', { message });
        this.emitError('DEEPGRAM_MESSAGE_ERROR', errorMessage, true);
    }
    handleWebSocketError(error) {
        const deepgramError = this.createDeepgramError(error);
        this.emit(DeepgramStreamAdapter.EVENTS.ERROR, deepgramError);
    }
    createDeepgramError(error) {
        return {
            code: this.determineErrorCode(error),
            message: this.formatErrorMessage(error),
            recoverable: this.isRecoverable(error),
            closeCode: error.code
        };
    }
    determineErrorCode(error) {
        if (error.code === 4000)
            return 'BAD_REQUEST';
        if (error.code === 4001)
            return 'UNAUTHORIZED';
        if (error.code === 4008)
            return 'REQUEST_TIMEOUT';
        if (error.message?.includes('400'))
            return 'INVALID_FORMAT';
        if (error.message?.includes('401'))
            return 'INVALID_API_KEY';
        return 'UNKNOWN_ERROR';
    }
    formatErrorMessage(error) {
        if (error.message?.includes('400')) {
            return 'Bad Request - Possible causes: Invalid audio format, incorrect parameters, or API key permissions issue';
        }
        if (error.message?.includes('401')) {
            return 'Unauthorized - API key is invalid';
        }
        return error.message || 'Unknown error occurred';
    }
    isRecoverable(error) {
        const nonRecoverableCodes = ['UNAUTHORIZED', 'INVALID_API_KEY'];
        return !nonRecoverableCodes.includes(this.determineErrorCode(error));
    }
    emitError(code, message, recoverable) {
        const error = {
            code,
            message,
            recoverable
        };
        this.emit(DeepgramStreamAdapter.EVENTS.ERROR, error);
    }
    shouldReconnect() {
        return this.reconnectAttempts < this.maxReconnectAttempts;
    }
    attemptReconnection() {
        this.reconnectAttempts++;
        this.componentLogger?.info('Attempting reconnection', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            delay: this.reconnectDelay
        });
        setTimeout(async () => {
            try {
                await this.connect();
            }
            catch (error) {
                this.componentLogger?.error('Reconnection failed', { error });
                if (this.shouldReconnect()) {
                    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
                    this.attemptReconnection();
                }
                else {
                    this.emitError('RECONNECTION_FAILED', 'Failed to reconnect after maximum attempts', false);
                }
            }
        }, this.reconnectDelay);
    }
    getCloseCodeMeaning(code) {
        switch (code) {
            case 1000: return 'Normal closure';
            case 1001: return 'Going away';
            case 1002: return 'Protocol error';
            case 1003: return 'Unsupported data';
            case 1006: return 'Abnormal closure';
            case 1007: return 'Invalid frame payload data';
            case 1008: return 'Policy violation';
            case 1009: return 'Message too big';
            case 1010: return 'Mandatory extension';
            case 1011: return 'Internal server error';
            case 4000: return 'Bad request - Invalid parameters or audio format';
            case 4001: return 'Unauthorized - Invalid API key';
            case 4008: return 'Request timeout';
            default:
                if (code >= 4000 && code < 5000) {
                    return 'Deepgram-specific error';
                }
                return 'Unknown close code';
        }
    }
    resetMetrics() {
        return {
            connected: false,
            bytesReceived: 0,
            bytesSent: 0,
            messagesReceived: 0,
            messagesSent: 0
        };
    }
    /**
     * Start KeepAlive timer to prevent Deepgram timeout
     */
    startKeepAlive() {
        this.componentLogger?.debug('Starting KeepAlive timer');
        this.keepAliveInterval = setInterval(() => {
            if (this.isConnected()) {
                try {
                    // Send KeepAlive message as specified by Deepgram
                    this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
                    this.componentLogger?.debug('Sent KeepAlive message');
                }
                catch (error) {
                    this.componentLogger?.error('Failed to send KeepAlive', { error });
                }
            }
        }, this.keepAliveIntervalMs);
    }
    /**
     * Stop KeepAlive timer
     */
    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
            this.componentLogger?.debug('Stopped KeepAlive timer');
        }
    }
    /**
     * Reset KeepAlive timer (called on audio activity)
     */
    resetKeepAlive() {
        // Don't reset KeepAlive on every audio chunk - it's unnecessary
        // The timer will handle itself, and we're sending audio continuously
        // which serves as activity indication to Deepgram
    }
}
exports.DeepgramStreamAdapter = DeepgramStreamAdapter;
// イベント定数
DeepgramStreamAdapter.EVENTS = {
    TRANSCRIPT: 'transcript',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
    METADATA: 'metadata',
    UTTERANCE_END: 'utteranceEnd'
};
