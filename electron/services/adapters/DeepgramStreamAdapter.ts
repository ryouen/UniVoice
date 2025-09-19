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
import { WebSocket } from 'ws';
import { logger } from '../../utils/logger';

// ===== 型定義 =====

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

// ===== イベント型定義 =====

export interface DeepgramStreamAdapterEvents {
  transcript: (result: TranscriptResult) => void;
  connected: () => void;
  disconnected: (reason?: string) => void;
  error: (error: DeepgramError) => void;
  metadata: (metadata: any) => void;
  utteranceEnd: (data: any) => void; // UtteranceEndイベント対応
}

export declare interface DeepgramStreamAdapter {
  on<K extends keyof DeepgramStreamAdapterEvents>(
    event: K,
    listener: DeepgramStreamAdapterEvents[K]
  ): this;
  
  emit<K extends keyof DeepgramStreamAdapterEvents>(
    event: K,
    ...args: Parameters<DeepgramStreamAdapterEvents[K]>
  ): boolean;
}

/**
 * DeepgramStreamAdapter クラス
 */
export class DeepgramStreamAdapter extends EventEmitter {
  // イベント定数
  static readonly EVENTS = {
    TRANSCRIPT: 'transcript' as const,
    CONNECTED: 'connected' as const,
    DISCONNECTED: 'disconnected' as const,
    ERROR: 'error' as const,
    METADATA: 'metadata' as const,
    UTTERANCE_END: 'utteranceEnd' as const
  };

  private config: DeepgramAdapterConfig;
  private ws: WebSocket | null = null;
  private metrics: ConnectionMetrics;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000; // ms
  private componentLogger = logger.child('DeepgramStreamAdapter');
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private keepAliveIntervalMs = 5000; // Send KeepAlive every 5 seconds (Deepgram recommends 3-5 seconds)
  private audioStarted = false;
  private initialAudioTimer: NodeJS.Timeout | null = null;

  constructor(config: DeepgramAdapterConfig) {
    super();
    this.config = config;
    this.metrics = this.resetMetrics();
  }

  /**
   * Connect to Deepgram WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      throw new Error('Already connected to Deepgram');
    }

    return new Promise((resolve, reject) => {
      const wsUrl = this.buildWebSocketUrl();
      
      this.componentLogger?.info('Connecting to Deepgram', { 
        url: wsUrl.replace(this.config.apiKey, '***'),
        model: this.config.model,
        sourceLanguage: this.config.sourceLanguage
      });
      
      this.ws = new WebSocket(wsUrl, {
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
  disconnect(): void {
    if (!this.ws) return;

    this.componentLogger?.info('Disconnecting from Deepgram');
    this.stopKeepAlive();
    
    // Send finalize and close messages
    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'Finalize' }));
        this.ws.send(JSON.stringify({ type: 'CloseStream' }));
      } catch (error) {
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
  sendAudio(buffer: Buffer): void {
    if (!this.isConnected()) {
      this.componentLogger?.warn('Cannot send audio - not connected');
      return;
    }

    try {
      this.ws!.send(buffer);
      this.audioStarted = true; // ✅ 初回送信検知
      this.metrics.bytesSent += buffer.length;
      this.metrics.messagesSent++;
      this.metrics.lastActivityTime = Date.now();
      // Reset KeepAlive timer on audio activity
      this.resetKeepAlive();
    } catch (error) {
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
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      connected: this.isConnected()
    };
  }

  /**
   * Destroy the adapter
   */
  destroy(): void {
    this.stopKeepAlive();
    this.disconnect();
    this.removeAllListeners();
    this.componentLogger?.info('DeepgramStreamAdapter destroyed');
  }

  // ===== Private Methods =====

