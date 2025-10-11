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
import { DeepgramStreamAdapter, TranscriptResult, DeepgramError } from '../adapters/DeepgramStreamAdapter';
import OpenAI from 'openai';
// 🔴 CRITICAL: SegmentManagerのインポートを削除（使用しない）
// import { SegmentManager } from './SegmentManager';
// AdvancedFeatureService is managed in main.ts, not here
import { 
  createASREvent,
  createTranslationEvent,
  createErrorEvent,
  createStatusEvent,
  createCombinedSentenceEvent,  // 【Phase 2-2】追加
  PipelineEvent
} from '../ipc/contracts';
import { LanguageConfig, LanguageCode, getTranslationPrompt, SUPPORTED_LANGUAGES } from './LanguageConfig';
import { isDeepgramSupported } from './DeepgramLanguageSupport';
import { logger } from '../../utils/logger';
import { TranslationQueueManager, QueuedTranslation } from './TranslationQueueManager';
import { SentenceCombiner, CombinedSentence } from './SentenceCombiner';
import type { TranscriptSegment } from '../../shared/types/TranscriptSegment';
// Shadow Mode統合用のインポート（🔴 既存実装は変更しない）
// Shadow Mode not implemented - imports commented out
// import { LLMGateway, LLMPurpose, LLMConfig } from '../../infrastructure/llm/types';
// import { OpenAIGateway } from '../../infrastructure/llm/OpenAIGateway';
// 状態管理の責任分離
import { PipelineStateManager, PipelineState } from './PipelineStateManager';

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

// ===== Domain Models ====

interface Translation {
  id: string;
  sourceText: string;     // original → sourceText
  targetText: string;     // translated → targetText
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
}

interface Summary {
  id: string;
  sourceText: string;
  targetText: string;
  wordCount: number;
  timestamp: number;
  timeRange: {
    start: number;
    end: number;
  };
}

// ===== Pipeline States =====
// PipelineState は PipelineStateManager から import されるため削除

export class UnifiedPipelineService extends EventEmitter {
  // Configuration
  private audioConfig: AudioConfig;
  private deepgramConfig: DeepgramConfig;
  private openaiConfig: OpenAIConfig;
  
  // External services
  private deepgramAdapter: DeepgramStreamAdapter | null = null;
  private openai: OpenAI;
  // 🔴 CRITICAL: SegmentManagerフィールドを削除（使用しない）
  // private segmentManager: SegmentManager;
  // AdvancedFeatureService is managed in main.ts, not here
  private translationQueue: TranslationQueueManager;
  private sentenceCombiner: SentenceCombiner;
  // 🔴 ParagraphBuilderを一時的に無効化 - フロントエンドでのグループ化を優先
  // private paragraphBuilder: ParagraphBuilder;  // 【Phase 2-ParagraphBuilder】追加
  
  // Shadow Mode用のLLM Gateway（🔴 既存実装に影響しない）
  // private llmGateway: LLMGateway | null = null;  // Shadow Mode not implemented
  // private enableShadowMode: boolean = false;  // Shadow Mode not implemented
  
  // State management - PipelineStateManagerに統合
  private stateManager: PipelineStateManager;
  private sourceLanguage: LanguageCode;
  private targetLanguage: LanguageCode;
  
  // 🔴 CRITICAL: stateプロパティは削除し、stateManagerに完全移行済み
  private currentCorrelationId: string | null = null;  // 現在の実装で使用されている
  private startTime: number = 0;  // 現在の実装で使用されている
  private lastActivityTime: number = 0;  // 現在の実装で使用されている
  
  // Data storage
  private transcriptSegments: TranscriptSegment[] = [];
  private translations: Translation[] = [];
  private summaries: Summary[] = [];
  
  private componentLogger = logger.child('UnifiedPipelineService');
  private audioFrameCount = 0; // 音声フレームカウンター

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
    
