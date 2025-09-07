// SentenceCombiner動作確認用スクリプト（修正版）
// window.univoice.onPipelineEvent を使用

console.log('=== SentenceCombiner 動作確認（修正版）===');

// 1. 基本的なイベント監視
const eventCounts = {
  asr: 0,
  segment: 0,
  translation: 0,
  combinedSentence: 0,
  error: 0,
  finalSegments: 0
};

const startTime = Date.now();

// onPipelineEvent を使用（正しいAPI）
const removeListener = window.univoice?.onPipelineEvent((event) => {
  const relativeTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
  
  // 重要なイベントのみ詳細表示
  switch(event.type) {
    case 'segment':
      if (event.data.isFinal) {
        eventCounts.finalSegments++;
        console.log(`[${relativeTime}s] 📝 FINAL セグメント #${eventCounts.finalSegments}:`, {
          id: event.data.id,
          text: event.data.text?.substring(0, 50) + '...',
          文末: /[。．！？.!?]\s*$/.test(event.data.text) ? '✅ あり' : '❌ なし',
          長さ: event.data.text?.length
        });
      }
      break;
      
    case 'combinedSentence':
      console.log(`[${relativeTime}s] 🎯 文結合イベント検出！:`, {
        combinedId: event.data.combinedId,
        segmentIds: event.data.segmentIds,
        segmentCount: event.data.segmentIds?.length || 0,
        text: event.data.originalText?.substring(0, 100) + '...'
      });
      break;
      
    case 'translation':
      if (event.data.segmentId?.startsWith('history_')) {
        console.log(`[${relativeTime}s] 🔄 履歴翻訳検出:`, {
          id: event.data.segmentId,
          originalId: event.data.segmentId.replace('history_', ''),
          翻訳: event.data.translatedText?.substring(0, 50) + '...'
        });
      }
      break;
      
    case 'error':
      console.error(`[${relativeTime}s] ❌ エラー:`, event.data);
      break;
  }
});

// 2. 統計情報の定期表示
const statsInterval = setInterval(() => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`\n📊 === 統計情報 (${elapsed}秒経過) ===`);
  console.log(`ASRイベント: ${eventCounts.asr}`);
  console.log(`セグメント: ${eventCounts.segment} (FINAL: ${eventCounts.finalSegments})`);
  console.log(`翻訳: ${eventCounts.translation}`);
  console.log(`🎯 文結合: ${eventCounts.combinedSentence}`);
  console.log(`エラー: ${eventCounts.error}`);
  
  if (eventCounts.finalSegments > 0) {
    const combineRate = (eventCounts.combinedSentence / eventCounts.finalSegments * 100).toFixed(1);
    console.log(`結合率: ${combineRate}%`);
  }
  
  if (eventCounts.combinedSentence === 0 && eventCounts.finalSegments >= 2) {
    console.log('\n⚠️ 問題の可能性:');
    console.log('- 2つ以上のFINALセグメントがあるのに文結合が発生していません');
    console.log('- SentenceCombinerが動作していない可能性があります');
    console.log('- バックエンドのログ（VSCodeターミナル）も確認してください');
  }
}, 15000); // 15秒ごと

// 3. クリーンアップ情報
console.log('\n📌 使用方法:');
console.log('1. 音声入力を開始してください');
console.log('2. 文末（。！？.!?）を含む文を話してください');
console.log('3. 2-3文話すと文結合イベントが発生するはずです');
console.log('\n🛑 停止方法:');
console.log(`clearInterval(${statsInterval}); // 統計表示を停止`);
console.log('removeListener(); // イベントリスナーを削除');

// 4. バックエンドログの確認方法
console.log('\n🔍 バックエンドログの確認:');
console.log('VSCodeのターミナルで以下のログを探してください:');
console.log('- [DataFlow-1] Transcript segment received');
console.log('- [DataFlow-2] Queuing translation for segment');  
console.log('- [DataFlow-3] Adding to SentenceCombiner');
console.log('- [DataFlow-4] Combined sentence created');
console.log('- [SentenceCombiner] Emitting combined sentence');