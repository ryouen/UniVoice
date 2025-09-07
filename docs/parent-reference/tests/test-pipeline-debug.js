/**
 * パイプラインデバッグツール
 */

const WebSocket = require('ws');
const dotenv = require('dotenv');
dotenv.config();

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

console.log('Starting Deepgram debug test...');
console.log('API Key:', DEEPGRAM_API_KEY?.substring(0, 20) + '...');

// Deepgram接続パラメータ
const params = new URLSearchParams({
  encoding: 'linear16',
  sample_rate: '16000',
  interim_results: 'true',
  endpointing: '800',
  utterance_end_ms: '1000',
  punctuate: 'true',
  diarize: 'false',
  model: 'nova-3',
  version: 'latest'
});

const url = `wss://api.deepgram.com/v1/listen?${params}`;

console.log('Connecting to:', url);

const ws = new WebSocket(url, {
  headers: {
    'Authorization': `Token ${DEEPGRAM_API_KEY}`
  }
});

ws.on('open', () => {
  console.log('[Deepgram] Connected successfully!');
  
  // PCM音声データを作成（440Hzのサイン波）
  const sampleRate = 16000;
  const duration = 1; // 1秒
  const frequency = 440; // 440Hz (A4音)
  const samples = sampleRate * duration;
  const pcmData = new Int16Array(samples);
  
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const value = Math.sin(2 * Math.PI * frequency * t);
    pcmData[i] = Math.floor(value * 0x7FFF * 0.3); // 30%音量
  }
  
  ws.send(pcmData.buffer);
  console.log('[Deepgram] Sent test audio (440Hz tone)');
  
  // 5秒後に接続を閉じる
  setTimeout(() => {
    console.log('[Deepgram] Closing connection...');
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('[Deepgram] Message received:', JSON.stringify(msg, null, 2));
    
    if (msg.channel?.alternatives?.[0]?.transcript) {
      console.log('[Deepgram] Transcript:', msg.channel.alternatives[0].transcript);
    }
  } catch (error) {
    console.error('[Deepgram] Parse error:', error);
  }
});

ws.on('error', (error) => {
  console.error('[Deepgram] Error:', error);
});

ws.on('close', () => {
  console.log('[Deepgram] Connection closed');
  process.exit(0);
});