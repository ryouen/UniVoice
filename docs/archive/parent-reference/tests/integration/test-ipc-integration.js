#!/usr/bin/env node
/**
 * test-ipc-integration.js
 * 
 * Test IPC communication between test-20min-production-ipc.js and simulated UI
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting IPC Integration Test');
console.log('='.repeat(50));

// Spawn the IPC-enabled test script
const testProcess = spawn('node', [
  path.join(__dirname, 'test-20min-production-ipc.js'),
  '--audio=sample_voice/Hayes.wav',
  '--ipc'
], {
  env: { ...process.env, IPC_MODE: 'true' },
  stdio: ['inherit', 'pipe', 'pipe', 'ipc']
});

// Track metrics
const metrics = {
  messagesReceived: 0,
  asrInterim: 0,
  asrFinal: 0,
  translationDeltas: 0,
  segmentsComplete: 0,
  summaries: 0,
  errors: 0,
  firstPaintTime: null,
  startTime: Date.now()
};

// Handle IPC messages
testProcess.on('message', (message) => {
  metrics.messagesReceived++;
  const { type, data } = message;
  
  switch (type) {
    case 'audio-loaded':
      console.log(`✅ Audio loaded: ${data.frames} frames, ${data.bytes} bytes`);
      break;
      
    case 'deepgram-connected':
      console.log('✅ Deepgram WebSocket connected');
      break;
      
    case 'asr-interim':
      metrics.asrInterim++;
      if (metrics.asrInterim <= 3) {
        console.log(`📝 ASR Interim: "${data.text.substring(0, 50)}..." (${data.confidence.toFixed(2)})`);
      }
      break;
      
    case 'asr-final':
      metrics.asrFinal++;
      console.log(`✅ ASR Final #${metrics.asrFinal}: "${data.text.substring(0, 50)}..."`);
      break;
      
    case 'first-paint':
      if (!metrics.firstPaintTime) {
        metrics.firstPaintTime = data.elapsed;
        console.log(`🎨 First Paint: ${data.elapsed.toFixed(0)}ms`);
      }
      break;
      
    case 'translation-delta':
      metrics.translationDeltas++;
      // Log first few deltas
      if (metrics.translationDeltas <= 5) {
        console.log(`📊 Translation Delta #${metrics.translationDeltas}: "${data.delta}"`);
      }
      break;
      
    case 'segment-complete':
      metrics.segmentsComplete++;
      console.log(`✅ Segment #${metrics.segmentsComplete} Complete:`);
      console.log(`   Original: "${data.original.substring(0, 50)}..."`);
      console.log(`   Translation: "${data.translation.substring(0, 50)}..."`);
      console.log(`   Time: ${data.totalTime.toFixed(0)}ms (First paint: ${data.firstPaint?.toFixed(0)}ms)`);
      break;
      
    case 'summary-update':
      metrics.summaries++;
      console.log(`📝 Summary Update (${data.timeRange}):`);
      console.log(`   English: "${data.english.substring(0, 100)}..."`);
      console.log(`   Japanese: "${data.japanese.substring(0, 100)}..."`);
      console.log(`   Vocabulary: ${data.vocabulary.length} terms`);
      break;
      
    case 'error':
      metrics.errors++;
      console.error(`❌ Error in ${data.stage}: ${data.error}`);
      break;
      
    case 'test-complete':
      const duration = Date.now() - metrics.startTime;
      console.log('\\n' + '=' . repeat(50));
      console.log('✅ TEST COMPLETE');
      console.log('='.repeat(50));
      console.log('📊 METRICS:');
      console.log(`  Total Messages: ${metrics.messagesReceived}`);
      console.log(`  ASR Interim: ${metrics.asrInterim}`);
      console.log(`  ASR Final: ${metrics.asrFinal}`);
      console.log(`  Translation Deltas: ${metrics.translationDeltas}`);
      console.log(`  Segments Complete: ${metrics.segmentsComplete}`);
      console.log(`  Summaries: ${metrics.summaries}`);
      console.log(`  Errors: ${metrics.errors}`);
      console.log(`  First Paint: ${metrics.firstPaintTime?.toFixed(0)}ms`);
      console.log(`  Duration: ${(duration / 1000).toFixed(1)}s`);
      console.log('='.repeat(50));
      
      // Test user input translation
      testUserInputTranslation();
      break;
      
    default:
      console.log(`Unknown message type: ${type}`);
  }
});

// Handle stdout
testProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\\n');
  lines.forEach(line => {
    if (line && !line.includes('[IPC]')) {
      console.log(`[STDOUT] ${line}`);
    }
  });
});

// Handle stderr
testProcess.stderr.on('data', (data) => {
  console.error(`[STDERR] ${data}`);
});

// Handle process exit
testProcess.on('exit', (code) => {
  console.log(`\\nProcess exited with code ${code}`);
  process.exit(code);
});

// Handle errors
testProcess.on('error', (error) => {
  console.error('Process error:', error);
  process.exit(1);
});

// Test user input translation
function testUserInputTranslation() {
  console.log('\\n🔄 Testing user input translation...');
  
  const requestId = Date.now().toString();
  
  // Set up response handler
  const handler = (message) => {
    if (message.type === 'user-input-translated' && message.requestId === requestId) {
      console.log('✅ User input translation response:');
      console.log(`   Original: "${message.data.original}"`);
      console.log(`   Translated: "${message.data.translated}"`);
      testProcess.removeListener('message', handler);
      
      // Stop the test after user input test
      setTimeout(() => {
        console.log('\\n🛑 Sending stop signal...');
        testProcess.send({ type: 'stop' });
      }, 1000);
    }
  };
  
  testProcess.on('message', handler);
  
  // Send translation request
  testProcess.send({
    type: 'translate-user-input',
    requestId,
    data: {
      text: 'これは日本語のテストメッセージです。',
      from: 'ja',
      to: 'en'
    }
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Stopping test...');
  if (testProcess) {
    testProcess.send({ type: 'stop' });
    setTimeout(() => {
      testProcess.kill('SIGTERM');
      process.exit(0);
    }, 2000);
  }
});

console.log('📡 Waiting for IPC messages...');
console.log('Press Ctrl+C to stop\\n');