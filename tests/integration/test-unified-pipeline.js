/**
 * UniVoice 2.0 統合パイプラインテスト
 * GPT-5 responses API を使用した翻訳処理の確認
 */

require('dotenv').config();
const { UnifiedPipelineService } = require('../../dist-electron/services/domain/UnifiedPipelineService');

async function test() {
  console.log('UniVoice 2.0 統合パイプラインテスト\n');
  
  // サービスの設定
  const audioConfig = {
    sampleRate: 16000,
    channels: 1,
    encoding: 'linear16'
  };
  
  const deepgramConfig = {
    apiKey: process.env.DEEPGRAM_API_KEY,
    model: 'nova-3',
    language: 'en',
    punctuate: true,
    interimResults: true,
    endpointing: 300
  };
  
  const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    models: {
      translate: 'gpt-5-nano',
      summary: 'gpt-5-mini',
      summaryTranslate: 'gpt-5-nano',
      userTranslate: 'gpt-5-nano',
      vocabulary: 'gpt-5-mini',
      report: 'gpt-5'
    },
    maxTokens: {
      translate: parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500'),
      summary: parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500'),
      vocabulary: parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500'),
      report: parseInt(process.env.OPENAI_REPORT_MAX_TOKENS || '8192')
    }
  };
  
  try {
    // サービスの初期化
    const pipeline = new UnifiedPipelineService(
      audioConfig,
      deepgramConfig,
      openaiConfig
    );
    
    console.log('✅ パイプラインサービスが初期化されました');
    
    // 翻訳イベントのリスナー設定
    pipeline.on('translation', (translation) => {
      console.log('\n翻訳イベント受信:');
      console.log(`  原文: "${translation.original}"`);
      console.log(`  翻訳: "${translation.translated}"`);
      console.log(`  言語: ${translation.sourceLanguage} → ${translation.targetLanguage}`);
    });
    
    // エラーイベントのリスナー設定
    pipeline.on('error', (error) => {
      console.error('\nエラー発生:', error);
    });
    
    // テスト用の文章を直接翻訳処理に送る
    console.log('\n翻訳テストを実行中...');
    
    // 内部メソッドを直接呼び出すため、リフレクションを使用
    const translateMethod = pipeline.translateSegment.bind(pipeline);
    
    const testCases = [
      "Welcome to today's machine learning lecture.",
      "We'll explore neural networks and deep learning.",
      "These technologies have revolutionized artificial intelligence."
    ];
    
    // 翻訳結果を収集
    const translations = [];
    let translationReceived = false;
    
    // 翻訳イベントリスナーを更新
    pipeline.removeAllListeners('translation');
    pipeline.on('translation', (translation) => {
      translationReceived = true;
      translations.push(translation);
      console.log('\n🎯 翻訳イベント受信:');
      console.log(`  原文: "${translation.original}"`);
      console.log(`  翻訳: "${translation.translated}"`);
      console.log(`  言語: ${translation.sourceLanguage} → ${translation.targetLanguage}`);
    });
    
    for (let i = 0; i < testCases.length; i++) {
      console.log(`\nテスト ${i + 1}/${testCases.length}: "${testCases[i]}"`);
      
      try {
        await translateMethod(testCases[i], `test-segment-${i}`);
        console.log('  → 翻訳リクエスト送信成功');
        
        // イベントが発火するまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('  → エラー:', error.message);
      }
      
      // API制限対策
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 結果サマリー
    console.log('\n' + '='.repeat(50));
    console.log('📊 テスト結果サマリー');
    console.log('='.repeat(50));
    console.log(`翻訳成功数: ${translations.length}/${testCases.length}`);
    
    if (!translationReceived) {
      console.log('\n⚠️ 警告: 翻訳イベントが一度も発火しませんでした');
      console.log('翻訳処理は実行されていますが、イベントが正しく発火していない可能性があります');
    }
    
    console.log('\n✅ 全てのテストが完了しました');
    
  } catch (error) {
    console.error('\n致命的エラー:', error);
  }
}

// 実行
test().catch(console.error);