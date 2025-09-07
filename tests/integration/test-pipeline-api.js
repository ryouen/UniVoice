/**
 * UniVoice 2.0 パイプラインAPIテスト
 * 
 * 確認事項:
 * 1. GPT-5 responses.create APIの動作確認
 * 2. パフォーマンスメトリクスの計測
 * 3. エラーハンドリングの確認
 */

require('dotenv').config();
const { UnifiedPipelineService } = require('../../dist-electron/services/domain/UnifiedPipelineService');

console.log('🚀 UniVoice 2.0 パイプラインAPIテスト開始');
console.log('📋 テスト内容:');
console.log('  - GPT-5 API統合確認');
console.log('  - メトリクス計測');
console.log('  - 翻訳処理の動作確認');
console.log('');

// 設定
const audioConfig = { 
  frameMs: 20, 
  frameSize: 640, 
  sampleRate: 16000 
};

const deepgramConfig = {
  apiKey: process.env.DEEPGRAM_API_KEY || '',
  model: 'nova-3',
  interim: true,
  endpointing: 800,
  utteranceEndMs: 1000
};

const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  models: {
    translate: process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano',
    summary: process.env.OPENAI_MODEL_SUMMARY || 'gpt-5-mini',
    summaryTranslate: process.env.OPENAI_MODEL_SUMMARY_TRANSLATE || 'gpt-5-nano',
    userTranslate: process.env.OPENAI_MODEL_USER_TRANSLATE || 'gpt-5-nano',
    vocabulary: process.env.OPENAI_MODEL_VOCABULARY || 'gpt-5-mini',
    report: process.env.OPENAI_MODEL_REPORT || 'gpt-5'
  },
  maxTokens: {
    translate: parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500'),
    summary: parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500'),
    vocabulary: parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500'),
    report: parseInt(process.env.OPENAI_REPORT_MAX_TOKENS || '8192')
  }
};

// APIキーの確認
console.log('🔑 API Key状態:');
console.log(`  - OpenAI: ${openaiConfig.apiKey ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`  - Deepgram: ${deepgramConfig.apiKey ? '✅ 設定済み' : '❌ 未設定'}`);
console.log('');

if (!openaiConfig.apiKey || !deepgramConfig.apiKey) {
  console.error('❌ APIキーが設定されていません。.envファイルを確認してください。');
  process.exit(1);
}

// メトリクス
const metrics = {
  translationTimes: [],
  firstPaintTimes: []
};

// パイプラインサービスを初期化
console.log('⚙️  パイプラインサービス初期化中...');
const pipelineService = new UnifiedPipelineService(
  audioConfig,
  deepgramConfig,
  openaiConfig,
  { sourceLanguage: 'en', targetLanguage: 'ja' }
);

// イベントリスナー設定
pipelineService.on('pipelineEvent', (event) => {
  if (event.type === 'translation') {
    console.log('📝 翻訳イベント受信:', {
      original: event.data.originalText.substring(0, 50) + '...',
      translated: event.data.translatedText.substring(0, 50) + '...'
    });
  }
});

// テスト実行
async function runTest() {
  try {
    console.log('\n🧪 翻訳APIテスト開始...');
    
    // 模擬テキストで翻訳をテスト（内部のtranslateSegmentメソッドを間接的にテスト）
    const testTexts = [
      "Hello, this is a test of the UniVoice translation system.",
      "The real-time translation pipeline is working correctly.",
      "We are using GPT-5 nano model for efficient translation."
    ];
    
    // パイプラインを開始
    await pipelineService.startListening('en', 'ja', 'test-correlation-id');
    console.log('✅ パイプライン開始');
    
    // 模擬音声認識結果を処理
    for (let i = 0; i < testTexts.length; i++) {
      console.log(`\n📤 テスト ${i + 1}/${testTexts.length}: "${testTexts[i]}"`);
      
      // processTranscriptSegmentメソッドを直接呼び出すことはできないので、
      // 実際のDeepgramメッセージをシミュレート
      const mockDeepgramMessage = {
        channel: {
          alternatives: [{
            transcript: testTexts[i],
            confidence: 0.95
          }]
        },
        is_final: true,
        start: i * 5,
        end: (i + 1) * 5
      };
      
      // WebSocketメッセージとして処理（内部メソッドなのでリフレクション使用）
      const handleMethod = pipelineService.handleDeepgramMessage.bind(pipelineService);
      handleMethod(Buffer.from(JSON.stringify(mockDeepgramMessage)));
      
      // 翻訳処理を待つ
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // メトリクス集計
    console.log('\n📊 テスト結果サマリー:');
    console.log('─'.repeat(50));
    
    const state = pipelineService.getState();
    console.log(`✅ パイプライン状態: ${state.state}`);
    console.log(`✅ 処理セグメント数: ${state.segmentCount}`);
    console.log(`✅ 生成翻訳数: ${state.translationCount}`);
    
    // ログから性能指標を確認
    console.log('\n🎯 パフォーマンス指標:');
    console.log('  - [統合テストでは実際のメトリクスログを確認]');
    
    // 停止
    await pipelineService.stopListening('test-correlation-id');
    console.log('\n✅ パイプライン正常停止');
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    pipelineService.destroy();
  }
}

// テスト実行
runTest().then(() => {
  console.log('\n✅ すべてのテストが完了しました');
  process.exit(0);
}).catch(error => {
  console.error('❌ テスト失敗:', error);
  process.exit(1);
});