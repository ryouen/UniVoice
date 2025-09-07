// 音声データフローの詳細追跡テスト
// このスクリプトで、各ステップでのデータの流れを確認

const { spawn } = require('child_process');
const path = require('path');

console.log('=== UniVoice Audio Flow Debug Test ===');
console.log('Starting Electron app with detailed logging...\n');

// Electronアプリを起動（メインプロセスのログが見える）
const electron = spawn('npm', ['run', 'electron'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\nStopping Electron app...');
  electron.kill();
  process.exit();
});

console.log(`
=== 音声データフローの確認手順 ===

1. アプリが起動したら、ブラウザの開発者ツール（F12）を開く

2. Consoleタブで以下を確認：
   - "Microphone permission granted" のメッセージ
   - "Audio chunk sent" のメッセージ
   - "Pipeline event received" のメッセージ

3. ターミナル（このウィンドウ）で以下を確認：
   - "[Main] Audio chunk received" のメッセージ
   - "[UnifiedPipelineService] Deepgram message received" のメッセージ
   - "[UnifiedPipelineService] Emitting ASR event" のメッセージ

4. 音声入力テスト：
   - "Start Listening" ボタンをクリック
   - 英語で話す（例："Hello, this is a test"）
   - 音声が文字起こしされるか確認

5. 問題が発生した場合：
   - どのステップで止まっているか記録
   - エラーメッセージがあれば記録

Ctrl+C で終了
`);