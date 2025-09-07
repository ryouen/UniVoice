#!/usr/bin/env node
/**
 * test-unified-pipeline.js
 * UnifiedPipelineServiceの統合テスト
 */

require('dotenv').config();
const { UnifiedPipelineService } = require('./electron/UnifiedPipelineService');
const fs = require('fs');
const WebSocket = require('ws');

// Test configuration
const TEST_DURATION_MS = 60 * 1000; // 1 minute test
const AUDIO_FILE = './sample_voice/Hayes.wav';

// Mock BrowserWindow for testing
class MockBrowserWindow {
  constructor() {
    this.webContents = {
      send: (channel, data) => {
        console.log(`[IPC] ${channel}:`, 
          typeof data === 'object' ? JSON.stringify(data).substring(0, 100) : data
        );
      }
    };
  }
  
  isDestroyed() {
    return false;
  }
}

/**
 * Test UnifiedPipelineService
 */
async function testPipeline() {
  console.log('🚀 UnifiedPipelineService Integration Test');
  console.log('='.repeat(60));
  
  // Check environment
  if (!process.env.DEEPGRAM_API_KEY || !process.env.OPENAI_API_KEY) {
    console.error('❌ Missing API keys. Please check .env file');
    process.exit(1);
  }
  
  console.log('✅ Environment variables loaded');
  console.log(`  DEEPGRAM_API_KEY: ${process.env.DEEPGRAM_API_KEY.substring(0, 20)}...`);
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
  console.log();
  
  // Create pipeline service
  const pipeline = new UnifiedPipelineService({
    deepgramApiKey: process.env.DEEPGRAM_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    summaryIntervalMinutes: 1, // 1 minute for testing
    maxMemoryMB: 500,
    firstPaintTargetMs: 500
  });
  
  // Create mock window
  const mockWindow = new MockBrowserWindow();
  
  // Track events
  const events = {
    asrInterim: 0,
    asrFinal: 0,
    translationDelta: 0,
    translationComplete: 0,
    summaryUpdate: 0,
    errors: 0
  };
  
  // Override send method to track events
  const originalSend = mockWindow.webContents.send;
  mockWindow.webContents.send = (channel, data) => {
    // Track event counts
    switch (channel) {
      case 'asr-interim':
        events.asrInterim++;
        break;
      case 'asr-final':
        events.asrFinal++;
        break;
      case 'translation-delta':
        events.translationDelta++;
        break;
      case 'translation-complete':
        events.translationComplete++;
        console.log(`\n✅ Translation complete #${events.translationComplete}:`);
        console.log(`   Original: "${data.original?.substring(0, 50)}..."`);
        console.log(`   Translation: "${data.translation?.substring(0, 50)}..."`);
        if (data.timeMs) {
          console.log(`   Time: ${data.timeMs}ms`);
        }
        break;
      case 'summary-update':
        events.summaryUpdate++;
        console.log(`\n📊 Summary generated #${events.summaryUpdate}:`);
        console.log(`   English: "${data.english?.substring(0, 80)}..."`);
        console.log(`   Japanese: "${data.japanese?.substring(0, 80)}..."`);
        console.log(`   Vocabulary: ${data.vocabulary?.length || 0} terms`);
        break;
      case 'asr-error':
      case 'translation-error':
      case 'summary-error':
        events.errors++;
        console.error(`\n❌ Error from ${channel}:`, data);
        break;
    }
    
    // Call original
    originalSend.call(mockWindow.webContents, channel, data);
  };
  
  try {
    // Initialize pipeline
    console.log('📡 Initializing pipeline...');
    await pipeline.initialize(mockWindow);
    console.log('✅ Pipeline initialized\n');
    
    // Start pipeline
    console.log('🎬 Starting live translation...');
    await pipeline.startLiveTranslation();
    console.log('✅ Pipeline started\n');
    
    // Load and stream audio file
    console.log(`📁 Loading audio file: ${AUDIO_FILE}`);
    const audioData = fs.readFileSync(AUDIO_FILE);
    const audioBuffer = audioData.slice(44); // Skip WAV header
    const totalFrames = Math.floor(audioBuffer.length / 640); // 20ms frames at 16kHz
    console.log(`✅ Audio loaded: ${totalFrames} frames (${(totalFrames * 20 / 1000).toFixed(1)} seconds)\n`);
    
    // Create audio stream
    const { Readable } = require('stream');
    let frameIndex = 0;
    
    const audioStream = new Readable({
      read() {
        if (frameIndex >= totalFrames) {
          this.push(null); // End stream
          return;
        }
        
        // Send one frame
        const frame = audioBuffer.slice(
          frameIndex * 640,
          (frameIndex + 1) * 640
        );
        this.push(frame);
        frameIndex++;
        
        // Progress indicator every 100 frames (2 seconds)
        if (frameIndex % 100 === 0) {
          const progress = (frameIndex / totalFrames * 100).toFixed(1);
          process.stdout.write(`\r⏳ Progress: ${progress}% (${frameIndex}/${totalFrames} frames)`);
        }
      }
    });
    
    // Connect Deepgram WebSocket manually (since we need to send audio)
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
    
    const ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${params}`,
      {
        headers: {
          'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`
        }
      }
    );
    
    ws.on('open', () => {
      console.log('\n🔌 Deepgram WebSocket connected');
      
      // Stream audio frames
      const interval = setInterval(() => {
        if (frameIndex >= totalFrames) {
          clearInterval(interval);
          ws.close();
          return;
        }
        
        const frame = audioBuffer.slice(
          frameIndex * 640,
          (frameIndex + 1) * 640
        );
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(frame);
        }
        
        frameIndex++;
        
        // Progress
        if (frameIndex % 100 === 0) {
          const progress = (frameIndex / totalFrames * 100).toFixed(1);
          process.stdout.write(`\r⏳ Progress: ${progress}% (${frameIndex}/${totalFrames} frames)`);
        }
      }, 20); // 20ms intervals
    });
    
    // Wait for test duration
    console.log(`\n⏱️ Running test for ${TEST_DURATION_MS / 1000} seconds...`);
    
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION_MS));
    
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 Test Results');
    console.log('='.repeat(60));
    
    // Get final metrics
    const metrics = pipeline.getMetrics();
    
    console.log('\n📈 Event Counts:');
    console.log(`  ASR Interim: ${events.asrInterim}`);
    console.log(`  ASR Final: ${events.asrFinal}`);
    console.log(`  Translation Delta: ${events.translationDelta}`);
    console.log(`  Translation Complete: ${events.translationComplete}`);
    console.log(`  Summary Update: ${events.summaryUpdate}`);
    console.log(`  Errors: ${events.errors}`);
    
    console.log('\n⚡ Performance Metrics:');
    console.log(`  First Paint: ${metrics.firstPaintMs ? metrics.firstPaintMs + 'ms' : 'N/A'}`);
    console.log(`  Avg Translation: ${metrics.avgTranslationMs}ms`);
    console.log(`  Memory Usage: ${metrics.memoryUsageMB}MB`);
    console.log(`  Total Segments: ${metrics.totalSegments}`);
    console.log(`  Total Summaries: ${metrics.totalSummaries}`);
    console.log(`  Estimated Cost: $${metrics.estimatedCost.toFixed(4)}`);
    
    // Success criteria
    const success = 
      events.translationComplete > 0 &&
      events.errors === 0 &&
      metrics.firstPaintMs !== null;
    
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✅ TEST PASSED - All systems operational');
    } else {
      console.log('❌ TEST FAILED - Check errors above');
    }
    console.log('='.repeat(60));
    
    // Stop pipeline
    await pipeline.stop();
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testPipeline().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});