#!/usr/bin/env node
/**
 * test-pipeline-direct.js
 * パイプライン機能の直接テスト（TypeScript不要）
 */

require('dotenv').config();
const WebSocket = require('ws');
const fs = require('fs');

// Test configuration
const AUDIO_FILE = './sample_voice/Hayes.wav';
const TEST_DURATION_MS = 30 * 1000; // 30 seconds

console.log('🚀 Pipeline Direct Test (Deepgram + GPT-5)');
console.log('='.repeat(60));

// Check environment
if (!process.env.DEEPGRAM_API_KEY || !process.env.OPENAI_API_KEY) {
  console.error('❌ Missing API keys. Please check .env file');
  process.exit(1);
}

console.log('✅ Environment loaded');
console.log(`  DEEPGRAM_API_KEY: ${process.env.DEEPGRAM_API_KEY.substring(0, 20)}...`);
console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
console.log();

// Load audio file
console.log(`📁 Loading audio: ${AUDIO_FILE}`);
const audioData = fs.readFileSync(AUDIO_FILE);
const audioBuffer = audioData.slice(44); // Skip WAV header
const frameSize = 640; // 20ms at 16kHz
const totalFrames = Math.floor(audioBuffer.length / frameSize);
console.log(`✅ Audio loaded: ${totalFrames} frames (${(totalFrames * 20 / 1000).toFixed(1)} seconds)\n`);

// Import GPT-5 helpers
const {
  translateWithRetry,
  generateSummary,
  translateSummary,
  generateVocabulary
} = require('./test-gpt5-helpers');

// Tracking
const results = {
  transcripts: [],
  translations: [],
  summaries: [],
  vocabulary: [],
  metrics: {
    firstPaintMs: null,
    translationCount: 0,
    summaryCount: 0,
    startTime: Date.now()
  }
};

// Buffer for summary generation
let transcriptBuffer = [];
let lastSummaryTime = Date.now();
const SUMMARY_INTERVAL = 60 * 1000; // 1 minute

/**
 * Process transcript segment
 */
async function processTranscript(text, isFinal) {
  if (!text || text.trim().length === 0) return;
  
  console.log(`\n📝 ${isFinal ? 'Final' : 'Interim'}: "${text.substring(0, 50)}..."`);
  
  if (isFinal) {
    results.transcripts.push(text);
    transcriptBuffer.push(text);
    
    // Translate
    const translationStart = Date.now();
    let firstPaintRecorded = false;
    
    try {
      const translation = await translateWithRetry({
        srcLang: 'en',
        tgtLang: 'ja',
        text,
        maxOutputTokens: 1500,
        onFirstPaint: (elapsedMs) => {
          if (!firstPaintRecorded && results.metrics.firstPaintMs === null) {
            results.metrics.firstPaintMs = elapsedMs;
            console.log(`   ⚡ First paint: ${elapsedMs}ms`);
            firstPaintRecorded = true;
          }
        },
        onDelta: (delta) => {
          // Streaming delta (could update UI here)
        },
        onDone: (fullText) => {
          const elapsed = Date.now() - translationStart;
          console.log(`   ✅ Translation: "${fullText.substring(0, 50)}..." (${elapsed}ms)`);
          results.translations.push(fullText);
          results.metrics.translationCount++;
        }
      });
    } catch (error) {
      console.error('   ❌ Translation error:', error.message);
    }
    
    // Check for summary generation
    await checkForSummary();
  }
}

/**
 * Check if it's time to generate a summary
 */
async function checkForSummary() {
  const now = Date.now();
  
  if (now - lastSummaryTime >= SUMMARY_INTERVAL && transcriptBuffer.length > 0) {
    lastSummaryTime = now;
    
    const textToSummarize = transcriptBuffer.join(' ');
    transcriptBuffer = []; // Clear buffer
    
    console.log('\n📊 Generating summary...');
    
    try {
      // Generate English summary
      const englishSummary = await generateSummary(textToSummarize);
      console.log(`   ✅ English summary: "${englishSummary.substring(0, 80)}..."`);
      
      // Translate to Japanese
      const japaneseSummary = await translateSummary(englishSummary);
      console.log(`   ✅ Japanese summary: "${japaneseSummary.substring(0, 80)}..."`);
      
      // Extract vocabulary
      const vocabulary = await generateVocabulary(textToSummarize);
      console.log(`   ✅ Vocabulary: ${vocabulary.length} terms extracted`);
      
      results.summaries.push({
        english: englishSummary,
        japanese: japaneseSummary,
        vocabulary,
        timestamp: now
      });
      
      results.metrics.summaryCount++;
      
    } catch (error) {
      console.error('   ❌ Summary error:', error.message);
    }
  }
}

