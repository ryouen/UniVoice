/**
 * API動作確認テスト
 * window.univoice APIが正しく実装されているか確認
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('=== UniVoice 2.0 API動作確認テスト ===\n');

// DevToolsで実行するテストコード
const testScript = `
// API存在確認
console.log('1. window.univoice API確認');
console.log('   存在:', !!window.univoice);
console.log('   メソッド:', Object.keys(window.univoice || {}));

// セッション開始のシミュレート
if (window.univoice) {
  console.log('\\n2. セッション開始テスト');
  
  // イベントリスナー設定
  window.univoice.onStatusEvent((event) => {
    console.log('   Status Event:', event);
  });
  
  window.univoice.onASREvent((event) => {
    console.log('   ASR Event:', event);
  });
  
  window.univoice.onTranslationEvent((event) => {
    console.log('   Translation Event:', event);
  });
  
  // デバッグ情報取得
  const debugInfo = window.univoice.getDebugInfo();
  console.log('\\n3. デバッグ情報:', debugInfo);
  
  // コマンド送信テスト
  console.log('\\n4. startListeningコマンドテスト');
  try {
    const correlationId = window.univoice.generateCorrelationId();
    console.log('   CorrelationId:', correlationId);
    
    window.univoice.startListening('en', 'ja').then(() => {
      console.log('   ✅ startListening成功');
    }).catch(err => {
      console.log('   ❌ startListening失敗:', err);
    });
  } catch (error) {
    console.log('   ❌ エラー:', error);
  }
}

// UI要素の確認
console.log('\\n5. UI要素確認');
const setupForm = document.querySelector('.max-w-md');
console.log('   セットアップフォーム:', !!setupForm);

const classNameInput = document.querySelector('input[placeholder*="授業名"]');
console.log('   授業名入力:', !!classNameInput);

const startButton = Array.from(document.querySelectorAll('button'))
  .find(btn => btn.textContent.includes('授業を開始'));
console.log('   開始ボタン:', !!startButton);

// Reactコンポーネントの状態確認
console.log('\\n6. Reactコンポーネント確認');
const reactRoot = document.getElementById('root');
if (reactRoot && reactRoot._reactRootContainer) {
  console.log('   React Root:', !!reactRoot._reactRootContainer);
}

// hooks の状態確認（開発モードのみ）
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('   React DevTools利用可能');
}
`;

console.log('テスト用スクリプトを生成しました。');
console.log('\n以下の手順でテストを実行してください：');
console.log('1. npm run electron でアプリを起動');
console.log('2. F12キーでDevToolsを開く');
console.log('3. Consoleタブで以下のスクリプトを実行：\n');
console.log('='.repeat(60));
console.log(testScript);
console.log('='.repeat(60));
console.log('\n実行後、結果を確認してください。');