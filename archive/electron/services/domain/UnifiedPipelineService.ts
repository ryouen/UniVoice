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
import { SegmentManager, SegmentInput } from './SegmentManager';
import { 
  createASREvent,
  createTranslationEvent,
  createSegmentEvent,
  createErrorEvent,
  createStatusEvent,
  PipelineEvent
} from '../ipc/contracts';
import { logger } from '../../utils/logger';

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
  private segmentManager: SegmentManager;
  
  // State management
  private state: PipelineState = 'idle';
  private currentCorrelationId: string | null = null;
  private sourceLanguage: string = 'en';
  private targetLanguage: string = 'ja';
  
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
    openaiConfig: OpenAIConfig
  ) {
    super();
    
    this.audioConfig = audioConfig;
    this.deepgramConfig = deepgramConfig;
    this.openaiConfig = openaiConfig;
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.openaiConfig.apiKey,
    });
    
    // Initialize SegmentManager with optimized settings
    this.segmentManager = new SegmentManager({
      debounceMs: parseInt(process.env.STREAM_COALESCER_DEBOUNCE_MS || '160'),
      forceCommitMs: parseInt(process.env.STREAM_COALESCER_FORCE_COMMIT_MS || '1100'),
      cleanupIntervalMs: 30000,
      maxInactiveMs: 60000,
    });
    
    this.setupSegmentManager();
    
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
    sourceLanguage: string = 'en',
    targetLanguage: string = 'ja',
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
      // Force emit any pending segments
      this.segmentManager.forceEmitAll();
      
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
    uptime: number;
  } {
    return {
      state: this.state,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
      segmentCount: this.transcriptSegments.length,
      translationCount: this.translations.length,
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
    this.segmentManager.resetAll();
    
    this.componentLogger.info('History cleared');
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      pipeline: this.getState(),
      segmentManager: this.segmentManager.getMetrics(),
      performance: {
        startTime: this.startTime,
        lastActivity: this.lastActivityTime,
        uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
      },
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.segmentManager.destroy();
    this.removeAllListeners();
    
    this.componentLogger.info('UnifiedPipelineService destroyed');
  }

  // ===== Private Methods =====

  /**
   * Setup SegmentManager event handlers
   */
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

  /**
   * Connect to Deepgram WebSocket
   */
  private async connectToDeepgram(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `wss://api.deepgram.com/v1/listen?` +
        `model=${this.deepgramConfig.model}&` +
        `interim_results=${this.deepgramConfig.interim}&` +
        `endpointing=${this.deepgramConfig.endpointing}&` +
        `utterance_end_ms=${this.deepgramConfig.utteranceEndMs}&` +
        `language=${this.sourceLanguage}&` +
        `sample_rate=${this.audioConfig.sampleRate}&` +
        `channels=1&` +
        `encoding=linear16`;
      
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Token ${this.deepgramConfig.apiKey}`,
        },
      });
      
      this.ws.on('open', () => {
        this.componentLogger.info('Deepgram WebSocket connected');
        resolve();
      });
      
      this.ws.on('message', (data) => {
        this.handleDeepgramMessage(data);
      });
      
      this.ws.on('error', (error) => {
        this.componentLogger.error('Deepgram WebSocket error', { error });
        reject(error);
      });
      
      this.ws.on('close', () => {
        this.componentLogger.info('Deepgram WebSocket closed');
        this.ws = null;
      });
    });
  }

  /**
   * Handle Deepgram WebSocket messages
   */
  private handleDeepgramMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      
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
      }
    } catch (error) {
      this.componentLogger.error('Failed to parse Deepgram message', {
        error: error instanceof Error ? error.message : String(error),
        data: data.toString().substring(0, 200),
      });
    }
  }

  /**
   * Process transcript segment through SegmentManager
   */
  private processTranscriptSegment(segment: TranscriptSegment): void {
    // Store segment
    this.transcriptSegments.push(segment);
    
    // Emit ASR event
    this.emitEvent(createASREvent({
      text: segment.text,
      confidence: segment.confidence,
      isFinal: segment.isFinal,
      language: this.sourceLanguage,
    }, this.currentCorrelationId || 'unknown'));
    
    // Process through SegmentManager
    const segmentInput: SegmentInput = {
      text: segment.text,
      confidence: segment.confidence,
      isFinal: segment.isFinal,
      startMs: segment.startMs,
      endMs: segment.endMs,
      metadata: {
        segmentId: segment.id,
        timestamp: segment.timestamp,
      },
    };
    
    this.segmentManager.processSegment(segmentInput);
  }

  /**
   * Translate segment text
   */
  private async translateSegment(text: string, segmentId: string): Promise<void> {
    try {
      const startTime = Date.now();
      
      const response = await this.openai.chat.completions.create({
        model: this.openaiConfig.models.translate,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following ${this.sourceLanguage} text to ${this.targetLanguage}. Provide only the translation, no explanations.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        max_tokens: this.openaiConfig.maxTokens.translate,
        temperature: 0.3,
      });
      
      const translatedText = response.choices[0]?.message?.content?.trim() || '';
      
      if (translatedText) {
        const translation: Translation = {
          id: `translation-${segmentId}`,
          original: text,
          translated: translatedText,
          sourceLanguage: this.sourceLanguage,
          targetLanguage: this.targetLanguage,
          timestamp: Date.now(),
          confidence: 0.9, // OpenAI translations are generally high confidence
          isFinal: true,
        };
        
        this.translations.push(translation);
        
        // Emit translation event
        this.emitEvent(createTranslationEvent({
          originalText: translation.original,
          translatedText: translation.translated,
          sourceLanguage: translation.sourceLanguage,
          targetLanguage: translation.targetLanguage,
          confidence: translation.confidence,
          isFinal: translation.isFinal,
        }, this.currentCorrelationId || 'unknown'));
        
        this.componentLogger.performance('info', 'Translation completed', startTime, {
          textLength: text.length,
          translationLength: translatedText.length,
          segmentId,
        });
      }
    } catch (error) {
      this.componentLogger.error('Translation failed', {
        error: error instanceof Error ? error.message : String(error),
        text: text.substring(0, 100),
        segmentId,
      });
      
      this.emitError('TRANSLATION_FAILED',
        `Failed to translate segment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.currentCorrelationId || 'unknown'
      );
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
}