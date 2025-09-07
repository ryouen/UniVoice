// SentenceCombiner実装状況の確認スクリプト
// DevToolsのコンソールで実行してください

console.log('=== SentenceCombiner 実装状況確認 ===');

// 1. 基本的な動作確認
if (!window.univoice) {
  console.error('❌ window.univoice が存在しません');
} else {
  console.log('✅ window.univoice が存在します');
  
  // 2. セッションの状態確認
  window.univoice.getSessionState().then(state => {
    console.log('📊 セッション状態:', state);
  }).catch(err => {
    console.log('セッション状態取得エラー:', err);
  });
}

// 3. イベント監視の設定
const eventCounts = {
  asr: 0,
  segment: 0,
  translation: 0,
  combinedSentence: 0,
  error: 0
};

window.univoice?.on('pipelineEvent', (event) => {
  eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
  
  // 重要なイベントのみ詳細表示
  switch(event.type) {
    case 'segment':
      console.log(`📝 [${eventCounts.segment}] セグメント:`, {
        id: event.data.id,
        text: event.data.text?.substring(0, 30) + '...',
        isFinal: event.data.isFinal
      });
      break;
      
    case 'combinedSentence':
      console.log(`🎯 [${eventCounts.combinedSentence}] 文結合イベント:`, {
        combinedId: event.data.combinedId,
        segmentIds: event.data.segmentIds,
        segmentCount: event.data.segmentIds.length,
        text: event.data.originalText?.substring(0, 50) + '...'
      });
      break;
      
    case 'translation':
      if (event.data.segmentId?.startsWith('history_')) {
        console.log(`🔄 履歴翻訳:`, {
          segmentId: event.data.segmentId,
          text: event.data.translatedText?.substring(0, 30) + '...'
        });
      }
      break;
      
    case 'error':
      console.error('❌ エラー:', event.data);
      break;
  }
});

// 4. 統計情報の定期表示
const statsInterval = setInterval(() => {
  console.log('📊 イベント統計:', {
    ASR: eventCounts.asr,
    セグメント: eventCounts.segment,
    翻訳: eventCounts.translation,
    文結合: eventCounts.combinedSentence,
    エラー: eventCounts.error,
    結合率: eventCounts.segment > 0 ? 
      `${(eventCounts.combinedSentence / eventCounts.segment * 100).toFixed(1)}%` : 
      '計算不可'
  });
}, 15000); // 15秒ごと

// 5. セッション開始の自動化（テスト用）
console.log('\n📌 セッションを開始するには:');
console.log('1. 言語を選択（英語→日本語）');
console.log('2. 授業名を入力');
console.log('3. 「開始」ボタンをクリック');
console.log('\n⏱️ 15秒ごとに統計情報が表示されます');
console.log('停止するには: clearInterval(' + statsInterval + ')');

// 6. データフローログの監視
console.log('\n🔍 バックエンドログを監視中...');
console.log('以下のログが表示されるはずです:');
console.log('- [DataFlow-1] Transcript segment received');
console.log('- [DataFlow-2] Queuing translation for segment');
console.log('- [DataFlow-3] Adding to SentenceCombiner');