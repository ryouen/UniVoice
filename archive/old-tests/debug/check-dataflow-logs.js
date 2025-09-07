// バックエンドのDataFlowログを確認するスクリプト
// Electronのメインプロセスコンソールを確認する必要があります

console.log('=== DataFlowログの確認方法 ===');

// 1. 現在のイベントフローを詳細に監視
let lastSegmentId = null;
let segmentToTranslationMap = new Map();

window.univoice?.on('pipelineEvent', (event) => {
  const timestamp = new Date().toISOString().substring(11, 19);
  
  switch(event.type) {
    case 'segment':
      if (event.data.isFinal) {
        lastSegmentId = event.data.id;
        console.log(`[${timestamp}] 📝 FINALセグメント検出:`, {
          id: event.data.id,
          text: event.data.text?.substring(0, 40) + '...'
        });
        console.log('  → SentenceCombinerに追加されるはず...');
      }
      break;
      
    case 'translation':
      if (lastSegmentId && event.data.segmentId === lastSegmentId) {
        console.log(`[${timestamp}] 🌐 通常翻訳完了:`, {
          segmentId: event.data.segmentId,
          translation: event.data.translatedText?.substring(0, 40) + '...'
        });
        segmentToTranslationMap.set(event.data.segmentId, event.data.translatedText);
      }
      
      if (event.data.segmentId?.startsWith('history_')) {
        const originalId = event.data.segmentId.replace('history_', '');
        console.log(`[${timestamp}] 🔄 履歴翻訳検出:`, {
          historyId: event.data.segmentId,
          originalId: originalId,
          translation: event.data.translatedText?.substring(0, 40) + '...'
        });
      }
      break;
      
    case 'combinedSentence':
      console.log(`[${timestamp}] 🎯 文結合イベント検出！！！:`, event.data);
      console.log('  → このイベントが来ていれば、SentenceCombinerは動作しています');
      break;
      
    case 'error':
      console.error(`[${timestamp}] ❌ エラー:`, event.data);
      break;
  }
});

// 2. Electronメインプロセスのログを確認する手順
console.log('\n📌 重要: バックエンドログの確認方法');
console.log('1. Electronアプリのウィンドウで Ctrl+Shift+I を押す');
console.log('2. DevToolsが開いたら、メニューから「View」→「Toggle Developer Tools」');
console.log('3. または、VSCodeのターミナルでElectronを起動している場合は、そこにログが出力されます');
console.log('\n🔍 探すべきログ:');
console.log('- [DataFlow-1] Transcript segment received');
console.log('- [DataFlow-2] Queuing translation for segment');
console.log('- [DataFlow-3] Adding to SentenceCombiner');
console.log('- [SentenceCombiner] Emitting combined sentence');

// 3. 問題の診断
console.log('\n🚨 現在の問題:');
console.log('- combinedSentenceイベントが来ていない');
console.log('- history_プレフィックス付き翻訳も来ていない');
console.log('→ SentenceCombinerが動作していない可能性が高い');

// 4. デバッグ用の手動テスト
console.log('\n🧪 手動テスト:');
console.log('音声入力を行い、2-3文話してみてください。');
console.log('文末（。！？）で区切られた後、文結合イベントが発生するはずです。');