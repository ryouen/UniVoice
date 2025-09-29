/**
 * リアルタイム音声認識・翻訳テスト（最終版）
 * マイクから音声を取得してDeepgram→GPT-5で処理
 */

const WebSocket = require('ws');
const record = require('node-record-lpcm16');
const dotenv = require('dotenv');
dotenv.config();

// Helper functions
const { translateWithRetry } = require('./tests/helpers/gpt5-helpers');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

console.log('=== リアルタイム音声認識・翻訳テスト ===');
console.log('Deepgram API Key:', DEEPGRAM_API_KEY?.substring(0, 20) + '...');
console.log('話してください（Ctrl+Cで終了）\n');

// Deepgram WebSocket接続
const params = new URLSearchParams({
  encoding: 'linear16',
  sample_rate: '16000',
  language: 'en',
  interim_results: 'true',
  endpointing: '800',
  utterance_end_ms: '1000',
  punctuate: 'true',
  model: 'nova-3'
});

const url = `wss://api.deepgram.com/v1/listen?${params}`;
const ws = new WebSocket(url, {
  headers: {
    'Authorization': `Token ${DEEPGRAM_API_KEY}`
  }
});

// マイク録音開始
const recording = record.record({
  sampleRate: 16000,
  channels: 1,
  audioType: 'raw',
  recorder: 'sox'
});

ws.on('open', () => {
  console.log('[Deepgram] 接続成功！\n');
  
  // マイクデータをDeepgramに送信
  recording.stream()
    .on('data', (chunk) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk);
      }
    })
    .on('error', (error) => {
      console.error('[マイク] エラー:', error);
    });
});

// Deepgramからの応答処理
ws.on('message', async (data) => {
  try {
    const msg = JSON.parse(data.toString());
    
    if (msg.type === 'Results') {
      const alt = msg.channel?.alternatives?.[0];
      if (!alt) return;
      
      const text = alt.transcript || '';
      const isFinal = msg.is_final;
      
      if (text.trim()) {
        if (isFinal) {
          console.log('\n[英語] ' + text);
          
          // GPT-5で翻訳
          try {
            const translation = await translateWithRetry({
              srcLang: 'en',
              tgtLang: 'ja',
              text: text,
              onDelta: (delta) => {
                process.stdout.write(delta);
              },
              onFirstPaint: (ms) => {
                process.stdout.write('[日本語] ');
              }
            });
            console.log('\n'); // 改行
          } catch (error) {
            console.error('[翻訳エラー]', error.message);
          }
        } else {
          // 中間結果（グレー表示）
          process.stdout.write('\x1b[90m' + text + '\x1b[0m\r');
        }
      }
    }
  } catch (error) {
    console.error('[Deepgram] パースエラー:', error);
  }
});

ws.on('error', (error) => {
  console.error('[Deepgram] エラー:', error);
});

ws.on('close', () => {
  console.log('[Deepgram] 接続終了');
  recording.stop();
  process.exit(0);
});

// 終了処理
process.on('SIGINT', () => {
  console.log('\n\n終了中...');
  ws.close();
  recording.stop();
  setTimeout(() => process.exit(0), 1000);
});