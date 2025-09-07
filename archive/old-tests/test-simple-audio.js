// 簡単な音声テスト
// Node.jsで実行して、Deepgramの接続を直接テスト

const WebSocket = require('ws');
const fs = require('fs');
require('dotenv').config();

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  console.error('DEEPGRAM_API_KEY is not set in .env file');
  process.exit(1);
}

console.log('Testing Deepgram connection...');
console.log('API Key available:', !!DEEPGRAM_API_KEY);
console.log('API Key prefix:', DEEPGRAM_API_KEY.substring(0, 10) + '...');

// Deepgram WebSocket URL
const wsUrl = 'wss://api.deepgram.com/v1/listen?' +
  'model=nova-3&' +
  'interim_results=true&' +
  'endpointing=800&' +
  'utterance_end_ms=1000&' +
  'language=en&' +
  'sample_rate=16000&' +
  'channels=1&' +
  'encoding=linear16';

const ws = new WebSocket(wsUrl, {
  headers: {
    'Authorization': `Token ${DEEPGRAM_API_KEY}`,
  },
});

ws.on('open', () => {
  console.log('✅ Deepgram WebSocket connected successfully!');
  
  // 無音データを送信してテスト
  const silentBuffer = Buffer.alloc(1600); // 100ms of silence at 16kHz
  ws.send(silentBuffer);
  console.log('Sent test audio data');
  
  // 5秒後に接続を閉じる
  setTimeout(() => {
    ws.close();
    console.log('Test completed');
  }, 5000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Deepgram message received:', JSON.stringify(message, null, 2));
});

ws.on('error', (error) => {
  console.error('❌ Deepgram WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket closed');
});