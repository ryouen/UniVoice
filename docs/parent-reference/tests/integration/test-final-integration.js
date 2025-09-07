#!/usr/bin/env node
/**
 * test-final-integration.js
 * Hayes.wavを使用した最終統合テスト（10秒）
 */

require('dotenv').config();
const { UnifiedPipelineService } = require('./electron/UnifiedPipelineService');
const fs = require('fs');

console.log('🚀 Final Integration Test with Hayes.wav');
console.log('='.repeat(60));

// Mock window with event tracking
let eventCounts = {
  'asr-status': 0,
  'asr-interim': 0,
  'asr-final': 0,
  'translation-delta': 0,
  'translation-complete': 0,
  'summary-update': 0
};

const mockWindow = {
  isDestroyed: () => false,
  webContents: {
    send: (channel, data) => {
      eventCounts[channel] = (eventCounts[channel] || 0) + 1;
      
      // Log important events
      if (channel === 'asr-final') {
        console.log(`📝 ASR: "${data.text.substring(0, 50)}..."`);
      } else if (channel === 'translation-complete') {
        console.log(`   ✅ Translation: "${data.translation.substring(0, 50)}..." (${data.timeMs}ms)`);
      } else if (channel === 'asr-status' && data.connected) {
        console.log('🔌 Deepgram connected');
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
    
    // Start
    console.log('Starting live translation...\n');
    await pipeline.startLiveTranslation();
    
    // Load and send audio
    const audioData = fs.readFileSync('./sample_voice/Hayes.wav');
    const audioBuffer = audioData.slice(44); // Skip WAV header
    const frameSize = 640; // 20ms at 16kHz
    const maxFrames = 500; // 10 seconds only
    
    console.log(`Streaming ${maxFrames} frames (10 seconds)...\n`);
    
    // Stream audio
    let frameIndex = 0;
    const interval = setInterval(() => {
      if (frameIndex >= maxFrames) {
        clearInterval(interval);
        
        // Wait for processing
        setTimeout(async () => {
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
            console.log('✅ INTEGRATION TEST PASSED');
            console.log('   UI is ready for real-time translation!');
          } else {
            console.log('❌ TEST FAILED');
          }
          console.log('='.repeat(60));
          
          process.exit(success ? 0 : 1);
        }, 3000); // Wait 3 seconds for processing
        
        return;
      }
      
      const frame = audioBuffer.slice(
        frameIndex * frameSize,
        (frameIndex + 1) * frameSize
      );
      
      pipeline.sendAudioChunk(frame);
      frameIndex++;
      
      if (frameIndex % 100 === 0) {
        process.stdout.write(`\r⏳ Progress: ${(frameIndex/maxFrames*100).toFixed(0)}%`);
      }
    }, 20); // 20ms intervals
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

test();