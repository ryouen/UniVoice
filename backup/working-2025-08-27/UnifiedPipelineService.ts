/**
 * UnifiedPipelineService - Pure Domain Service
 * 
 * Responsibilities:
 * - Manage ASR and Translation pipeline
 * - Integrate with StreamCoalescer for UI optimization
 * - Emit domain events (no UI dependencies)
 * - Handle error recovery and state management
 * 
 * Key Changes from Original:
 * - Removed all UI-specific code
 * - Integrated StreamCoalescer for segment management
 * - Pure event emission (no direct UI updates)
 * - Enhanced error handling and recovery
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import OpenAI from 'openai';
// 🔴 CRITICAL: SegmentManagerのインポートを削除（使用しない）
// import { SegmentManager } from './SegmentManager';
import { AdvancedFeatureService } from './AdvancedFeatureService';
import { 
  createASREvent,
  createTranslationEvent,
  createErrorEvent,
  createStatusEvent,
  createVocabularyEvent,
  createFinalReportEvent,
  PipelineEvent
} from '../ipc/contracts';
import { LanguageConfig, LanguageCode, getTranslationPrompt } from './LanguageConfig';
import { logger } from '../../utils/logger';
import { TranslationQueueManager, QueuedTranslation } from './TranslationQueueManager';
import { SentenceCombiner, CombinedSentence } from './SentenceCombiner';

// ===== Configuration Interfaces =====
interface AudioConfig {
  frameMs: number;
  frameSize: number;
  sampleRate: number;
}

interface DeepgramConfig {
  apiKey: string;
  model: string;
  interim: boolean;
  endpointing: number;
  utteranceEndMs: number;
  smartFormat?: boolean; // NEW: Smart formatting (includes punctuation)
  noDelay?: boolean;     // NEW: Skip 3-second finalization delay
}

interface OpenAIConfig {
  apiKey: string;
  models: {
    translate: string;
    summary: string;
    summaryTranslate: string;
    userTranslate: string;
    vocabulary: string;
    report: string;
  };
  maxTokens: {
    translate: number;
    summary: number;
    vocabulary: number;
    report: number;
  };
}

// ===== Domain Models =====
interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
  startMs?: number;
  endMs?: number;
}

interface Translation {
  id: string;
  original: string;
  translated: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
}

interface Summary {
  id: string;
  english: string;
  japanese: string;
  wordCount: number;
  timestamp: number;
  timeRange: {
    start: number;
    end: number;
  };
}

// ===== Pipeline States =====
type PipelineState = 'idle' | 'starting' | 'listening' | 'processing' | 'stopping' | 'error';

export class UnifiedPipelineService extends EventEmitter {
  // Configuration
  private audioConfig: AudioConfig;
  private deepgramConfig: DeepgramConfig;
  private openaiConfig: OpenAIConfig;
  
  // External services
  private ws: WebSocket | null = null;
  private openai: OpenAI;
  // 🔴 CRITICAL: SegmentManagerフィールドを削除（使用しない）
  // private segmentManager: SegmentManager;
  private advancedFeatures: AdvancedFeatureService;
  private translationQueue: TranslationQueueManager;
  private sentenceCombiner: SentenceCombiner;
  
  // State management
  private state: PipelineState = 'idle';
  private currentCorrelationId: string | null = null;
  private sourceLanguage: LanguageCode;
  private targetLanguage: LanguageCode;
  
  // Data storage
  private transcriptSegments: TranscriptSegment[] = [];
  private translations: Translation[] = [];
  private summaries: Summary[] = [];
  
  // Performance tracking
  private startTime: number = 0;
  private lastActivityTime: number = 0;
  
  private componentLogger = logger.child('UnifiedPipelineService');

  constructor(
    audioConfig: AudioConfig,
    deepgramConfig: DeepgramConfig,
    openaiConfig: OpenAIConfig,
    languageConfig: LanguageConfig = { sourceLanguage: 'en', targetLanguage: 'ja' }
  ) {
    super();
    
    this.audioConfig = audioConfig;
    this.deepgramConfig = deepgramConfig;
    this.openaiConfig = openaiConfig;
    this.sourceLanguage = languageConfig.sourceLanguage;
    this.targetLanguage = languageConfig.targetLanguage;
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.openaiConfig.apiKey,
    });
    
    // 🔴 CRITICAL: SegmentManagerの初期化を完全に削除
    // 重複の原因：SegmentManagerは翻訳を重複でトリガーしていた
    // 親フォルダ（UniVoice 1.0）にはこの機能は存在しない
    
    // Initialize TranslationQueueManager
    this.translationQueue = new TranslationQueueManager({
      maxConcurrency: parseInt(process.env.TRANSLATION_MAX_CONCURRENCY || '3'),
      maxQueueSize: parseInt(process.env.TRANSLATION_MAX_QUEUE_SIZE || '100'),
      requestTimeoutMs: parseInt(process.env.TRANSLATION_TIMEOUT_MS || '30000')
    });
    
    // Set translation handler
    this.translationQueue.setTranslationHandler(async (queuedTranslation: QueuedTranslation) => {
      // 履歴用翻訳か通常翻訳かで分岐
      if (queuedTranslation.segmentId.startsWith('history_')) {
        return this.executeHistoryTranslation(queuedTranslation);
      } else {
        return this.executeTranslation(queuedTranslation);
      }
    });
    
    // Initialize SentenceCombiner
    this.sentenceCombiner = new SentenceCombiner(
      (combinedSentence) => this.handleCombinedSentence(combinedSentence),
      {
        maxSegments: 10,
        timeoutMs: 2000,
        minSegments: 2
      }
    );
    
    // Initialize AdvancedFeatureService
    this.advancedFeatures = new AdvancedFeatureService({
      openaiApiKey: this.openaiConfig.apiKey,
      summaryInterval: parseInt(process.env.SUMMARY_INTERVAL_MS || '600000'),
      summaryModel: process.env.OPENAI_MODEL_SUMMARY || 'gpt-5-mini',
      vocabularyModel: process.env.OPENAI_MODEL_VOCABULARY || 'gpt-5-mini',
      reportModel: process.env.OPENAI_MODEL_REPORT || 'gpt-5',
      maxTokens: {
        summary: parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500'),
        vocabulary: parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500'),
        report: parseInt(process.env.OPENAI_REPORT_MAX_TOKENS || '8192')
      }
    });
    
    // Forward advanced feature events
    this.advancedFeatures.on('summaryGenerated', (event) => {
      this.emit('pipelineEvent', event);
    });
    
    this.advancedFeatures.on('error', (event) => {
      this.emit('pipelineEvent', event);
    });
    
    this.componentLogger.info('UnifiedPipelineService initialized', {
      audioConfig: this.audioConfig,
      deepgramModel: this.deepgramConfig.model,
      openaiModels: this.openaiConfig.models,
    });
  }

  /**
   * Start listening with specified languages
   */
  async startListening(
    sourceLanguage: LanguageCode = 'en',
    targetLanguage: LanguageCode = 'ja',
    correlationId: string
  ): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot start listening in state: ${this.state}`);
    }
    
    this.setState('starting');
    this.currentCorrelationId = correlationId;
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    this.startTime = Date.now();
    
    try {
      await this.connectToDeepgram();
      this.setState('listening');
      
      // Start advanced features for periodic summaries with language settings
      this.advancedFeatures.start(correlationId, this.sourceLanguage, this.targetLanguage);
      
      this.componentLogger.info('Started listening', {
        sourceLanguage,
        targetLanguage,
        correlationId,
      });
      
    } catch (error) {
      this.setState('error');
      this.emitError('DEEPGRAM_CONNECTION_FAILED', 
        error instanceof Error ? error.message : 'Failed to connect to Deepgram',
        correlationId
      );
      throw error;
    }
  }

  /**
   * Stop listening
   */
  async stopListening(correlationId: string): Promise<void> {
    if (this.state === 'idle') {
      return; // Already stopped
    }
    
    this.setState('stopping');
    
    try {
      // 🔴 CRITICAL: SegmentManager.forceEmitAll()を削除
      // 親フォルダ（UniVoice 1.0）と同じシンプルな実装
      // this.segmentManager.forceEmitAll();
      
      // Force emit any remaining segments in SentenceCombiner
      this.sentenceCombiner.forceEmit();
      
      // Stop advanced features
      await this.advancedFeatures.stop();
      
      // Close Deepgram connection
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      this.setState('idle');
      this.currentCorrelationId = null;
      
      this.componentLogger.info('Stopped listening', {
        correlationId,
        duration: Date.now() - this.startTime,
        segmentsProcessed: this.transcriptSegments.length,
        translationsGenerated: this.translations.length,
      });
      
    } catch (error) {
      this.setState('error');
      this.emitError('STOP_FAILED',
        error instanceof Error ? error.message : 'Failed to stop listening',
        correlationId
      );
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): {
    state: PipelineState;
    sourceLanguage: string;
    targetLanguage: string;
    segmentCount: number;
    translationCount: number;
    summaryCount: number;
    uptime: number;
  } {
    return {
      state: this.state,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
      segmentCount: this.transcriptSegments.length,
      translationCount: this.translations.length,
      summaryCount: this.summaries.length,
      uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
    };
  }

  /**
   * Send audio chunk for processing
   */
  sendAudioChunk(buffer: Buffer): void {
    if (this.state !== 'listening' || !this.ws) {
      return;
    }
    
    try {
      this.ws.send(buffer);
      this.lastActivityTime = Date.now();
    } catch (error) {
      this.componentLogger.error('Failed to send audio chunk', {
        error: error instanceof Error ? error.message : String(error),
        bufferSize: buffer.length,
      });
    }
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.transcriptSegments = [];
    this.translations = [];
    this.summaries = [];
    // 🔴 CRITICAL: SegmentManager.resetAll()を削除
    // this.segmentManager.resetAll();
    
    this.componentLogger.info('History cleared');
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      pipeline: this.getState(),
      // 🔴 CRITICAL: SegmentManager.getMetrics()を削除
      // segmentManager: this.segmentManager.getMetrics(),
      performance: {
        startTime: this.startTime,
        lastActivity: this.lastActivityTime,
        uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
      },
    };
  }

  // ===== Private Methods =====

  // 🔴 CRITICAL: SegmentManagerのイベントハンドラを無効化
  // 重複の原因：このハンドラも翻訳をトリガーしていた
  // 親フォルダ（UniVoice 1.0）にはこの機能は存在しない
  /*
  private setupSegmentManager(): void {
    this.segmentManager.on('coalescedSegment', (coalescedSegment) => {
      // Emit segment event
      this.emitEvent(createSegmentEvent({
        segmentId: coalescedSegment.segmentId,
        text: coalescedSegment.data.text,
        translation: coalescedSegment.data.translation,
        status: coalescedSegment.data.isFinal ? 'completed' : 'processing',
        metadata: {
          confidence: coalescedSegment.data.confidence,
          holdDuration: coalescedSegment.holdDuration,
          timestamp: coalescedSegment.timestamp,
        },
      }, this.currentCorrelationId || 'unknown'));
      
      // Trigger translation if needed
      if (coalescedSegment.data.text && !coalescedSegment.data.translation) {
        this.translateSegment(coalescedSegment.data.text, coalescedSegment.segmentId);
      }
    });
  }
  */

  /**
   * Connect to Deepgram WebSocket
   * 
   * @see https://developers.deepgram.com/reference/speech-to-text-api/listen-streaming
   * @see docs/DEEPGRAM-NOVA3-API-GUIDE.md - Nova-3モデルの使用方法
   * 
   * 重要: nova-3は実在のモデルです（2025年リリース）
   * パラメータ詳細:
   * - model: nova-3（推奨）、nova-3-general、nova-3-medical
   * - interim_results: true（リアルタイム表示に必須）
   * - punctuate: true（句読点の自動挿入）
   * - endpointing: 800ms（推奨値）
   * - utterance_end_ms: 1000ms（推奨値）
   */
  private async connectToDeepgram(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build WebSocket URL with optimized parameters
      let wsUrl = `wss://api.deepgram.com/v1/listen?` +
        `model=${this.deepgramConfig.model}&` +
        `interim_results=${this.deepgramConfig.interim}&` +
        `endpointing=${this.deepgramConfig.endpointing}&` +
        `utterance_end_ms=${this.deepgramConfig.utteranceEndMs}&` +
        `language=${this.sourceLanguage}&` +
        `sample_rate=${this.audioConfig.sampleRate}&` +
        `channels=1&` +
        `encoding=linear16&` +
        `punctuate=true`; // 親フォルダと同様にpunctuateを追加
      
      // Add smart_format if enabled (includes punctuation, so punctuate param not needed)
      if (this.deepgramConfig.smartFormat) {
        wsUrl += `&smart_format=true`;
        // Note: punctuate=true is not needed when smart_format=true, but keeping it doesn't hurt
      }
      
      // Add no_delay if enabled (trades quality for speed)
      if (this.deepgramConfig.noDelay) {
        wsUrl += `&no_delay=true`;
      }
      
      console.log('[UnifiedPipelineService] Connecting to Deepgram with URL:', wsUrl);
      console.log('[UnifiedPipelineService] API Key available:', !!this.deepgramConfig.apiKey);
      
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Token ${this.deepgramConfig.apiKey}`,
        },
      });
      
      this.ws.on('open', () => {
        this.componentLogger.info('Deepgram WebSocket connected');
        console.log('[UnifiedPipelineService] Deepgram WebSocket connected successfully');
        resolve();
      });
      
      this.ws.on('message', (data) => {
        this.handleDeepgramMessage(data);
      });
      
      this.ws.on('error', (error: any) => {
        console.error('[UnifiedPipelineService] Deepgram WebSocket error:', error);
        console.error('[UnifiedPipelineService] Error details:', {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        });
        
        // Enhanced error logging for better diagnostics
        if (error.message?.includes('400')) {
          console.error('[UnifiedPipelineService] 400 Bad Request - Possible causes:');
          console.error('  - Invalid audio format being sent');
          console.error('  - Incorrect WebSocket parameters');
          console.error('  - API key permissions issue');
        } else if (error.message?.includes('401')) {
          console.error('[UnifiedPipelineService] 401 Unauthorized - API key is invalid');
        }
        
        this.componentLogger.error('Deepgram WebSocket error', { 
          error: error.message,
          code: error.code,
          type: error.type
        });
        
        // Emit error event to UI
        this.emitError('DEEPGRAM_ERROR', 
          `Deepgram connection error: ${error.message || 'Unknown error'}`,
          this.currentCorrelationId || 'unknown'
        );
        
        reject(error);
      });
      
      this.ws.on('close', (code, reason) => {
        console.log('[UnifiedPipelineService] Deepgram WebSocket closed', {
          code,
          reason: reason?.toString()
        });
        
        // Log close codes for diagnostics
        if (code !== 1000) { // 1000 is normal closure
          console.error('[UnifiedPipelineService] Abnormal WebSocket closure:', {
            code,
            reason: reason?.toString(),
            meaning: this.getCloseCodeMeaning(code)
          });
        }
        
        this.componentLogger.info('Deepgram WebSocket closed', { code, reason: reason?.toString() });
        this.ws = null;
      });
    });
  }

  /**
   * Get meaning of WebSocket close code
   */
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

  /**
   * Handle Deepgram WebSocket messages
   */
  private handleDeepgramMessage(data: Buffer | ArrayBuffer | Buffer[]): void {
    try {
      let dataStr: string;
      if (Buffer.isBuffer(data)) {
        dataStr = data.toString();
      } else if (data instanceof ArrayBuffer) {
        dataStr = Buffer.from(data).toString();
      } else {
        dataStr = Buffer.concat(data).toString();
      }
      const message = JSON.parse(dataStr);
      
      // Check for error messages from Deepgram
      if (message.type === 'Error' || message.error) {
        console.error('[UnifiedPipelineService] Deepgram error message:', message);
        this.componentLogger.error('Deepgram error message', { message });
        
        // Emit error to UI
        this.emitError('DEEPGRAM_MESSAGE_ERROR', 
          `Deepgram error: ${message.error || message.message || 'Unknown error'}`,
          this.currentCorrelationId || 'unknown'
        );
        return;
      }
      
      // Handle transcript messages
      if (message.channel?.alternatives?.[0]) {
        const alternative = message.channel.alternatives[0];
        const transcript = alternative.transcript;
        
        if (transcript) {
          const segment: TranscriptSegment = {
            id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: transcript,
            timestamp: Date.now(),
            confidence: alternative.confidence || 0,
            isFinal: message.is_final || false,
            startMs: message.start ? Math.round(message.start * 1000) : undefined,
            endMs: message.end ? Math.round(message.end * 1000) : undefined,
          };
          
          this.processTranscriptSegment(segment);
        }
      } else if (message.type === 'Metadata') {
        // Log metadata messages for debugging
        console.log('[UnifiedPipelineService] Deepgram metadata:', message);
      }
    } catch (error) {
      this.componentLogger.error('Failed to parse Deepgram message', {
        error: error instanceof Error ? error.message : String(error),
        data: data.toString().substring(0, 200),
      });
    }
  }

  /**
   * Process transcript segment - シンプルに処理（親フォルダと同様）
   */
  private processTranscriptSegment(segment: TranscriptSegment): void {
    // Store final segments only
    if (segment.isFinal) {
      this.transcriptSegments.push(segment);
      
      // 直接翻訳をキューに追加（SegmentManager不要）
      this.translateSegment(segment.text, segment.id);
      
      // SentenceCombinerに追加（文単位の結合用）
      this.sentenceCombiner.addSegment(segment);
    }
    
    // Emit ASR event for both interim and final results
    console.log('[UnifiedPipelineService] Emitting ASR event:', {
      text: segment.text,
      isFinal: segment.isFinal,
      segmentId: segment.id
    });
    this.emitEvent(createASREvent({
      text: segment.text,
      confidence: segment.confidence,
      isFinal: segment.isFinal,
      language: this.sourceLanguage,
      segmentId: segment.id, // Added for RealtimeDisplayManager
    }, this.currentCorrelationId || 'unknown'));
    
    // 🔴 CRITICAL: 親フォルダと同じ直接イベントも発行
    // リアルタイム表示のために必要（interim結果も含む）
    this.emit('currentOriginalUpdate', {
      text: segment.text,
      isFinal: segment.isFinal
    });
    
    // 🔴 CRITICAL: SegmentManager経由の処理を削除
    // 重複の原因：SegmentManagerも翻訳をトリガーするため、
    // 同じセグメントが2回翻訳されていた
    // 親フォルダ（UniVoice 1.0）と同じシンプルな実装に戻す
  }

  /**
   * Translate segment text using queue
   * 
   * 翻訳リクエストをキューに追加し、並列数制限を適用
   */
  private async translateSegment(text: string, segmentId: string): Promise<void> {
    try {
      // キューに翻訳リクエストを追加
      await this.translationQueue.enqueue({
        segmentId,
        originalText: text,
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        timestamp: Date.now(),
        priority: 'normal' // 通常優先度
      });
      
      this.componentLogger.info('Translation request queued', {
        segmentId,
        queueStatus: this.translationQueue.getStatus()
      });
    } catch (error) {
      this.componentLogger.error('Failed to queue translation', {
        segmentId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // エラーイベントを発行
      this.emitEvent(createErrorEvent(
        {
          code: 'TRANSLATION_QUEUE_ERROR',
          message: `Translation queue error: ${error instanceof Error ? error.message : String(error)}`,
          recoverable: true
        },
        this.currentCorrelationId || 'unknown'
      ));
    }
  }
  
  /**
   * Execute translation (called by queue)
   * 
   * @see https://platform.openai.com/docs/api-reference/responses
   * @see docs/GPT5-RESPONSES-API-GUIDE.md - GPT-5 Responses APIの使用方法
   * 
   * 重要: Responses APIは実在のAPIです（2025年3月リリース）
   * - responses.stream を使用（chat.completions.createではない）
   * - inputパラメータを使用（messagesではない）
   * - max_output_tokensを使用（max_tokensではない）
   * - reasoning.effortで推論の深さを制御（minimal/low/medium/high）
   * - temperatureは1.0固定（GPT-5では変更不可）
   */
  private async executeTranslation(queuedTranslation: QueuedTranslation): Promise<string> {
    const startTime = Date.now();
    let firstPaintTime = 0;
    const segmentId = queuedTranslation.segmentId;
    const text = queuedTranslation.originalText;
    
    try {
      // 🔴 正しいAPI呼び出し方法（test-3min-complete.jsで動作確認済み）
      // responses.create を使用（chat.completions.createではない）
      // これがGPT-5系モデルの正しい呼び方
      // 動的に翻訳プロンプトを生成
      const translationPrompt = getTranslationPrompt(this.sourceLanguage, this.targetLanguage);
      
      const stream = await this.openai.responses.create({
        model: this.openaiConfig.models.translate,
        input: [
          { role: 'system', content: translationPrompt },
          { role: 'user', content: text }
        ],
        max_output_tokens: this.openaiConfig.maxTokens.translate,
        reasoning: { effort: 'minimal' },
        stream: true  // ストリーミングを有効化
      });
      
      let translation = '';
      
      for await (const chunk of stream) {
        // test-3min-complete.js (517行目) に準拠
        if (chunk.type === 'response.output_text.delta' && chunk.delta) {
          const delta = chunk.delta;
          if (delta && !firstPaintTime) {
            firstPaintTime = Date.now() - startTime;
          }
          translation += delta;
          
          // ④Current Japanese更新（ストリーミング）
          // 中間結果も最終結果も両方リアルタイム表示
          // SegmentManagerは使わない - 親フォルダと同じシンプルな処理
          
          // 🔴 CRITICAL: 親フォルダと同じ直接イベントも発行
          // リアルタイム翻訳表示のために必要（累積された全体を送信）
          this.emit('currentTranslationUpdate', translation);
        }
      }
      
      const completeTime = Date.now() - startTime;
      
      // 翻訳完了
      const result: Translation = {
        id: `translation-${segmentId}`,
        original: text,
        translated: translation.trim(),
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        timestamp: Date.now(),
        confidence: 0.9, // OpenAI translations are generally high confidence
        isFinal: true,
      };
      
      this.translations.push(result);
      
      // 🔴 CRITICAL: SegmentManagerは使わない - 親フォルダと同じシンプルな処理
      // 重複の原因を完全に排除
      
      // Add translation to advanced features for summary generation
      this.advancedFeatures.addTranslation({
        id: result.id,
        original: result.original,
        translated: result.translated,
        timestamp: result.timestamp
      });
      
      // Emit translation event
      this.emitEvent(createTranslationEvent({
        originalText: result.original,
        translatedText: result.translated,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        confidence: result.confidence,
        isFinal: result.isFinal,
        segmentId: segmentId,
      }, this.currentCorrelationId || 'unknown'));
      
      // 🔴 CRITICAL: 親フォルダ互換のtranslationCompleteイベントを発火
      // このイベントがないと履歴に追加されない
      if (result.isFinal) {
        this.emit('translationComplete', {
          id: segmentId,
          original: result.original,
          japanese: result.translated,
          timestamp: Date.now(),
          firstPaintMs: firstPaintTime,
          completeMs: completeTime
        });
      }
      
      // 成功メトリクス
      console.log(`[翻訳完了] "${result.translated.substring(0, 30)}..." (${completeTime}ms)`);
      
      this.componentLogger.performance('info', 'Translation completed', startTime, {
        textLength: text.length,
        translationLength: result.translated.length,
        segmentId,
        firstPaintMs: firstPaintTime,
        completeMs: completeTime,
      });
      
      // Return the translated text for the queue
      return result.translated;
      
    } catch (error: any) {
      console.error('[UnifiedPipeline] Translation error:', error);
      console.error('[UnifiedPipeline] Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        response: error.response?.data
      });
      
      this.componentLogger.error('Translation failed', {
        error: error instanceof Error ? error.message : String(error),
        text: text.substring(0, 100),
        segmentId,
      });
      
      this.emitEvent(createErrorEvent(
        {
          code: 'TRANSLATION_FAILED',
          message: `Failed to translate segment: ${error instanceof Error ? error.message : 'Unknown error'}`,
          recoverable: false
        },
        this.currentCorrelationId || 'unknown'
      ));
      
      // Re-throw to let the queue handle the error
      throw error;
    }
  }

  /**
   * Set pipeline state and emit status event
   */
  private setState(newState: PipelineState): void {
    const oldState = this.state;
    this.state = newState;
    
    this.componentLogger.info('Pipeline state changed', {
      from: oldState,
      to: newState,
      correlationId: this.currentCorrelationId,
    });
    
    // Emit status event
    this.emitEvent(createStatusEvent({
      state: newState,
      details: {
        previousState: oldState,
        timestamp: Date.now(),
        uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
      },
    }, this.currentCorrelationId || 'unknown'));
  }

  /**
   * Emit pipeline event
   */
  private emitEvent(event: PipelineEvent): void {
    this.emit('pipelineEvent', event);
  }

  /**
   * Emit error event
   */
  private emitError(code: string, message: string, correlationId: string): void {
    this.emitEvent(createErrorEvent({
      code,
      message,
      recoverable: true,
      details: {
        state: this.state,
        timestamp: Date.now(),
      },
    }, correlationId));
  }


  /**
   * Generate vocabulary from current session
   */
  public async generateVocabulary(correlationId: string): Promise<void> {
    try {
      this.componentLogger.info('Generating vocabulary', { correlationId });
      
      const vocabulary = await this.advancedFeatures.generateVocabulary();
      
      if (vocabulary.length > 0) {
        this.emitEvent(createVocabularyEvent({
          items: vocabulary,
          totalTerms: vocabulary.length,
        }, correlationId));
        
        this.componentLogger.info('Vocabulary generated', {
          correlationId,
          termCount: vocabulary.length,
        });
      } else {
        this.componentLogger.warn('No vocabulary items generated', { correlationId });
      }
    } catch (error) {
      this.componentLogger.error('Failed to generate vocabulary', {
        error: error instanceof Error ? error.message : String(error),
        correlationId,
      });
      
      this.emitError('VOCABULARY_GENERATION_FAILED',
        `Failed to generate vocabulary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        correlationId
      );
    }
  }

  /**
   * Generate final report from current session
   */
  public async generateFinalReport(correlationId: string): Promise<void> {
    try {
      this.componentLogger.info('Generating final report', { correlationId });
      
      const report = await this.advancedFeatures.generateFinalReport();
      
      if (report) {
        const totalWordCount = this.translations.reduce(
          (sum, t) => sum + t.original.split(' ').length, 
          0
        );
        const summaryCount = this.advancedFeatures.getSummaries().length;
        const vocabularyCount = (await this.advancedFeatures.generateVocabulary()).length;
        
        this.emitEvent(createFinalReportEvent({
          report,
          totalWordCount,
          summaryCount,
          vocabularyCount,
        }, correlationId));
        
        this.componentLogger.info('Final report generated', {
          correlationId,
          reportLength: report.length,
          totalWordCount,
          summaryCount,
        });
      } else {
        this.componentLogger.warn('Empty final report generated', { correlationId });
      }
    } catch (error) {
      this.componentLogger.error('Failed to generate final report', {
        error: error instanceof Error ? error.message : String(error),
        correlationId,
      });
      
      this.emitError('FINAL_REPORT_GENERATION_FAILED',
        `Failed to generate final report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        correlationId
      );
    }
  }
  
  /**
   * Handle combined sentence from SentenceCombiner
   * 結合された文を履歴用高品質翻訳キューに追加
   */
  private async handleCombinedSentence(combinedSentence: CombinedSentence): Promise<void> {
    console.log(`[UnifiedPipelineService] Combined sentence ready: ${combinedSentence.segmentCount} segments`);
    
    try {
      // 履歴用翻訳リクエストを低優先度でキューに追加
      await this.translationQueue.enqueue({
        segmentId: `history_${combinedSentence.id}`,
        originalText: combinedSentence.originalText,
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        timestamp: combinedSentence.timestamp,
        priority: 'low'  // 低優先度でリアルタイム翻訳を妨げない
      });
      
      console.log(`[UnifiedPipelineService] History translation queued for combined sentence: ${combinedSentence.id}`);
    } catch (error) {
      console.error('[UnifiedPipelineService] Failed to queue history translation:', error);
      // 履歴翻訳の失敗はリアルタイム翻訳に影響しないようにエラーを握りつぶす
    }
  }
  
  /**
   * Execute history translation with higher quality
   * 履歴用の高品質翻訳を実行（より大きなコンテキストと高品質モデル）
   */
  private async executeHistoryTranslation(queuedTranslation: QueuedTranslation): Promise<string> {
    const startTime = Date.now();
    const combinedId = queuedTranslation.segmentId.replace('history_', '');
    const text = queuedTranslation.originalText;
    
    try {
      console.log(`[UnifiedPipelineService] Starting history translation for: ${combinedId}`);
      
      // 履歴用の詳細な翻訳プロンプト
      const historyTranslationPrompt = `あなたは${this.sourceLanguage}から${this.targetLanguage}への専門翻訳者です。
以下の講義内容を、文脈を考慮して自然で正確な${this.targetLanguage}に翻訳してください。

重要な指示:
1. 専門用語は正確に翻訳し、必要に応じて原語を併記
2. 文の流れを自然にし、講義として聞きやすい表現に
3. 複数の文がある場合は、文脈を考慮して一貫性のある翻訳に
4. 学生が理解しやすいよう、適切な説明を加えても構いません`;
      
      // 高品質モデルで翻訳（gpt-5-miniまたはgpt-5）
      const stream = await this.openai.responses.create({
        model: this.openaiConfig.models.summary,  // 高品質モデルを使用
        input: [
          { role: 'system', content: historyTranslationPrompt },
          { role: 'user', content: text }
        ],
        max_output_tokens: 2000,  // より長い出力を許可
        reasoning: { effort: 'low' },  // 少し推論を強化
        stream: true
      });
      
      let translation = '';
      
      for await (const chunk of stream) {
        if (chunk.type === 'response.output_text.delta' && chunk.delta) {
          translation += chunk.delta;
        }
      }
      
      const completeTime = Date.now() - startTime;
      console.log(`[UnifiedPipelineService] History translation completed in ${completeTime}ms`);
      
      // 履歴翻訳完了イベントを発行（pipelineEventとして）
      this.emitEvent(createTranslationEvent({
        originalText: text,
        translatedText: translation.trim(),
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        confidence: 0.95,  // 高品質翻訳なので高信頼度
        isFinal: true,
        segmentId: `history_${combinedId}`,  // 履歴翻訳であることを識別
      }, this.currentCorrelationId || 'unknown'));
      
      return translation.trim();
      
    } catch (error: any) {
      console.error('[UnifiedPipelineService] History translation error:', error);
      
      // 履歴翻訳の失敗は致命的ではないので、エラーを記録するだけ
      this.componentLogger.warn('History translation failed', {
        error: error instanceof Error ? error.message : String(error),
        combinedId,
        textLength: text.length
      });
      
      // 空の翻訳を返す（元のセグメント翻訳が使用される）
      return '';
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // 🔴 CRITICAL: SegmentManager.destroy()を削除
    // this.segmentManager.destroy();
    this.advancedFeatures.destroy();
    this.translationQueue.destroy();
    this.sentenceCombiner.destroy();
    this.removeAllListeners();
    
    this.componentLogger.info('UnifiedPipelineService destroyed');
  }
}