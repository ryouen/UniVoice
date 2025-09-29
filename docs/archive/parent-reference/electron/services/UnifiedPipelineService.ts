/**
 * UnifiedPipelineService.ts
 * 
 * test-20min-production-detailed.jsの処理を
 * クリーンアーキテクチャで実装
 * 
 * 8ブロックUI構成:
 * ①② History (English/Japanese) - 完了した翻訳履歴
 * ③④ Current (English/Japanese) - リアルタイム翻訳
 * ⑤⑥ Summary (English/Japanese) - Progressive要約
 * ⑦⑧ User    (Input/Translation) - ユーザー入力翻訳
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import OpenAI from 'openai';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// ===== 型定義 =====
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
    translate: string;     // ②リアルタイム翻訳: gpt-5-nano
    summary: string;       // ③定期要約: gpt-5-mini
    summaryTranslate: string; // ④要約翻訳: gpt-5-nano
    userTranslate: string; // ④ユーザー翻訳: gpt-5-nano
    vocabulary: string;    // ⑤単語帳: gpt-5-mini
    report: string;        // ⑥最終レポート: gpt-5
  };
  maxTokens: {
    translate: number;
    summary: number;
    vocabulary: number;
    report: number;
  };
}

interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
}

interface Translation {
  id: string;
  original: string;
  japanese: string;
  timestamp: number;
  firstPaintMs: number;
  completeMs: number;
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

interface VocabularyEntry {
  word: string;
  definition: string;
  example?: string;
}

// ===== メインサービス =====
export class UnifiedPipelineService extends EventEmitter {
  // 設定
  private audioConfig: AudioConfig;
  private deepgramConfig: DeepgramConfig;
  private openaiConfig: OpenAIConfig;
  
  // 接続
  private ws: WebSocket | null = null;
  private openai: OpenAI;
  
  // 状態
  private isRunning = false;
  private audioBuffer: Buffer | null = null;
  private frameIndex = 0;
  private frameTimer: NodeJS.Timeout | null = null;
  
  // データストア（8ブロック対応）
  private currentOriginal = '';      // ③Current English
  private currentTranslation = '';   // ④Current Japanese
  private history: Translation[] = []; // ①②History
  private summaries: Summary[] = [];   // ⑤⑥Summary
  private vocabulary: VocabularyEntry[] = []; // 語彙
  
  // Progressive Summarization
  private summaryBuffer: string[] = [];
  private summaryWordCount = 0;
  private summaryThresholds = [400, 800, 1600]; // 段階的要約
  private currentThresholdIndex = 0;
  
  // 翻訳キュー
  private translationQueue: Array<() => Promise<void>> = [];
  private activeTranslations = 0;
  private maxConcurrency = 3;
  private lastInterimText = '';
  private lastInterimTime = 0;
  
  constructor(
    audioConfig: AudioConfig,
    deepgramConfig: DeepgramConfig,
    openaiConfig: OpenAIConfig
  ) {
    super();
    
    this.audioConfig = audioConfig;
    this.deepgramConfig = deepgramConfig;
    this.openaiConfig = openaiConfig;
    
    this.openai = new OpenAI({
      apiKey: openaiConfig.apiKey,
      dangerouslyAllowBrowser: false
    });
  }
  
  // ===== パブリックAPI =====
  
  async startFromFile(audioPath: string): Promise<void> {
    if (this.isRunning) await this.stop();
    console.log(`[UnifiedPipeline] Starting from file: ${audioPath}`);

    // ✅ ファイルパスを堅牢に解決
    const candidates: string[] = [];
    if (path.isAbsolute(audioPath)) {
      candidates.push(audioPath);
    } else {
      candidates.push(
        path.resolve(process.cwd(), audioPath),
        path.resolve(process.cwd(), 'sample_voice', audioPath),
        path.resolve(app.getAppPath(), audioPath),
        path.resolve(app.getAppPath(), 'sample_voice', audioPath),
        path.resolve(__dirname, '..', '..', 'sample_voice', audioPath) // dist配置想定
      );
    }
    const resolvedPath = candidates.find(p => fs.existsSync(p));
    if (!resolvedPath) {
      throw new Error(`Audio file not found. Tried:\n${candidates.join('\n')}`);
    }
    console.log(`[UnifiedPipeline] Resolved path: ${resolvedPath}`);

    // WAV想定：先頭44byteヘッダをスキップし raw PCM16 (16k) を送る
    const audioData = fs.readFileSync(resolvedPath);
    this.audioBuffer = audioData.slice(44);

    await this.start(); // Deepgram接続→ファイル送出
  }
  
  async startFromMicrophone(): Promise<void> {
    if (this.isRunning) await this.stop();

    console.log('[UnifiedPipeline] Starting from microphone');
    this.audioBuffer = null;          // マイクは push 型
    this.frameIndex = 0;

    await this.start();               // Deepgram接続のみ（送出は sendAudioChunk で）
    // Renderer が window.electron.sendAudioChunk() でプッシュしてくる想定
  }
  
  /** Deepgram 接続→ファイルなら送出開始 */
  private async start(): Promise<void> {
    this.isRunning = true;
    await this.connectDeepgram();
    if (this.audioBuffer) this.startAudioStreaming(); // ファイル時のみ
    this.emit('started');
  }
  
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // タイマー停止
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }
    
    // WebSocket終了
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'Finalize' }));
      this.ws.send(JSON.stringify({ type: 'CloseStream' }));
      this.ws.close();
      this.ws = null;
    }
    
    // 最終レポート生成
    if (this.history.length > 0) {
      await this.generateFinalReport();
    }
    
    this.emit('stopped');
  }
  
  // ===== ①音声入力 =====
  
  private startAudioStreaming(): void {
    if (!this.audioBuffer) return;
    
    const totalFrames = Math.floor(this.audioBuffer.length / this.audioConfig.frameSize);
    this.frameIndex = 0;
    
    this.frameTimer = setInterval(() => {
      if (!this.isRunning || this.frameIndex >= totalFrames) {
        if (this.frameTimer) {
          clearInterval(this.frameTimer);
          this.frameTimer = null;
        }
        return;
      }
      
      const frame = this.audioBuffer!.slice(
        this.frameIndex * this.audioConfig.frameSize,
        (this.frameIndex + 1) * this.audioConfig.frameSize
      );
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(frame);
      }
      
      this.frameIndex++;
      
      // Progress event
      if (this.frameIndex % 50 === 0) {
        this.emit('audioProgress', {
          current: this.frameIndex,
          total: totalFrames,
          percentage: (this.frameIndex / totalFrames) * 100
        });
      }
    }, this.audioConfig.frameMs);
  }
  
  // ===== ②ASR（音声認識） =====
  
  private async connectDeepgram(): Promise<void> {
    const params = new URLSearchParams({
      encoding: 'linear16',
      sample_rate: this.audioConfig.sampleRate.toString(),
      interim_results: this.deepgramConfig.interim.toString(),
      endpointing: this.deepgramConfig.endpointing.toString(),
      utterance_end_ms: this.deepgramConfig.utteranceEndMs.toString(),
      punctuate: 'true',
      model: this.deepgramConfig.model
    });
    
    const url = `wss://api.deepgram.com/v1/listen?${params}`;
    
    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Token ${this.deepgramConfig.apiKey}`
      }
    });
    
    this.ws.on('open', () => {
      console.log('[UnifiedPipeline] Deepgram connected');
      this.emit('deepgramConnected');
    });
    
    this.ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleDeepgramMessage(msg);
      } catch (error) {
        console.error('[UnifiedPipeline] Parse error:', error);
      }
    });
    
    this.ws.on('error', (error) => {
      console.error('[UnifiedPipeline] WebSocket error:', error);
      this.emit('error', { stage: 'deepgram', error });
    });
  }
  
  private handleDeepgramMessage(msg: any): void {
    if (msg.type !== 'Results') return;
    
    const alternatives = msg.channel?.alternatives?.[0];
    if (!alternatives?.transcript) return;
    
    const segment: TranscriptSegment = {
      id: `seg_${Date.now()}`,
      text: alternatives.transcript,
      timestamp: Date.now(),
      confidence: alternatives.confidence || 0,
      isFinal: msg.is_final || false
    };
    
    // 音声認識ログ
    console.log(`[Deepgram] ${segment.isFinal ? 'Final' : 'Interim'}: "${segment.text}" (confidence: ${segment.confidence.toFixed(2)})`);
    
    // ③Current English更新（中間結果も最終結果も両方表示）
    this.currentOriginal = segment.text;
    this.emit('currentOriginalUpdate', {
      text: this.currentOriginal,
      isFinal: segment.isFinal
    });
    
    // 翻訳リクエスト（条件付き）
    if (segment.isFinal) {
      // 最終結果は必ず翻訳
      this.enqueueTranslation(segment);
      // 最終結果の後はcurrentをクリア
      setTimeout(() => {
        this.currentOriginal = '';
        this.currentTranslation = '';
        this.emit('currentOriginalUpdate', {
          text: '',
          isFinal: true
        });
        this.emit('currentTranslationUpdate', '');
      }, 100);
    } else {
      // 中間結果の翻訳条件を緩和
      const shouldTranslate = 
        segment.text.length > 15 && // 15文字以上（より早く翻訳開始）
        (!this.lastInterimText || // 初回
         segment.text.length > this.lastInterimText.length + 5 || // 5文字以上増加
         Date.now() - this.lastInterimTime > 500); // 500ms以上経過
      
      if (shouldTranslate) {
        this.enqueueTranslation(segment);
        this.lastInterimText = segment.text;
        this.lastInterimTime = Date.now();
      }
    }
    
    // Progressive Summarization用にバッファリング
    if (segment.isFinal) {
      this.addToSummaryBuffer(segment.text);
      this.lastInterimText = ''; // リセット
    }
  }
  
  // ===== ③翻訳要求 + ④GPT処理 + ⑤出力抽出 =====
  
  private enqueueTranslation(segment: TranscriptSegment): void {
    const task = async () => {
      const startTime = Date.now();
      let firstPaintTime = 0;
      
      try {
        // 🔴 正しいAPI呼び出し方法（test-3min-complete.jsで動作確認済み）
        // responses.stream を使用（chat.completions.createではない）
        // これがGPT-5系モデルの正しい呼び方
        const stream = await this.openai.responses.stream({
          model: this.openaiConfig.models.translate,
          input: [
            { role: 'system', content: 'You are a professional translator. Translate English to natural Japanese. Output ONLY the Japanese translation without explanations / inner thoughts.' },
            { role: 'user', content: segment.text }
          ],
          max_output_tokens: this.openaiConfig.maxTokens.translate,
          reasoning: { effort: 'minimal' }
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
            this.currentTranslation = translation;
            this.emit('currentTranslationUpdate', this.currentTranslation);
          }
        }
        
        const completeTime = Date.now() - startTime;
        
        // 翻訳完了
        const result: Translation = {
          id: segment.id,
          original: segment.text,
          japanese: translation.trim(),
          timestamp: Date.now(),
          firstPaintMs: firstPaintTime,
          completeMs: completeTime
        };
        
        // ⑥表示段階
        if (segment.isFinal) {
          this.history.push(result);
          this.emit('translationComplete', result);
          
          // Current → History移動
          this.currentOriginal = '';
          this.currentTranslation = '';
        }
        
        // 成功メトリクス
        console.log(`[翻訳完了] "${result.japanese.substring(0, 30)}..." (${completeTime}ms)`);
        
      } catch (error: any) {
        console.error('[UnifiedPipeline] Translation error:', error);
        console.error('[UnifiedPipeline] Error details:', {
          message: error.message,
          code: error.code,
          status: error.status,
          response: error.response?.data
        });
        this.emit('error', { 
          stage: 'translation', 
          error: error.message || String(error) 
        });
      }
    };
    
    this.translationQueue.push(task);
    this.processTranslationQueue();
  }
  
  private async processTranslationQueue(): Promise<void> {
    while (this.activeTranslations < this.maxConcurrency && this.translationQueue.length > 0) {
      const task = this.translationQueue.shift();
      if (task) {
        this.activeTranslations++;
        task().finally(() => {
          this.activeTranslations--;
          this.processTranslationQueue();
        });
      }
    }
  }
  
  // ===== Progressive Summarization (⑤⑥) =====
  
  private addToSummaryBuffer(text: string): void {
    this.summaryBuffer.push(text);
    this.summaryWordCount += text.split(' ').length;
    
    // 閾値チェック
    if (this.currentThresholdIndex < this.summaryThresholds.length) {
      const threshold = this.summaryThresholds[this.currentThresholdIndex];
      
      if (this.summaryWordCount >= threshold) {
        this.generateSummary();
        this.currentThresholdIndex++;
      }
    } else {
      // 最大閾値後は+800語ごと
      if (this.summaryWordCount >= this.summaryThresholds[2] + 800) {
        this.generateSummary();
        this.summaryWordCount = this.summaryThresholds[2]; // リセット
      }
    }
  }
  
  private async generateSummary(): Promise<void> {
    const text = this.summaryBuffer.join(' ');
    const startTime = Date.now();
    
    try {
      // ⑤英語要約生成
      const englishResponse = await this.openai.chat.completions.create({
        model: this.openaiConfig.models.summary,
        messages: [
          { role: 'system', content: 'Summarize the lecture content in 3-5 bullet points.' },
          { role: 'user', content: text }
        ],
        max_tokens: this.openaiConfig.maxTokens.summary
      });
      
      const englishSummary = englishResponse.choices[0].message.content || '';
      
      // ⑥日本語要約翻訳
      const japaneseResponse = await this.openai.chat.completions.create({
        model: this.openaiConfig.models.summaryTranslate,
        messages: [
          { role: 'system', content: 'Translate to Japanese.' },
          { role: 'user', content: englishSummary }
        ],
        max_tokens: this.openaiConfig.maxTokens.summary
      });
      
      const japaneseSummary = japaneseResponse.choices[0].message.content || '';
      
      const summary: Summary = {
        id: `sum_${Date.now()}`,
        english: englishSummary,
        japanese: japaneseSummary,
        wordCount: this.summaryWordCount,
        timestamp: Date.now(),
        timeRange: {
          start: startTime,
          end: Date.now()
        }
      };
      
      this.summaries.push(summary);
      this.emit('summaryGenerated', summary);
      
      // バッファクリア
      this.summaryBuffer = [];
      
    } catch (error) {
      console.error('[UnifiedPipeline] Summary error:', error);
      this.emit('error', { stage: 'summary', error });
    }
  }
  
  // ===== ⑦⑧ユーザー入力翻訳 =====
  
  async translateUserInput(text: string, fromLang = 'ja', toLang = 'en'): Promise<string> {
    try {
      const direction = fromLang === 'ja' ? 'Japanese to English' : 'English to Japanese';
      
      const response = await this.openai.chat.completions.create({
        model: this.openaiConfig.models.userTranslate,
        messages: [
          { role: 'system', content: `Translate ${direction}. Output only the translation.` },
          { role: 'user', content: text }
        ],
        max_tokens: this.openaiConfig.maxTokens.translate
      });
      
      const translation = response.choices[0].message.content || '';
      
      this.emit('userTranslation', {
        original: text,
        translation,
        fromLang,
        toLang,
        timestamp: Date.now()
      });
      
      return translation;
      
    } catch (error) {
      console.error('[UnifiedPipeline] User translation error:', error);
      throw error;
    }
  }
  
  // ===== 最終レポート生成 =====
  
  private async generateFinalReport(): Promise<void> {
    try {
      const context = {
        translations: this.history,
        summaries: this.summaries,
        duration: Date.now() - (this.history[0]?.timestamp || Date.now())
      };
      
      const response = await this.openai.chat.completions.create({
        model: this.openaiConfig.models.report,
        messages: [
          {
            role: 'system',
            content: 'Generate a comprehensive report of the lecture session.'
          },
          {
            role: 'user',
            content: JSON.stringify(context)
          }
        ],
        max_tokens: this.openaiConfig.maxTokens.report
      });
      
      const report = response.choices[0].message.content || '';
      
      this.emit('finalReport', {
        report,
        vocabulary: this.vocabulary,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('[UnifiedPipeline] Report generation error:', error);
    }
  }
  
  // ===== 状態取得 =====
  
  getState() {
    return {
      isRunning: this.isRunning,
      currentOriginal: this.currentOriginal,
      currentTranslation: this.currentTranslation,
      historyCount: this.history.length,
      summaryCount: this.summaries.length,
      queueLength: this.translationQueue.length,
      activeTranslations: this.activeTranslations
    };
  }
  
  getHistory(): Translation[] {
    return [...this.history];
  }
  
  getSummaries(): Summary[] {
    return [...this.summaries];
  }
  
  /** ✅ マイク/任意チャンク：Rendererからの raw PCM16 をそのままWSへ送る */
  public sendAudioChunk(chunk: Buffer): void {
    if (!this.isRunning || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(chunk);
    } catch (e) {
      this.emit('error', e);
    }
  }
}