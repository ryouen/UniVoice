/**
 * 高品質翻訳の履歴統合テスト
 * FlexibleHistoryGrouper と history_ プレフィックス付き翻訳の動作確認
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('=== 高品質翻訳履歴統合テスト ===');
console.log('1. Electronアプリを起動');
console.log('2. 音声認識を開始');
console.log('3. history_ プレフィックス付き翻訳イベントの処理を確認');
console.log('4. FlexibleHistoryGrouperの動作を確認');

// テスト用のElectronプロセスを起動
const electronPath = require('electron');
const appPath = path.join(__dirname, '../../');

console.log('\n[Info] Electronアプリを起動中...');
const electronProcess = spawn(electronPath, [appPath], {
  env: {
    ...process.env,
    NODE_ENV: 'development',
    TEST_MODE: 'high-quality-translation'
  }
});

// 標準出力をモニタリング
electronProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // 高品質翻訳関連のログを探す
  if (output.includes('[useUnifiedPipeline] History translation received:')) {
    console.log('\n✅ 高品質翻訳を受信:', output.trim());
  }
  
  if (output.includes('[useUnifiedPipeline] High-quality translation stored:')) {
    console.log('✅ 高品質翻訳を保存:', output.trim());
  }
  
  if (output.includes('[useUnifiedPipeline] Updating sentence translation:')) {
    console.log('✅ 履歴ブロックを更新:', output.trim());
  }
  
  if (output.includes('[useUnifiedPipeline] History block sent to main process:')) {
    console.log('✅ 履歴ブロックをメインプロセスに送信:', output.trim());
  }
  
  // FlexibleHistoryGrouper関連のログ
  if (output.includes('FlexibleHistoryGrouper')) {
    console.log('📚 FlexibleHistoryGrouper:', output.trim());
  }
});

// エラー出力をモニタリング
electronProcess.stderr.on('data', (data) => {
  console.error('❌ エラー:', data.toString());
});

// プロセス終了時
electronProcess.on('close', (code) => {
  console.log(`\n[Info] Electronプロセスが終了しました (code: ${code})`);
});

// 手動テスト手順
console.log('\n=== 手動テスト手順 ===');
console.log('1. アプリが起動したら、言語設定を確認');
console.log('2. "Start Recording" をクリックして音声認識を開始');
console.log('3. 英語で話す（または音声ファイルを再生）');
console.log('4. 履歴セクションに以下を確認:');
console.log('   - 3-5文ごとにブロック化されている');
console.log('   - 各ブロックに原文と翻訳が表示されている');
console.log('   - 高品質翻訳で更新されている（遅延あり）');
console.log('5. コンソールログで history_ プレフィックスのイベントを確認');
console.log('\n[Info] Ctrl+C でテストを終了');

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n[Info] テストを終了します...');
  electronProcess.kill();
  process.exit(0);
});