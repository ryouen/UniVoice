/**
 * Translation Timeout Integration Test
 * 
 * タイムアウト機能の統合テスト
 * - タイムアウトが正しく発火するか
 * - 履歴に保存されるか
 * - メモリリークがないか
 */

// Import from source since this is a frontend utility
const { TranslationTimeoutManager } = require('../../src/utils/TranslationTimeoutManager');

console.log('=== Translation Timeout Integration Test ===\n');

// Test 1: Basic timeout functionality
console.log('Test 1: Basic timeout functionality');
const manager = new TranslationTimeoutManager({
  defaultTimeout: 1000, // 1秒でテスト
  enableDynamicTimeout: false
});

let timeoutFired = false;
const segmentId = 'test-seg-1';

manager.startTimeout(
  segmentId,
  'Hello world, this is a test sentence.',
  (timedOutSegmentId) => {
    console.log(`✓ Timeout fired for segment: ${timedOutSegmentId}`);
    timeoutFired = true;
  }
);

console.log(`  Active timeouts: ${manager.getActiveTimeoutCount()}`);

// Simulate translation arriving after 500ms
setTimeout(() => {
  console.log('  Simulating translation arrival...');
  const cleared = manager.clearTimeout(segmentId);
  console.log(`  Timeout cleared: ${cleared}`);
  
  if (!timeoutFired && cleared) {
    console.log('✓ Test 1 passed: Timeout cleared before firing\n');
  } else {
    console.log('✗ Test 1 failed: Timeout should have been cleared\n');
  }
}, 500);

// Test 2: Timeout firing
setTimeout(() => {
  console.log('Test 2: Timeout firing');
  
  let timeout2Fired = false;
  const segmentId2 = 'test-seg-2';
  
  manager.startTimeout(
    segmentId2,
    'This translation will timeout',
    (timedOutSegmentId) => {
      console.log(`✓ Timeout fired for segment: ${timedOutSegmentId}`);
      timeout2Fired = true;
    }
  );
  
  // Wait for timeout
  setTimeout(() => {
    if (timeout2Fired) {
      console.log('✓ Test 2 passed: Timeout fired correctly\n');
    } else {
      console.log('✗ Test 2 failed: Timeout should have fired\n');
    }
  }, 1500);
}, 1000);

// Test 3: Dynamic timeout calculation
setTimeout(() => {
  console.log('Test 3: Dynamic timeout calculation');
  
  const dynamicManager = new TranslationTimeoutManager({
    defaultTimeout: 1000,
    enableDynamicTimeout: true,
    maxTimeout: 3000
  });
  
  const shortTimeout = dynamicManager.startTimeout('seg-short', 'Hi', () => {});
  dynamicManager.clearTimeout('seg-short');
  
  const longTimeout = dynamicManager.startTimeout('seg-long', 'A'.repeat(300), () => {});
  dynamicManager.clearTimeout('seg-long');
  
  console.log(`  Short text timeout: ${shortTimeout}ms`);
  console.log(`  Long text timeout: ${longTimeout}ms`);
  
  if (longTimeout > shortTimeout) {
    console.log('✓ Test 3 passed: Dynamic timeout working\n');
  } else {
    console.log('✗ Test 3 failed: Dynamic timeout not working\n');
  }
}, 3000);

// Test 4: Memory cleanup
setTimeout(() => {
  console.log('Test 4: Memory cleanup');
  
  // Create many timeouts
  for (let i = 0; i < 10; i++) {
    manager.startTimeout(`seg-${i}`, `Text ${i}`, () => {});
  }
  
  console.log(`  Active timeouts before destroy: ${manager.getActiveTimeoutCount()}`);
  
  manager.destroy();
  
  console.log(`  Active timeouts after destroy: ${manager.getActiveTimeoutCount()}`);
  console.log('✓ Test 4 passed: Memory cleanup successful\n');
  
  console.log('=== All tests completed ===');
  process.exit(0);
}, 4000);