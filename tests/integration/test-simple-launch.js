/**
 * UniVoice 2.0 簡易起動テスト
 * 
 * 確認事項:
 * 1. Electronアプリが正常に起動するか
 * 2. エラーが発生していないか
 * 3. 基本的な初期化が完了するか
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 UniVoice 2.0 簡易起動テスト開始');
console.log('📋 テスト内容:');
console.log('  - Electron起動確認');
console.log('  - 初期化エラーチェック');
console.log('  - ログ出力確認');
console.log('');

// Electronアプリを起動
const electronPath = require('electron');
const appPath = path.join(__dirname, '../../');

console.log('📂 アプリケーションパス:', appPath);
console.log('⚡ Electron起動中...');

// 開発サーバーを使わないようにフラグを設定
const electronProcess = spawn(electronPath, [appPath, '--no-sandbox'], {
  env: { 
    ...process.env, 
    NODE_ENV: 'production',
    ELECTRON_IS_DEV: '0'
  }
});

let outputBuffer = '';
let errorBuffer = '';
let hasErrors = false;

// 標準出力をキャプチャ
electronProcess.stdout.on('data', (data) => {
  const output = data.toString();
  outputBuffer += output;
  
  // 重要なログは表示
  if (output.includes('[Main]') || output.includes('[UniVoice]') || output.includes('initialized')) {
    console.log('✅', output.trim());
  }
});

// エラー出力をキャプチャ
electronProcess.stderr.on('data', (data) => {
  const error = data.toString();
  errorBuffer += error;
  hasErrors = true;
  console.error('❌ [Error]', error.trim());
});

// 10秒後に結果を出力して終了
setTimeout(() => {
  console.log('\n📊 テスト結果:');
  console.log('─'.repeat(50));
  
  if (!hasErrors) {
    console.log('✅ アプリケーションは正常に起動しました');
  } else {
    console.log('❌ エラーが検出されました');
  }
  
  // ログの概要
  const logLines = outputBuffer.split('\n').filter(line => line.trim());
  console.log(`\n📝 ログ出力数: ${logLines.length}行`);
  
  // 重要なログを抽出
  const importantLogs = logLines.filter(line => 
    line.includes('initialized') || 
    line.includes('setup completed') ||
    line.includes('ready') ||
    line.includes('loaded')
  );
  
  if (importantLogs.length > 0) {
    console.log('\n🔍 重要なログ:');
    importantLogs.forEach(log => console.log('  -', log.trim()));
  }
  
  // プロセスを終了
  electronProcess.kill();
  
  // 終了コードを設定
  process.exit(hasErrors ? 1 : 0);
}, 10000);

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n🛑 テスト中断');
  electronProcess.kill();
  process.exit(1);
});