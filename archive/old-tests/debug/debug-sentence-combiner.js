// デバッグ用スクリプト: SentenceCombinerの動作確認
// 使用方法: npm run electron を実行後、DevToolsのコンソールでこのスクリプトを実行

console.log('=== SentenceCombiner デバッグ開始 ===');

// 1. 現在のwindow.univoiceの状態確認
if (window.univoice) {
  console.log('✅ window.univoice が存在します');
  console.log('利用可能なメソッド:', Object.keys(window.univoice));
} else {
  console.error('❌ window.univoice が存在しません');
}

// 2. イベントリスナーを設定してCombinedSentenceEventを監視
let combinedEventCount = 0;
let segmentEventCount = 0;

window.univoice?.on('pipelineEvent', (event) => {
  if (event.type === 'segment') {
    segmentEventCount++;
    console.log(`📝 セグメント ${segmentEventCount}:`, {
      id: event.data.id,
      text: event.data.text?.substring(0, 50) + '...',
      isFinal: event.data.isFinal
    });
  }
  
  if (event.type === 'combinedSentence') {
    combinedEventCount++;
    console.log(`🎯 文結合イベント ${combinedEventCount}:`, {
      combinedId: event.data.combinedId,
      segmentCount: event.data.segmentIds.length,
      text: event.data.originalText?.substring(0, 100) + '...'
    });
  }
});

// 3. 定期的に統計情報を表示
setInterval(() => {
  console.log('📊 統計情報:', {
    セグメント数: segmentEventCount,
    結合文数: combinedEventCount,
    結合率: segmentEventCount > 0 ? (combinedEventCount / segmentEventCount * 100).toFixed(2) + '%' : '0%'
  });
}, 10000); // 10秒ごと

console.log('=== デバッグ設定完了 ===');
console.log('音声認識を開始して、セグメントと文結合の動作を確認してください。');