#!/usr/bin/env node
/**
 * test-integration-quick.js
 * UI統合の簡易動作確認テスト
 */

require('dotenv').config();
const { UnifiedPipelineService } = require('./electron/UnifiedPipelineService');

console.log('🚀 UI Integration Quick Test');
console.log('='.repeat(60));

// Check environment
if (!process.env.DEEPGRAM_API_KEY || !process.env.OPENAI_API_KEY) {
  console.error('❌ Missing API keys');
  process.exit(1);
}

console.log('✅ Environment OK');
console.log(`  Deepgram: ${process.env.DEEPGRAM_API_KEY.substring(0, 20)}...`);
console.log(`  OpenAI: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);

// Mock window
const mockWindow = {
  isDestroyed: () => false,
  webContents: {
    send: (channel, data) => {
      console.log(`[IPC] ${channel}:`, JSON.stringify(data).substring(0, 100));
    }
  }
};

// Create service
const pipeline = new UnifiedPipelineService({
  deepgramApiKey: process.env.DEEPGRAM_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  summaryIntervalMinutes: 1,
  maxMemoryMB: 500,
  firstPaintTargetMs: 500
});

// Test
async function test() {
  try {
    console.log('\n1️⃣ Initializing pipeline...');
    await pipeline.initialize(mockWindow);
    console.log('   ✅ Initialized');
    
    console.log('\n2️⃣ Starting live translation...');
    await pipeline.startLiveTranslation();
    console.log('   ✅ Started');
    
    console.log('\n3️⃣ Getting metrics...');
    const metrics = pipeline.getMetrics();
    console.log('   ✅ Metrics:', metrics);
    
    console.log('\n4️⃣ Stopping pipeline...');
    await pipeline.stop();
    console.log('   ✅ Stopped');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST PASSED - All components working');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

test();