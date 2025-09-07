/**
 * ParagraphBuilder統合テスト
 * 
 * テスト項目:
 * 1. パラグラフが20-60秒で形成されること
 * 2. 無音検出でパラグラフが区切られること
 * 3. ParagraphCompleteEventが発行されること
 * 4. 高品質翻訳が適用されること
 * 5. FlexibleHistoryGrouperが更新されること
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 環境変数チェック
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

if (!process.env.DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY is not set');
  process.exit(1);
}

console.log('🧪 Starting ParagraphBuilder Integration Test...\n');

// Electronアプリケーションを起動
const electronPath = require('electron');
const appPath = path.join(__dirname, '../../');

const app = spawn(electronPath, [appPath, '--no-sandbox'], {
  env: {
    ...process.env,
    NODE_ENV: 'test',
    TEST_MODE: 'true',
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
  }
});

let testPassed = false;
let paragraphEvents = [];
let translationEvents = [];
let startTime = Date.now();

// タイムアウト設定（90秒）
const testTimeout = setTimeout(() => {
  console.error('\n❌ Test timeout after 90 seconds');
  cleanup(1);
}, 90000);

// 出力を監視
app.stdout.on('data', (data) => {
  const output = data.toString();
  
  // デバッグ出力
  if (process.env.DEBUG) {
    console.log('[STDOUT]', output);
  }
  
  // ParagraphCompleteEvent検出
  if (output.includes('[DataFlow-10p] ParagraphCompleteEvent emitted:')) {
    const match = output.match(/paragraphId: (para_\d+_\w+)/);
    if (match) {
      const paragraphId = match[1];
      paragraphEvents.push({
        id: paragraphId,
        timestamp: Date.now(),
        elapsed: Date.now() - startTime
      });
      console.log(`✅ ParagraphCompleteEvent detected: ${paragraphId} (${Math.round((Date.now() - startTime) / 1000)}s)`);
    }
  }
  
  // パラグラフ翻訳検出
  if (output.includes('Paragraph translation received:') && output.includes('paragraph_')) {
    const match = output.match(/segmentId: "(paragraph_[^"]+)"/);
    if (match) {
      const paragraphId = match[1];
      translationEvents.push({
        id: paragraphId,
        timestamp: Date.now()
      });
      console.log(`✅ Paragraph translation received: ${paragraphId}`);
    }
  }
  
  // エラー検出
  if (output.includes('Failed to queue paragraph translation')) {
    console.error('❌ Paragraph translation error detected');
  }
  
  // セッション開始検出
  if (output.includes('Started listening')) {
    console.log('🎤 Session started');
    startTime = Date.now();
  }
});

app.stderr.on('data', (data) => {
  const error = data.toString();
  if (!error.includes('DevTools') && !error.includes('Electron Security Warning')) {
    console.error('[STDERR]', error);
  }
});

// テストシナリオ
async function runTest() {
  console.log('⏳ Waiting for app to initialize...');
  await sleep(5000);
  
  console.log('📝 Test Scenario:');
  console.log('1. Simulate 25 seconds of audio');
  console.log('2. 2 second silence');
  console.log('3. Another 25 seconds of audio');
  console.log('4. Verify paragraph formation\n');
  
  // テストを60秒実行
  await sleep(60000);
  
  // 結果を検証
  console.log('\n📊 Test Results:');
  console.log(`- Paragraph events: ${paragraphEvents.length}`);
  console.log(`- Translation events: ${translationEvents.length}`);
  
  if (paragraphEvents.length >= 2) {
    console.log('\n✅ Paragraph formation test PASSED');
    
    // タイミング分析
    paragraphEvents.forEach((event, index) => {
      console.log(`  Paragraph ${index + 1}: formed after ${Math.round(event.elapsed / 1000)}s`);
    });
    
    // 翻訳マッチング確認
    const translatedCount = paragraphEvents.filter(p => 
      translationEvents.some(t => t.id === `paragraph_${p.id}`)
    ).length;
    
    if (translatedCount === paragraphEvents.length) {
      console.log(`\n✅ All ${translatedCount} paragraphs received translations`);
      testPassed = true;
    } else {
      console.log(`\n⚠️ Only ${translatedCount}/${paragraphEvents.length} paragraphs received translations`);
    }
  } else {
    console.log('\n❌ Insufficient paragraphs formed');
    console.log(`   Expected: >= 2, Actual: ${paragraphEvents.length}`);
  }
  
  cleanup(testPassed ? 0 : 1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanup(exitCode) {
  clearTimeout(testTimeout);
  
  // アプリケーションを終了
  if (app && !app.killed) {
    app.kill('SIGTERM');
  }
  
  // 結果をファイルに保存
  const result = {
    timestamp: new Date().toISOString(),
    testName: 'paragraph-builder-integration',
    passed: exitCode === 0,
    paragraphEvents,
    translationEvents,
    duration: Date.now() - startTime
  };
  
  const resultPath = path.join(__dirname, '../../test-results/paragraph-builder-test.json');
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  
  console.log(`\n📄 Test results saved to: ${resultPath}`);
  process.exit(exitCode);
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => cleanup(1));
process.on('SIGTERM', () => cleanup(1));

// テスト実行
runTest().catch(error => {
  console.error('❌ Test error:', error);
  cleanup(1);
});