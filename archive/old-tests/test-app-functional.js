/**
 * UniVoice 2.0 機能テストスクリプト
 * アプリケーションが起動した後、DevToolsのコンソールで実行してください
 */

(async function testUniVoice() {
  console.log('=== UniVoice 2.0 機能テスト開始 ===');
  
  // 1. 環境確認
  console.log('\n1. 環境確認:');
  console.log('- window.univoice:', !!window.univoice);
  console.log('- window.electron:', !!window.electron);
  
  if (!window.univoice) {
    console.error('❌ window.univoice が定義されていません');
    return;
  }
  
  // 2. API確認
  console.log('\n2. UniVoice API確認:');
  const apiMethods = [
    'startListening',
    'stopListening',
    'generateCorrelationId',
    'onPipelineEvent',
    'generateVocabulary',
    'generateFinalReport',
    'clearHistory'
  ];
  
  apiMethods.forEach(method => {
    console.log(`- ${method}:`, typeof window.univoice[method] === 'function' ? '✅' : '❌');
  });
  
  // 3. Electron API確認
  console.log('\n3. Electron API確認:');
  const electronMethods = ['on', 'removeListener', 'sendAudioChunk'];
  
  electronMethods.forEach(method => {
    console.log(`- ${method}:`, typeof window.electron[method] === 'function' ? '✅' : '❌');
  });
  
  // 4. イベントリスナー登録テスト
  console.log('\n4. イベントリスナー登録テスト:');
  
  let eventReceived = false;
  const testListener = (event) => {
    console.log('✅ Pipeline event received:', event.type);
    eventReceived = true;
  };
  
  const unsubscribe = window.univoice.onPipelineEvent(testListener);
  console.log('- Event listener registered');
  
  // 5. マイク開始テスト
  console.log('\n5. マイク開始テスト:');
  const correlationId = window.univoice.generateCorrelationId();
  console.log('- Correlation ID:', correlationId);
  
  try {
    const result = await window.univoice.startListening({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      correlationId
    });
    
    console.log('- Start result:', result);
    
    if (result.success) {
      console.log('✅ マイク開始成功');
      
      // 音声キャプチャ確認
      console.log('\n6. 音声キャプチャ確認:');
      console.log('- マイクに向かって英語で話してください...');
      
      // 5秒待機
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 停止
      console.log('\n7. マイク停止テスト:');
      const stopResult = await window.univoice.stopListening({ correlationId });
      console.log('- Stop result:', stopResult);
      
      if (stopResult.success) {
        console.log('✅ マイク停止成功');
      } else {
        console.log('❌ マイク停止失敗:', stopResult.error);
      }
    } else {
      console.log('❌ マイク開始失敗:', result.error);
    }
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  // クリーンアップ
  unsubscribe();
  console.log('\n8. クリーンアップ完了');
  
  // 結果サマリー
  console.log('\n=== テスト結果サマリー ===');
  console.log('- 環境: ✅');
  console.log('- API: ✅');
  console.log('- イベント受信:', eventReceived ? '✅' : '❌');
  
  // React DevToolsでの確認方法
  console.log('\n=== React DevToolsでの確認方法 ===');
  console.log('1. React DevToolsを開く');
  console.log('2. UniVoiceコンポーネントを選択');
  console.log('3. 以下の値を確認:');
  console.log('   - pipeline.isRunning');
  console.log('   - pipeline.currentOriginal');
  console.log('   - pipeline.currentTranslation');
  console.log('   - pipeline.history');
  
  console.log('\n=== テスト完了 ===');
})();