#!/usr/bin/env node
/**
 * test-20min-production-ipc.js
 * 
 * IPC-enabled version of test-20min-production-detailed.js
 * Sends real-time translation data to Electron UI
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// ========== IPC Setup ==========
const IS_IPC_MODE = process.env.IPC_MODE === 'true' || process.argv.includes('--ipc');

function sendIPC(type, data) {
  if (IS_IPC_MODE && process.send) {
    try {
      process.send({ type, data, timestamp: Date.now() });
    } catch (error) {
      console.error('IPC send error:', error);
    }
  }
}

// Handle parent process messages
if (IS_IPC_MODE && process.on) {
  process.on('message', (message) => {
    if (message.type === 'stop') {
      console.log('Received stop signal from parent');
      endTest();
    } else if (message.type === 'translate-user-input') {
      // Handle user input translation request
      handleUserInputTranslation(message);
    }
  });
}

// ========== Configuration ==========
const TEST_NAME = '20min-production-ipc';
const TEST_DURATION_MS = 1200 * 1000;  // 20 minutes
const AUDIO_FILE = process.argv.find(arg => arg.startsWith('--audio='))?.split('=')[1] || './sample_voice/Hayes.wav';

// Frame settings
const FRAME_MS = 20;
const FRAME_SIZE = 640;

// Deepgram params
const DG_PARAMS = new URLSearchParams({
  encoding: 'linear16',
  sample_rate: '16000',
  interim_results: 'true',
  endpointing: '800',
  utterance_end_ms: '1000',
  punctuate: 'true',
  diarize: 'false',
  model: 'nova-3',
  version: 'latest'
});

const DEEPGRAM_WS_URL = `wss://api.deepgram.com/v1/listen?${DG_PARAMS}`;

// OpenAI setup
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Import helper functions
const {
  generateSummary,
  translateSummary,
  generateVocabulary,
  generateFinalReport
} = require('./test-gpt5-helpers.js');

// Dynamic config
const MAX_TOKENS = parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500');
const CURRENT_MODEL = process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano';

// ========== State Management ==========
let audioBuffer;
let frameIndex = 0;
let ws;
let lastInterimText = '';
let lastInterimTime = 0;
let currentMinute = 0;
let transcriptBuffer = [];
let lastSummaryMinute = -1;
let startTime = Date.now();
let isRunning = false;

// Translation queue
const translationQueue = [];
let activeTranslations = 0;
const CONCURRENCY_LIMIT = 3;

// ========== Audio Loading ==========
function loadAudio() {
  try {
    const audioData = fs.readFileSync(AUDIO_FILE);
    audioBuffer = audioData.slice(44); // Skip WAV header
    const totalFrames = Math.floor(audioBuffer.length / FRAME_SIZE);
    
    console.log(`✅ Audio loaded: ${audioBuffer.length} bytes, ${totalFrames} frames`);
    sendIPC('audio-loaded', { frames: totalFrames, bytes: audioBuffer.length });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load audio:', error.message);
    sendIPC('error', { stage: 'audio-load', error: error.message });
    return false;
  }
}

// ========== Deepgram WebSocket ==========
function connectDeepgram() {
  ws = new WebSocket(DEEPGRAM_WS_URL, {
    headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}` }
  });

  ws.on('open', () => {
    console.log('🔌 Deepgram connected');
    sendIPC('deepgram-connected', {});
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
        
        // Send ASR result via IPC
        sendIPC(isFinal ? 'asr-final' : 'asr-interim', {
          text,
          confidence,
          timestamp: Date.now()
        });
        
        // Process translation
        if (isFinal) {
          transcriptBuffer.push(text);
          enqueueTranslation(text, false);
        } else if (shouldProcessInterim(text)) {
          enqueueTranslation(text, true);
        }
        
        // Check for summary generation
        checkForSummary();
      }
    } catch (error) {
      console.error('ASR error:', error);
      sendIPC('error', { stage: 'asr', error: error.message });
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    sendIPC('error', { stage: 'websocket', error: error.message });
  });

  ws.on('close', () => {
    console.log('🔌 Deepgram disconnected');
    sendIPC('deepgram-disconnected', {});
  });
}

// ========== Audio Streaming ==========
function startAudioStream() {
  isRunning = true;
  const interval = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isRunning) {
      clearInterval(interval);
      return;
    }
    
    if (frameIndex >= Math.floor(audioBuffer.length / FRAME_SIZE)) {
      clearInterval(interval);
      ws.close();
      endTest();
      return;
    }
    
    const frame = audioBuffer.slice(
      frameIndex * FRAME_SIZE,
      (frameIndex + 1) * FRAME_SIZE
    );
    
    ws.send(frame);
    frameIndex++;
  }, FRAME_MS);
  
  // Timeout
  setTimeout(() => {
    clearInterval(interval);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    endTest();
  }, TEST_DURATION_MS);
}

// ========== Translation Processing ==========
function shouldProcessInterim(text) {
  const now = Date.now();
  if (now - lastInterimTime < 500) return false;
  if (text === lastInterimText) return false;
  if (text.length < 8) return false;
  
  lastInterimText = text;
  lastInterimTime = now;
  return true;
}

function enqueueTranslation(text, isInterim) {
  translationQueue.push({ text, isInterim });
  processTranslationQueue();
}

async function processTranslationQueue() {
  while (translationQueue.length > 0 && activeTranslations < CONCURRENCY_LIMIT) {
    const task = translationQueue.shift();
    activeTranslations++;
    
    translateText(task.text, task.isInterim).finally(() => {
      activeTranslations--;
      processTranslationQueue();
    });
  }
}

async function translateText(text, isInterim) {
  const startTime = performance.now();
  let firstTokenTime = null;
  let translation = '';
  
  try {
    // Notify translation start
    sendIPC('translation-start', { 
      original: text,
      isInterim,
      timestamp: Date.now() 
    });
    
    const stream = await openai.responses.stream({
      model: CURRENT_MODEL,
      input: [
        { role: 'system', content: 'Translate English to Japanese. Output only the translation.' },
        { role: 'user', content: text }
      ],
      max_output_tokens: MAX_TOKENS,
      reasoning: { effort: 'minimal' }
    });
    
    for await (const chunk of stream) {
      if (chunk.type === 'response.output_text.delta' && chunk.delta) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now() - startTime;
          // Send first paint
          sendIPC('first-paint', { 
            elapsed: firstTokenTime,
            timestamp: Date.now() 
          });
        }
        
        translation += chunk.delta;
        
        // Send delta
        sendIPC('translation-delta', {
          delta: chunk.delta,
          timestamp: Date.now()
        });
      }
    }
    
    const totalTime = performance.now() - startTime;
    
    // Send completion
    if (!isInterim) {
      sendIPC('segment-complete', {
        original: text,
        translation,
        firstPaint: firstTokenTime,
        totalTime,
        timestamp: Date.now()
      });
    }
    
    console.log(`✅ Translation: "${translation.substring(0, 50)}..." (${totalTime.toFixed(0)}ms)`);
    
  } catch (error) {
    console.error('Translation error:', error.message);
    sendIPC('error', { 
      stage: 'translation', 
      error: error.message,
      text: text.substring(0, 100)
    });
  }
}

// ========== Summary Processing ==========
async function checkForSummary() {
  const currentTime = Date.now();
  const minute = Math.floor((currentTime - startTime) / 60000);
  
  if (minute >= 10 && minute % 10 === 0 && minute !== lastSummaryMinute) {
    lastSummaryMinute = minute;
    
    const last10MinText = transcriptBuffer.join(' ');
    transcriptBuffer = []; // Clear buffer
    
    console.log(`🔄 Processing 10-minute summary at minute ${minute}...`);
    
    try {
      // Generate summary
      const englishSummary = await generateSummary(last10MinText);
      
      // Translate and extract vocabulary in parallel
      const [japaneseSummary, vocabulary] = await Promise.all([
        translateSummary(englishSummary),
        generateVocabulary(last10MinText)
      ]);
      
      // Send summary update
      sendIPC('summary-update', {
        english: englishSummary,
        japanese: japaneseSummary,
        vocabulary,
        timeRange: `${minute - 10}-${minute} min`,
        timestamp: Date.now()
      });
      
      console.log(`📝 Summary generated for minutes ${minute - 10}-${minute}`);
      
    } catch (error) {
      console.error('Summary processing failed:', error.message);
      sendIPC('error', { 
        stage: 'summary', 
        minute, 
        error: error.message 
      });
    }
  }
}

// ========== User Input Translation ==========
async function handleUserInputTranslation(message) {
  const { requestId, data } = message;
  const { text, from, to } = data;
  
  try {
    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      input: [
        { role: 'system', content: `Translate from ${from} to ${to}. Output only the translation.` },
        { role: 'user', content: text }
      ],
      max_output_tokens: 500
    });
    
    const translated = response.output_text || '';
    
    // Send response back
    if (process.send) {
      process.send({
        type: 'user-input-translated',
        requestId,
        data: { original: text, translated }
      });
    }
    
    sendIPC('user-input-translated', {
      original: text,
      translated,
      from,
      to
    });
    
  } catch (error) {
    console.error('User input translation error:', error);
    if (process.send) {
      process.send({
        type: 'user-input-translated',
        requestId,
        data: { original: text, translated: '', error: error.message }
      });
    }
  }
}

// ========== Test End ==========
async function endTest() {
  if (!isRunning) return;
  isRunning = false;
  
  console.log('📊 Ending test...');
  
  // Process final summary if needed
  if (transcriptBuffer.length > 0) {
    await checkForSummary();
  }
  
  // Generate final report
  try {
    const allTranscripts = transcriptBuffer.join(' ');
    const finalReport = await generateFinalReport(allTranscripts, '', []);
    
    sendIPC('final-report', {
      report: finalReport,
      timestamp: Date.now()
    });
    
    console.log('✅ Final report generated');
  } catch (error) {
    console.error('Final report failed:', error);
  }
  
  sendIPC('test-complete', {
    duration: Date.now() - startTime,
    timestamp: Date.now()
  });
  
  console.log('✅ Test completed');
  
  // Exit if not in IPC mode
  if (!IS_IPC_MODE) {
    process.exit(0);
  }
}

// ========== Main ==========
async function main() {
  console.log('🚀 Starting IPC-enabled translation test');
  console.log(`📁 Audio file: ${AUDIO_FILE}`);
  console.log(`⚙️ IPC mode: ${IS_IPC_MODE}`);
  
  startTime = Date.now();
  
  if (!loadAudio()) {
    console.error('Failed to load audio');
    process.exit(1);
  }
  
  connectDeepgram();
}

// Start the test
main().catch(error => {
  console.error('Fatal error:', error);
  sendIPC('fatal-error', { error: error.message });
  process.exit(1);
});