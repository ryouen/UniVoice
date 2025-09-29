#!/usr/bin/env node
/**
 * test-3min-complete.js
 * 
 * test-20min-production-detailed.jsの3分版（同一実装）
 * TEST_NAME='3min-complete', TEST_DURATION_MS=180秒のみ異なる
 * 
 * ※ 本ファイル更新時はCLAUDE.mdの該当箇所を更新すること
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// ========== 設定 ==========
const TEST_NAME = '3min-complete';
const TEST_DURATION_MS = 180 * 1000;  // 3分
const AUDIO_FILE = './sample_voice/Hayes.wav';
const LOOP_AUDIO = false;

// フレーム設定
const FRAME_MS = 20;
const FRAME_SIZE = 640;
const FRAMES_PER_SECOND = 50;

// Deepgram params
const DG_ENDPOINTING = (process.env.DG_ENDPOINTING || '800').toString();
const DG_UTTERANCE_END_MS = (process.env.DG_UTTERANCE_END_MS || '1000').toString();
const DG_INTERIM = (process.env.DG_INTERIM || 'true').toString();
const DG_DIARIZE = (process.env.DG_DIARIZE || 'false').toString();
const DG_MODEL = (process.env.DG_MODEL || 'nova-3').toString();

const DG_PARAMS = new URLSearchParams({
  encoding: 'linear16',
  sample_rate: '16000',
  interim_results: DG_INTERIM,
  endpointing: DG_ENDPOINTING,
  utterance_end_ms: DG_UTTERANCE_END_MS,
  punctuate: 'true',
  diarize: DG_DIARIZE,
  model: DG_MODEL,
  version: 'latest'
});

const DEEPGRAM_WS_URL = `wss://api.deepgram.com/v1/listen?${DG_PARAMS}`;

// OpenAI設定
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ③④⑤⑥のヘルパー関数をインポート
const {
  generateSummary,
  translateSummary,
  generateVocabulary,
  generateFinalReport
} = require('../helpers/gpt5-helpers.js');

// 動的設定
let MAX_TOKENS = parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500', 10);
let CONCURRENCY = parseInt(process.env.OPENAI_TRANSLATE_CONCURRENCY || '3', 10);
let CURRENT_MODEL = process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano';
let INTERIM_THROTTLE_MS = 500;

// 出力ディレクトリ
const OUT_DIR = path.resolve('test-results');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(OUT_DIR, `${TEST_NAME}_log_${RUN_ID}.jsonl`);
const METRICS_FILE = path.join(OUT_DIR, `${TEST_NAME}_metrics_${RUN_ID}.json`);
const REPORT_FILE = path.join(OUT_DIR, `${TEST_NAME}_report_${RUN_ID}.md`);
const DETAILED_FILE = path.join(OUT_DIR, `${TEST_NAME}_detailed_${RUN_ID}.json`);

// ========== 詳細記録用データ構造 ==========
const detailedData = {
  testInfo: {
    runId: RUN_ID,
    startTime: new Date().toISOString(),
    audioFile: AUDIO_FILE,
    models: {
      asr: DG_MODEL,
      translation: CURRENT_MODEL
    },
    params: {
      maxTokens: MAX_TOKENS,
      concurrency: CONCURRENCY,
      interimThrottle: INTERIM_THROTTLE_MS
    }
  },
  
  // ①音声入力
  stage1_audioInput: {
    totalFrames: 0,
    totalBytes: 0,
    frameSamples: [],  // 最初と最後の10フレーム
    timestamps: []
  },
  
  // ②ASR（音声認識）
  stage2_asr: {
    interim: [],
    final: [],
    confidence: [],
    timeline: []  // 分単位のタイムライン
  },
  
  // ③④⑤要約データ
  summaries: [],
  
  // ③翻訳要求
  stage3_translationRequests: {
    requests: [],
    throttled: 0,
    queued: 0
  },
  
  // ④GPT処理
  stage4_gptProcessing: {
    requests: [],
    tokens: 0,
    cost: 0
  },
  
  // ⑤出力抽出
  stage5_outputExtraction: {
    successful: [],
    empty: [],
    extractionDetails: []
  },
  
  // ⑥表示（ユーザーに見える全データ）
  stage6_display: {
    translations: [],  // ユーザーに表示される全翻訳
    firstPaints: [],
    timeline: []  // 時系列表示データ
  },
  
  // 要約・語彙
  summaries: [],
  vocabulary: [],
  finalReport: null
};

// ========== Translation queue ==========
let ACTIVE = 0;
const QUEUE = [];

function enqueueTranslate(fn) {
  QUEUE.push(fn);
  drainQueue();
}

function drainQueue() {
  while (ACTIVE < CONCURRENCY && QUEUE.length > 0) {
    const fn = QUEUE.shift();
    ACTIVE++;
    Promise.resolve()
      .then(fn)
      .catch(() => {})
      .finally(() => {
        ACTIVE--;
        drainQueue();
      });
  }
}

// ========== ログシステム ==========
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(stage, data) {
  const entry = {
    timestamp: Date.now(),
    stage,
    data
  };
  
  logStream.write(JSON.stringify(entry) + '\n');
  
  // 重要なイベントはコンソール出力
  if (stage === 'error' || stage === 'stopLoss' || data.milestone) {
    console.log(`[${stage}] ${data.message || JSON.stringify(data).substring(0, 100)}`);
  }
}

// ========== メトリクス ==========
const metrics = {
  startTime: Date.now(),
  endTime: null,
  duration: null,
  translations: {
    attempted: 0,
    successful: 0,
    empty: 0,
    errors: 0
  },
  asr: {
    interim: 0,
    final: 0,
    confidence: []
  },
  performance: {
    firstPaints: [],
    latencies: []
  },
  errors: []
};

// ========== 音声ファイル読み込み ==========
let audioBuffer;
let frameIndex = 0;

function loadAudio() {
  try {
    const audioData = fs.readFileSync(AUDIO_FILE);
    audioBuffer = audioData.slice(44); // WAVヘッダースキップ
    const totalFrames = Math.floor(audioBuffer.length / FRAME_SIZE);
    
    detailedData.stage1_audioInput.totalFrames = totalFrames;
    detailedData.stage1_audioInput.totalBytes = audioBuffer.length;
    
    console.log(`✅ Audio loaded: ${audioBuffer.length} bytes, ${totalFrames} frames`);
    console.log(`   Duration: ${(totalFrames * FRAME_MS / 1000).toFixed(1)} seconds`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load audio:', error.message);
    return false;
  }
}

// ========== Deepgram WebSocket ==========
let ws;
let lastInterimText = '';
let lastInterimTime = 0;
let currentMinute = 0;
let minuteTranscript = '';

// 要約用のバッファと制御変数
let transcriptBuffer = [];
let lastSummaryMinute = -1;
const SUMMARY_INTERVAL_MINUTES = 2;  // 3分テスト用に2分に変更

function connectDeepgram() {
  ws = new WebSocket(DEEPGRAM_WS_URL, {
    headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}` }
  });

  ws.on('open', () => {
    console.log('🔌 Deepgram connected');
    log('websocket', { status: 'connected' });
    startAudioStream();
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'Results') {
        const alt = msg.channel?.alternatives?.[0];
        if (!alt) return;
        
        const text = alt.transcript;
        const confidence = alt.confidence || 0;
        const isFinal = msg.is_final;
        
        if (!text) return;
        
        const timestamp = Date.now();
        const minute = Math.floor((timestamp - metrics.startTime) / 60000);
        
        // ②ASR記録
        const asrRecord = {
          timestamp,
          minute,
          text,
          confidence,
          isFinal
        };
        
        if (isFinal) {
          // Final結果
          detailedData.stage2_asr.final.push(asrRecord);
          metrics.asr.final++;
          metrics.asr.confidence.push(confidence);
          
          log('asr_final', { text, confidence, segment_id: metrics.asr.final });
          
          // タイムライン更新
          minuteTranscript += text + ' ';
          
          // 転写テキストをバッファに追加
          transcriptBuffer.push(text);
          
          // ③翻訳要求作成
          const requestId = `req_${RUN_ID}_${metrics.translations.attempted++}`;
          const translationRequest = {
            requestId,
            timestamp,
            text,
            confidence,
            type: 'final'
          };
          
          detailedData.stage3_translationRequests.requests.push(translationRequest);
          
          // 翻訳実行
          enqueueTranslate(async () => {
            await processTranslation(text, confidence, requestId, false);
          });
          
        } else {
          // Interim結果
          detailedData.stage2_asr.interim.push(asrRecord);
          metrics.asr.interim++;
          
          // スロットリング
          const now = Date.now();
          if (now - lastInterimTime < INTERIM_THROTTLE_MS) {
            detailedData.stage3_translationRequests.throttled++;
            return;
          }
          
          if (text !== lastInterimText && text.length > 8) {
            lastInterimText = text;
            lastInterimTime = now;
            
            const requestId = `req_${RUN_ID}_interim_${metrics.asr.interim}`;
            
            enqueueTranslate(async () => {
              await processTranslation(text, confidence, requestId, true);
            });
          }
        }
        
        // 分単位のタイムライン更新
        if (minute > currentMinute) {
          if (minuteTranscript) {
            detailedData.stage2_asr.timeline.push({
              minute: currentMinute,
              timeRange: formatTimeRange(currentMinute),
              transcript: minuteTranscript.trim(),
              wordCount: minuteTranscript.split(' ').length
            });
          }
          currentMinute = minute;
          minuteTranscript = '';
          
          // 10分ごとの要約処理
          if (minute >= SUMMARY_INTERVAL_MINUTES && 
              minute % SUMMARY_INTERVAL_MINUTES === 0 && 
              minute !== lastSummaryMinute) {
            
            lastSummaryMinute = minute;
            
            // 過去10分のテキストを結合
            const last10MinText = transcriptBuffer.join(' ');
            transcriptBuffer = []; // バッファをクリア
            
            console.log(`\n🔄 Processing 10-minute summary at minute ${minute}...`);
            
            // 非同期処理（Promiseで実行）
            (async () => {
              try {
                // ③定期要約を生成
                const summaryStartTime = Date.now();
                const englishSummary = await generateSummary(last10MinText);
                const summaryTime = Date.now() - summaryStartTime;
                
                console.log(`✅ Summary generated in ${summaryTime}ms`);
                
                // ④要約翻訳と⑤語彙抽出を並列実行
                const [japaneseSummary, vocabulary] = await Promise.all([
                  translateSummary(englishSummary),
                  generateVocabulary(last10MinText)
                ]);
                
                // データ記録
                detailedData.summaries.push({
                  minute,
                  timeRange: formatTimeRange(minute - 10) + ' - ' + formatTimeRange(minute),
                  englishSummary,
                  japaneseSummary,
                  vocabulary,
                  wordCount: last10MinText.split(' ').length
                });
                
                console.log(`📝 Summary: "${englishSummary.substring(0, 100)}..."`);
                console.log(`🇯🇵 Translation: "${japaneseSummary.substring(0, 100)}..."`);
                console.log(`📚 Vocabulary: ${vocabulary.length} terms extracted`);
                
              } catch (error) {
                console.error(`❌ Summary processing failed:`, error.message);
                log('error', { 
                  stage: 'summary', 
                  minute, 
                  error: error.message 
                });
              }
            })();
          }
        }
      }
    } catch (error) {
      log('error', { stage: 'asr', error: error.message });
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    log('error', { stage: 'websocket', error: error.message });
    metrics.errors.push({ stage: 'websocket', error: error.message, timestamp: Date.now() });
  });

  ws.on('close', () => {
    console.log('🔌 Deepgram disconnected');
    log('websocket', { status: 'disconnected' });
  });
}

// ========== 音声ストリーミング ==========
function startAudioStream() {
  const interval = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      clearInterval(interval);
      return;
    }
    
    if (frameIndex >= Math.floor(audioBuffer.length / FRAME_SIZE)) {
      if (!LOOP_AUDIO) {
        clearInterval(interval);
        ws.close();
        endTest();
        return;
      }
      frameIndex = 0;
    }
    
    const frame = audioBuffer.slice(
      frameIndex * FRAME_SIZE,
      (frameIndex + 1) * FRAME_SIZE
    );
    
    ws.send(frame);
    
    // ①音声入力記録（サンプリング）
    if (frameIndex < 10 || frameIndex === Math.floor(audioBuffer.length / FRAME_SIZE) - 1 || frameIndex % 1000 === 0) {
      detailedData.stage1_audioInput.frameSamples.push({
        frameIndex,
        timestamp: Date.now(),
        size: frame.length
      });
    }
    
    frameIndex++;
  }, FRAME_MS);
  
  // タイムアウト設定
  setTimeout(() => {
    clearInterval(interval);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    endTest();
  }, TEST_DURATION_MS);
}

// ========== 翻訳処理（test-20min-productionと同じ） ==========
async function processTranslation(text, confidence, requestId, isInterim = false) {
  const startTime = performance.now();
  
  // ④GPT処理記録
  const gptRequest = {
    requestId,
    timestamp: Date.now(),
    model: CURRENT_MODEL,
    text,
    isInterim,
    inputPrompt: `Translate English to Japanese. Output only the translation.\n\n${text}`
  };
  
  detailedData.stage4_gptProcessing.requests.push(gptRequest);
  
  let out = '', firstTokenMs = null, usage = null, status = 'completed';
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const stream = await openai.responses.stream({
        model: CURRENT_MODEL,
        input: [
          { role: 'system', content: 'Translate English to Japanese. Output only the translation.' },
          { role: 'user', content: text }
        ],
        max_output_tokens: MAX_TOKENS,
        reasoning: { effort: 'minimal' },
        text: { verbosity: (process.env.OPENAI_TRANSLATE_VERBOSITY || 'low') }
      });
      
      for await (const chunk of stream) {
        if (chunk.type === 'response.output_text.delta' && chunk.delta) {
          if (!firstTokenMs) {
            firstTokenMs = performance.now() - startTime;
            
            // First paint記録
            detailedData.stage6_display.firstPaints.push({
              requestId,
              firstPaintMs: firstTokenMs,
              timestamp: Date.now()
            });
            
            log('first_paint', { requestId, firstPaintMs: firstTokenMs });
          }
          out += chunk.delta;
        } else if (chunk.type === 'response.done' && chunk.usage) {
          usage = chunk.usage;
        }
      }
      
      break; // 成功したらループを抜ける
      
    } catch (error) {
      console.error(`Translation attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === 2) {
        log('error', { 
          stage: 'translation', 
          requestId,
          error: error.message,
          category: 'FATAL'
        });
        metrics.translations.errors++;
        return;
      }
    }
  }
  
  const totalTime = performance.now() - startTime;
  const translation = out;
  
  // ⑤出力抽出記録
  const extractionResult = {
    requestId,
    timestamp: Date.now(),
    success: translation.length > 0,
    outputLength: translation.length,
    isEmpty: translation.trim().length === 0
  };
  
  detailedData.stage5_outputExtraction.extractionDetails.push(extractionResult);
  
  if (translation.trim()) {
    metrics.translations.successful++;
    detailedData.stage5_outputExtraction.successful.push(requestId);
    
    // ⑥表示記録（ユーザーに見える全データ）
    const displayEntry = {
      timestamp: Date.now(),
      minute: Math.floor((Date.now() - metrics.startTime) / 60000),
      timeString: formatTime(Date.now() - metrics.startTime),
      original: text,
      translation,
      confidence,
      isInterim,
      firstPaintMs: firstTokenMs,
      totalTimeMs: totalTime,
      model: CURRENT_MODEL
    };
    
    detailedData.stage6_display.translations.push(displayEntry);
    
    log('translation_complete', displayEntry);
    
    // コンソール出力（簡易表示）
    const time = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${time}] 翻訳完了: "${translation.substring(0, 50)}..." (${totalTime.toFixed(0)}ms)`);
    
  } else {
    metrics.translations.empty++;
    detailedData.stage5_outputExtraction.empty.push(requestId);
    log('translation_empty', { requestId });
  }
  
  // GPT処理の詳細更新
  gptRequest.response = translation;
  gptRequest.usage = usage;
  gptRequest.latencyMs = totalTime;
  gptRequest.firstPaintMs = firstTokenMs;
  gptRequest.status = status;
  
  // メトリクス更新
  if (usage) {
    detailedData.stage4_gptProcessing.tokens += (usage.input_tokens || 0) + (usage.output_tokens || 0);
    detailedData.stage4_gptProcessing.cost += 
      ((usage.input_tokens || 0) * 0.00015 + (usage.output_tokens || 0) * 0.0006) / 1000;
  }
  
  metrics.performance.latencies.push(totalTime);
  if (firstTokenMs) {
    metrics.performance.firstPaints.push(firstTokenMs);
  }
}

// ========== ユーティリティ関数 ==========
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatTimeRange(minute) {
  const start = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  const end = `${String(Math.floor((minute + 1) / 60)).padStart(2, '0')}:${String((minute + 1) % 60).padStart(2, '0')}`;
  return `${start}-${end}`;
}

// ========== テスト終了処理 ==========
async function endTest() {
  metrics.endTime = Date.now();
  metrics.duration = metrics.endTime - metrics.startTime;
  
  // 最後の分のトランスクリプトを保存
  if (minuteTranscript) {
    detailedData.stage2_asr.timeline.push({
      minute: currentMinute,
      timeRange: formatTimeRange(currentMinute),
      transcript: minuteTranscript.trim(),
      wordCount: minuteTranscript.split(' ').length
    });
  }
  
  // 最後の要約を処理（残りのバッファ）
  if (transcriptBuffer.length > 0) {
    console.log('\n🔄 Processing final summary...');
    try {
      const finalText = transcriptBuffer.join(' ');
      const englishSummary = await generateSummary(finalText);
      const [japaneseSummary, vocabulary] = await Promise.all([
        translateSummary(englishSummary),
        generateVocabulary(finalText)
      ]);
      
      detailedData.summaries.push({
        minute: Math.floor((Date.now() - metrics.startTime) / 60000),
        englishSummary,
        japaneseSummary,
        vocabulary
      });
    } catch (error) {
      console.error('Final summary failed:', error.message);
    }
  }
  
  // ⑥AI最終レポート生成
  console.log('\n📊 Generating AI final report...');
  try {
    const reportStartTime = Date.now();
    
    // 全転写テキストを結合
    const allTranscripts = detailedData.stage2_asr.final
      .map(item => item.text)
      .join(' ');
    
    // 全要約を結合
    const allSummaries = detailedData.summaries
      .map(s => s.englishSummary)
      .join('\n\n');
    
    // 全語彙を重複排除
    const allVocabulary = [...new Set(
      detailedData.summaries.flatMap(s => s.vocabulary || [])
    )];
    
    // GPT-5高推論でレポート生成
    const finalReport = await generateFinalReport(
      allTranscripts,
      allSummaries,
      allVocabulary
    );
    
    const reportTime = Date.now() - reportStartTime;
    console.log(`✅ AI report generated in ${reportTime}ms`);
    
    // レポート保存
    detailedData.finalReport = finalReport;
    
    // AIレポートをファイルに保存
    const AI_REPORT_FILE = path.join(OUT_DIR, `${TEST_NAME}_ai-report_${RUN_ID}.md`);
    fs.writeFileSync(AI_REPORT_FILE, finalReport);
    console.log(`📄 AI Report saved: ${AI_REPORT_FILE}`);
    
  } catch (error) {
    console.error('❌ AI report generation failed:', error.message);
    log('error', { 
      stage: 'final-report', 
      error: error.message 
    });
  }
  
  console.log('\n📊 Generating reports...');
  
  // 詳細データ保存
  fs.writeFileSync(DETAILED_FILE, JSON.stringify(detailedData, null, 2));
  
  // メトリクス保存
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
  
  // Markdownレポート生成
  generateMarkdownReport();
  
  // ログストリーム終了
  logStream.end();
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test completed!');
  console.log('='.repeat(80));
  console.log(`📊 Detailed data: ${DETAILED_FILE}`);
  console.log(`📈 Metrics: ${METRICS_FILE}`);
  console.log(`📄 Report: ${REPORT_FILE}`);
  console.log(`📝 Raw log: ${LOG_FILE}`);
  console.log('='.repeat(80));
  
  // 主要KPI表示
  const totalProcessed = metrics.translations.successful + metrics.translations.empty + metrics.translations.errors;
  const successRate = totalProcessed > 0 ? 
    (metrics.translations.successful / totalProcessed) * 100 : 0;
  const emptyRate = totalProcessed > 0 ? 
    (metrics.translations.empty / totalProcessed) * 100 : 0;
  const avgFirstPaint = metrics.performance.firstPaints.length > 0 ?
    metrics.performance.firstPaints.reduce((a, b) => a + b, 0) / metrics.performance.firstPaints.length : 0;
  
  console.log('\n📊 KEY RESULTS:');
  console.log(`  Total Translations: ${detailedData.stage6_display.translations.length}`);
  console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`  Empty Rate: ${emptyRate.toFixed(1)}%`);
  console.log(`  Avg First Paint: ${avgFirstPaint.toFixed(0)}ms`);
  console.log(`  Total Cost: $${detailedData.stage4_gptProcessing.cost.toFixed(4)}`);
  console.log('='.repeat(80));
  
  process.exit(0);
}

// ========== Markdownレポート生成 ==========
function generateMarkdownReport() {
  const duration = metrics.duration / 1000;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  
  let report = `# Hayes.wav Detailed Production Test Report

## Test Information
- **Test ID**: ${RUN_ID}
- **Audio File**: ${AUDIO_FILE}
- **Duration**: ${minutes}:${String(seconds).padStart(2, '0')}
- **Date**: ${new Date().toISOString()}

## 6-Stage Pipeline Performance

### ①音声入力 (Audio Input)
- **Total Frames**: ${detailedData.stage1_audioInput.totalFrames}
- **Total Data**: ${(detailedData.stage1_audioInput.totalBytes / 1024 / 1024).toFixed(2)} MB
- **Frame Samples**: ${detailedData.stage1_audioInput.frameSamples.length}

### ②ASR処理 (Speech Recognition)
- **Model**: ${DG_MODEL}
- **Interim Results**: ${metrics.asr.interim}
- **Final Results**: ${metrics.asr.final}
- **Avg Confidence**: ${metrics.asr.confidence.length > 0 ? 
    (metrics.asr.confidence.reduce((a, b) => a + b, 0) / metrics.asr.confidence.length * 100).toFixed(1) : 0}%

### ③翻訳要求 (Translation Requests)
- **Total Requests**: ${detailedData.stage3_translationRequests.requests.length}
- **Throttled**: ${detailedData.stage3_translationRequests.throttled}

### ④GPT処理 (GPT Processing)
- **Model**: ${CURRENT_MODEL}
- **Total Requests**: ${detailedData.stage4_gptProcessing.requests.length}
- **Total Tokens**: ${detailedData.stage4_gptProcessing.tokens}
- **Total Cost**: $${detailedData.stage4_gptProcessing.cost.toFixed(4)}

### ⑤出力抽出 (Output Extraction)
- **Successful**: ${detailedData.stage5_outputExtraction.successful.length}
- **Empty**: ${detailedData.stage5_outputExtraction.empty.length}

### ⑥表示 (Display to User)
- **Total Translations Shown**: ${detailedData.stage6_display.translations.length}
- **Average First Paint**: ${metrics.performance.firstPaints.length > 0 ?
    (metrics.performance.firstPaints.reduce((a, b) => a + b, 0) / metrics.performance.firstPaints.length).toFixed(0) : 0}ms

## Timeline (分単位の転写内容)

`;

  // タイムライン追加
  for (const entry of detailedData.stage2_asr.timeline.slice(0, 20)) {
    report += `### ${entry.timeRange}
- **Words**: ${entry.wordCount}
- **Content**: "${entry.transcript.substring(0, 200)}..."

`;
  }

  // サンプル翻訳追加
  report += `## Sample Translations (ユーザー表示データ)

`;
  
  for (const trans of detailedData.stage6_display.translations.slice(0, 10)) {
    report += `### [${trans.timeString}] ${trans.isInterim ? '(Interim)' : '(Final)'}
- **Original**: "${trans.original}"
- **Translation**: "${trans.translation}"
- **First Paint**: ${trans.firstPaintMs ? trans.firstPaintMs.toFixed(0) : 'N/A'}ms
- **Total Time**: ${trans.totalTimeMs.toFixed(0)}ms
- **Model**: ${trans.model}

`;
  }
  
  report += `---
Generated: ${new Date().toISOString()}
`;
  
  fs.writeFileSync(REPORT_FILE, report);
}

// ========== メイン実行 ==========
async function main() {
  console.log('='.repeat(80));
  console.log('Hayes.wav Detailed Production Test');
  console.log(`Test ID: ${RUN_ID}`);
  console.log('='.repeat(80));
  
  // 音声ファイル読み込み
  if (!loadAudio()) {
    process.exit(1);
  }
  
  // Deepgram接続
  connectDeepgram();
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  log('error', { stage: 'system', error: error.message });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
  log('error', { stage: 'system', error: String(reason) });
});

// 実行
main();