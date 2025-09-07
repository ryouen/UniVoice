// バックエンドのログをフロントエンドで受け取るスクリプト
// DevToolsコンソールで実行

console.log('=== バックエンドログキャプチャ開始 ===');

// IPCでバックエンドログを要求する仕組みを追加
const logBuffer = [];
const startTime = Date.now();

// すべてのコンソール出力をインターセプト（開発用）
if (window.electron) {
  // Electronのログを取得する試み
  console.log('Electronのログ取得を試みています...');
  
  // デバッグ情報の取得
  window.univoice?.getDebugInfo?.().then(info => {
    console.log('📊 デバッグ情報:', info);
  }).catch(err => {
    console.error('デバッグ情報取得エラー:', err);
  });
}

// パイプラインイベントから推測
let lastSegmentTime = 0;
let segmentsSinceLastCombined = 0;

window.univoice?.onPipelineEvent((event) => {
  const now = Date.now();
  const elapsed = ((now - startTime) / 1000).toFixed(2);
  
  switch(event.type) {
    case 'segment':
      if (event.data.isFinal) {
        const timeSinceLastSegment = lastSegmentTime ? (now - lastSegmentTime) : 0;
        segmentsSinceLastCombined++;
        
        console.log(`[${elapsed}s] 📝 Segment:`, {
          id: event.data.id,
          text: event.data.text.substring(0, 40) + '...',
          timeSinceLastSegment: `${(timeSinceLastSegment / 1000).toFixed(1)}s`,
          segmentsSinceLastCombined
        });
        
        lastSegmentTime = now;
        
        // 2秒以上経過したらタイムアウトが発生するはず
        if (timeSinceLastSegment > 2000 && segmentsSinceLastCombined > 0) {
          console.log(`⏱️ タイムアウト発生予測: ${segmentsSinceLastCombined}個のセグメントが結合されるはず`);
        }
      }
      break;
      
    case 'combinedSentence':
      console.log(`[${elapsed}s] 🎯 CombinedSentence 検出！`, event.data);
      segmentsSinceLastCombined = 0;
      break;
      
    case 'status':
      if (event.data.message?.includes('SentenceCombiner')) {
        console.log(`[${elapsed}s] 📍 SentenceCombiner関連ステータス:`, event.data.message);
      }
      break;
  }
});

// 推測による診断
setInterval(() => {
  console.log('\n🔍 === 診断 ===');
  console.log(`経過時間: ${((Date.now() - startTime) / 1000).toFixed(1)}秒`);
  console.log(`最後のセグメントから: ${lastSegmentTime ? ((Date.now() - lastSegmentTime) / 1000).toFixed(1)}秒` : 'N/A'}`);
  console.log(`未結合セグメント数: ${segmentsSinceLastCombined}`);
  
  if (segmentsSinceLastCombined >= 2 && Date.now() - lastSegmentTime > 2000) {
    console.log('⚠️ 警告: 2つ以上のセグメントが2秒以上結合されていません');
    console.log('可能性:');
    console.log('1. SentenceCombinerのタイムアウトが機能していない');
    console.log('2. combinedSentenceイベントが発行されていない');
    console.log('3. バックエンドでエラーが発生している');
  }
}, 10000);

console.log('\n📝 現在の推測:');
console.log('- セグメントは正常に受信されている（ASRイベントから確認）');
console.log('- しかしcombinedSentenceイベントが来ていない');
console.log('- SentenceCombinerが動作していない可能性が高い');
console.log('\nVSCodeターミナルで以下を確認してください:');
console.log('- [DataFlow-3] Adding to SentenceCombiner');
console.log('- [SentenceCombiner] 関連のログ');
console.log('- エラーメッセージ');