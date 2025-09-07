// クリーンなイベントフローテスト
const { spawn } = require('child_process');
const path = require('path');

console.log('[Test] Starting clean event flow test...');

// Electronアプリケーションを起動（既に起動している前提）
setTimeout(() => {
  console.log('\n[Test] Please check the Electron app window for the following:');
  console.log('1. ✅ Realtime text should appear in "Current Original"');
  console.log('2. ✅ Japanese translation should appear in "Current Japanese"');
  console.log('3. ✅ History should show ONLY ONE entry per segment');
  console.log('4. ✅ No duplicate entries in history');
  console.log('\nTo simulate events, open DevTools console and run:');
  
  console.log(`
// Test Event 1
window.univoice.sendCommand({
  command: 'startListening',
  params: { sourceLanguage: 'en', targetLanguage: 'ja' }
});

// Wait a moment, then check if events are flowing by looking at:
// - Network tab for WebSocket connections
// - Console for event logs
// - UI for real-time updates
  `);
}, 2000);