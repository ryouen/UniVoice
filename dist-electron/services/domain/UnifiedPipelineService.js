"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedPipelineService = void 0;
const events_1 = require("events");
const DeepgramStreamAdapter_1 = require("../adapters/DeepgramStreamAdapter");
const openai_1 = __importDefault(require("openai"));
// 🔴 CRITICAL: SegmentManagerのインポートを削除（使用しない）
// import { SegmentManager } from './SegmentManager';
// AdvancedFeatureService is managed in main.ts, not here
const contracts_1 = require("../ipc/contracts");
const LanguageConfig_1 = require("./LanguageConfig");
const logger_1 = require("../../utils/logger");
const TranslationQueueManager_1 = require("./TranslationQueueManager");
const SentenceCombiner_1 = require("./SentenceCombiner");
// 🔴 ParagraphBuilderを一時的に無効化 - フロントエンドでのグループ化を優先
// import { ParagraphBuilder, Paragraph } from './ParagraphBuilder';  // 【Phase 2-ParagraphBuilder】追加
// Shadow Mode統合用のインポート（🔴 既存実装は変更しない）
// Shadow Mode not implemented - imports commented out
// import { LLMGateway, LLMPurpose, LLMConfig } from '../../infrastructure/llm/types';
// import { OpenAIGateway } from '../../infrastructure/llm/OpenAIGateway';
// 状態管理の責任分離
const PipelineStateManager_1 = require("./PipelineStateManager");
// ===== Pipeline States =====
// PipelineState は PipelineStateManager から import されるため削除
class UnifiedPipelineService extends events_1.EventEmitter {
    constructor(audioConfig, deepgramConfig, openaiConfig, languageConfig = { sourceLanguage: 'en', targetLanguage: 'ja' }) {
        super();
        // External services
        this.deepgramAdapter = null;
        // 🔴 CRITICAL: stateプロパティは削除し、stateManagerに完全移行済み
        this.currentCorrelationId = null; // 現在の実装で使用されている
        this.startTime = 0; // 現在の実装で使用されている
        this.lastActivityTime = 0; // 現在の実装で使用されている
        // Data storage
        this.transcriptSegments = [];
        this.translations = [];
        this.summaries = [];
        this.componentLogger = logger_1.logger.child('UnifiedPipelineService');
        this.audioConfig = audioConfig;
        this.deepgramConfig = deepgramConfig;
        this.openaiConfig = openaiConfig;
        this.sourceLanguage = languageConfig.sourceLanguage;
        this.targetLanguage = languageConfig.targetLanguage;
        // Initialize state manager
        this.stateManager = new PipelineStateManager_1.PipelineStateManager();
        // Initialize OpenAI client
        this.openai = new openai_1.default({
            apiKey: this.openaiConfig.apiKey,
        });
        // 🔴 CRITICAL: SegmentManagerの初期化を完全に削除
        // 重複の原因：SegmentManagerは翻訳を重複でトリガーしていた
        // 親フォルダ（UniVoice 1.0）にはこの機能は存在しない
        // Initialize TranslationQueueManager
        this.translationQueue = new TranslationQueueManager_1.TranslationQueueManager({
            maxConcurrency: parseInt(process.env.TRANSLATION_MAX_CONCURRENCY || '3'),
            maxQueueSize: parseInt(process.env.TRANSLATION_MAX_QUEUE_SIZE || '100'),
            requestTimeoutMs: parseInt(process.env.TRANSLATION_TIMEOUT_MS || '30000')
        });
        // Set translation handler
        this.translationQueue.setTranslationHandler(async (queuedTranslation) => {
            // 履歴用翻訳かパラグラフ翻訳か通常翻訳かで分岐
            if (queuedTranslation.segmentId.startsWith('history_') ||
                queuedTranslation.segmentId.startsWith('paragraph_')) {
                return this.executeHistoryTranslation(queuedTranslation);
            }
            else {
                return this.executeTranslation(queuedTranslation);
            }
        });
        // Initialize SentenceCombiner
        this.sentenceCombiner = new SentenceCombiner_1.SentenceCombiner((combinedSentence) => this.handleCombinedSentence(combinedSentence), {
            maxSegments: 10,
            timeoutMs: 2000,
            minSegments: 1 // DEEP-THINK修正: 短い文も履歴に含める（元は2）
        });
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
     * Start listening with specified languages
     */
    async startListening(sourceLanguage = 'en', targetLanguage = 'ja', correlationId) {
        if (this.stateManager.getState() !== 'idle') {
            throw new Error(`Cannot start listening in state: ${this.stateManager.getState()}`);
        }
        this.setState('starting');
        this.currentCorrelationId = correlationId;
        this.sourceLanguage = sourceLanguage;
        this.targetLanguage = targetLanguage;
        this.startTime = Date.now();
        try {
            await this.connectToDeepgram();
            this.setState('listening');
            // AdvancedFeatureService.start is handled in main.ts to maintain proper separation
            this.componentLogger.info('Started listening', {
                sourceLanguage,
                targetLanguage,
                correlationId,
            });
        }
        catch (error) {
            this.setState('error');
            this.emitError('DEEPGRAM_CONNECTION_FAILED', error instanceof Error ? error.message : 'Failed to connect to Deepgram', correlationId);
            throw error;
        }
    }
    /**
     * Stop listening
     */
    async stopListening(correlationId) {
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
        }
        catch (error) {
            this.setState('error');
            this.emitError('STOP_FAILED', error instanceof Error ? error.message : 'Failed to stop listening', correlationId);
            throw error;
        }
    }
    /**
     * Pause the pipeline
     */
    pauseListening() {
        const correlationId = this.currentCorrelationId || 'unknown';
        if (this.stateManager.pause()) {
            this.componentLogger.info('Pipeline paused', { correlationId });
            // Emit status event
            this.emitEvent((0, contracts_1.createStatusEvent)({
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
    resumeListening() {
        const correlationId = this.currentCorrelationId || 'unknown';
        if (this.stateManager.resume()) {
            this.componentLogger.info('Pipeline resumed', { correlationId });
            // Emit status event
            this.emitEvent((0, contracts_1.createStatusEvent)({
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
    getState() {
        return {
            state: this.stateManager.getState(), // PipelineStateManagerから取得
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
    sendAudioChunk(buffer) {
        const currentState = this.stateManager.getState();
        if ((currentState !== 'listening' && currentState !== 'paused') || !this.deepgramAdapter) {
            return;
        }
        // Paused状態では音声を送信しない
        if (currentState === 'paused') {
            return;
        }
        try {
            this.deepgramAdapter.sendAudio(buffer);
            this.lastActivityTime = Date.now();
        }
        catch (error) {
            this.componentLogger.error('Failed to send audio chunk', {
                error: error instanceof Error ? error.message : String(error),
                bufferSize: buffer.length,
            });
        }
    }
    /**
     * Clear all history
     */
    clearHistory() {
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
    async connectToDeepgram() {
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
        this.componentLogger.info('Creating DeepgramStreamAdapter', {
            config: { ...adapterConfig, apiKey: '***' }
        });
        // アダプターを作成
        this.deepgramAdapter = new DeepgramStreamAdapter_1.DeepgramStreamAdapter(adapterConfig);
        // イベントハンドラーを設定
        this.setupDeepgramEventHandlers();
        // 接続
        try {
            await this.deepgramAdapter.connect();
            this.componentLogger.info('DeepgramStreamAdapter connected successfully');
        }
        catch (error) {
            this.componentLogger.error('Failed to connect DeepgramStreamAdapter', { error });
            throw error;
        }
    }
    /**
     * DeepgramStreamAdapter のイベントハンドラーを設定
     */
    setupDeepgramEventHandlers() {
        if (!this.deepgramAdapter)
            return;
        // Transcript イベント
        this.deepgramAdapter.on(DeepgramStreamAdapter_1.DeepgramStreamAdapter.EVENTS.TRANSCRIPT, (result) => {
            // TranscriptResult を既存の TranscriptSegment 形式に変換
            const segment = {
                id: result.id,
                text: result.text,
                timestamp: result.timestamp,
                confidence: result.confidence,
                isFinal: result.isFinal,
                startMs: result.startMs,
                endMs: result.endMs
            };
            this.processTranscriptSegment(segment);
        });
        // Error イベント
        this.deepgramAdapter.on(DeepgramStreamAdapter_1.DeepgramStreamAdapter.EVENTS.ERROR, (error) => {
            this.componentLogger.error('Deepgram adapter error', { ...error });
            this.emitError('DEEPGRAM_ERROR', error.message, this.currentCorrelationId || 'unknown');
        });
        // Connected イベント
        this.deepgramAdapter.on(DeepgramStreamAdapter_1.DeepgramStreamAdapter.EVENTS.CONNECTED, () => {
            this.componentLogger.info('Deepgram adapter connected event received');
        });
        // Disconnected イベント
        this.deepgramAdapter.on(DeepgramStreamAdapter_1.DeepgramStreamAdapter.EVENTS.DISCONNECTED, (reason) => {
            this.componentLogger.info('Deepgram adapter disconnected', { reason });
            // 必要に応じて再接続ロジックを追加
        });
        // UtteranceEnd イベント（将来の実装用）
        this.deepgramAdapter.on(DeepgramStreamAdapter_1.DeepgramStreamAdapter.EVENTS.UTTERANCE_END, (data) => {
            this.componentLogger.debug('UtteranceEnd event received', data);
            // TODO: UtteranceEnd 処理の実装
        });
        // Metadata イベント
        this.deepgramAdapter.on(DeepgramStreamAdapter_1.DeepgramStreamAdapter.EVENTS.METADATA, (metadata) => {
            this.componentLogger.debug('Deepgram metadata received', metadata);
        });
    }
    /**
     * Get meaning of WebSocket close code
     */
    /**
     * Process transcript segment - シンプルに処理（親フォルダと同様）
     */
    processTranscriptSegment(segment) {
        // 【Phase 0-1】データフロー可視化ログ追加
        console.log('[DataFlow-1] Transcript segment received:', {
            id: segment.id,
            textLength: segment.text.length,
            isFinal: segment.isFinal,
            timestamp: Date.now()
        });
        // Store final segments only
        if (segment.isFinal) {
            this.transcriptSegments.push(segment);
            // 直接翻訳をキューに追加（SegmentManager不要）
            console.log('[DataFlow-2] Queuing translation for segment:', segment.id);
            this.translateSegment(segment.text, segment.id);
            // SentenceCombinerに追加（文単位の結合用）
            console.log('[DataFlow-3] Adding to SentenceCombiner:', segment.id);
            this.sentenceCombiner.addSegment(segment);
            // 🔴 ParagraphBuilderを一時的に無効化 - フロントエンドでのグループ化を優先
            // 【Phase 2-ParagraphBuilder】ParagraphBuilderにのみ追加（パラグラフ単位の結合用）
            // console.log('[DataFlow-3b] Adding to ParagraphBuilder:', {
            //   segmentId: segment.id,
            //   text: segment.text.substring(0, 50) + '...',
            //   isFinal: segment.isFinal,
            //   timestamp: segment.timestamp,
            //   hasStartMs: 'startMs' in segment,
            //   hasEndMs: 'endMs' in segment
            // });
            // this.paragraphBuilder.addSegment(segment);
        }
        // Emit ASR event for both interim and final results
        console.log('[UnifiedPipelineService] Emitting ASR event:', {
            text: segment.text,
            isFinal: segment.isFinal,
            segmentId: segment.id
        });
        this.emitEvent((0, contracts_1.createASREvent)({
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
    async translateSegment(text, segmentId) {
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
        }
        catch (error) {
            this.componentLogger.error('Failed to queue translation', {
                segmentId,
                error: error instanceof Error ? error.message : String(error)
            });
            // エラーイベントを発行
            this.emitEvent((0, contracts_1.createErrorEvent)({
                code: 'TRANSLATION_QUEUE_ERROR',
                message: `Translation queue error: ${error instanceof Error ? error.message : String(error)}`,
                recoverable: true
            }, this.currentCorrelationId || 'unknown'));
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
    async executeTranslation(queuedTranslation) {
        const startTime = Date.now();
        let firstPaintTime = 0;
        const segmentId = queuedTranslation.segmentId;
        const text = queuedTranslation.originalText;
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
            const translationPrompt = (0, LanguageConfig_1.getTranslationPrompt)(this.sourceLanguage, this.targetLanguage);
            const stream = await this.openai.responses.create({
                model: this.openaiConfig.models.translate,
                input: [
                    { role: 'system', content: translationPrompt },
                    { role: 'user', content: text }
                ],
                max_output_tokens: this.openaiConfig.maxTokens.translate,
                reasoning: { effort: 'minimal' },
                stream: true // ストリーミングを有効化
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
            // 翻訳完了
            const result = {
                id: `translation-${segmentId}`,
                original: text,
                translated: cleanedTranslation,
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
            this.emitEvent((0, contracts_1.createTranslationEvent)({
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
            // 🔴 Shadow Mode: LLM Gateway経由でも実行（既存実装に影響しない）
            // Shadow Mode not implemented - commented out
            /*
            if (this.enableShadowMode && this.llmGateway) {
              this.executeShadowModeTranslation(text, segmentId, result.translated, firstPaintTime, completeTime);
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
            return result.translated;
        }
        catch (error) {
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
            this.emitEvent((0, contracts_1.createErrorEvent)({
                code: 'TRANSLATION_FAILED',
                message: `Failed to translate segment: ${error instanceof Error ? error.message : 'Unknown error'}`,
                recoverable: false
            }, this.currentCorrelationId || 'unknown'));
            // Re-throw to let the queue handle the error
            throw error;
        }
    }
    /**
     * Set pipeline state and emit status event
     */
    setState(newState) {
        const oldState = this.stateManager.getState();
        // PipelineStateManagerを使用して状態遷移を管理
        this.stateManager.setState(newState, this.currentCorrelationId || undefined);
        this.componentLogger.info('Pipeline state changed', {
            from: oldState,
            to: newState,
            correlationId: this.currentCorrelationId,
        });
        // Emit status event
        this.emitEvent((0, contracts_1.createStatusEvent)({
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
    emitEvent(event) {
        this.emit('pipelineEvent', event);
    }
    /**
     * Emit error event
     */
    emitError(code, message, correlationId) {
        this.emitEvent((0, contracts_1.createErrorEvent)({
            code,
            message,
            recoverable: true,
            details: {
                state: this.stateManager.getState(),
                timestamp: Date.now(),
            },
        }, correlationId));
    }
    /**
     * Generate vocabulary from current session
     * @deprecated This method should be called directly on AdvancedFeatureService from main.ts
     */
    async generateVocabulary(correlationId) {
        this.componentLogger.warn('generateVocabulary called on UnifiedPipelineService - this should be called on AdvancedFeatureService from main.ts', { correlationId });
        // Emit an event to notify that vocabulary generation was requested
        this.emit('vocabularyRequested', { correlationId });
    }
    /**
     * Generate final report from current session
     * @deprecated This method should be called directly on AdvancedFeatureService from main.ts
     */
    async generateFinalReport(correlationId) {
        this.componentLogger.warn('generateFinalReport called on UnifiedPipelineService - this should be called on AdvancedFeatureService from main.ts', { correlationId });
        // Emit an event to notify that final report generation was requested
        this.emit('finalReportRequested', { correlationId });
    }
    /**
     * Handle combined sentence from SentenceCombiner
     * 結合された文を履歴用高品質翻訳キューに追加
     */
    async handleCombinedSentence(combinedSentence) {
        console.log(`[UnifiedPipelineService] Combined sentence ready: ${combinedSentence.segmentCount} segments`);
        // 【Phase 1-1】データフロー可視化ログ追加
        console.log('[DataFlow-5] handleCombinedSentence called:', {
            combinedId: combinedSentence.id,
            segmentCount: combinedSentence.segmentCount,
            textLength: combinedSentence.originalText.length,
            timestamp: Date.now()
        });
        try {
            // 【Phase 2-2】CombinedSentenceEventをフロントエンドに送信
            this.emitEvent((0, contracts_1.createCombinedSentenceEvent)({
                combinedId: combinedSentence.id,
                segmentIds: combinedSentence.segmentIds,
                originalText: combinedSentence.originalText,
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
                originalText: combinedSentence.originalText,
                sourceLanguage: this.sourceLanguage,
                targetLanguage: this.targetLanguage,
                timestamp: combinedSentence.timestamp,
                priority: 'low' // 低優先度でリアルタイム翻訳を妨げない
            });
            console.log(`[UnifiedPipelineService] History translation queued for combined sentence: ${combinedSentence.id}`);
            // 【Phase 1-1】データフロー可視化ログ追加
            console.log('[DataFlow-6] History translation queued:', {
                historyId: `history_${combinedSentence.id}`,
                priority: 'low',
                timestamp: Date.now()
            });
        }
        catch (error) {
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
     * Execute history translation with higher quality
     * 履歴用の高品質翻訳を実行（より大きなコンテキストと高品質モデル）
     */
    async executeHistoryTranslation(queuedTranslation) {
        const startTime = Date.now();
        // history_またはparagraph_プレフィックスを削除
        const isParagraph = queuedTranslation.segmentId.startsWith('paragraph_');
        const baseId = queuedTranslation.segmentId.replace(/^(history_|paragraph_)/, '');
        const text = queuedTranslation.originalText;
        try {
            console.log(`[UnifiedPipelineService] Starting ${isParagraph ? 'paragraph' : 'history'} translation for: ${baseId}`);
            // 【Phase 1-2】データフロー可視化ログ追加
            console.log('[DataFlow-7] executeHistoryTranslation called:', {
                baseId,
                isParagraph,
                textLength: text.length,
                model: this.openaiConfig.models.summary, // gpt-5-mini
                timestamp: Date.now()
            });
            // 履歴用の詳細な翻訳プロンプト
            const historyTranslationPrompt = `あなたは${this.sourceLanguage}から${this.targetLanguage}への専門翻訳者です。
以下の講義内容を、文脈を考慮して自然で正確な${this.targetLanguage}に翻訳してください。

重要な指示:
1. 専門用語は正確に翻訳する
2. 文の流れを自然にし、講義として聞きやすい表現にする
3. 複数の文がある場合は、文脈を考慮して一貫性のある翻訳にする
4. 翻訳結果のみを出力し、注釈・説明・原語併記は一切含めない

翻訳のみを出力してください。`;
            // 高品質モデルで翻訳（gpt-5-miniまたはgpt-5）
            const stream = await this.openai.responses.create({
                model: this.openaiConfig.models.summary, // 高品質モデルを使用
                input: [
                    { role: 'system', content: historyTranslationPrompt },
                    { role: 'user', content: text }
                ],
                max_output_tokens: 2000, // より長い出力を許可
                reasoning: { effort: 'low' }, // 少し推論を強化
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
            this.emitEvent((0, contracts_1.createTranslationEvent)({
                originalText: text,
                translatedText: cleanedTranslation,
                sourceLanguage: this.sourceLanguage,
                targetLanguage: this.targetLanguage,
                confidence: 0.95, // 高品質翻訳なので高信頼度
                isFinal: true,
                segmentId: queuedTranslation.segmentId, // 元のIDを保持（history_またはparagraph_プレフィックス付き）
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
        }
        catch (error) {
            console.error('[UnifiedPipelineService] History translation error:', error);
            // 履歴翻訳の失敗は致命的ではないので、エラーを記録するだけ
            this.componentLogger.warn('History translation failed', {
                error: error instanceof Error ? error.message : String(error),
                baseId,
                isParagraph,
                textLength: text.length
            });
            // 空の翻訳を返す（元のセグメント翻訳が使用される）
            return '';
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
    cleanTranslationOutput(text) {
        // 先頭・末尾の空白を除去
        let cleaned = text.trim();
        // GPTの思考プロセスパターンを検出
        const thoughtPatterns = [
            /^.*?Note:.*?\n\n/s, // "Note:" で始まる説明
            /^.*?Wait:.*?\n\n/s, // "Wait:" で始まる思考
            /^.*?Hmm[?.].*?\n\n/s, // "Hmm" の迷い
            /^.*?Let's output[.]*/s, // "Let's output" の決定
            /^.*?I'll output:.*?(?=\n|$)/s, // "I'll output:" の宣言
            /^.*?I'll choose.*?(?=\n|$)/s, // "I'll choose" の選択
            /^.*?I'll render.*?(?=\n|$)/s, // "I'll render" の描画
            /^.*?Output only.*?(?=\n|$)/s, // "Output only" の指示確認
            /^.*?But requirement says.*?\n/s, // "But requirement says" の確認
            /^.*?Better to render as.*?\n/s, // "Better to render as" の選択
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
    destroy() {
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
exports.UnifiedPipelineService = UnifiedPipelineService;
