/**
 * 統合テスト：セットアップ画面の表示確認
 * 
 * テスト項目：
 * 1. アプリが起動すること
 * 2. セットアップ画面が表示されること
 * 3. 必要なUI要素が存在すること
 */

const { exec } = require('child_process');
const path = require('path');

console.log('=== UniVoice 2.0 統合テスト：セットアップ画面 ===\n');

// テスト用のElectronアプリを起動
const electronPath = require('electron');
const appPath = path.join(__dirname, '..', '..');

console.log('1. Electronアプリを起動します...');
console.log(`   Path: ${appPath}`);

const electronProcess = exec(`"${electronPath}" "${appPath}" --enable-logging`, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ エラー:', error);
    return;
  }
  console.log('stdout:', stdout);
  if (stderr) console.error('stderr:', stderr);
});

// アプリの起動ログを監視
electronProcess.stdout.on('data', (data) => {
  const log = data.toString();
  
  // 重要なログをフィルタリング
  if (log.includes('[Main]') || log.includes('[UniVoice]') || log.includes('Error')) {
    console.log('📋 LOG:', log.trim());
  }
  
  // セットアップ画面の表示確認
  if (log.includes('UniVoice Preload] Script loaded')) {
    console.log('✅ 2. Preloadスクリプトが正常にロードされました');
  }
  
  if (log.includes('window.univoice API is ready')) {
    console.log('✅ 3. window.univoice APIが利用可能です');
  }
  
  if (log.includes('DevTools enabled')) {
    console.log('✅ 4. DevToolsが有効化されました（F12で開けます）');
  }
});

electronProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('Error') || error.includes('Warning')) {
    console.error('❌ ERROR:', error.trim());
  }
});

// テスト完了までの待機時間
setTimeout(() => {
  console.log('\n=== テスト結果 ===');
  console.log('以下の項目を手動で確認してください：');
  console.log('□ セットアップ画面が表示されている');
  console.log('□ 授業名の入力フィールドがある');
  console.log('□ 言語選択ドロップダウンがある（元の言語・翻訳先）');
  console.log('□ 「授業を開始」ボタンがある');
  console.log('□ UIが元のUniVoicePerfectと同じデザインである');
  console.log('\n確認後、Ctrl+Cでテストを終了してください。');
}, 5000);

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\nテストを終了します...');
  electronProcess.kill();
  process.exit(0);
});