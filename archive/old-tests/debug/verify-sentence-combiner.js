// SentenceCombinerの動作確認用詳細デバッグスクリプト
// VSCodeのターミナルで見えないログを可視化

console.log('=== SentenceCombiner 詳細デバッグ開始 ===');

// 1. 基本的なイベント監視
const eventLog = [];
const startTime = Date.now();

window.univoice?.on('pipelineEvent', (event) => {
  const relativeTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // 全イベントを記録
  eventLog.push({
    time: relativeTime,
    type: event.type,
    data: event.data
  });
  
  // 重要なイベントのみコンソールに表示
  switch(event.type) {
    case 'segment':
      if (event.data.isFinal) {
        console.log(`[${relativeTime}s] 📝 FINAL セグメント:`, {
          id: event.data.id,
          text: event.data.text?.substring(0, 50) + '...',
          文末: /[。．！？.!?]\s*$/.test(event.data.text) ? '✅ あり' : '❌ なし'
        });
      }
      break;
      
    case 'combinedSentence':
      console.log(`[${relativeTime}s] 🎯 文結合イベント！:`, event.data);
      break;
      
    case 'translation':
      if (event.data.segmentId?.startsWith('history_')) {
        console.log(`[${relativeTime}s] 🔄 履歴翻訳:`, {
          id: event.data.segmentId,
          翻訳: event.data.translatedText?.substring(0, 30) + '...'
        });
      }
      break;
  }
});

// 2. セグメントの文末パターン分析
const analyzeSegmentPattern = (text) => {
  const patterns = {
    '日本語句点': /[。．]\s*$/,
    '日本語感嘆疑問': /[！？]\s*$/,
    '英語ピリオド': /[.]\s*$/,
    '英語感嘆疑問': /[!?]\s*$/,
  };
  
  const matches = [];
  for (const [name, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      matches.push(name);
    }
  }
  
  return matches.length > 0 ? matches.join(', ') : 'なし';
};

// 3. 定期的な診断情報
const diagnosticInterval = setInterval(() => {
  const segments = eventLog.filter(e => e.type === 'segment' && e.data.isFinal);
  const combined = eventLog.filter(e => e.type === 'combinedSentence');
  const historyTrans = eventLog.filter(e => e.type === 'translation' && e.data.segmentId?.startsWith('history_'));
  
  console.log('\n📊 === 診断情報 ===');
  console.log(`経過時間: ${((Date.now() - startTime) / 1000).toFixed(1)}秒`);
  console.log(`FINALセグメント数: ${segments.length}`);
  console.log(`文結合イベント数: ${combined.length}`);
  console.log(`履歴翻訳数: ${historyTrans.length}`);
  
  if (segments.length > 0) {
    const lastSegments = segments.slice(-3);
    console.log('\n最近のセグメント:');
    lastSegments.forEach((s, i) => {
      console.log(`  ${i+1}. "${s.data.text?.substring(0, 40)}..." → 文末: ${analyzeSegmentPattern(s.data.text)}`);
    });
  }
  
  if (combined.length === 0 && segments.length >= 3) {
    console.log('\n⚠️ 警告: 3つ以上のセグメントがあるのに文結合が発生していません');
    console.log('考えられる原因:');
    console.log('1. SentenceCombinerのminSegments設定（デフォルト: 2）');
    console.log('2. 文末パターンが検出されていない');
    console.log('3. タイムアウト（2秒）がまだ発生していない');
  }
}, 10000); // 10秒ごと

// 4. クリーンアップ
console.log('\n🛑 診断を停止するには: clearInterval(' + diagnosticInterval + ')');