/**
 * Main test function
 */
async function runTest() {
  // Connect to Deepgram
  const params = new URLSearchParams({
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
  
  console.log('🔌 Connecting to Deepgram...');
  
  const ws = new WebSocket(
    `wss://api.deepgram.com/v1/listen?${params}`,
    {
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`
      }
    }
  );
  
  let frameIndex = 0;
  let streamInterval = null;
  
  ws.on('open', () => {
    console.log('✅ Deepgram connected\n');
    
    // Start streaming audio
    streamInterval = setInterval(() => {
      if (frameIndex >= totalFrames || ws.readyState !== WebSocket.OPEN) {
        clearInterval(streamInterval);
        setTimeout(() => {
          ws.close();
        }, 2000); // Wait 2 seconds for final processing
        return;
      }
      
      const frame = audioBuffer.slice(
        frameIndex * frameSize,
        (frameIndex + 1) * frameSize
      );
      
      ws.send(frame);
      frameIndex++;
      
      // Progress indicator
      if (frameIndex % 100 === 0) {
        const progress = (frameIndex / totalFrames * 100).toFixed(1);
        process.stdout.write(`\r⏳ Progress: ${progress}% (${frameIndex}/${totalFrames} frames)`);
      }
    }, 20); // 20ms intervals
  });
  
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'Results') {
        const alt = msg.channel?.alternatives?.[0];
        if (!alt || !alt.transcript) return;
        
        const text = alt.transcript;
        const isFinal = msg.is_final;
        
        await processTranscript(text, isFinal);
      }
    } catch (error) {
      console.error('Parse error:', error);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  ws.on('close', async () => {
    console.log('\n\n🔌 Deepgram disconnected');
    
    // Final summary if needed
    if (transcriptBuffer.length > 0) {
      await checkForSummary();
    }
    
    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results');
    console.log('='.repeat(60));
    
    console.log('\n📈 Metrics:');
    console.log(`  First Paint: ${results.metrics.firstPaintMs ? results.metrics.firstPaintMs + 'ms' : 'N/A'}`);
    console.log(`  Total Transcripts: ${results.transcripts.length}`);
    console.log(`  Total Translations: ${results.metrics.translationCount}`);
    console.log(`  Total Summaries: ${results.metrics.summaryCount}`);
    console.log(`  Test Duration: ${((Date.now() - results.metrics.startTime) / 1000).toFixed(1)}s`);
    
    if (results.summaries.length > 0) {
      console.log('\n📝 Sample Summary:');
      const summary = results.summaries[0];
      console.log(`  English: ${summary.english.substring(0, 100)}...`);
      console.log(`  Japanese: ${summary.japanese.substring(0, 100)}...`);
      console.log(`  Vocabulary: ${summary.vocabulary.slice(0, 3).map(v => `${v.term_en}→${v.term_ja}`).join(', ')}`);
    }
    
    // Success criteria
    const success = 
      results.metrics.translationCount > 0 &&
      results.metrics.firstPaintMs !== null;
    
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✅ TEST PASSED - Pipeline operational');
      console.log(`   First paint achieved: ${results.metrics.firstPaintMs}ms`);
      console.log(`   Translations completed: ${results.metrics.translationCount}`);
    } else {
      console.log('❌ TEST FAILED');
      if (results.metrics.firstPaintMs === null) {
        console.log('   - No first paint recorded');
      }
      if (results.metrics.translationCount === 0) {
        console.log('   - No translations completed');
      }
    }
    console.log('='.repeat(60));
    
    process.exit(success ? 0 : 1);
  });
  
  // Safety timeout
  setTimeout(() => {
    console.log('\n⏱️ Test timeout reached');
    ws.close();
  }, TEST_DURATION_MS);
}

// Run test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});