  private buildWebSocketUrl(): string {
    const params = new URLSearchParams({
      model: this.config.model,
      interim_results: String(this.config.interim),
      endpointing: String(this.config.endpointing),
      utterance_end_ms: String(this.config.utteranceEndMs),
      sample_rate: String(this.config.sampleRate),
      channels: '1',
      encoding: 'linear16'
    });
    
    // smart_format と punctuate の整合性
    const useSmart = this.config.smartFormat === true;
    if (useSmart) {
      params.append('smart_format', 'true');
      // smart_format使用時はpunctuateを指定しない
    } else {
      params.append('punctuate', 'true');
    }
    
    // no_delay は smart_format と競合しやすいので抑止
    if (this.config.noDelay && !useSmart) {
      params.append('no_delay', 'true');
    } else if (this.config.noDelay && useSmart) {
      this.componentLogger?.warn('no_delay is ignored because smart_format=true prioritizes formatting quality');
    }
    
    // Language parameter handling
    if (this.config.sourceLanguage) {
      let languageParam = this.config.sourceLanguage;
      
      // Nova-3 requires 'multi' for multilingual support including Japanese
      // Reference: https://developers.deepgram.com/docs/multilingual-code-switching
      if (this.config.model === 'nova-3' || this.config.model === 'nova-3-ea') {
        // Languages that require 'multi' parameter in Nova-3
        // Nova-3 native support: English only. All others require 'multi'
        const multilingualLanguages = ['ja', 'fr', 'de', 'it', 'es', 'pt', 'ru', 'hi', 'nl'];
        
        if (multilingualLanguages.includes(this.config.sourceLanguage) || this.config.sourceLanguage === 'multi') {
          languageParam = 'multi';
          this.componentLogger?.info('Nova-3 multilingual mode activated', {
            originalLanguage: this.config.sourceLanguage,
            languageParam: 'multi'
          });
        }
      }
      
      params.append('language', languageParam);
      
      console.log('[DeepgramAdapter] WebSocket parameters:', {
        model: this.config.model,
        language: languageParam,
        originalLanguage: this.config.sourceLanguage,
        interim_results: this.config.interim,
        endpointing: this.config.endpointing,
        utterance_end_ms: this.config.utteranceEndMs
      });
    }
    
    const wsUrl = `wss://api.deepgram.com/v1/listen?${params}`;
    console.log('[DeepgramAdapter] WebSocket URL:', wsUrl.replace(this.config.apiKey, 'API_KEY_HIDDEN'));
    
    return wsUrl;
  }

  private setupWebSocketHandlers(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.ws) return;

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

