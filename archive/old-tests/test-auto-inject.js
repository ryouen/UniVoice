// Electronアプリ起動後に自動実行されるテストスクリプト
const { app, BrowserWindow } = require('electron');

// 既存のElectronアプリのウィンドウを取得
setTimeout(() => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const mainWindow = windows[0];
    
    // DevToolsを開く
    if (!mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.openDevTools();
    }
    
    // テストコマンドを自動実行
    mainWindow.webContents.executeJavaScript(`
      console.log('🚀 自動テスト開始...');
      
      // 1. イベントリスナー設定
      window.electron.on('currentOriginalUpdate', (event, data) => {
        console.log('🎤 Original:', data);
      });
      
      window.electron.on('currentTranslationUpdate', (event, text) => {
        console.log('🇯🇵 Translation:', text);
      });
      
      // 2. リスニング開始
      window.univoice.sendCommand({
        command: 'startListening',
        params: { sourceLanguage: 'en', targetLanguage: 'ja' }
      }).then(result => {
        console.log('✅ Started:', result);
        
        // 3. 2秒後にテストイベント送信
        setTimeout(() => {
          console.log('📤 テストイベント送信...');
          window.dispatchEvent(new CustomEvent('pipeline-event', {
            detail: {
              type: 'asr',
              correlationId: 'test-' + Date.now(),
              timestamp: Date.now(),
              data: {
                text: 'Hello world, this is an automatic test',
                isFinal: true,
                segmentId: 'test-segment-' + Date.now(),
                language: 'en',
                confidence: 0.95
              }
            }
          }));
        }, 2000);
      });
    `);
    
    console.log('[Test] 自動テストコマンドを実行しました');
  }
}, 3000); // アプリ起動から3秒後に実行