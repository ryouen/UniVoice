// ブラウザのコンソールで実行するテストコード
// ASRイベントを手動で発火させて、表示が機能するか確認

// 1. まず、window.univoiceが利用可能か確認
if (!window.univoice) {
  console.error('window.univoice is not available');
} else {
  console.log('window.univoice is available');
  
  // 2. onPipelineEventリスナーをテスト
  const unsubscribe = window.univoice.onPipelineEvent((event) => {
    console.log('Test: Pipeline event received:', event);
  });
  
  // 3. 手動でASRイベントをシミュレート（本来はメインプロセスから来る）
  // これは実際にはできないので、useUnifiedPipelineの中で直接テスト
  console.log('Test listener registered. Waiting for real events...');
  
  // 5秒後にリスナーを解除
  setTimeout(() => {
    unsubscribe();
    console.log('Test listener unsubscribed');
  }, 5000);
}