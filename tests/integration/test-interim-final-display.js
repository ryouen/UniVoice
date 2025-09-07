/**
 * UniVoice 2.0 Interim/Final表示テスト
 * 
 * 確認事項:
 * 1. interim結果の視覚的区別（イタリック、グレー色）
 * 2. 「認識中」ラベルの表示
 * 3. final結果への遷移
 */

require('dotenv').config();

console.log('🧪 Interim/Final表示テスト開始');
console.log('📋 テスト内容:');
console.log('  - Interim結果の表示確認');
console.log('  - Final結果への更新確認');
console.log('  - 視覚的区別の動作確認');
console.log('');

// RealtimeDisplayManagerのテスト
const { RealtimeDisplayManager } = require('../../dist-electron/utils/RealtimeDisplayManager.js');

// 表示更新をキャプチャ
let displayedSegments = [];
const displayManager = new RealtimeDisplayManager(
  (segments) => {
    displayedSegments = segments;
    console.log('\n📺 表示更新:');
    segments.forEach(seg => {
      console.log(`  - ID: ${seg.id}`);
      console.log(`    Text: "${seg.text}"`);
      console.log(`    Type: ${seg.type}`);
      console.log(`    IsFinal: ${seg.originalIsFinal}`);
      console.log(`    Status: ${seg.status}`);
      console.log(`    Opacity: ${seg.opacity}`);
    });
  },
  {
    maxSegments: 3,
    fadeInDurationMs: 200,
    fadeOutDurationMs: 300,
    minDisplayDurationMs: 1500
  }
);

// テストシナリオ実行
async function runTest() {
  console.log('\n🎬 シナリオ1: Interim結果の表示');
  
  // Interim結果を追加
  displayManager.updateSegment(
    'seg-1',
    'Hello, this is a test',
    'original',
    0,
    false // interim
  );
  
  await sleep(500);
  
  console.log('\n🎬 シナリオ2: Interim → Final更新');
  
  // 同じセグメントをfinalに更新
  displayManager.updateSegment(
    'seg-1',
    'Hello, this is a test of the UniVoice system.',
    'original',
    0,
    true // final
  );
  
  await sleep(500);
  
  console.log('\n🎬 シナリオ3: 複数セグメントの混在');
  
  // 新しいinterimセグメント
  displayManager.updateSegment(
    'seg-2',
    'The real-time transcription',
    'original',
    1,
    false // interim
  );
  
  // 前のセグメントの翻訳（final）
  displayManager.updateSegment(
    'trans-seg-1',
    'こんにちは、これはUniVoiceシステムのテストです。',
    'translation',
    0,
    true // final
  );
  
  await sleep(1000);
  
  // 検証
  console.log('\n✅ 最終状態の検証:');
  const finalSegments = displayedSegments;
  
  finalSegments.forEach(seg => {
    if (seg.type === 'original') {
      if (seg.originalIsFinal) {
        console.log(`  ✅ Final: "${seg.text}" (通常表示)`);
      } else {
        console.log(`  ⏳ Interim: "${seg.text}" (イタリック・グレー表示)`);
      }
    }
  });
  
  // メトリクス
  const metrics = displayManager.getMetrics();
  console.log('\n📊 メトリクス:');
  console.log(`  - アクティブセグメント: ${metrics.activeSegments}`);
  console.log(`  - 総セグメント数: ${metrics.totalSegments}`);
  console.log(`  - キャッシュサイズ: ${metrics.cacheSize}`);
  
  // クリーンアップ
  displayManager.destroy();
  console.log('\n✅ テスト完了');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// テスト実行
runTest().catch(error => {
  console.error('❌ テストエラー:', error);
  process.exit(1);
});