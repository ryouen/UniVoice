// テスト用スクリプト - イベントフローの確認
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', async () => {
  // ウィンドウ作成
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 開発サーバーに接続
  await mainWindow.loadURL('http://localhost:5173');
  
  // DevTools を開く
  mainWindow.webContents.openDevTools();

  // 少し待ってからテストイベントを送信
  setTimeout(() => {
    console.log('[Test] Sending test events...');
    
    // ASRイベントを送信
    mainWindow.webContents.send('pipeline-event', {
      type: 'asr',
      correlationId: 'test-123',
      timestamp: Date.now(),
      data: {
        text: 'This is a test message',
        isFinal: true,
        segmentId: 'test-segment-1',
        language: 'en',
        confidence: 0.95
      }
    });

    // 少し遅れて翻訳イベントを送信
    setTimeout(() => {
      mainWindow.webContents.send('pipeline-event', {
        type: 'translation',
        correlationId: 'test-123',
        timestamp: Date.now(),
        data: {
          originalText: 'This is a test message',
          translatedText: 'これはテストメッセージです',
          segmentId: 'test-segment-1',
          isFinal: true,
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          confidence: 0.9
        }
      });
    }, 500);

    // さらに別のセグメント
    setTimeout(() => {
      mainWindow.webContents.send('pipeline-event', {
        type: 'asr',
        correlationId: 'test-123',
        timestamp: Date.now(),
        data: {
          text: 'Second test segment',
          isFinal: true,
          segmentId: 'test-segment-2',
          language: 'en',
          confidence: 0.95
        }
      });
    }, 2000);

    setTimeout(() => {
      mainWindow.webContents.send('pipeline-event', {
        type: 'translation',
        correlationId: 'test-123',
        timestamp: Date.now(),
        data: {
          originalText: 'Second test segment',
          translatedText: '2番目のテストセグメント',
          segmentId: 'test-segment-2',
          isFinal: true,
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          confidence: 0.9
        }
      });
    }, 2500);

  }, 3000);
});