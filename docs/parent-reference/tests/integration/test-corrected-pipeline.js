#!/usr/bin/env node
/**
 * test-corrected-pipeline.js
 * 修正済みパイプラインテスト
 */

require('dotenv').config();
const { UnifiedPipelineService } = require('./electron/UnifiedPipelineService');

console.log('🚀 Corrected Pipeline Test');
console.log('='.repeat(60));

// Mock window
let eventCounts = {};
const mockWindow = {
  isDestroyed: () => false,
  webContents: {
    send: (channel, data) => {
      eventCounts[channel] = (eventCounts[channel] || 0) + 1;
      
      if (channel === 'asr-final') {
        console.log(`\n📝 ASR Final: "${data.text.substring(0, 60)}..."`);
      } else if (channel === 'asr-interim') {
        // Interim results (partial)
        if (data.text && data.text.trim()) {
          process.stdout.write(`\r📝 ASR Interim: "${data.text.substring(0, 40)}..."    `);
        }
      } else if (channel === 'translation-complete') {
        console.log(`   ✅ Translation: "${data.translation.substring(0, 50)}..."`);
      } else if (channel === 'asr-status') {
        console.log(`🔌 ASR Status: ${data.connected ? 'Connected' : 'Disconnected'}`);
      }
    }
  }
};

// Create service
const pipeline = new UnifiedPipelineService({
  deepgramApiKey: process.env.DEEPGRAM_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  summaryIntervalMinutes: 5,
  maxMemoryMB: 500,
  firstPaintTargetMs: 500
});

async function test() {
  try {
    // Initialize
    console.log('Initializing pipeline...');
    await pipeline.initialize(mockWindow);
    
    // Start pipeline
    console.log('Starting live translation...');
    await pipeline.startLiveTranslation();
    
    // Start streaming from WAV file
    console.log('Streaming Hayes.wav (10 seconds test)...\n');
    await pipeline.startFromWavFile('./sample_voice/Hayes.wav');
    
    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds
    
    // Stop
    await pipeline.stop();
    
    // Results
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results');
    console.log('='.repeat(60));
    
    const metrics = pipeline.getMetrics();
    
    console.log('\nEvent Counts:');
    Object.entries(eventCounts).forEach(([event, count]) => {
      if (count > 0) {
        console.log(`  ${event}: ${count}`);
      }
    });
    
    console.log('\nMetrics:');
    console.log(`  First Paint: ${metrics.firstPaintMs ? metrics.firstPaintMs + 'ms' : 'N/A'}`);
    console.log(`  Avg Translation: ${metrics.avgTranslationMs}ms`);
    console.log(`  Total Segments: ${metrics.totalSegments}`);
    console.log(`  Memory: ${metrics.memoryUsageMB}MB`);
    
    const success = metrics.totalSegments > 0 && eventCounts['translation-complete'] > 0;
    
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✅ TEST PASSED - Pipeline working correctly!');
      console.log('   Deepgram transcription: OK');
      console.log('   GPT-5 translation: OK');
      console.log('   IPC communication: OK');
    } else {
      console.log('⚠️ TEST INCOMPLETE');
      if (metrics.totalSegments === 0) {
        console.log('   - No transcripts received from Deepgram');
      }
      if (!eventCounts['translation-complete']) {
        console.log('   - No translations completed');
      }
    }
    console.log('='.repeat(60));
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

test();