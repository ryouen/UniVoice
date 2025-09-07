// 既存のElectronアプリに直接イベントを送信するテスト
const { ipcRenderer } = require('electron');

// このスクリプトはブラウザのコンソールで実行する

// テスト用のASRイベントを作成
const testASREvent = {
  type: 'asr',
  correlationId: 'test-direct-123',
  timestamp: Date.now(),
  data: {
    text: 'Direct test of ASR event',
    isFinal: true,
    segmentId: 'direct-test-1',
    language: 'en',
    confidence: 0.95
  }
};

// テスト用の翻訳イベント
const testTranslationEvent = {
  type: 'translation',
  correlationId: 'test-direct-123',
  timestamp: Date.now(),
  data: {
    originalText: 'Direct test of ASR event',
    translatedText: 'ASRイベントの直接テスト',
    segmentId: 'direct-test-1',
    isFinal: true,
    sourceLanguage: 'en',
    targetLanguage: 'ja',
    confidence: 0.9
  }
};

// ブラウザコンソールで実行するコマンド
console.log(`
以下のコマンドをブラウザのDevToolsコンソールで実行してください:

// ASRイベントを送信
window.dispatchEvent(new CustomEvent('pipeline-event', { 
  detail: ${JSON.stringify(testASREvent, null, 2)}
}));

// 翻訳イベントを送信（1秒後）
setTimeout(() => {
  window.dispatchEvent(new CustomEvent('pipeline-event', { 
    detail: ${JSON.stringify(testTranslationEvent, null, 2)}
  }));
}, 1000);
`);