    this.ws.on('error', (error: any) => {
      // 🔴 詳細なエラーログ
      console.error('[DeepgramAdapter] WebSocket error details:', {
        message: error.message,
        code: error.code,
        type: error.type,
        sourceLanguage: this.config.sourceLanguage,
        model: this.config.model
      });
      
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
      } else {
        this.emit(DeepgramStreamAdapter.EVENTS.DISCONNECTED, reason?.toString());
      }
    });
  }

  private handleMessage(data: Buffer | ArrayBuffer | Buffer[]): void {
    this.metrics.messagesReceived++;
    this.metrics.lastActivityTime = Date.now();
    

    try {
      const message = this.parseMessage(data);
      
      // 🔴 受信メッセージの詳細ログ（全言語モードで有効）
      if (true) { // デバッグのため常に有効
        if (message.channel?.alternatives?.[0]) {
          console.log('[DeepgramAdapter] Recognition result:', {
            sourceLanguage: this.config.sourceLanguage,
            text: message.channel.alternatives[0].transcript.substring(0, 50),
            fullText: message.channel.alternatives[0].transcript,
            confidence: message.channel.alternatives[0].confidence,
            isFinal: message.is_final,
            messageType: message.type,
            detectedLanguage: message.channel.alternatives[0].language || 'not specified',
            words: message.channel.alternatives[0].words?.length || 0
          });
        } else if (message.type === 'Results' && message.channel) {
          // 認識結果が空の場合もログ出力
          console.log('[DeepgramAdapter] Empty recognition result:', {
            sourceLanguage: this.config.sourceLanguage,
            messageType: message.type,
            channel: message.channel,
            duration: message.duration,
            isFinal: message.is_final
          });
        } else if (message.type) {
          console.log('[DeepgramAdapter] Other message type:', {
            type: message.type,
            hasChannel: !!message.channel
          });
        }
      }
      
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
    } catch (error) {
      this.componentLogger?.error('Failed to parse Deepgram message', { error });
      this.emitError('PARSE_ERROR', 'Failed to parse message', true);
    }
  }

  private parseMessage(data: Buffer | ArrayBuffer | Buffer[]): any {
    let dataStr: string;
    
    if (Buffer.isBuffer(data)) {
      dataStr = data.toString();
      this.metrics.bytesReceived += data.length;
    } else if (data instanceof ArrayBuffer) {
      dataStr = Buffer.from(data).toString();
      this.metrics.bytesReceived += data.byteLength;
    } else {
      const buffer = Buffer.concat(data);
      dataStr = buffer.toString();
      this.metrics.bytesReceived += buffer.length;
    }
    
    return JSON.parse(dataStr);
  }

  private extractTranscript(message: any): TranscriptResult | null {
    const alternative = message.channel.alternatives[0];
    if (!alternative.transcript) return null;
    
    const result = {
      id: `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: alternative.transcript,
      confidence: alternative.confidence || 0,
      isFinal: message.is_final || false,
      timestamp: Date.now(),
      startMs: message.start ? Math.round(message.start * 1000) : undefined,
      endMs: message.end ? Math.round(message.end * 1000) : undefined,
      language: this.config.sourceLanguage
    };
    
    
    return result;
  }

  private handleDeepgramError(message: any): void {
    const errorMessage = message.error || message.message || 'Unknown error';
    console.error('[DeepgramAdapter] Deepgram error received:', {
      sourceLanguage: this.config.sourceLanguage,
      model: this.config.model,
      fullMessage: message,
      error: errorMessage
    });
    this.componentLogger?.error('Deepgram error message', { message });
    this.emitError('DEEPGRAM_MESSAGE_ERROR', errorMessage, true);
  }

  private handleWebSocketError(error: any): void {
    const deepgramError = this.createDeepgramError(error);
    this.emit(DeepgramStreamAdapter.EVENTS.ERROR, deepgramError);
  }

  private createDeepgramError(error: any): DeepgramError {
    return {
      code: this.determineErrorCode(error),
      message: this.formatErrorMessage(error),
      recoverable: this.isRecoverable(error),
      closeCode: error.code
    };
  }

  private determineErrorCode(error: any): string {
    if (error.code === 4000) return 'BAD_REQUEST';
    if (error.code === 4001) return 'UNAUTHORIZED';
    if (error.code === 4008) return 'REQUEST_TIMEOUT';
    if (error.message?.includes('400')) return 'INVALID_FORMAT';
    if (error.message?.includes('401')) return 'INVALID_API_KEY';
    return 'UNKNOWN_ERROR';
  }

  private formatErrorMessage(error: any): string {
    if (error.message?.includes('400')) {
      return 'Bad Request - Possible causes: Invalid audio format, incorrect parameters, or API key permissions issue';
    }
    if (error.message?.includes('401')) {
      return 'Unauthorized - API key is invalid';
    }
    return error.message || 'Unknown error occurred';
  }

  private isRecoverable(error: any): boolean {
    const nonRecoverableCodes = ['UNAUTHORIZED', 'INVALID_API_KEY'];
    return !nonRecoverableCodes.includes(this.determineErrorCode(error));
  }

  private emitError(code: string, message: string, recoverable: boolean): void {
    const error: DeepgramError = {
      code,
      message,
      recoverable
    };
    this.emit(DeepgramStreamAdapter.EVENTS.ERROR, error);
  }

  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  private attemptReconnection(): void {
    this.reconnectAttempts++;
    
    this.componentLogger?.info('Attempting reconnection', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay: this.reconnectDelay
    });

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.componentLogger?.error('Reconnection failed', { error });
        
        if (this.shouldReconnect()) {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
          this.attemptReconnection();
        } else {
          this.emitError('RECONNECTION_FAILED', 'Failed to reconnect after maximum attempts', false);
        }
      }
    }, this.reconnectDelay);
  }

  private getCloseCodeMeaning(code: number): string {
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

  private resetMetrics(): ConnectionMetrics {
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
  private startKeepAlive(): void {
    this.componentLogger?.debug('Starting KeepAlive timer');
    
    // 10秒以内に音声が来ない場合、短いサイレンスを送って切断を防ぐ
    if (this.initialAudioTimer) clearTimeout(this.initialAudioTimer);
    this.initialAudioTimer = setTimeout(() => {
      if (this.isConnected() && !this.audioStarted) {
        const seconds = 0.2; // 200msのサイレンス
        const bytes = Math.round(this.config.sampleRate * seconds) * 2; // 16bit mono
        const silence = Buffer.alloc(bytes, 0);
        try {
          this.ws!.send(silence);
          this.componentLogger?.debug('Sent initial silence frame to keep connection alive');
          this.audioStarted = true;
        } catch (e) {
          this.componentLogger?.warn('Failed to send initial silence frame', { e });
        }
      }
    }, 9000); // 9秒後（10秒ルールの手前）
    
    // 通常のKeepAlive（無音区間の維持）
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected()) {
        try {
          // Send KeepAlive message as specified by Deepgram
          this.ws!.send(JSON.stringify({ type: 'KeepAlive' }));
          this.componentLogger?.debug('Sent KeepAlive message');
        } catch (error) {
          this.componentLogger?.error('Failed to send KeepAlive', { error });
        }
      }
    }, this.keepAliveIntervalMs);
  }

  /**
   * Stop KeepAlive timer
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.initialAudioTimer) {
      clearTimeout(this.initialAudioTimer);
      this.initialAudioTimer = null;
    }
    this.componentLogger?.debug('Stopped KeepAlive timer');
  }

  /**
   * Reset KeepAlive timer (called on audio activity)
   */
  private resetKeepAlive(): void {
    // Don't reset KeepAlive on every audio chunk - it's unnecessary
    // The timer will handle itself, and we're sending audio continuously
    // which serves as activity indication to Deepgram
  }
}