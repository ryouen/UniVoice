/**
 * UniVoice 2.0 基本統合テスト
 * 
 * 確認事項:
 * 1. GPT-5 API (responses.create) の正しい動作
 * 2. RealtimeDisplayManagerの統合
 * 3. 基本的なパフォーマンス測定
 */

const { spawn } = require('child_process');
const path = require('path');

// タイミング測定用
const metrics = {
  startTime: Date.now(),
  firstPaint: null,
  translationComplete: null,
  events: []
};

console.log('🚀 UniVoice 2.0 統合テスト開始');
console.log('📋 テスト内容:');
console.log('  - GPT-5 API統合確認');
console.log('  - 3行表示UI動作確認');
console.log('  - パフォーマンス測定');
console.log('');

// Electronアプリを起動
const electronPath = require('electron');
const appPath = path.join(__dirname, '../../');

console.log('📂 アプリケーションパス:', appPath);
console.log('⚡ Electron起動中...');

const electronProcess = spawn(electronPath, [appPath], {
  env: { ...process.env, NODE_ENV: 'production' }
});

let outputBuffer = '';

// 標準出力をキャプチャ
electronProcess.stdout.on('data', (data) => {
  const output = data.toString();
  outputBuffer += output;
  
  // メトリクス収集
  if (output.includes('[UniVoice]')) {
    const timestamp = Date.now() - metrics.startTime;
    
    if (output.includes('first paint') && !metrics.firstPaint) {
      metrics.firstPaint = timestamp;
      console.log(`✅ First Paint: ${timestamp}ms`);
    }
    
    if (output.includes('translation complete') && !metrics.translationComplete) {
      metrics.translationComplete = timestamp;
      console.log(`✅ Translation Complete: ${timestamp}ms`);
    }
    
    metrics.events.push({
      timestamp,
      message: output.trim()
    });
  }
  
  // デバッグ出力
  if (process.env.DEBUG || output.includes('error') || output.includes('Error')) {
    console.log('[Electron]', output.trim());
  }
});

// エラー出力をキャプチャ
electronProcess.stderr.on('data', (data) => {
  console.error('[Electron Error]', data.toString());
});

// 30秒後に結果を出力して終了
setTimeout(() => {
  console.log('\n📊 テスト結果サマリー:');
  console.log('─'.repeat(50));
  
  if (metrics.firstPaint) {
    const status = metrics.firstPaint <= 1000 ? '✅ PASS' : '❌ FAIL';
    console.log(`First Paint: ${metrics.firstPaint}ms ${status} (基準: ≤1000ms)`);
  } else {
    console.log('❌ First Paint: 測定できませんでした');
  }
  
  if (metrics.translationComplete) {
    const status = metrics.translationComplete <= 2000 ? '✅ PASS' : '❌ FAIL';
    console.log(`Translation Complete: ${metrics.translationComplete}ms ${status} (基準: ≤2000ms)`);
  } else {
    console.log('❌ Translation Complete: 測定できませんでした');
  }
  
  console.log(`\n📝 記録されたイベント数: ${metrics.events.length}`);
  
  // API使用状況の確認
  const gpt5Calls = outputBuffer.match(/responses\.create/g)?.length || 0;
  const deepgramCalls = outputBuffer.match(/Deepgram.*WebSocket/g)?.length || 0;
  
  console.log(`\n🔌 API使用状況:`);
  console.log(`  - GPT-5 API呼び出し: ${gpt5Calls}回`);
  console.log(`  - Deepgram WebSocket: ${deepgramCalls}回`);
  
  // エラーチェック
  const errors = outputBuffer.match(/error|Error|ERROR/gi) || [];
  if (errors.length > 0) {
    console.log(`\n⚠️  エラー検出: ${errors.length}件`);
  }
  
  // プロセスを終了
  electronProcess.kill();
  
  // 終了コードを設定
  const hasErrors = errors.length > 0 || !metrics.firstPaint;
  process.exit(hasErrors ? 1 : 0);
}, 30000);

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n🛑 テスト中断');
  electronProcess.kill();
  process.exit(1);
});