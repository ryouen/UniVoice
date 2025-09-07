#!/usr/bin/env node
/**
 * test-20min-with-5min-summaries.js
 * 
 * 20分テストで5分ごとに要約を生成
 * ③定期要約（5分ごと）
 * ④要約翻訳（英→日）
 * ⑤語彙抽出
 * ⑥最終レポート（英語＋日本語）
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// ========== 設定 ==========
const TEST_NAME = '20min-with-5min-summaries';
const TEST_DURATION_MS = 20 * 60 * 1000;  // 20分
const AUDIO_FILE = './sample_voice/Hayes.wav';
const SUMMARY_INTERVAL_MINUTES = 5;  // 5分ごとに要約

// Frame settings
const FRAME_MS = 20;
const FRAME_SIZE = 640;
const FRAMES_PER_SECOND = 50;

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

// Helper functions
const {
  generateSummary,
  translateSummary,
  generateVocabulary,
  generateFinalReport
} = require('./test-gpt5-helpers.js');

// Output directory
const OUT_DIR = path.resolve('test-results');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const RESULT_FILE = path.join(OUT_DIR, `${TEST_NAME}_${RUN_ID}.json`);
const REPORT_FILE = path.join(OUT_DIR, `${TEST_NAME}_report_${RUN_ID}.md`);

// ========== Data Structure ==========
const testData = {
  testInfo: {
    runId: RUN_ID,
    startTime: new Date().toISOString(),
    audioFile: AUDIO_FILE,
    summaryInterval: SUMMARY_INTERVAL_MINUTES
  },
  
  // ②ASR
  transcripts: [],
  timeline: [],  // 分単位の転写
  
  // ③④⑤要約
  summaries: [],  // 5分ごとの要約
  
  // ⑥最終レポート
  finalReport: {
    english: null,
    japanese: null
  },
  
  // メトリクス
  metrics: {
    summaryCount: 0,
    summaryTimes: [],
    translationTimes: [],
    vocabularyTimes: [],
    finalReportTime: null,
    finalReportTranslationTime: null,
    totalTranscripts: 0
  }
};

// ========== State ==========
let audioBuffer;
let frameIndex = 0;
let ws;
let transcriptBuffer = [];
let lastSummaryMinute = -1;
let currentMinute = 0;
let minuteTranscript = '';
let startTime = Date.now();
let isRunning = false;

// Translation queue
const translationQueue = [];
let activeTranslations = 0;
const CONCURRENCY_LIMIT = 3;

// ========== Utilities ==========
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatTimeRange(startMinute, endMinute) {
  return `${formatTime(startMinute * 60000)}-${formatTime(endMinute * 60000)}`;
}

// ========== Audio Loading ==========
function loadAudio() {
  try {
    const audioData = fs.readFileSync(AUDIO_FILE);
    audioBuffer = audioData.slice(44); // Skip WAV header
    const totalFrames = Math.floor(audioBuffer.length / FRAME_SIZE);
    const durationSeconds = (totalFrames * FRAME_MS / 1000).toFixed(1);
    
    console.log(`✅ Audio loaded: ${audioBuffer.length} bytes, ${totalFrames} frames`);
    console.log(`   Duration: ${durationSeconds} seconds`);
    
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
        const confidence = alt.confidence || 0;
        const isFinal = msg.is_final;
        
        if (!text) return;
        
        const timestamp = Date.now();
        const minute = Math.floor((timestamp - startTime) / 60000);
        
        if (isFinal) {
          // Save transcript
          testData.transcripts.push({
            text,
            confidence,
            timestamp: timestamp - startTime,
            minute
          });
          testData.metrics.totalTranscripts++;
          
          // Add to buffer for summaries
          transcriptBuffer.push(text);
          minuteTranscript += text + ' ';
          
          // Translate for subtitles (not stored in this test)
          enqueueTranslation(text, confidence);
        }
        
        // Update timeline
        if (minute > currentMinute) {
          if (minuteTranscript) {
            testData.timeline.push({
              minute: currentMinute,
              timeRange: formatTimeRange(currentMinute, currentMinute + 1),
              transcript: minuteTranscript.trim(),
              wordCount: minuteTranscript.split(' ').length
            });
          }
          currentMinute = minute;
          minuteTranscript = '';
          
          // Check for 5-minute summary
          if (minute >= SUMMARY_INTERVAL_MINUTES && 
              minute % SUMMARY_INTERVAL_MINUTES === 0 && 
              minute !== lastSummaryMinute) {
            
            lastSummaryMinute = minute;
            await processSummary(minute);
          }
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

// ========== Summary Processing ==========
async function processSummary(minute) {
  const last5MinText = transcriptBuffer.join(' ');
  transcriptBuffer = []; // Clear buffer
  
  if (!last5MinText || last5MinText.trim().length < 50) {
    console.log(`⏭️ Skipping summary at minute ${minute} - insufficient text`);
    return;
  }
  
  console.log(`\n🔄 Processing ${SUMMARY_INTERVAL_MINUTES}-minute summary at minute ${minute}...`);
  console.log(`   Text length: ${last5MinText.length} chars`);
  
  try {
    // ③ Generate English summary
    console.log('   ③ Generating English summary...');
    const summaryStartTime = Date.now();
    const englishSummary = await generateSummary(last5MinText);
    const summaryTime = Date.now() - summaryStartTime;
    testData.metrics.summaryTimes.push(summaryTime);
    
    console.log(`   ✅ Summary generated in ${summaryTime}ms`);
    console.log(`      "${englishSummary.substring(0, 100)}..."`);
    
    // ④ Translate summary to Japanese (parallel with ⑤)
    console.log('   ④ Translating summary & ⑤ Extracting vocabulary...');
    const [japaneseSummary, vocabulary] = await Promise.all([
      translateSummary(englishSummary),
      generateVocabulary(last5MinText)
    ]);
    
    const translationTime = Date.now() - summaryStartTime - summaryTime;
    testData.metrics.translationTimes.push(translationTime);
    
    console.log(`   ✅ Translation completed`);
    console.log(`      "${japaneseSummary.substring(0, 100)}..."`);
    console.log(`   ✅ Vocabulary: ${vocabulary.length} terms extracted`);
    
    // Save summary data
    testData.summaries.push({
      minute,
      timeRange: formatTimeRange(minute - SUMMARY_INTERVAL_MINUTES, minute),
      englishSummary,
      japaneseSummary,
      vocabulary,
      wordCount: last5MinText.split(' ').length,
      processingTime: {
        summary: summaryTime,
        translation: translationTime
      }
    });
    
    testData.metrics.summaryCount++;
    console.log(`   📝 Summary #${testData.metrics.summaryCount} complete\n`);
    
  } catch (error) {
    console.error(`   ❌ Summary processing failed:`, error.message);
  }
}

// ========== Translation Queue (for subtitles - not stored) ==========
function enqueueTranslation(text, confidence) {
  translationQueue.push({ text, confidence });
  processTranslationQueue();
}

async function processTranslationQueue() {
  while (translationQueue.length > 0 && activeTranslations < CONCURRENCY_LIMIT) {
    const task = translationQueue.shift();
    activeTranslations++;
    
    translateForSubtitle(task.text).finally(() => {
      activeTranslations--;
      processTranslationQueue();
    });
  }
}

async function translateForSubtitle(text) {
  // Simple translation for real-time subtitles
  // Not stored in this test, just for pipeline completeness
  try {
    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      input: [
        { role: 'system', content: 'Translate English to Japanese. Output only translation.' },
        { role: 'user', content: text }
      ],
      max_output_tokens: 500,
      stream: false
    });
    
    // Subtitle would be displayed here in production
  } catch (error) {
    // Silent fail for subtitles
  }
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

// ========== Test End ==========
async function endTest() {
  if (!isRunning) return;
  isRunning = false;
  
  console.log('\n📊 Ending test...');
  
  // Save last minute transcript
  if (minuteTranscript) {
    testData.timeline.push({
      minute: currentMinute,
      timeRange: formatTimeRange(currentMinute, currentMinute + 1),
      transcript: minuteTranscript.trim(),
      wordCount: minuteTranscript.split(' ').length
    });
  }
  
  // Process final summary if needed
  if (transcriptBuffer.length > 0) {
    const finalMinute = Math.ceil((Date.now() - startTime) / 60000);
    console.log('Processing final summary...');
    await processSummary(finalMinute);
  }
  
  // ⑥ Generate final report (English + Japanese)
  try {
    console.log('\n⑥ Generating final report...');
    
    // Combine all transcripts
    const allTranscripts = testData.transcripts
      .map(t => t.text)
      .join(' ');
    
    // Combine all summaries
    const allSummaries = testData.summaries
      .map(s => s.englishSummary)
      .join('\n\n');
    
    // Combine all vocabulary
    const allVocabulary = [...new Set(
      testData.summaries.flatMap(s => s.vocabulary || [])
    )];
    
    // Generate English report
    const reportStartTime = Date.now();
    const englishReport = await generateFinalReport(
      allTranscripts,
      allSummaries,
      allVocabulary
    );
    const reportTime = Date.now() - reportStartTime;
    testData.metrics.finalReportTime = reportTime;
    
    console.log(`   ✅ English report generated in ${reportTime}ms`);
    console.log(`      Length: ${englishReport.length} chars`);
    
    // Translate report to Japanese
    console.log('   Translating final report to Japanese...');
    const translateStartTime = Date.now();
    const japaneseReport = await translateSummary(englishReport);
    const translateTime = Date.now() - translateStartTime;
    testData.metrics.finalReportTranslationTime = translateTime;
    
    console.log(`   ✅ Japanese report generated in ${translateTime}ms`);
    console.log(`      Length: ${japaneseReport.length} chars`);
    
    // Save reports
    testData.finalReport.english = englishReport;
    testData.finalReport.japanese = japaneseReport;
    
  } catch (error) {
    console.error('❌ Final report generation failed:', error.message);
  }
  
  // Save all data
  fs.writeFileSync(RESULT_FILE, JSON.stringify(testData, null, 2));
  
  // Generate Markdown report
  generateMarkdownReport();
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ TEST COMPLETE');
  console.log('='.repeat(80));
  
  console.log('\n📊 Results Summary:');
  console.log(`  Total Transcripts: ${testData.metrics.totalTranscripts}`);
  console.log(`  Timeline Entries: ${testData.timeline.length} minutes`);
  console.log(`  Summaries Generated: ${testData.metrics.summaryCount}`);
  console.log(`    - Every ${SUMMARY_INTERVAL_MINUTES} minutes`);
  console.log(`    - With English: ${testData.summaries.filter(s => s.englishSummary).length}`);
  console.log(`    - With Japanese: ${testData.summaries.filter(s => s.japaneseSummary).length}`);
  console.log(`    - With Vocabulary: ${testData.summaries.filter(s => s.vocabulary?.length > 0).length}`);
  console.log(`  Final Report:`);
  console.log(`    - English: ${testData.finalReport.english ? '✅' : '❌'} (${testData.finalReport.english?.length || 0} chars)`);
  console.log(`    - Japanese: ${testData.finalReport.japanese ? '✅' : '❌'} (${testData.finalReport.japanese?.length || 0} chars)`);
  
  if (testData.metrics.summaryTimes.length > 0) {
    const avgSummaryTime = testData.metrics.summaryTimes.reduce((a, b) => a + b, 0) / testData.metrics.summaryTimes.length;
    const avgTranslateTime = testData.metrics.translationTimes.reduce((a, b) => a + b, 0) / testData.metrics.translationTimes.length;
    
    console.log('\n⏱️ Performance:');
    console.log(`  ③ Avg summary generation: ${avgSummaryTime.toFixed(0)}ms`);
    console.log(`  ④ Avg translation time: ${avgTranslateTime.toFixed(0)}ms`);
    console.log(`  ⑥ Final report: ${testData.metrics.finalReportTime}ms (translation: ${testData.metrics.finalReportTranslationTime}ms)`);
  }
  
  console.log(`\n📁 Files saved:`);
  console.log(`  JSON Data: ${RESULT_FILE}`);
  console.log(`  Markdown Report: ${REPORT_FILE}`);
  console.log('='.repeat(80));
  
  process.exit(0);
}

// ========== Markdown Report Generation ==========
function generateMarkdownReport() {
  const duration = (Date.now() - startTime) / 1000;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  
  let report = `# ${TEST_NAME} Test Report

## Test Information
- **Test ID**: ${RUN_ID}
- **Audio File**: ${AUDIO_FILE}
- **Duration**: ${minutes}:${String(seconds).padStart(2, '0')}
- **Date**: ${new Date().toISOString()}
- **Summary Interval**: Every ${SUMMARY_INTERVAL_MINUTES} minutes

## Results Overview

### Transcription (②ASR)
- **Total Segments**: ${testData.metrics.totalTranscripts}
- **Timeline Coverage**: ${testData.timeline.length} minutes

### Summaries (③④⑤)
- **Total Summaries**: ${testData.metrics.summaryCount}
- **Coverage**: ${testData.summaries.map(s => s.timeRange).join(', ')}

### Final Report (⑥)
- **English**: ${testData.finalReport.english ? `✅ ${testData.finalReport.english.length} characters` : '❌ Not generated'}
- **Japanese**: ${testData.finalReport.japanese ? `✅ ${testData.finalReport.japanese.length} characters` : '❌ Not generated'}

## ${SUMMARY_INTERVAL_MINUTES}-Minute Summaries

`;

  // Add each summary
  testData.summaries.forEach((summary, index) => {
    report += `### Summary ${index + 1}: ${summary.timeRange}

#### English Summary
${summary.englishSummary}

#### Japanese Translation (④)
${summary.japaneseSummary}

#### Key Vocabulary (⑤)
${summary.vocabulary?.length > 0 ? summary.vocabulary.join(', ') : 'None extracted'}

---

`;
  });

  // Add final report
  if (testData.finalReport.english) {
    report += `## Final Report (⑥)

### English Version
${testData.finalReport.english}

### Japanese Version
${testData.finalReport.japanese}

`;
  }

  // Add performance metrics
  report += `## Performance Metrics

- **Summary Generation (③)**: Avg ${testData.metrics.summaryTimes.length > 0 ? 
    (testData.metrics.summaryTimes.reduce((a, b) => a + b, 0) / testData.metrics.summaryTimes.length).toFixed(0) : 'N/A'}ms
- **Translation (④)**: Avg ${testData.metrics.translationTimes.length > 0 ? 
    (testData.metrics.translationTimes.reduce((a, b) => a + b, 0) / testData.metrics.translationTimes.length).toFixed(0) : 'N/A'}ms
- **Final Report (⑥)**: ${testData.metrics.finalReportTime || 'N/A'}ms
- **Report Translation**: ${testData.metrics.finalReportTranslationTime || 'N/A'}ms

---
*Generated: ${new Date().toISOString()}*
`;

  fs.writeFileSync(REPORT_FILE, report);
}

// ========== Main ==========
async function main() {
  console.log('🚀 Starting 20-minute test with 5-minute summaries');
  console.log(`📁 Audio file: ${AUDIO_FILE}`);
  console.log(`⏱️ Summary interval: every ${SUMMARY_INTERVAL_MINUTES} minutes`);
  console.log(`📊 Testing ③④⑤⑥ functionality with proper intervals\n`);
  
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