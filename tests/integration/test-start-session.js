/**
 * 統合テスト：授業開始ボタンの動作確認
 * 
 * テスト項目：
 * 1. 授業開始ボタンをクリックできること
 * 2. IPCコマンドが正しく送信されること
 * 3. セッション開始のレスポンスが返ること
 * 4. UIが授業中の画面に遷移すること
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('=== UniVoice 2.0 統合テスト：授業開始機能 ===\n');

// Electronアプリにテストスクリプトを注入
const testScript = `
// 自動テストスクリプト
setTimeout(() => {
  console.log('[TEST] Starting automated test...');
  
  // セットアップフォームに値を入力
  const classNameInput = document.querySelector('input[placeholder*="授業名"]');
  if (classNameInput) {
    classNameInput.value = 'テスト授業';
    console.log('[TEST] ✅ 授業名を入力しました');
  } else {
    console.error('[TEST] ❌ 授業名入力フィールドが見つかりません');
  }
  
  // 言語選択（デフォルト値を使用）
  console.log('[TEST] 言語設定: 英語 → 日本語（デフォルト）');
  
  // 授業開始ボタンをクリック
  const startButton = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.includes('授業を開始'));
    
  if (startButton) {
    console.log('[TEST] ✅ 授業開始ボタンを発見');
    
    // window.univoice APIの動作を監視
    if (window.univoice && window.univoice.onStatusEvent) {
      window.univoice.onStatusEvent((event) => {
        console.log('[TEST] Status Event:', event);
      });
    }
    
    // ボタンクリック
    startButton.click();
    console.log('[TEST] ✅ 授業開始ボタンをクリックしました');
    
    // 画面遷移を確認
    setTimeout(() => {
      const isSessionActive = document.querySelector('.session-container') || 
                            document.querySelector('[class*="session"]');
      if (isSessionActive) {
        console.log('[TEST] ✅ セッション画面に遷移しました');
      } else {
        console.log('[TEST] ⚠️ セッション画面への遷移を確認できません');
      }
    }, 2000);
    
  } else {
    console.error('[TEST] ❌ 授業開始ボタンが見つかりません');
  }
}, 3000);
`;

// テスト用の設定ファイルを作成
const fs = require('fs');
const testPreloadPath = path.join(__dirname, 'test-preload.js');

// 既存のpreloadスクリプトを読み込んで、テストコードを追加
const originalPreload = fs.readFileSync(
  path.join(__dirname, '..', '..', 'dist-electron', 'preload.js'), 
  'utf8'
);

fs.writeFileSync(testPreloadPath, `
${originalPreload}

// テストコードを注入
contextBridge.exposeInMainWorld('__test__', {
  runTest: () => {
    ${testScript}
  }
});
`);

// Electronアプリを起動
const electronPath = require('electron');
const appPath = path.join(__dirname, '..', '..');

console.log('1. テスト用Electronアプリを起動します...');

const electronProcess = spawn(electronPath, [
  appPath,
  '--enable-logging',
  `--preload=${testPreloadPath}`
], {
  stdio: ['inherit', 'pipe', 'pipe']
});

// ログ監視
electronProcess.stdout.on('data', (data) => {
  const log = data.toString();
  
  // IPCコマンドの監視
  if (log.includes('Received command:')) {
    console.log('📋 IPC Command:', log.trim());
  }
  
  if (log.includes('[TEST]')) {
    console.log(log.trim());
  }
  
  if (log.includes('startListening')) {
    console.log('✅ startListeningコマンドが送信されました');
  }
});

electronProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('[TEST]') || error.includes('Error')) {
    console.error(error.trim());
  }
});

// アプリが起動したらテストを実行
setTimeout(() => {
  console.log('\n2. 自動テストを開始します...');
  console.log('   （DevToolsコンソールで window.__test__.runTest() を実行してください）');
}, 5000);

// テスト結果の確認
setTimeout(() => {
  console.log('\n=== テスト結果 ===');
  console.log('以下の項目を確認してください：');
  console.log('□ 授業名が入力された');
  console.log('□ 授業開始ボタンがクリックされた');
  console.log('□ startListeningコマンドがIPCで送信された');
  console.log('□ セッション画面に遷移した');
  console.log('□ エラーが発生していない');
  console.log('\n確認後、Ctrl+Cでテストを終了してください。');
}, 10000);

// クリーンアップ
process.on('SIGINT', () => {
  console.log('\nテストを終了します...');
  electronProcess.kill();
  fs.unlinkSync(testPreloadPath);
  process.exit(0);
});