#!/usr/bin/env node
/**
 * test-1min-summary.js
 * 1分間の短縮テストで③④⑤⑥の動作を確認
 * 10秒ごとに要約を生成して動作確認
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// ========== 設定 ==========
const TEST_NAME = '1min-summary-test';
const TEST_DURATION_MS = 60 * 1000;  // 1分
const AUDIO_FILE = './sample_voice/Hayes.wav';
const SUMMARY_INTERVAL_SECONDS = 10;  // 10秒ごとに要約（テスト用）

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

// OpenAI
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ③④⑤⑥のヘルパー関数をインポート
const {
  generateSummary,
  translateSummary,
  generateVocabulary,
  generateFinalReport
} = require('./test-gpt5-helpers.js');

// 出力ディレクトリ
const OUT_DIR = path.resolve('test-results');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const RESULT_FILE = path.join(OUT_DIR, `${TEST_NAME}_${RUN_ID}.json`);

// ========== データ構造 ==========
const testData = {
  startTime: new Date().toISOString(),
  transcripts: [],
  summaries: [],
  finalReport: null,
  metrics: {
    summaryCount: 0,
    summaryTimes: [],
    translationTimes: [],
    vocabularyTimes: [],
    reportTime: null
  }
};

// ========== State ==========
let audioBuffer;
let frameIndex = 0;
let ws;
let transcriptBuffer = [];
let lastSummarySecond = -1;
let startTime = Date.now();
let isRunning = false;

// ========== Audio Loading ==========
function loadAudio() {
  try {
    const audioData = fs.readFileSync(AUDIO_FILE);
    audioBuffer = audioData.slice(44); // Skip WAV header
    const totalFrames = Math.floor(audioBuffer.length / FRAME_SIZE);
    console.log(`✅ Audio loaded: ${totalFrames} frames`);
    return true;
  } catch (error) {
    console.error('❌ Failed to load audio:', error.message);
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
    startAudioStream();
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'Results') {
        const alt = msg.channel?.alternatives?.[0];
        if (!alt) return;
        
        const text = alt.transcript;
        const isFinal = msg.is_final;
        
        if (!text) return;
        
        if (isFinal) {
          transcriptBuffer.push(text);
          testData.transcripts.push({
            text,
            timestamp: Date.now() - startTime,
            confidence: alt.confidence
          });
          
          // Check for summary generation
          await checkForSummary();
        }
      }
    } catch (error) {
      console.error('ASR error:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });

  ws.on('close', () => {
    console.log('🔌 Deepgram disconnected');
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

// ========== Summary Processing ==========
async function checkForSummary() {
  const currentTime = Date.now();
  const second = Math.floor((currentTime - startTime) / 1000);
  
  if (second >= SUMMARY_INTERVAL_SECONDS && 
      second % SUMMARY_INTERVAL_SECONDS === 0 && 
      second !== lastSummarySecond) {
    
    lastSummarySecond = second;
    
    const textToSummarize = transcriptBuffer.join(' ');
    transcriptBuffer = []; // Clear buffer
    
    if (!textToSummarize || textToSummarize.trim().length < 10) {
      console.log(`⏭️ Skipping summary at ${second}s - insufficient text`);
      return;
    }
    
    console.log(`\n🔄 Processing summary at ${second} seconds...`);
    console.log(`   Text length: ${textToSummarize.length} chars`);
    
    try {
      // ③ Generate English summary
      console.log('   ③ Generating English summary...');
      const summaryStart = Date.now();
      const englishSummary = await generateSummary(textToSummarize);
      const summaryTime = Date.now() - summaryStart;
      testData.metrics.summaryTimes.push(summaryTime);
      console.log(`   ✅ Summary generated in ${summaryTime}ms`);
      console.log(`      "${englishSummary.substring(0, 80)}..."`);
      
      // ④ Translate summary to Japanese
      console.log('   ④ Translating summary to Japanese...');
      const translateStart = Date.now();
      const japaneseSummary = await translateSummary(englishSummary);
      const translateTime = Date.now() - translateStart;
      testData.metrics.translationTimes.push(translateTime);
      console.log(`   ✅ Translation completed in ${translateTime}ms`);
      console.log(`      "${japaneseSummary.substring(0, 80)}..."`);
      
      // ⑤ Extract vocabulary
      console.log('   ⑤ Extracting vocabulary...');
      const vocabStart = Date.now();
      const vocabulary = await generateVocabulary(textToSummarize);
      const vocabTime = Date.now() - vocabStart;
      testData.metrics.vocabularyTimes.push(vocabTime);
      console.log(`   ✅ Vocabulary extracted in ${vocabTime}ms`);
      console.log(`      ${vocabulary.length} terms found`);
      if (vocabulary.length > 0) {
        console.log(`      First 3: ${vocabulary.slice(0, 3).join(', ')}`);
      }
      
      // Save summary data
      testData.summaries.push({
        timePoint: `${second}s`,
        textLength: textToSummarize.length,
        englishSummary,
        japaneseSummary,
        vocabulary,
        processingTimes: {
          summary: summaryTime,
          translation: translateTime,
          vocabulary: vocabTime
        }
      });
      
      testData.metrics.summaryCount++;
      console.log(`   📝 Summary #${testData.metrics.summaryCount} complete\n`);
      
    } catch (error) {
      console.error(`   ❌ Summary processing failed:`, error.message);
    }
  }
}

// ========== Test End ==========
async function endTest() {
  if (!isRunning) return;
  isRunning = false;
  
  console.log('\n📊 Ending test...');
  
  // Process final summary if needed
  if (transcriptBuffer.length > 0) {
    console.log('Processing final summary...');
    await checkForSummary();
  }
  
  // ⑥ Generate final report
  try {
    console.log('\n⑥ Generating final report...');
    const allTranscripts = testData.transcripts.map(t => t.text).join(' ');
    const allSummaries = testData.summaries.map(s => s.englishSummary).join('\n\n');
    const allVocabulary = [...new Set(
      testData.summaries.flatMap(s => s.vocabulary || [])
    )];
    
    const reportStart = Date.now();
    const finalReport = await generateFinalReport(
      allTranscripts,
      allSummaries,
      allVocabulary
    );
    const reportTime = Date.now() - reportStart;
    testData.metrics.reportTime = reportTime;
    
    // ⑥の和訳も生成
    console.log('   Translating final report to Japanese...');
    const reportTranslateStart = Date.now();
    const japaneseReport = await translateSummary(finalReport);
    const reportTranslateTime = Date.now() - reportTranslateStart;
    
    testData.finalReport = {
      english: finalReport,
      japanese: japaneseReport,
      processingTime: reportTime,
      translationTime: reportTranslateTime
    };
    
    console.log(`✅ Final report generated in ${reportTime}ms (translation: ${reportTranslateTime}ms)`);
    console.log(`   English length: ${finalReport.length} chars`);
    console.log(`   Japanese length: ${japaneseReport.length} chars`);
  } catch (error) {
    console.error('Final report failed:', error);
  }
  
  // Save results
  fs.writeFileSync(RESULT_FILE, JSON.stringify(testData, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ TEST COMPLETE');
  console.log('='.repeat(50));
  console.log('📊 Results:');
  console.log(`  Transcripts collected: ${testData.transcripts.length}`);
  console.log(`  Summaries generated: ${testData.metrics.summaryCount}`);
  console.log(`  - With English summaries: ${testData.summaries.filter(s => s.englishSummary).length}`);
  console.log(`  - With Japanese translations: ${testData.summaries.filter(s => s.japaneseSummary).length}`);
  console.log(`  - With vocabulary: ${testData.summaries.filter(s => s.vocabulary && s.vocabulary.length > 0).length}`);
  console.log(`  Final report: ${testData.finalReport ? '✅' : '❌'}`);
  console.log(`  - English: ${testData.finalReport?.english ? '✅' : '❌'}`);
  console.log(`  - Japanese: ${testData.finalReport?.japanese ? '✅' : '❌'}`);
  
  if (testData.metrics.summaryTimes.length > 0) {
    const avgSummaryTime = testData.metrics.summaryTimes.reduce((a, b) => a + b, 0) / testData.metrics.summaryTimes.length;
    const avgTranslateTime = testData.metrics.translationTimes.reduce((a, b) => a + b, 0) / testData.metrics.translationTimes.length;
    const avgVocabTime = testData.metrics.vocabularyTimes.reduce((a, b) => a + b, 0) / testData.metrics.vocabularyTimes.length;
    
    console.log('\n⏱️ Performance:');
    console.log(`  ③ Avg summary time: ${avgSummaryTime.toFixed(0)}ms`);
    console.log(`  ④ Avg translation time: ${avgTranslateTime.toFixed(0)}ms`);
    console.log(`  ⑤ Avg vocabulary time: ${avgVocabTime.toFixed(0)}ms`);
    console.log(`  ⑥ Final report time: ${testData.metrics.reportTime}ms`);
  }
  
  console.log(`\n📁 Results saved to: ${RESULT_FILE}`);
  console.log('='.repeat(50));
  
  process.exit(0);
}

// ========== Main ==========
async function main() {
  console.log('🚀 Starting 1-minute summary test');
  console.log(`📁 Audio file: ${AUDIO_FILE}`);
  console.log(`⏱️ Summary interval: every ${SUMMARY_INTERVAL_SECONDS} seconds`);
  console.log(`📊 Testing ③④⑤⑥ functionality\n`);
  
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
  process.exit(1);
});