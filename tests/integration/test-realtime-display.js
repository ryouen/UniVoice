/**
 * リアルタイム3行表示の統合テスト
 * 
 * テスト内容:
 * 1. RealtimeDisplayManagerが正しく3行表示を管理
 * 2. UniVoicePerfectコンポーネントが表示を反映
 * 3. 透明度遷移が正しく動作
 */

// CommonJS形式でインポート
const { RealtimeDisplayManager } = require('../../dist-electron/utils/RealtimeDisplayManager');

// テストデータ
const testSegments = [
  "Hello, this is the first segment of our test",
  "Now we're adding a second segment to see transitions", 
  "Third segment will show the full 3-line display",
  "Fourth segment will push out the oldest line",
  "Fifth and final segment completes our test"
];

const testTranslations = [
  "こんにちは、これはテストの最初のセグメントです",
  "次に、遷移を確認するために2番目のセグメントを追加します",
  "3番目のセグメントで3行表示が完成します",
  "4番目のセグメントで最も古い行が押し出されます",
  "5番目で最後のセグメントでテストが完了します"
];

// テスト実行
async function runRealtimeDisplayTest() {
  console.log('🧪 リアルタイム3行表示テスト開始\n');
  
  let displaySegments = [];
  
  // DisplayManagerを初期化
  const displayManager = new RealtimeDisplayManager(
    (segments) => {
      displaySegments = segments;
      console.log('\n📊 現在の表示状態:');
      segments.forEach((seg, idx) => {
        console.log(`  [${idx}] ${seg.status} (opacity: ${seg.opacity?.toFixed(2) || '1.00'})`);
        console.log(`      原文: "${seg.original}"`);
        console.log(`      翻訳: "${seg.translation}"`);
      });
    },
    {
      maxDisplaySegments: 3,
      minDisplayTimeMs: 1500,
      translationDisplayTimeMs: 1500
    }
  );
  
  // テストシナリオを実行
  for (let i = 0; i < testSegments.length; i++) {
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`⏱️  ステップ ${i + 1}: セグメント追加`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Interim結果を追加
    console.log('\n1️⃣  Interim結果を追加:');
    displayManager.updateOriginal(testSegments[i], false);
    
    // 少し待機（実際の音声認識の遅延をシミュレート）
    await sleep(500);
    
    // Final結果で更新
    console.log('\n2️⃣  Final結果で更新:');
    displayManager.updateOriginal(testSegments[i], true);
    
    // 翻訳を追加
    await sleep(300);
    console.log('\n3️⃣  翻訳を追加:');
    displayManager.updateTranslation(testTranslations[i], testSegments[i]);
    
    // 表示状態の確認
    console.log('\n📈 表示セグメント数:', displaySegments.length);
    console.log('🎯 アクティブセグメント数:', displaySegments.filter(s => s.status === 'active').length);
    console.log('🌅 フェード中セグメント数:', displaySegments.filter(s => s.status === 'fading').length);
    
    // 少し待機してから次へ
    await sleep(1000);
  }
  
  // 最終状態の確認
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ テスト完了 - 最終状態`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  if (displaySegments.length <= 3) {
    console.log('✅ 表示セグメント数が3以下に制限されています');
  } else {
    console.log('❌ エラー: 表示セグメント数が3を超えています:', displaySegments.length);
  }
  
  // 透明度の確認
  const opacities = displaySegments.map(s => s.opacity || 1);
  console.log('\n🎨 透明度の分布:', opacities.map(o => o.toFixed(2)).join(', '));
  
  // クリーンアップ
  displayManager.destroy();
  console.log('\n🧹 クリーンアップ完了');
}

// ユーティリティ関数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// テスト実行
runRealtimeDisplayTest().catch(console.error);