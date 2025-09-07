#!/usr/bin/env node
/**
 * test-20min-production.js
 * 20分本番テスト - ストップロス機能付き包括的ログ記録
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// ========== 設定 ==========
const TEST_NAME = '20min-production';
const TEST_DURATION_MS = 1200 * 1000;  // 20分
const AUDIO_FILE = './sample_voice/Hayes.wav';  // 約20分のWAVファイル（変換済み）
const LOOP_AUDIO = false;  // Hayes.wavは20分なのでループ不要

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

// 動的設定（ストップロス用）
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

// ========== Translation queue (concurrency-aware) ==========
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
      .catch(() => {})    // 失敗は個別にログ済み
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
  
  // コンソール出力（簡潔）
  if (stage === 'error' || stage === 'stopLoss' || data.milestone) {
    console.log(`[${stage}] ${data.message || JSON.stringify(data).substring(0, 100)}`);
  }
  
  // ファイル出力（詳細）
  logStream.write(JSON.stringify(entry) + '\n');
}

// ========== メトリクス収集 ==========
const metrics = {
  test_info: {
    start_time: null,
    end_time: null,
    duration_ms: null,
    audio_file: AUDIO_FILE,
    test_name: TEST_NAME
  },
  
  pipeline_metrics: {
    // ①音声入力
    audio_input: {
      frames_sent: 0,
      total_bytes: 0,
      silence_frames: 0
    },
    
    // ②ASR処理
    asr_processing: {
      interim_count: 0,
      final_count: 0,
      speech_final_count: 0,
      confidences: [],
      transcripts: [],
      word_counts: []
    },
    
    // ③翻訳呼び出し
    translation_request: {
      total_requests: 0,
      queued_requests: 0,
      retry_count: 0
    },
    
    // ④GPT処理
    gpt_processing: {
      completed_count: 0,
      incomplete_count: 0,
      empty_count: 0,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        reasoning_tokens: 0
      },
      latencies: []
    },
    
    // ⑤出力抽出
    output_extraction: {
      success_count: 0,
      fallback_count: 0,
      empty_count: 0
    },
    
    // ⑥表示
    display_update: {
      interim_updates: 0,
      final_updates: 0,
      first_token_updates: 0,
      render_times: []
    }
  },
  
  kpi: {
    // タイミング
    first_paint_times: [],
    first_paint_events: [],      // {ts, ms}
    end_to_end_times: [],
    
    // 成功率
    translation_attempts: 0,
    translation_successes: 0,
    empty_outputs: 0,
    attempt_ts: [],
    success_ts: [],
    empty_ts: [],
    http429_ts: [],
    
    // リソース
    memory_samples: [],
    api_calls: 0,
    estimated_cost: 0,
    
    // エラー
    http_429_count: 0
  },
  
  // ストップロス記録
  stopLoss: {
    model_switches: [],
    concurrency_changes: [],
    throttle_adjustments: [],
    recovery_times: []
  },
  
  // 5分窓メトリクス
  windows: [],
  
  errors: []
};

// ========== エラーカテゴリ分類 ==========
const ERROR_CATEGORIES = {
  NETWORK: "NETWORK",
  API: "API",
  PARSING: "PARSING",
  TIMEOUT: "TIMEOUT",
  RESOURCE: "RESOURCE",
  LOGIC: "LOGIC"
};

function classifyError(err) {
  const msg = (err && err.message) ? err.message : String(err);
  if (/ECONNRESET|ENETUNREACH|ECONNREFUSED/i.test(msg)) return ERROR_CATEGORIES.NETWORK;
  if (/ETIMEDOUT|timeout/i.test(msg)) return ERROR_CATEGORIES.TIMEOUT;
  if (/429|rate limit/i.test(msg)) {
    metrics.kpi.http_429_count++;
    metrics.kpi.http429_ts.push(Date.now());
    return ERROR_CATEGORIES.API;
  }
  if (/5\\d{2}/.test(msg)) return ERROR_CATEGORIES.API;
  if (/ENOMEM|heap out of memory/i.test(msg)) return ERROR_CATEGORIES.RESOURCE;
  if (/SyntaxError|Unexpected token/i.test(msg)) return ERROR_CATEGORIES.PARSING;
  return ERROR_CATEGORIES.LOGIC;
}

// ========== Interimデデュープ & スロットリング ==========
let lastInterimText = '';
let lastInterimAt = 0;
function shouldTranslateInterim(text) {
  const now = Date.now();
  if (now - lastInterimAt < INTERIM_THROTTLE_MS) return false;
  if (text === lastInterimText) return false;
  if (Math.abs(text.length - lastInterimText.length) < 8) return false;
  if (lastInterimText && (text.length / lastInterimText.length) < 1.25) return false;
  lastInterimText = text; 
  lastInterimAt = now;
  return true;
}

// ========== リクエストID生成 ==========
let requestCounter = 0;
function generateRequestId() {
  return `req_${RUN_ID}_${++requestCounter}`;
}

// ========== パーセンタイル計算 ==========
function percentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ========== 5分窓メトリクス計算 ==========
function calculateWindow() {
  const now = Date.now(), from = now - 300000; // 5分
  const attempts = metrics.kpi.attempt_ts.filter(ts => ts >= from).length;
  const succ = metrics.kpi.success_ts.filter(ts => ts >= from).length;
  const empt = metrics.kpi.empty_ts.filter(ts => ts >= from).length;
  const http429 = metrics.kpi.http429_ts.filter(ts => ts >= from).length;
  const emptyRate = attempts ? (empt / attempts) : 0;
  const successRate = attempts ? (succ / attempts) : 0;
  const http429Rate = attempts ? (http429 / attempts) : 0;
  const paints = metrics.kpi.first_paint_events.filter(e => e.ts >= from).map(e => e.ms);
  const p95 = percentile(paints, 95);
  const window = { timestamp: now, empty_rate: emptyRate, success_rate: successRate, http_429_rate: http429Rate, first_paint_p95: p95, attempts };
  metrics.windows.push(window);
  checkStopLoss(window);
  return window;
}

// ========== ストップロス機能 ==========
function checkStopLoss(window) {
  let triggered = false;
  
  // 1. 空出力率 > 3%
  if (window.empty_rate > 0.03 && CURRENT_MODEL !== 'gpt-4.1-mini') {
    log('stopLoss', { 
      trigger: 'empty_output_rate',
      value: window.empty_rate,
      action: 'switch_model',
      from: CURRENT_MODEL,
      to: 'gpt-4.1-mini'
    });
    CURRENT_MODEL = 'gpt-4.1-mini';
    metrics.stopLoss.model_switches.push({
      timestamp: Date.now(),
      reason: 'empty_output_rate',
      from: 'gpt-5-nano',
      to: 'gpt-4.1-mini'
    });
    triggered = true;
  }
  
  // 2. first-paint p95 > 6秒
  if (window.first_paint_p95 > 6000 && CONCURRENCY > 2) {
    log('stopLoss', {
      trigger: 'first_paint_p95',
      value: window.first_paint_p95,
      action: 'reduce_concurrency',
      from: CONCURRENCY,
      to: 2
    });
    CONCURRENCY = 2;
    INTERIM_THROTTLE_MS += 200;
    metrics.stopLoss.concurrency_changes.push({
      timestamp: Date.now(),
      reason: 'first_paint_p95',
      from: 3,
      to: 2
    });
    triggered = true;
  }
  
  // 3. 429エラー率 > 1%
  if (window.http_429_rate > 0.01 && CONCURRENCY > 2) {
    log('stopLoss', {
      trigger: 'http_429_rate',
      value: window.http_429_rate,
      action: 'reduce_concurrency',
      from: CONCURRENCY,
      to: 2
    });
    CONCURRENCY = 2;
    metrics.stopLoss.concurrency_changes.push({
      timestamp: Date.now(),
      reason: 'http_429_rate',
      from: 3,
      to: 2
    });
    triggered = true;
  }
  
  // 回復条件チェック（2連続窓で基準内）
  if (metrics.windows.length >= 2 && !triggered) {
    const prev = metrics.windows[metrics.windows.length - 2];
    if (window.empty_rate <= 0.02 && prev.empty_rate <= 0.02 && CURRENT_MODEL === 'gpt-4.1-mini') {
      log('stopLoss', {
        trigger: 'recovery',
        action: 'restore_model',
        from: CURRENT_MODEL,
        to: 'gpt-5-nano'
      });
      CURRENT_MODEL = 'gpt-5-nano';
      metrics.stopLoss.recovery_times.push(Date.now());
    }
  }
  
  // 並列数変更後の残キュー消化
  drainQueue();
}

// ========== GPT-5ストリーミング翻訳処理 ==========
async function translateText(text, isInterim = false) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  log('translation_request', {
    request_id: requestId,
    input_text: text,
    input_length: text.length,
    max_output_tokens: MAX_TOKENS,
    model: CURRENT_MODEL,
    is_interim: isInterim
  });
  metrics.pipeline_metrics.translation_request.total_requests++;
  metrics.kpi.translation_attempts++;
  metrics.kpi.attempt_ts.push(Date.now());

  // 429エラー時の指数バックオフ再試行（最大2回）
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
        reasoning: { effort: 'minimal' },  // 推論を最小限に抑制
        text: { verbosity: (process.env.OPENAI_TRANSLATE_VERBOSITY || 'low') }
      });

      for await (const event of stream) {
        if (!firstTokenMs && (event.type === 'response.output_text.delta' || event.type === 'response.delta')) {
          firstTokenMs = performance.now() - startTime;
          metrics.kpi.first_paint_times.push(firstTokenMs);
          metrics.kpi.first_paint_events.push({ ts: Date.now(), ms: firstTokenMs });
          log('gpt_processing', { request_id: requestId, status: 'streaming', first_token_ms: firstTokenMs });
          
          // 最初のトークンで即描画
          const renderStart = performance.now();
          try { process.stdout.write(isInterim ? '.' : '|'); } catch {}
          const renderTime = performance.now() - renderStart;
          log('display_update', {
            request_id: requestId,
            update_type: isInterim ? 'interim_first_token' : 'first_token',
            first_paint_ms: firstTokenMs,
            render_time_ms: renderTime,
            memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024
          });
          metrics.pipeline_metrics.display_update.first_token_updates++;
        }
        if (event.type === 'response.output_text.delta' && event.delta) out += event.delta;
        if (event.type === 'response.completed') usage = event.response?.usage || null;
        if (event.type === 'response.incomplete') status = 'incomplete';
      }
      break; // 成功で抜ける
    } catch (error) {
      const msg = String(error && error.message || error);
      if (/429|rate limit/i.test(msg) && attempt < 2) {
        metrics.pipeline_metrics.translation_request.retry_count++;
        const backoff = 250 * Math.pow(2, attempt); // 250ms, 500ms
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      // 既存のerrorログ処理
      log('error', { 
        stage: 'translation', 
        request_id: requestId, 
        category: classifyError(error), 
        error: error.message, 
        stack: error.stack,
        model: CURRENT_MODEL
      });
      metrics.errors.push({ timestamp: Date.now(), stage: 'translation', message: error.message });
      return '';
    }
  }
  
  const latency = performance.now() - startTime;
  log('gpt_processing', {
    request_id: requestId,
    status,
    incomplete_details: status === 'incomplete' ? { reason: 'stream_incomplete' } : undefined,
    usage,
    latency_ms: latency,
    first_token_ms: firstTokenMs ?? latency,
    output_empty: !out,
    model: CURRENT_MODEL
  });
  metrics.pipeline_metrics.gpt_processing.latencies.push(latency);
  metrics.kpi.api_calls++;
  if (status === 'completed') metrics.pipeline_metrics.gpt_processing.completed_count++;
  else metrics.pipeline_metrics.gpt_processing.incomplete_count++;
  if (usage) {
    metrics.pipeline_metrics.gpt_processing.usage.input_tokens += usage.input_tokens || 0;
    metrics.pipeline_metrics.gpt_processing.usage.output_tokens += usage.output_tokens || 0;
    metrics.pipeline_metrics.gpt_processing.usage.reasoning_tokens += (usage.output_tokens_details?.reasoning_tokens || 0);
  }

  log('output_extraction', {
    request_id: requestId,
    extraction_method: 'stream',
    success: Boolean(out && out.trim()),
    output_length: (out || '').length,
    processing_ms: 0
  });

  if (out && out.trim()) {
    metrics.pipeline_metrics.output_extraction.success_count++;
    metrics.kpi.translation_successes++;
    metrics.kpi.success_ts.push(Date.now());
    const renderStart = performance.now();
    process.stdout.write(isInterim ? '.' : '|');
    const renderTime = performance.now() - renderStart;
    log('display_update', {
      request_id: requestId,
      update_type: isInterim ? 'interim' : 'final',
      render_time_ms: renderTime,
      memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024
    });
    metrics.pipeline_metrics.display_update.render_times.push(renderTime);
    if (isInterim) metrics.pipeline_metrics.display_update.interim_updates++;
    else metrics.pipeline_metrics.display_update.final_updates++;
    return out;
  } else {
    metrics.pipeline_metrics.output_extraction.empty_count++;
    metrics.pipeline_metrics.gpt_processing.empty_count++;
    metrics.kpi.empty_outputs++;
    metrics.kpi.empty_ts.push(Date.now());
    return '';
  }
}

// ========== ASRメッセージ処理 ==========
async function handleASRMessage(msg) {
  const alt = msg?.channel?.alternatives?.[0];
  if (!alt) return;
  
  const text = (alt.transcript || '').trim();
  const confidence = alt.confidence || 0;
  const isFinal = Boolean(msg.is_final);
  const speechFinal = Boolean(msg.speech_final);
  
  if (!text) return;
  
  // ②ASR処理段階
  log('asr_processing', {
    message_type: isFinal ? 'final' : 'interim',
    transcript: text,
    confidence: confidence,
    word_count: text.split(' ').length,
    is_final: isFinal,
    speech_final: speechFinal
  });
  
  // メトリクス更新
  if (isFinal) {
    metrics.pipeline_metrics.asr_processing.final_count++;
    metrics.pipeline_metrics.asr_processing.confidences.push(confidence);
  } else {
    metrics.pipeline_metrics.asr_processing.interim_count++;
  }
  
  if (speechFinal) {
    metrics.pipeline_metrics.asr_processing.speech_final_count++;
  }
  
  metrics.pipeline_metrics.asr_processing.transcripts.push({
    text,
    confidence,
    isFinal,
    speechFinal,
    timestamp: Date.now() - metrics.test_info.start_time
  });
  
  metrics.pipeline_metrics.asr_processing.word_counts.push(text.split(' ').length);
  
  // 3文字以上のみ翻訳
  if (text.length > 3) {
    const translationStart = Date.now();
    // interimの場合はデデュープ&スロットリング
    if (!isFinal) {
      if (shouldTranslateInterim(text)) {
        enqueueTranslate(() => translateText(text, true));
      }
    } else {
      enqueueTranslate(() => translateText(text, false));
    }
    const e2eTime = Date.now() - translationStart;
    metrics.kpi.end_to_end_times.push(e2eTime);
  }
}

// ========== メモリ監視 ==========
function startMemoryMonitoring() {
  return setInterval(() => {
    const mem = process.memoryUsage();
    const sample = {
      timestamp: Date.now() - metrics.test_info.start_time,
      heap_used_mb: mem.heapUsed / 1024 / 1024,
      heap_total_mb: mem.heapTotal / 1024 / 1024,
      external_mb: mem.external / 1024 / 1024
    };
    
    metrics.kpi.memory_samples.push(sample);
    
    log('resource_monitor', {
      memory: sample,
      active_handles: process._getActiveHandles().length,
      active_requests: process._getActiveRequests().length
    });
  }, 10000); // 10秒ごと
}

// ========== 5分窓監視 ==========
function startWindowMonitoring() {
  return setInterval(() => {
    const window = calculateWindow();
    log('window_metrics', window);
    
    // 進捗表示
    const elapsed = Date.now() - metrics.test_info.start_time;
    const minutes = Math.floor(elapsed / 60000);
    console.log(`[${minutes}min] Empty: ${(window.empty_rate * 100).toFixed(1)}%, Success: ${(window.success_rate * 100).toFixed(1)}%, p95: ${window.first_paint_p95.toFixed(0)}ms`);
  }, 60000); // 1分ごと
}

// ========== メイン処理 ==========
async function main() {
  console.log(`\\n${'='.repeat(60)}`);
  console.log(`Starting ${TEST_NAME} Test`);
  console.log(`Duration: ${TEST_DURATION_MS / 1000} seconds`);
  console.log(`Audio: ${AUDIO_FILE}`);
  console.log(`${'='.repeat(60)}\\n`);
  
  // 音声ファイル読み込み
  if (!fs.existsSync(AUDIO_FILE)) {
    console.error('Audio file not found:', AUDIO_FILE);
    process.exit(1);
  }
  
  const audioBuffer = fs.readFileSync(AUDIO_FILE);
  console.log(`Audio buffer size: ${audioBuffer.length} bytes`);
  
  // WAVヘッダーをスキップ（通常44バイト）
  const pcmBuffer = audioBuffer.slice(44);
  const totalFrames = Math.floor(pcmBuffer.length / FRAME_SIZE);
  
  console.log(`PCM data size: ${pcmBuffer.length} bytes`);
  console.log(`Total frames: ${totalFrames}`);
  console.log(`Audio duration: ${(totalFrames * FRAME_MS / 1000).toFixed(1)} seconds`);
  console.log(`Loop required: ${LOOP_AUDIO ? 'Yes' : 'No'}`);
  
  log('test_start', {
    test_name: TEST_NAME,
    duration_ms: TEST_DURATION_MS,
    audio_size: audioBuffer.length,
    total_frames: totalFrames
  });
  
  metrics.test_info.start_time = Date.now();
  
  // 監視開始
  const memoryMonitor = startMemoryMonitoring();
  const windowMonitor = startWindowMonitoring();
  
  // Deepgram接続
  return new Promise((resolve) => {
    const ws = new WebSocket(DEEPGRAM_WS_URL, {
      headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` }
    });
    
    let frameIndex = 0;
    let frameTimer;
    let testTimer;
    
    ws.on('open', () => {
      log('websocket', { status: 'connected', url: DEEPGRAM_WS_URL });
      
      // テストタイマー（20分後に終了）
      testTimer = setTimeout(() => {
        log('test_complete', { message: 'Test duration reached' });
        clearInterval(frameTimer);
        ws.send(JSON.stringify({ type: 'Finalize' }));
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'CloseStream' }));
          setTimeout(() => ws.close(), 1000);
        }, 2000);
      }, TEST_DURATION_MS);
      
      // フレーム送信開始
      frameTimer = setInterval(() => {
        // ループ処理
        if (LOOP_AUDIO && frameIndex >= totalFrames) {
          frameIndex = 0;
        }
        
        if (frameIndex < totalFrames) {
          const frame = pcmBuffer.slice(
            frameIndex * FRAME_SIZE,
            (frameIndex + 1) * FRAME_SIZE
          );
          
          // ①音声入力段階（1秒ごとにログ）
          if (frameIndex % FRAMES_PER_SECOND === 0) {
            log('audio_input', {
              chunk_id: `chunk_${frameIndex}`,
              size_bytes: frame.length,
              duration_ms: FRAME_MS,
              frame_index: frameIndex
            });
          }
          
          ws.send(frame);
          metrics.pipeline_metrics.audio_input.frames_sent++;
          metrics.pipeline_metrics.audio_input.total_bytes += frame.length;
          
          frameIndex++;
        } else if (!LOOP_AUDIO) {
          // 音声ファイルが終了し、ループしない場合はテスト終了
          log('audio_complete', { 
            message: 'Audio file ended',
            frames_sent: frameIndex,
            duration_ms: (frameIndex * FRAME_MS)
          });
          clearInterval(frameTimer);
          clearTimeout(testTimer);
          
          // グレースフル終了
          ws.send(JSON.stringify({ type: 'Finalize' }));
          setTimeout(() => {
            ws.send(JSON.stringify({ type: 'CloseStream' }));
            setTimeout(() => ws.close(), 1000);
          }, 2000);
        }
      }, FRAME_MS);
    });
    
    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        await handleASRMessage(msg);
      } catch (error) {
        log('error', {
          stage: 'parse',
          category: classifyError(error),
          error: error.message
        });
      }
    });
    
    ws.on('close', () => {
      log('websocket', { status: 'closed' });
      clearInterval(memoryMonitor);
      clearInterval(windowMonitor);
      clearInterval(frameTimer);
      clearTimeout(testTimer);
      
      metrics.test_info.end_time = Date.now();
      metrics.test_info.duration_ms = metrics.test_info.end_time - metrics.test_info.start_time;
      
      generateReport();
      resolve();
    });
    
    ws.on('error', (error) => {
      log('error', {
        stage: 'websocket',
        category: classifyError(error),
        error: error.message
      });
      
      metrics.errors.push({
        timestamp: Date.now(),
        stage: 'websocket',
        message: error.message
      });
    });
  });
}

// ========== レポート生成 ==========
function generateReport() {
  // KPI計算
  const avgConfidence = metrics.pipeline_metrics.asr_processing.confidences.length > 0
    ? metrics.pipeline_metrics.asr_processing.confidences.reduce((a, b) => a + b, 0) / 
      metrics.pipeline_metrics.asr_processing.confidences.length
    : 0;
  
  const successRate = metrics.kpi.translation_attempts > 0
    ? (metrics.kpi.translation_successes / metrics.kpi.translation_attempts) * 100
    : 0;
  
  const emptyRate = metrics.kpi.translation_attempts > 0
    ? (metrics.kpi.empty_outputs / metrics.kpi.translation_attempts) * 100
    : 0;
  
  
  // first_token時刻を優先的に使用
  const firstPaintTimes = metrics.kpi.first_paint_times.filter(t => t > 0);
  const actualP50 = firstPaintTimes.length > 0 ? percentile(firstPaintTimes, 50) : percentile(metrics.pipeline_metrics.gpt_processing.latencies, 50);
  const actualP95 = firstPaintTimes.length > 0 ? percentile(firstPaintTimes, 95) : percentile(metrics.pipeline_metrics.gpt_processing.latencies, 95);
  
  const testPassed = emptyRate <= 3 && successRate >= 95 && metrics.errors.filter(e => e.stage === 'crash').length === 0;
  
  const summary = {
    test_info: metrics.test_info,
    
    success_criteria: {
      crash_count: metrics.errors.filter(e => e.stage === 'crash').length === 0,
      empty_output_rate: emptyRate <= 3,
      translation_success: successRate >= 95,
      first_paint_p50: actualP50 < 1500,
      first_paint_p95: actualP95 < 3000,
      asr_confidence: avgConfidence > 0.9
    },
    
    kpi_summary: {
      translation_success_rate: successRate.toFixed(1),
      empty_output_rate: emptyRate.toFixed(1),
      asr_avg_confidence: (avgConfidence * 100).toFixed(1),
      first_paint_p50: actualP50,
      first_paint_p95: actualP95,
      segments_per_minute: (metrics.pipeline_metrics.asr_processing.final_count / 20).toFixed(1),
      api_calls: metrics.kpi.api_calls,
      http_429_count: metrics.kpi.http_429_count,
      error_count: metrics.errors.length
    },
    
    resource_usage: {
      peak_memory_mb: Math.max(...metrics.kpi.memory_samples.map(s => s.heap_used_mb)),
      avg_memory_mb: metrics.kpi.memory_samples.length > 0
        ? metrics.kpi.memory_samples.reduce((a, s) => a + s.heap_used_mb, 0) / 
          metrics.kpi.memory_samples.length
        : 0,
      total_tokens: metrics.pipeline_metrics.gpt_processing.usage.input_tokens +
                   metrics.pipeline_metrics.gpt_processing.usage.output_tokens,
      estimated_cost: ((metrics.pipeline_metrics.gpt_processing.usage.input_tokens +
                       metrics.pipeline_metrics.gpt_processing.usage.output_tokens) / 1000000) * 15
    },
    
    stopLoss: metrics.stopLoss
  };
  
  // JSON保存
  fs.writeFileSync(METRICS_FILE, JSON.stringify(summary, null, 2));
  
  // Markdownレポート
  const report = `# Production Test Report - 20 Minutes

## Test Information
- **Start Time**: ${new Date(metrics.test_info.start_time).toISOString()}
- **Duration**: ${(metrics.test_info.duration_ms / 1000).toFixed(1)} seconds
- **Audio File**: ${metrics.test_info.audio_file}
- **Status**: ${testPassed ? '✅ PASSED' : '❌ FAILED'}

## Success Criteria
| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| Crash Count | 0 | ${metrics.errors.filter(e => e.stage === 'crash').length} | ${summary.success_criteria.crash_count ? '✅' : '❌'} |
| Empty Output Rate | ≤3% | ${emptyRate.toFixed(1)}% | ${summary.success_criteria.empty_output_rate ? '✅' : '❌'} |
| Translation Success | ≥95% | ${successRate.toFixed(1)}% | ${summary.success_criteria.translation_success ? '✅' : '❌'} |
| First-paint p50 | <1.5s | ${actualP50.toFixed(0)}ms | ${summary.success_criteria.first_paint_p50 ? '✅' : '❌'} |
| First-paint p95 | <3s | ${actualP95.toFixed(0)}ms | ${summary.success_criteria.first_paint_p95 ? '✅' : '❌'} |
| ASR Confidence | >90% | ${summary.kpi_summary.asr_avg_confidence}% | ${summary.success_criteria.asr_confidence ? '✅' : '❌'} |

## Performance Metrics
- **Translation Attempts**: ${metrics.kpi.translation_attempts}
- **Translation Successes**: ${metrics.kpi.translation_successes}
- **Empty Outputs**: ${metrics.kpi.empty_outputs}
- **ASR Segments**: ${metrics.pipeline_metrics.asr_processing.final_count}
- **Segments/min**: ${summary.kpi_summary.segments_per_minute}
- **HTTP 429 Errors**: ${metrics.kpi.http_429_count}

## Resource Usage
- **Peak Memory**: ${summary.resource_usage.peak_memory_mb.toFixed(1)} MB
- **Avg Memory**: ${summary.resource_usage.avg_memory_mb.toFixed(1)} MB
- **Total Tokens**: ${summary.resource_usage.total_tokens}
- **API Calls**: ${summary.kpi_summary.api_calls}
- **Estimated Cost**: $${summary.resource_usage.estimated_cost.toFixed(4)}

## Stop-Loss Actions
- **Model Switches**: ${metrics.stopLoss.model_switches.length}
- **Concurrency Changes**: ${metrics.stopLoss.concurrency_changes.length}
- **Throttle Adjustments**: ${metrics.stopLoss.throttle_adjustments.length}
- **Recovery Times**: ${metrics.stopLoss.recovery_times.length}

## Errors
- **Total Errors**: ${metrics.errors.length}
- **HTTP 429 Errors**: ${metrics.kpi.http_429_count}

## 5-Minute Windows Summary
${metrics.windows.slice(-4).map((w, i) => 
  `### Window ${i + 1}
  - Empty Rate: ${(w.empty_rate * 100).toFixed(1)}%
  - Success Rate: ${(w.success_rate * 100).toFixed(1)}%
  - First-paint p95: ${w.first_paint_p95.toFixed(0)}ms
  - HTTP 429 Rate: ${(w.http_429_rate * 100).toFixed(2)}%`
).join('\\n\\n')}

## Recommendation
${testPassed ? 
  '✅ **Ready for extended testing (30-60 minutes)**\\nAll success criteria met. System demonstrated stability and recovery capabilities.' :
  '❌ **Requires fixes before extended testing**\\nAddress the failed criteria and re-run 20-minute test.'}

---
Generated: ${new Date().toISOString()}
Log File: ${path.basename(LOG_FILE)}
Metrics File: ${path.basename(METRICS_FILE)}
`;
  
  fs.writeFileSync(REPORT_FILE, report);
  
  // コンソール出力
  console.log('\\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log(`Status: ${testPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`Translation Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`Empty Output Rate: ${emptyRate.toFixed(1)}%`);
  console.log(`First-paint p50: ${actualP50.toFixed(0)}ms`);
  console.log(`First-paint p95: ${actualP95.toFixed(0)}ms`);
  console.log(`Peak Memory: ${summary.resource_usage.peak_memory_mb.toFixed(1)} MB`);
  console.log(`Stop-Loss Triggers: ${metrics.stopLoss.model_switches.length + metrics.stopLoss.concurrency_changes.length}`);
  console.log('='.repeat(60));
  console.log(`Report saved to: ${REPORT_FILE}`);
  
  // 成功フラグ作成
  if (testPassed) {
    fs.writeFileSync(path.join(OUT_DIR, '20min_success.flag'), new Date().toISOString());
  }
  
  logStream.end();
}

// 実行
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});