    // Initialize state manager
    this.stateManager = new PipelineStateManager();
    
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
      // 履歴用翻訳かパラグラフ翻訳か通常翻訳かで分岐
      if (queuedTranslation.segmentId.startsWith('history_') || 
          queuedTranslation.segmentId.startsWith('paragraph_')) {
        return this.executeHistoryTranslation(queuedTranslation);
      } else {
        return this.executeTranslation(queuedTranslation);
      }
    });

    this.translationQueue.setErrorHandler((translation, error) => {
      this.handleTranslationQueueFailure(translation, error);
    });

    
    // Initialize SentenceCombiner
    this.sentenceCombiner = new SentenceCombiner(
      (combinedSentence) => this.handleCombinedSentence(combinedSentence),
      {
        maxSegments: 10,
        timeoutMs: 2000,
        minSegments: 1  // DEEP-THINK修正: 短い文も履歴に含める（元は2）
      }
    );
    
    // 🔴 ParagraphBuilderを一時的に無効化 - フロントエンドでのグループ化を優先
    // Initialize ParagraphBuilder
    // 【Phase 2-ParagraphBuilder】パラグラフ単位の履歴管理
    // this.paragraphBuilder = new ParagraphBuilder(
    //   (paragraph) => this.handleParagraphComplete(paragraph),
    //   {
    //     minDurationMs: 10000,    // 10秒（短いセッションにも対応）
    //     maxDurationMs: 60000,    // 60秒
    //     silenceThresholdMs: 2000 // 2秒
    //   }
    // );
    
    // AdvancedFeatureService is managed externally in main.ts to maintain
    // proper separation of concerns and avoid duplicate instances
    
    this.componentLogger.info('UnifiedPipelineService initialized', {
      audioConfig: this.audioConfig,
      deepgramModel: this.deepgramConfig.model,
      openaiModels: this.openaiConfig.models,
    });
    
    // Shadow Modeの初期化（🔴 環境変数で有効化）
    // Shadow Mode not implemented - initialization commented out
    // this.enableShadowMode = false;
    /*
    this.enableShadowMode = process.env.ENABLE_LLM_SHADOW_MODE === 'true';
    if (this.enableShadowMode) {
      try {
        // LLM Gateway設定を構築（既存のOpenAI設定を流用）
        const llmConfig: LLMConfig = {
          apiKey: this.openaiConfig.apiKey,
          models: {
            [LLMPurpose.TRANSLATION]: this.openaiConfig.models.translate,
            [LLMPurpose.SUMMARY]: this.openaiConfig.models.summary,
            [LLMPurpose.SUMMARY_TRANSLATE]: this.openaiConfig.models.summaryTranslate || this.openaiConfig.models.translate,
            [LLMPurpose.USER_TRANSLATE]: this.openaiConfig.models.userTranslate || this.openaiConfig.models.translate,
            [LLMPurpose.VOCABULARY]: this.openaiConfig.models.vocabulary,
            [LLMPurpose.REPORT]: this.openaiConfig.models.report
          },
          maxTokens: {
            [LLMPurpose.TRANSLATION]: this.openaiConfig.maxTokens.translate,
            [LLMPurpose.SUMMARY]: this.openaiConfig.maxTokens.summary,
            [LLMPurpose.SUMMARY_TRANSLATE]: this.openaiConfig.maxTokens.translate,
            [LLMPurpose.USER_TRANSLATE]: this.openaiConfig.maxTokens.translate,
            [LLMPurpose.VOCABULARY]: this.openaiConfig.maxTokens.vocabulary,
            [LLMPurpose.REPORT]: this.openaiConfig.maxTokens.report
          }
        };
        
        // this.llmGateway = new OpenAIGateway(llmConfig);  // Shadow Mode not implemented
        this.componentLogger.info('Shadow Mode not implemented - skipping LLM Gateway initialization');
      } catch (error) {
        this.componentLogger.error('Failed to initialize LLM Gateway for Shadow Mode', { error });
        this.enableShadowMode = false; // Shadow Modeを無効化
      }
    }
    */
  }

  /**
   * Translate a paragraph (for history window)
   */
  async translateParagraph(
    paragraphId: string,
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string,
    correlationId: string
  ): Promise<void> {
    try {
      this.componentLogger.info('Translating paragraph', {
        paragraphId,
        sourceLanguage,
        targetLanguage,
        textLength: sourceText.length
      });

      // パラグラフ翻訳用のプロンプトを生成
      const systemPrompt = getTranslationPrompt(
        sourceLanguage as LanguageCode,
        targetLanguage as LanguageCode
      );
      const prompt = `${systemPrompt}\n\n${sourceText}`;

      // OpenAI APIを直接呼び出し（キューを通さない）
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: Math.min(sourceText.length * 4, 8192),
        stream: true
      });

      let translatedText = '';

      // ストリームを処理
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          translatedText += delta.content;
        }
      }

      // クリーンアップ
      translatedText = this.cleanTranslationOutput(translatedText);

      // パラグラフ翻訳完了イベントを発行
      const translationEvent = createTranslationEvent({
        sourceText,
        targetText: translatedText,
        sourceLanguage,
        targetLanguage,
        confidence: 1.0,
        isFinal: true,
        segmentId: paragraphId
      }, correlationId);

      this.emitEvent(translationEvent);

      this.componentLogger.info('Paragraph translation completed', {
        paragraphId,
        translatedLength: translatedText.length
      });

    } catch (error) {
      this.componentLogger.error('Paragraph translation failed', {
        error: error instanceof Error ? error.message : String(error),
        paragraphId
      });
      
      // エラーイベントを発行
      this.emitError(
        'PARAGRAPH_TRANSLATION_FAILED',
        error instanceof Error ? error.message : 'Failed to translate paragraph',
        correlationId,
        {
          recoverable: true,
          details: { paragraphId }
        }
      );
    }
  }

  /**
   * Start listening with specified languages
   */
  async startListening(
    sourceLanguage: LanguageCode = 'en',
    targetLanguage: LanguageCode = 'ja',
    correlationId: string
  ): Promise<void> {
    if (this.stateManager.getState() !== 'idle') {
      throw new Error(`Cannot start listening in state: ${this.stateManager.getState()}`);
    }
    
    // Validate source language is supported by Deepgram
    if (!isDeepgramSupported(sourceLanguage)) {
      throw new Error(`Source language '${sourceLanguage}' is not supported by Deepgram Nova-3. Supported languages: multi, en, ja, es, fr, de, hi, ru, pt, it, nl`);
    }
    
    this.setState('starting');
    this.currentCorrelationId = correlationId;
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    this.startTime = Date.now();
    
    // 🔴 言語設定の可視化
    console.log('[UnifiedPipelineService] Language Configuration:', {
      sourceLanguage,
      targetLanguage,
      isSameLanguage: sourceLanguage === targetLanguage,
      correlationId
    });
    
    try {
      await this.connectToDeepgram();
      this.setState('listening');
      
      // AdvancedFeatureService.start is handled in main.ts to maintain proper separation
      
      this.componentLogger.info('Started listening', {
        sourceLanguage,
        targetLanguage,
        correlationId,
      });
      
    } catch (error) {
      this.setState('error');
      this.emitError(
        'DEEPGRAM_CONNECTION_FAILED',
        error instanceof Error ? error.message : 'Failed to connect to Deepgram',
        correlationId,
        {
          recoverable: false,
          details: { reason: error instanceof Error ? error.message : String(error) },
        }
      );
      throw error;
    }
  }

  /**
   * Stop listening
   */
  async stopListening(correlationId: string): Promise<void> {
    if (this.stateManager.getState() === 'idle') {
      return; // Already stopped
    }
    
    this.setState('stopping');
    
    try {
      // 🔴 CRITICAL: SegmentManager.forceEmitAll()を削除
      // 親フォルダ（UniVoice 1.0）と同じシンプルな実装
      // this.segmentManager.forceEmitAll();
      
      // Force emit any remaining segments in SentenceCombiner
      this.sentenceCombiner.forceEmit();
      
      // 🔴 ParagraphBuilderを一時的に無効化
      // 【Phase 2-ParagraphBuilder】Force complete any pending paragraph
      // this.paragraphBuilder.flush();
      
      // AdvancedFeatureService.stop is handled in main.ts to maintain proper separation
      
      // Close Deepgram connection
      if (this.deepgramAdapter) {
        this.deepgramAdapter.disconnect();
        this.deepgramAdapter.destroy();
        this.deepgramAdapter = null;
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
      this.emitError(
        'STOP_FAILED',
        error instanceof Error ? error.message : 'Failed to stop listening',
        correlationId,
        {
          recoverable: false,
          details: { reason: error instanceof Error ? error.message : String(error) },
        }
      );
      throw error;
    }
  }
  
  /**
   * Update language settings (used when session metadata is updated)
   */
  async updateLanguages(
    sourceLanguage: LanguageCode, 
    targetLanguage: LanguageCode
  ): Promise<void> {
    // Check if languages actually changed
    if (this.sourceLanguage === sourceLanguage && this.targetLanguage === targetLanguage) {
      this.componentLogger.info('Language settings unchanged, skipping update', {
        sourceLanguage,
        targetLanguage
      });
      return;
    }
    
    this.componentLogger.info('Updating language settings', {
      from: { source: this.sourceLanguage, target: this.targetLanguage },
      to: { source: sourceLanguage, target: targetLanguage }
    });
    
    const wasListening = this.stateManager.getState() === 'listening';
    const currentCorrelationId = this.currentCorrelationId;
    
    // Update languages
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    
    // If currently listening, restart with new language settings
    if (wasListening && currentCorrelationId) {
      this.componentLogger.info('Restarting pipeline with new language settings');
      
      try {
        // Stop current session
        await this.stopListening(currentCorrelationId);
        
        // Brief delay to ensure clean restart
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Restart with new languages
        await this.startListening(sourceLanguage, targetLanguage, currentCorrelationId);
      } catch (error) {
        this.componentLogger.error('Failed to restart pipeline with new languages', { error });
        // Don't throw - let the user manually restart if needed
      }
    }
  }

  /**
   * Pause the pipeline
   */
  pauseListening(): boolean {
    const correlationId = this.currentCorrelationId || 'unknown';
    
    if (this.stateManager.pause()) {
      this.componentLogger.info('Pipeline paused', { correlationId });
      
      // Emit status event
      this.emitEvent(createStatusEvent({
        state: 'paused',
        details: {
          previousState: 'listening',
          timestamp: Date.now(),
          uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
        },
      }, correlationId));
      
      return true;
    }
    
    this.componentLogger.warn('Cannot pause pipeline', { 
      currentState: this.stateManager.getState(),
      correlationId 
    });
    return false;
  }

  /**
   * Resume the pipeline
   */
  resumeListening(): boolean {
    const correlationId = this.currentCorrelationId || 'unknown';
    
    if (this.stateManager.resume()) {
      this.componentLogger.info('Pipeline resumed', { correlationId });
      
      // Emit status event
      this.emitEvent(createStatusEvent({
        state: 'listening',
        details: {
          previousState: 'paused',
          timestamp: Date.now(),
          uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
        },
      }, correlationId));
      
      return true;
    }
    
    this.componentLogger.warn('Cannot resume pipeline', { 
      currentState: this.stateManager.getState(),
      correlationId 
    });
    return false;
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
      state: this.stateManager.getState(),  // PipelineStateManagerから取得
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
    const currentState = this.stateManager.getState();
    if ((currentState !== 'listening' && currentState !== 'paused') || !this.deepgramAdapter) {
      return;
    }
    
    // Paused状態では音声を送信しない
    if (currentState === 'paused') {
      return;
    }
    
    // 🔴 音声データ送信のカウント
    this.audioFrameCount = (this.audioFrameCount || 0) + 1;
    if (this.audioFrameCount % 50 === 1) { // 50フレームごと (約1秒)
      console.log('[UnifiedPipelineService] Sending audio to Deepgram:', {
        bufferSize: buffer.length,
        frameCount: this.audioFrameCount,
        sourceLanguage: this.sourceLanguage,
        state: currentState,
        adapterConnected: this.deepgramAdapter.isConnected()
      });
    }
    
    try {
      this.deepgramAdapter.sendAudio(buffer);
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
   * Connect to Deepgram using DeepgramStreamAdapter
   * Clean Architecture: WebSocket管理をアダプター層に委譲
   */
  private async connectToDeepgram(): Promise<void> {
    // DeepgramStreamAdapter の設定を構築
    const adapterConfig = {
      apiKey: this.deepgramConfig.apiKey,
      model: this.deepgramConfig.model,
      interim: this.deepgramConfig.interim,
      endpointing: this.deepgramConfig.endpointing,
      utteranceEndMs: this.deepgramConfig.utteranceEndMs,
      smartFormat: this.deepgramConfig.smartFormat ?? true,
      noDelay: this.deepgramConfig.noDelay ?? true,
      sampleRate: this.audioConfig.sampleRate,
      sourceLanguage: this.sourceLanguage
    };
    
    // 🔴 Deepgram設定の可視化
    console.log('[Deepgram] Configuration:', {
      model: this.deepgramConfig.model,
      sourceLanguage: this.sourceLanguage,
      sampleRate: this.audioConfig.sampleRate,
      interim: this.deepgramConfig.interim,
      endpointing: this.deepgramConfig.endpointing
    });
    
    this.componentLogger.info('Creating DeepgramStreamAdapter', { 
      config: { ...adapterConfig, apiKey: '***' },
      note: this.sourceLanguage === 'ja' ? 'Japanese selected - will use multi for Nova-3' : undefined
    });
    
    // アダプターを作成
    this.deepgramAdapter = new DeepgramStreamAdapter(adapterConfig);
    
    // イベントハンドラーを設定
    this.setupDeepgramEventHandlers();
    
    // 接続
    try {
      await this.deepgramAdapter.connect();
      this.componentLogger.info('DeepgramStreamAdapter connected successfully');
    } catch (error) {
      this.componentLogger.error('Failed to connect DeepgramStreamAdapter', { error });
      throw error;
    }
  }
  
  /**
   * DeepgramStreamAdapter のイベントハンドラーを設定
   */
  private setupDeepgramEventHandlers(): void {
    if (!this.deepgramAdapter) return;
    
    // Transcript イベント
    this.deepgramAdapter.on(DeepgramStreamAdapter.EVENTS.TRANSCRIPT, (result: TranscriptResult) => {
      this.handleTranscriptSegment(result);
    });
    
    // Error イベント
    this.deepgramAdapter.on(DeepgramStreamAdapter.EVENTS.ERROR, (error: DeepgramError) => {
      this.componentLogger.error('Deepgram adapter error', { ...error });
      this.emitError(
        'DEEPGRAM_ERROR',
        error.message,
        this.currentCorrelationId || 'unknown',
        {
          recoverable: error.recoverable ?? false,
          details: { code: error.code, closeCode: error.closeCode },
        }
      );
    });
    
    // Connected イベント
    this.deepgramAdapter.on(DeepgramStreamAdapter.EVENTS.CONNECTED, () => {
      this.componentLogger.info('Deepgram adapter connected event received');
    });
    
    // Disconnected イベント
    this.deepgramAdapter.on(DeepgramStreamAdapter.EVENTS.DISCONNECTED, (reason?: string) => {
      this.componentLogger.info('Deepgram adapter disconnected', { reason });
      // 必要に応じて再接続ロジックを追加
    });
    
    // UtteranceEnd イベント（将来の実装用）
    this.deepgramAdapter.on(DeepgramStreamAdapter.EVENTS.UTTERANCE_END, (data: any) => {
      this.componentLogger.debug('UtteranceEnd event received', data);
      // TODO: UtteranceEnd 処理の実装
    });
    
    // Metadata イベント
    this.deepgramAdapter.on(DeepgramStreamAdapter.EVENTS.METADATA, (metadata: any) => {
      this.componentLogger.debug('Deepgram metadata received', metadata);
    });
  }

  /**
   * Get meaning of WebSocket close code
   */



  
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
    const text = queuedTranslation.sourceText;
    
    // Check if translation is needed (skip if source and target languages are the same)
    if (this.sourceLanguage === this.targetLanguage) {
      this.componentLogger.info('Skipping translation - same source and target language', {
        language: this.sourceLanguage,
        segmentId
      });
      
      // 🔴 同言語スキップの可視化
      console.log('[Translation] SKIP - Same language:', {
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        text: text.substring(0, 50) + '...',
        segmentId
      });
      
      // Emit translation event with original text
      const translationEvent = createTranslationEvent({
        sourceText: text,
        targetText: text,
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        confidence: 1.0,
        isFinal: true,
        segmentId: segmentId
      }, this.currentCorrelationId || 'unknown');
      
      this.emit('translation', translationEvent);
      
      // Also emit translationComplete for history tracking
      this.emit('translationComplete', {
        id: segmentId,
        original: text,
        japanese: text,
        timestamp: Date.now(),
        firstPaintMs: 0,
        completeMs: 0
      });
      
      return text;
    }
    
    try {
      // 🚀 Shadow Modeを優先的に使用（環境変数で制御）
      // Shadow Mode not implemented - commented out
      /*
      if (process.env.USE_SHADOW_AS_PRIMARY === 'true' && this.enableShadowMode && this.llmGateway) {
        try {
          const shadowResult = await this.llmGateway.translate({
            text,
            sourceLanguage: this.sourceLanguage,
            targetLanguage: this.targetLanguage,
            metadata: { segmentId }
          });
          
          // Shadow Modeの結果を返す（40%高速）
          const translatedText = this.cleanTranslationOutput(shadowResult.content);
          
          // 翻訳完了イベントを発行
          this.emitEvent(createTranslationEvent({
            originalText: text,
            translatedText,
            sourceLanguage: this.sourceLanguage,
            targetLanguage: this.targetLanguage,
            confidence: 0.9,
            isFinal: true,
            segmentId
          }, this.currentCorrelationId || 'unknown'));
          
          return translatedText;
        } catch (error) {
          console.error('[Shadow as Primary] Failed, falling back to original implementation:', error);
          // エラー時は下の通常実装に進む
        }
      }
      */
      // 🔴 正しいAPI呼び出し方法（test-3min-complete.jsで動作確認済み）
      // responses.create を使用（chat.completions.createではない）
      // これがGPT-5系モデルの正しい呼び方
      // 動的に翻訳プロンプトを生成
      const translationPrompt = getTranslationPrompt(this.sourceLanguage, this.targetLanguage);
      
      // 🔴 AIプロンプトの可視化
      console.log('[Translation] AI Prompt:', {
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        prompt: translationPrompt,
        inputText: text.substring(0, 100) + '...'
      });
      
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
      
      // 翻訳結果をクリーンアップ（GPTの思考プロセスを除去）
      const cleanedTranslation = this.cleanTranslationOutput(translation.trim());
      
      // 🔴 翻訳結果の可視化
      console.log('[Translation] Result:', {
        originalText: text.substring(0, 50) + '...',
        translatedText: cleanedTranslation.substring(0, 50) + '...',
        timings: { firstPaintMs: firstPaintTime, completeMs: completeTime }
      });
      
      // 文字化けデバッグ情報
      console.log('[Translation] Debug - Raw translation:', translation);
      console.log('[Translation] Debug - Cleaned translation:', cleanedTranslation);
      console.log('[Translation] Debug - First 10 char codes:', [...cleanedTranslation.slice(0, 10)].map(c => c.charCodeAt(0)));
      
      // 翻訳完了
      const result: Translation = {
        id: `translation-${segmentId}`,
        sourceText: text,
        targetText: cleanedTranslation,
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        timestamp: Date.now(),
        confidence: 0.9, // OpenAI translations are generally high confidence
        isFinal: true,
      };
      
      this.translations.push(result);
      
      // 🔴 CRITICAL: SegmentManagerは使わない - 親フォルダと同じシンプルな処理
      // 重複の原因を完全に排除
      
      // Translation forwarding to AdvancedFeatureService is handled in main.ts
      // via the translationComplete event to maintain proper separation of concerns
      
      // Emit translation event
      this.emitEvent(createTranslationEvent({
        sourceText: result.sourceText,
        targetText: result.targetText,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        confidence: result.confidence,
        isFinal: result.isFinal,
        segmentId: segmentId,
      }, this.currentCorrelationId || 'unknown'));
      
      // translationCompleteイベントを発火（履歴記録用）
      if (result.isFinal) {
        this.emit('translationComplete', {
          id: segmentId,
          sourceText: result.sourceText,
          targetText: result.targetText,
          sourceLanguage: result.sourceLanguage,
          targetLanguage: result.targetLanguage,
          timestamp: Date.now(),
          firstPaintMs: firstPaintTime,
          completeMs: completeTime
        });
      }
      
      // 成功メトリクス
      console.log(`[翻訳完了] "${result.targetText.substring(0, 30)}..." (${completeTime}ms)`);
      
      this.componentLogger.performance('info', 'Translation completed', startTime, {
        textLength: text.length,
        translationLength: result.targetText.length,
        segmentId,
        firstPaintMs: firstPaintTime,
        completeMs: completeTime,
      });
      
      // 🔴 Shadow Mode: LLM Gateway経由でも実行（既存実装に影響しない）
      // Shadow Mode not implemented - commented out
      /*
      if (this.enableShadowMode && this.llmGateway) {
        this.executeShadowModeTranslation(text, segmentId, result.targetText, firstPaintTime, completeTime);
      }
      */
      
      // 🚀 Shadow Modeを本番として使用（環境変数で制御）
      // Shadow Mode not implemented - commented out
      /*
      if (process.env.USE_SHADOW_AS_PRIMARY === 'true' && this.enableShadowMode && this.llmGateway) {
        try {
          const shadowResult = await this.llmGateway.translate({
            text,
            sourceLanguage: this.sourceLanguage,
            targetLanguage: this.targetLanguage,
            metadata: { segmentId }
          });
          
          // Shadow Modeの結果を返す（40%高速）
          return this.cleanTranslationOutput(shadowResult.content);
        } catch (error) {
          // エラー時は通常の実装にフォールバック
          console.error('[Shadow as Primary] Translation failed, falling back to original:', error);
        }
      }
      */
      
      // Return the translated text for the queue
      return result.targetText;
      
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
      
      this.emitError(
        'TRANSLATION_FAILED',
        `Failed to translate segment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.currentCorrelationId || 'unknown',
        {
          recoverable: true,
          details: {
            segmentId,
            sourceLanguage: this.sourceLanguage,
            targetLanguage: this.targetLanguage,
            textPreview: text.substring(0, 50),
          },
        }
      );
      
      const fallbackTranslation = this.handleRealtimeTranslationFailure(segmentId, text, error);
      return fallbackTranslation;
    }
  }

  /**
   * Set pipeline state and emit status event
   */
  private setState(newState: PipelineState): void {
    const oldState = this.stateManager.getState();
    
    // PipelineStateManagerを使用して状態遷移を管理
    this.stateManager.setState(newState, this.currentCorrelationId || undefined);
    
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
  private handleTranslationQueueFailure(translation: QueuedTranslation, error: unknown): void {
    const kind = translation.kind ?? 'realtime';

    if (kind === 'history' || kind === 'paragraph') {
      this.handleHistoryTranslationFailure(translation, error);
      return;
    }

    this.handleRealtimeTranslationFailure(
      translation.segmentId,
      translation.sourceText,
      error
    );
  }

  private handleRealtimeTranslationFailure(
    segmentId: string,
    sourceText: string,
    error: unknown
  ): string {
    const reason = error instanceof Error ? error.message : String(error);
    const fallbackText = this.createFallbackTranslationText(sourceText, reason);
    const correlationId = this.currentCorrelationId || 'unknown';
    const timestamp = Date.now();

    const result: Translation = {
      id: `translation-${segmentId}`,
      sourceText,
      targetText: fallbackText,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
      timestamp,
      confidence: 0,
      isFinal: true,
    };

    this.translations.push(result);

    this.emitEvent(createTranslationEvent({
      sourceText: result.sourceText,
      targetText: result.targetText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      confidence: result.confidence,
      isFinal: result.isFinal,
      segmentId,
    }, correlationId));

    this.emit('translationComplete', {
      id: segmentId,
      sourceText: result.sourceText,
      targetText: result.targetText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      timestamp,
      firstPaintMs: 0,
      completeMs: 0
    });

    this.emit('currentTranslationUpdate', fallbackText);

    this.componentLogger.warn('Fallback translation emitted after failure', {
      segmentId,
      reason: reason ? reason.slice(0, 200) : undefined,
    });

    return fallbackText;
  }

  private handleHistoryTranslationFailure(translation: QueuedTranslation, error: unknown): string {
    const reason = error instanceof Error ? error.message : String(error);
    const fallbackText = this.createFallbackTranslationText(translation.sourceText, reason);
    const correlationId = this.currentCorrelationId || 'unknown';
    const timestamp = Date.now();

    const result: Translation = {
      id: translation.segmentId,
      sourceText: translation.sourceText,
      targetText: fallbackText,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
      timestamp,
      confidence: 0,
      isFinal: true,
    };

    this.translations.push(result);

    this.emitEvent(createTranslationEvent({
      sourceText: result.sourceText,
      targetText: result.targetText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      confidence: result.confidence,
      isFinal: result.isFinal,
      segmentId: translation.segmentId,
    }, correlationId));

    this.emit('translationComplete', {
      id: translation.segmentId,
      sourceText: result.sourceText,
      targetText: result.targetText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      timestamp,
      firstPaintMs: 0,
      completeMs: 0
    });

    this.componentLogger.warn('History translation fallback emitted after failure', {
      segmentId: translation.segmentId,
      reason: reason ? reason.slice(0, 200) : undefined,
    });
    return fallbackText;
  }

  private createFallbackTranslationText(sourceText: string, reason: string): string {
    const sanitizedReason = reason.replace(/\s+/g, ' ').slice(0, 120) || 'unknown error';
    if (this.targetLanguage === 'ja') {
      return `※翻訳に失敗しました（${sanitizedReason}）。原文を表示します。
${sourceText}`;
    }
    return `Translation unavailable (${sanitizedReason}). Showing original text:
${sourceText}`;
  }

  private emitError(
    code: string,
    message: string,
    correlationId: string,
    options?: { recoverable?: boolean; details?: Record<string, unknown> }
  ): void {
    const { recoverable = true, details } = options ?? {};

    this.emitEvent(createErrorEvent({
      code,
      message,
      recoverable,
      details: {
        state: this.stateManager.getState(),
        timestamp: Date.now(),
        ...(details ?? {}),
      },
    }, correlationId));
  }


  /**
   * Generate vocabulary from current session
   * @deprecated This method should be called directly on AdvancedFeatureService from main.ts
   */
  public async generateVocabulary(correlationId: string): Promise<void> {
    this.componentLogger.warn('generateVocabulary called on UnifiedPipelineService - this should be called on AdvancedFeatureService from main.ts', { correlationId });
    // Emit an event to notify that vocabulary generation was requested
    this.emit('vocabularyRequested', { correlationId });
  }

  /**
   * Generate final report from current session
   * @deprecated This method should be called directly on AdvancedFeatureService from main.ts
   */
  public async generateFinalReport(correlationId: string): Promise<void> {
    this.componentLogger.warn('generateFinalReport called on UnifiedPipelineService - this should be called on AdvancedFeatureService from main.ts', { correlationId });
    // Emit an event to notify that final report generation was requested
    this.emit('finalReportRequested', { correlationId });
  }
  
  /**
   * Handle combined sentence from SentenceCombiner
   * 結合された文を履歴用高品質翻訳キューに追加
   */
  private async handleCombinedSentence(combinedSentence: CombinedSentence): Promise<void> {
    console.log(`[UnifiedPipelineService] Combined sentence ready: ${combinedSentence.segmentCount} segments`);
    // 【Phase 1-1】データフロー可視化ログ追加
    console.log('[DataFlow-5] handleCombinedSentence called:', {
      combinedId: combinedSentence.id,
      segmentCount: combinedSentence.segmentCount,
      textLength: combinedSentence.sourceText.length,
      timestamp: Date.now()
    });
    
    try {
      // 【Phase 2-2】CombinedSentenceEventをフロントエンドに送信
      this.emitEvent(createCombinedSentenceEvent({
        combinedId: combinedSentence.id,
        segmentIds: combinedSentence.segmentIds,
        sourceText: combinedSentence.sourceText,
        timestamp: combinedSentence.timestamp,
        endTimestamp: combinedSentence.endTimestamp,
        segmentCount: combinedSentence.segmentCount,
      }, this.currentCorrelationId || 'unknown'));
      
      console.log('[DataFlow-10] CombinedSentenceEvent emitted:', {
        combinedId: combinedSentence.id,
        timestamp: Date.now()
      });
      
      // 履歴用翻訳リクエストを低優先度でキューに追加
      await this.translationQueue.enqueue({
        segmentId: `history_${combinedSentence.id}`,
        sourceText: combinedSentence.sourceText,
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        timestamp: combinedSentence.timestamp,
        priority: 'low',  // 低優先度でリアルタイム翻訳を妨げない
        kind: 'history',
      });
      
      console.log(`[UnifiedPipelineService] History translation queued for combined sentence: ${combinedSentence.id}`);
      // 【Phase 1-1】データフロー可視化ログ追加
      console.log('[DataFlow-6] History translation queued:', {
        historyId: `history_${combinedSentence.id}`,
        priority: 'low',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[UnifiedPipelineService] Failed to queue history translation:', error);
      // 履歴翻訳の失敗はリアルタイム翻訳に影響しないようにエラーを握りつぶす
    }
  }
  
  /**
   * Handle paragraph complete from ParagraphBuilder
   * 【Phase 2-ParagraphBuilder】パラグラフ単位の履歴処理
   * パラグラフが完成したら高品質翻訳を開始
   * 🔴 ParagraphBuilderを一時的に無効化 - フロントエンドでのグループ化を優先
   */
  // private async handleParagraphComplete(paragraph: Paragraph): Promise<void> {
  //   console.log(`[UnifiedPipelineService] Paragraph complete: ${paragraph.segments.length} segments, ${((paragraph.endTime - paragraph.startTime) / 1000).toFixed(1)}s`);
  //   console.log('[DataFlow-5p] handleParagraphComplete called:', {
  //     paragraphId: paragraph.id,
  //     segmentCount: paragraph.segments.length,
  //     duration: paragraph.endTime - paragraph.startTime,
  //     wordCount: paragraph.rawText.split(' ').length,
  //     timestamp: Date.now()
  //   });
  //   
  //   try {
  //     // テキストのクリーン化
  //     const cleanedText = ParagraphBuilder.cleanText(paragraph.rawText);
  //     
  //     // ParagraphCompleteEventをフロントエンドに送信
  //     this.emitEvent(createParagraphCompleteEvent({
  //       paragraphId: paragraph.id,
  //       segmentIds: paragraph.segments.map(s => s.id),
  //       rawText: paragraph.rawText,
  //       cleanedText: cleanedText,
  //       startTime: paragraph.startTime,
  //       endTime: paragraph.endTime,
  //       duration: paragraph.endTime - paragraph.startTime,
  //       wordCount: cleanedText.split(' ').length,
  //       // フロントエンド用にparagraphオブジェクトも含める
  //       paragraph: {
  //         id: paragraph.id,
  //         segments: paragraph.segments,
  //         startTime: paragraph.startTime,
  //         endTime: paragraph.endTime,
  //         rawText: paragraph.rawText,
  //         cleanedText: cleanedText,
  //         translation: '',
  //         status: 'processing'
  //       }
  //     }, this.currentCorrelationId || 'unknown'));
  //     
  //     console.log('[DataFlow-10p] ParagraphCompleteEvent emitted:', {
  //       paragraphId: paragraph.id,
  //       timestamp: Date.now()
  //     });
  //     
  //     // パラグラフ用翻訳リクエストを低優先度でキューに追加
  //     await this.translationQueue.enqueue({
  //       segmentId: `paragraph_${paragraph.id}`,
  //       originalText: cleanedText,
  //       sourceLanguage: this.sourceLanguage,
  //       targetLanguage: this.targetLanguage,
  //       timestamp: paragraph.startTime,
  //       priority: 'low'  // 低優先度でリアルタイム翻訳を妨げない
  //     });
  //     
  //     console.log(`[UnifiedPipelineService] Paragraph translation queued: ${paragraph.id}`);
  //     console.log('[DataFlow-6p] Paragraph translation queued:', {
  //       paragraphId: `paragraph_${paragraph.id}`,
  //       priority: 'low',
  //       wordCount: cleanedText.split(' ').length,
  //       timestamp: Date.now()
  //     });
  //   } catch (error) {
  //     console.error('[UnifiedPipelineService] Failed to queue paragraph translation:', error);
  //     // パラグラフ翻訳の失敗はリアルタイム翻訳に影響しないようにエラーを握りつぶす
  //   }
  // }
  
  /**
   * Handle transcript segment from Deepgram
   * Deepgramから受信したトランスクリプトセグメントを処理
   */
  private async handleTranscriptSegment(result: TranscriptResult): Promise<void> {
    try {
      // コンソールログ（デバッグ用）
      console.log('[UnifiedPipelineService] Transcript result:', {
        id: result.id,
        text: result.text.substring(0, 50) + '...',
        isFinal: result.isFinal,
        confidence: result.confidence,
        timestamp: Date.now()
      });

      // トランスクリプト結果を保存（互換性のため）
      const segment = {
        id: result.id,
        text: result.text,
        timestamp: result.timestamp,
        confidence: result.confidence,
        isFinal: result.isFinal
      };
      this.transcriptSegments.push(segment);

      // ASRイベントを発火
      this.emitEvent(createASREvent({
        text: result.text,
        confidence: result.confidence,
        isFinal: result.isFinal,
        language: this.sourceLanguage,
        segmentId: result.id
      }, this.currentCorrelationId || 'unknown'));

      // SentenceCombinerに送信（文単位の結合）
      if (result.isFinal) {
        this.sentenceCombiner.addSegment({
          id: result.id,
          text: result.text,
          timestamp: result.timestamp,
          isFinal: result.isFinal,
          startMs: result.startMs ?? 0,
          endMs: result.endMs ?? 0
        });
      }

      // 翻訳をキューに追加（finalセグメントのみ）
      if (result.isFinal && result.text.trim()) {
        await this.translationQueue.enqueue({
          segmentId: result.id,
          sourceText: result.text,
          sourceLanguage: this.sourceLanguage,
          targetLanguage: this.targetLanguage,
          timestamp: result.timestamp,
          priority: 'normal',
          kind: 'realtime'
        });
      }
    } catch (error) {
      this.componentLogger.error('Failed to handle transcript result', {
        error,
        resultId: result.id
      });
      // エラーを握りつぶして処理を継続
    }
  }

  /**
   * Execute history translation with higher quality
   * 履歴用の高品質翻訳を実行（より大きなコンテキストと高品質モデル）
   */
  private async executeHistoryTranslation(queuedTranslation: QueuedTranslation): Promise<string> {
    const startTime = Date.now();
    // history_またはparagraph_プレフィックスを削除
    const isParagraph = queuedTranslation.segmentId.startsWith('paragraph_');
    const baseId = queuedTranslation.segmentId.replace(/^(history_|paragraph_)/, '');
    const text = queuedTranslation.sourceText;
    
    try {
      // Check if translation is needed (skip if source and target languages are the same)
      if (this.sourceLanguage === this.targetLanguage) {
        this.componentLogger.info('Skipping history translation - same source and target language', {
          language: this.sourceLanguage,
          baseId,
          isParagraph
        });
        
        // Emit translation event with original text for history
        const historyEvent = createTranslationEvent({
          sourceText: text,
          targetText: text,
          sourceLanguage: this.sourceLanguage,
          targetLanguage: this.targetLanguage,
          confidence: 1.0,
          isFinal: true,
          segmentId: queuedTranslation.segmentId
        }, this.currentCorrelationId || 'unknown');
        
        this.emit('translation', historyEvent);
        
        return text;
      }
      
      console.log(`[UnifiedPipelineService] Starting ${isParagraph ? 'paragraph' : 'history'} translation for: ${baseId}`);
      // 【Phase 1-2】データフロー可視化ログ追加
      console.log('[DataFlow-7] executeHistoryTranslation called:', {
        baseId,
        isParagraph,
        textLength: text.length,
        model: this.openaiConfig.models.summary, // gpt-5-mini
        timestamp: Date.now()
      });
      
      // 履歴用の詳細な翻訳プロンプト（英語で記述）
      const sourceName = SUPPORTED_LANGUAGES[this.sourceLanguage].name;
      const targetName = SUPPORTED_LANGUAGES[this.targetLanguage].name;
      
      const historyTranslationPrompt = `You are a professional translator specializing in ${sourceName} to ${targetName} translation for academic lectures.
Translate the following lecture content from ${sourceName} to natural and accurate ${targetName}, considering the full context.

Important instructions:
1. Translate technical terms accurately
2. Ensure natural flow suitable for lecture listening
3. Maintain consistency across multiple sentences by considering context
4. Output ONLY the translation without any annotations, explanations, or original language references

Output only the ${targetName} translation.`;
      
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
      // 【Phase 1-2】データフロー可視化ログ追加
      console.log('[DataFlow-8] History translation completed:', {
        baseId,
        isParagraph,
        completeMs: completeTime,
        translationLength: translation.length,
        timestamp: Date.now()
      });
      
      // 翻訳結果をクリーンアップ（GPTの思考プロセスを除去）
      const cleanedTranslation = this.cleanTranslationOutput(translation.trim());
      
      // 履歴翻訳完了イベントを発行（pipelineEventとして）
      this.emitEvent(createTranslationEvent({
        sourceText: text,
        targetText: cleanedTranslation,
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        confidence: 0.95,  // 高品質翻訳なので高信頼度
        isFinal: true,
        segmentId: queuedTranslation.segmentId,  // 元のIDを保持（history_またはparagraph_プレフィックス付き）
      }, this.currentCorrelationId || 'unknown'));
      
      // 【Phase 1-2】データフロー可視化ログ追加
      console.log('[DataFlow-9] History translation event emitted:', {
        segmentId: queuedTranslation.segmentId,
        isParagraph,
        timestamp: Date.now()
      });
      
      // 🔴 Shadow Mode: LLM Gateway経由でも実行（既存実装に影響しない）
      // Shadow Mode not implemented - commented out
      /*
      if (this.enableShadowMode && this.llmGateway) {
        this.executeShadowModeHistoryTranslation(text, combinedId, cleanedTranslation, completeTime);
      }
      */
      
      return cleanedTranslation;
      
    } catch (error: any) {
      console.error('[UnifiedPipelineService] History translation error:', error);
      
      // 履歴翻訳の失敗は致命的ではないので、エラーを記録するだけ
      this.componentLogger.warn('History translation failed', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        isParagraph,
        textLength: text.length
      });
      
      // 空の翻訳を返す（元のセグメント翻訳が使用される）
      return this.handleHistoryTranslationFailure(queuedTranslation, error);
    }
  }
  
  /**
   * Shadow Mode: 通常翻訳の比較実行（非同期・エラーを握りつぶす）
   * 
   * @private
   */
  // Shadow Mode not implemented - entire method commented out
  /*
  private async executeShadowModeTranslation(
    text: string, 
    segmentId: string, 
    originalTranslation: string, 
    originalFirstPaintMs: number, 
    originalCompleteMs: number
  ): Promise<void> {
    try {
      const shadowStartTime = Date.now();
      let shadowFirstPaintTime = 0;
      let shadowTranslation = '';
      
      // LLM Gateway経由でストリーミング翻訳
      const translationPrompt = getTranslationPrompt(this.sourceLanguage, this.targetLanguage);
      const stream = this.llmGateway!.stream({
        purpose: LLMPurpose.TRANSLATION,
        systemPrompt: translationPrompt,
        userContent: text,
        metadata: { segmentId, shadowMode: true }
      });
      
      for await (const chunk of stream) {
        if (!chunk.isComplete) {
          if (!shadowFirstPaintTime && chunk.delta) {
            shadowFirstPaintTime = Date.now() - shadowStartTime;
          }
          shadowTranslation += chunk.delta;
        }
      }
      
      const shadowCompleteTime = Date.now() - shadowStartTime;
      
      // 結果を比較してログ出力
      const comparison = {
        segmentId,
        textLength: text.length,
        original: {
          translation: originalTranslation.substring(0, 100) + '...',
          firstPaintMs: originalFirstPaintMs,
          completeMs: originalCompleteMs
        },
        shadow: {
          translation: shadowTranslation.substring(0, 100) + '...',
          firstPaintMs: shadowFirstPaintTime,
          completeMs: shadowCompleteTime,
          metrics: this.llmGateway!.getLastMetrics()
        },
        match: originalTranslation.trim() === shadowTranslation.trim(),
        performanceDelta: {
          firstPaint: shadowFirstPaintTime - originalFirstPaintMs,
          complete: shadowCompleteTime - originalCompleteMs
        }
      };
      
      this.componentLogger.info('Shadow Mode translation comparison', comparison);
      
    } catch (error) {
      // Shadow Modeのエラーは本番に影響しないよう握りつぶす
      this.componentLogger.error('Shadow Mode translation failed', {
        error: error instanceof Error ? error.message : String(error),
        segmentId
      });
    }
  }
  */
  
  /**
   * Shadow Mode: 履歴翻訳の比較実行（非同期・エラーを握りつぶす）
   * 
   * @private
   */
  // Shadow Mode not implemented - entire method commented out
  /*
  private async executeShadowModeHistoryTranslation(
    text: string,
    combinedId: string,
    originalTranslation: string,
    originalCompleteMs: number
  ): Promise<void> {
    try {
      const shadowStartTime = Date.now();
      
      // LLM Gateway経由で高品質翻訳
      const historyPrompt = `あなたは${this.sourceLanguage}から${this.targetLanguage}への専門翻訳者です。
以下の講義内容を、文脈を考慮して自然で正確な${this.targetLanguage}に翻訳してください。

重要な指示:
1. 専門用語は正確に翻訳し、必要に応じて原語を併記
2. 文の流れを自然にし、講義として聞きやすい表現に
3. 複数の文がある場合は、文脈を考慮して一貫性のある翻訳に
4. 学生が理解しやすいよう、適切な説明を加えても構いません`;
      
      const response = await this.llmGateway!.complete({
        purpose: LLMPurpose.SUMMARY,  // 高品質モデルを使用
        systemPrompt: historyPrompt,
        userContent: text,
        maxTokens: 2000,
        metadata: { combinedId, shadowMode: true, historyTranslation: true }
      });
      
      const shadowCompleteTime = Date.now() - shadowStartTime;
      
      // 結果を比較してログ出力
      const comparison = {
        combinedId,
        textLength: text.length,
        original: {
          translation: originalTranslation.substring(0, 100) + '...',
          completeMs: originalCompleteMs
        },
        shadow: {
          translation: response.content.substring(0, 100) + '...',
          completeMs: shadowCompleteTime,
          metrics: this.llmGateway!.getLastMetrics()
        },
        match: originalTranslation.trim() === response.content.trim(),
        performanceDelta: shadowCompleteTime - originalCompleteMs
      };
      
      this.componentLogger.info('Shadow Mode history translation comparison', comparison);
      
    } catch (error) {
      // Shadow Modeのエラーは本番に影響しないよう握りつぶす
      this.componentLogger.error('Shadow Mode history translation failed', {
        error: error instanceof Error ? error.message : String(error),
        combinedId
      });
    }
  }
  */
  
  /**
   * Clean translation output to remove GPT's internal thoughts
   * GPTの内部思考プロセスを除去
   */
  private cleanTranslationOutput(text: string): string {
    // 先頭・末尾の空白を除去
    let cleaned = text.trim();
    
    // GPTの思考プロセスパターンを検出
    const thoughtPatterns = [
      /^.*?Note:.*?\n\n/s,  // "Note:" で始まる説明
      /^.*?Wait:.*?\n\n/s,  // "Wait:" で始まる思考
      /^.*?Hmm[?.].*?\n\n/s,  // "Hmm" の迷い
      /^.*?Let's output[.]*/s,  // "Let's output" の決定
      /^.*?I'll output:.*?(?=\n|$)/s,  // "I'll output:" の宣言
      /^.*?I'll choose.*?(?=\n|$)/s,  // "I'll choose" の選択
      /^.*?I'll render.*?(?=\n|$)/s,  // "I'll render" の描画
      /^.*?Output only.*?(?=\n|$)/s,  // "Output only" の指示確認
      /^.*?But requirement says.*?\n/s,  // "But requirement says" の確認
      /^.*?Better to render as.*?\n/s,  // "Better to render as" の選択
    ];
    
    // 各パターンを適用して思考プロセスを除去
    for (const pattern of thoughtPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        // パターンにマッチした部分を除去
        cleaned = cleaned.replace(pattern, '');
        cleaned = cleaned.trim();
      }
    }
    
    // 最後の翻訳結果を抽出（最後の改行以降の内容）
    const lines = cleaned.split('\n');
    if (lines.length > 1) {
      // 最後の非空行を探す
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim()) {
          return lines[i].trim();
        }
      }
    }
    
    return cleaned;
  }
  

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.deepgramAdapter) {
      this.deepgramAdapter.disconnect();
      this.deepgramAdapter.destroy();
      this.deepgramAdapter = null;
    }
    
    // 🔴 CRITICAL: SegmentManager.destroy()を削除
    // this.segmentManager.destroy();
    // AdvancedFeatureService is managed in main.ts
    this.translationQueue.destroy();
    this.sentenceCombiner.destroy();
    this.removeAllListeners();
    
    this.componentLogger.info('UnifiedPipelineService destroyed');
  }
}

