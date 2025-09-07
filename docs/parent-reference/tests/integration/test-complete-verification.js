#!/usr/bin/env node
/**
 * test-complete-verification.js
 * ①～⑥全機能の完全動作確認（3分短縮版）
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// 設定
const TEST_NAME = 'complete-verification';
const TEST_DURATION_MS = 3 * 60 * 1000;  // 3分
const AUDIO_FILE = './sample_voice/Hayes.wav';
const SUMMARY_INTERVAL_MINUTES = 1;  // テスト用に1分間隔

// Frame settings
const FRAME_MS = 20;
const FRAME_SIZE = 640;

// Deepgram params
const DG_PARAMS = new URLSearchParams({
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

const DEEPGRAM_WS_URL = `wss://api.deepgram.com/v1/listen?${DG_PARAMS}`;

// OpenAI
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper functions
const {
  generateSummary,
  translateSummary,
  generateVocabulary,
  generateFinalReport
} = require('./test-gpt5-helpers.js');

// 結果格納
const results = {
  '①音声入力': { status: '待機中', details: '' },
  '②ASR': { status: '待機中', count: 0 },
  '②翻訳': { status: '待機中', count: 0 },
  '③要約': { status: '待機中', count: 0 },
  '④要約翻訳': { status: '待機中', count: 0 },
  '⑤語彙': { status: '待機中', count: 0 },
  '⑥最終レポート': { status: '待機中', english: false, japanese: false }
};

// State
let audioBuffer;
let frameIndex = 0;
let ws;
let transcriptBuffer = [];
let translationCount = 0;
let lastSummaryMinute = -1;
let startTime = Date.now();
let summaryData = [];

// Audio Loading
function loadAudio() {
  try {
    const audioData = fs.readFileSync(AUDIO_FILE);
    audioBuffer = audioData.slice(44);
    const totalFrames = Math.floor(audioBuffer.length / FRAME_SIZE);
    
    results['①音声入力'].status = '✅成功';
    results['①音声入力'].details = `${totalFrames}フレーム (${(totalFrames * FRAME_MS / 1000).toFixed(1)}秒)`;
    
    console.log(`✅ ①音声入力: ${audioBuffer.length} bytes, ${totalFrames} frames`);
    return true;
  } catch (error) {
    results['①音声入力'].status = '❌失敗';
    results['①音声入力'].details = error.message;
    console.error('❌ ①音声入力失敗:', error.message);
    return false;
  }
}

// Deepgram WebSocket
function connectDeepgram() {
  ws = new WebSocket(DEEPGRAM_WS_URL, {
    headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}` }
  });

  ws.on('open', () => {
    console.log('🔌 Deepgram connected');
    startAudioStream();
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'Results') {
        const alt = msg.channel?.alternatives?.[0];
        if (!alt) return;
        
        const text = alt.transcript;
        const isFinal = msg.is_final;
        
        if (!text) return;
        
        // ②ASR成功
        if (isFinal) {
          results['②ASR'].count++;
          results['②ASR'].status = '✅動作中';
          console.log(`   ②ASR #${results['②ASR'].count}: "${text.substring(0, 50)}..."`);
          
          transcriptBuffer.push(text);
          
          // ②翻訳（簡易版）
          translateText(text);
          
          // Summary check
          await checkForSummary();
        }
      }
    } catch (error) {
      console.error('ASR error:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Deepgram disconnected');
  });
}

// ②翻訳処理（簡易版）
async function translateText(text) {
  try {
    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      input: [
        { role: 'system', content: 'Translate English to Japanese. Output only translation.' },
        { role: 'user', content: text }
      ],
      max_output_tokens: parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500')
    });
    
    if (response.output_text) {
      results['②翻訳'].count++;
      results['②翻訳'].status = '✅動作中';
      
      if (results['②翻訳'].count <= 3) {
        console.log(`   ②翻訳 #${results['②翻訳'].count}: "${response.output_text.substring(0, 50)}..."`);
      }
    }
  } catch (error) {
    console.error('Translation error:', error.message);
  }
}

// ③④⑤要約処理
async function checkForSummary() {
  const currentTime = Date.now();
  const minute = Math.floor((currentTime - startTime) / 60000);
  
  if (minute >= SUMMARY_INTERVAL_MINUTES && 
      minute % SUMMARY_INTERVAL_MINUTES === 0 && 
      minute !== lastSummaryMinute) {
    
    lastSummaryMinute = minute;
    
    const textToSummarize = transcriptBuffer.join(' ');
    transcriptBuffer = [];
    
    if (textToSummarize.length < 50) return;
    
    console.log(`\n🔄 ${minute}分時点の要約処理...`);
    
    try {
      // ③英語要約
      const englishSummary = await generateSummary(textToSummarize);
      if (englishSummary) {
        results['③要約'].count++;
        results['③要約'].status = '✅成功';
        console.log(`   ③要約: "${englishSummary.substring(0, 80)}..."`);
        
        // ④要約翻訳
        const japaneseSummary = await translateSummary(englishSummary);
        if (japaneseSummary && japaneseSummary.length > 0) {
          results['④要約翻訳'].count++;
          results['④要約翻訳'].status = '✅成功';
          console.log(`   ④要約翻訳: "${japaneseSummary.substring(0, 80)}..."`);
        } else {
          results['④要約翻訳'].status = '❌失敗';
        }
        
        // ⑤語彙抽出
        const vocabulary = await generateVocabulary(textToSummarize);
        if (Array.isArray(vocabulary) && vocabulary.length > 0) {
          results['⑤語彙'].count = vocabulary.length;
          results['⑤語彙'].status = '✅成功';
          console.log(`   ⑤語彙: ${vocabulary.length}語抽出`);
          vocabulary.slice(0, 3).forEach((v, i) => {
            console.log(`      ${i+1}. ${v.term_en} → ${v.term_ja}`);
          });
        } else {
          results['⑤語彙'].status = '❌失敗';
        }
        
        summaryData.push({
          minute,
          englishSummary,
          japaneseSummary,
          vocabulary
        });
      }
    } catch (error) {
      console.error('Summary error:', error.message);
    }
  }
}

// Audio Streaming
function startAudioStream() {
  const interval = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      clearInterval(interval);
      return;
    }
    
    if (frameIndex >= Math.floor(audioBuffer.length / FRAME_SIZE)) {
      clearInterval(interval);
      ws.close();
      endTest();
      return;
    }
    
    const frame = audioBuffer.slice(
      frameIndex * FRAME_SIZE,
      (frameIndex + 1) * FRAME_SIZE
    );
    
    ws.send(frame);
    frameIndex++;
  }, FRAME_MS);
  
  setTimeout(() => {
    clearInterval(interval);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    endTest();
  }, TEST_DURATION_MS);
}

// Test End
async function endTest() {
  console.log('\n📊 テスト終了処理...');
  
  // 最後の要約
  if (transcriptBuffer.length > 0) {
    await checkForSummary();
  }
  
  // ⑥最終レポート
  try {
    console.log('\n⑥最終レポート生成...');
    const allTranscripts = transcriptBuffer.join(' ');
    const allSummaries = summaryData.map(s => s.englishSummary).join(' ');
    const allVocabulary = summaryData.flatMap(s => s.vocabulary || []);
    
    // 英語レポート
    const englishReport = await generateFinalReport(
      allTranscripts || 'Test transcripts',
      allSummaries || 'Test summaries',
      allVocabulary
    );
    
    if (englishReport && englishReport.length > 0) {
      results['⑥最終レポート'].english = true;
      console.log(`   ⑥英語レポート: ${englishReport.length}文字`);
      
      // 日本語翻訳
      const japaneseReport = await translateSummary(englishReport.substring(0, 500)); // 短縮版
      if (japaneseReport && japaneseReport.length > 0) {
        results['⑥最終レポート'].japanese = true;
        console.log(`   ⑥日本語レポート: ${japaneseReport.length}文字`);
      }
    }
    
    results['⑥最終レポート'].status = 
      results['⑥最終レポート'].english && results['⑥最終レポート'].japanese ? '✅成功' : '⚠️部分的';
      
  } catch (error) {
    results['⑥最終レポート'].status = '❌失敗';
    console.error('Final report error:', error.message);
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 完全動作確認テスト結果');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([key, value]) => {
    const status = value.status;
    const details = value.count ? `(${value.count}回/個)` : 
                   value.details ? `(${value.details})` : 
                   value.english !== undefined ? `(英:${value.english ? '✅' : '❌'} 日:${value.japanese ? '✅' : '❌'})` : '';
    console.log(`${key}: ${status} ${details}`);
  });
  
  // 総合判定
  const allSuccess = Object.values(results).every(r => 
    r.status === '✅成功' || r.status === '✅動作中'
  );
  
  console.log('\n総合判定: ' + (allSuccess ? '🎉 全機能正常動作！' : '⚠️ 一部機能に問題あり'));
  console.log('='.repeat(60));
  
  process.exit(0);
}

// Main
async function main() {
  console.log('🚀 ①～⑥完全動作確認テスト（3分版）');
  console.log('='.repeat(60));
  console.log('環境変数:');
  console.log(`  TRANSLATE_MAX_TOKENS: ${process.env.OPENAI_TRANSLATE_MAX_TOKENS}`);
  console.log(`  SUMMARY_MAX_TOKENS: ${process.env.OPENAI_SUMMARY_MAX_TOKENS}`);
  console.log(`  VOCAB_MAX_TOKENS: ${process.env.OPENAI_VOCAB_MAX_TOKENS}`);
  console.log('='.repeat(60) + '\n');
  
  startTime = Date.now();
  
  if (!loadAudio()) {
    process.exit(1);
  }
  
  connectDeepgram();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});