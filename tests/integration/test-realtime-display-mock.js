/**
 * リアルタイム3行表示のモックテスト
 * RealtimeDisplayManagerの動作をシミュレート
 */

// モックセグメントデータ
const mockSegments = [];
let segmentIdCounter = 0;

// RealtimeDisplayManagerの簡易実装
class MockRealtimeDisplayManager {
  constructor(onUpdate) {
    this.segments = [];
    this.onUpdate = onUpdate;
    this.currentSegmentId = null;
    this.maxDisplaySegments = 3;
  }

  updateOriginal(text, isFinal) {
    const now = Date.now();
    
    if (this.currentSegmentId && !isFinal) {
      // 現在のセグメントを更新
      const segment = this.segments.find(s => s.id === this.currentSegmentId);
      if (segment) {
        segment.original = text;
        segment.timestamp = now;
      }
    } else if (isFinal || !this.currentSegmentId) {
      // 新しいセグメントを作成
      const newSegment = {
        id: `seg_${++segmentIdCounter}`,
        original: text,
        translation: '',
        status: 'active',
        timestamp: now,
        opacity: 1.0,
        isFinal: isFinal
      };
      
      // 既存のアクティブセグメントをフェーディングに
      this.segments.forEach(s => {
        if (s.status === 'active') {
          s.status = 'fading';
          s.opacity = 0.6;
        } else if (s.status === 'fading') {
          s.opacity = 0.3;
        }
      });
      
      this.segments.push(newSegment);
      this.currentSegmentId = newSegment.id;
      
      // 最大表示数を超えたら古いものを削除
      if (this.segments.length > this.maxDisplaySegments) {
        this.segments.shift();
      }
    }
    
    this.emitUpdate();
  }

  updateTranslation(text, originalText) {
    const segment = this.segments.find(s => s.original === originalText);
    if (segment) {
      segment.translation = text;
      this.emitUpdate();
    }
  }

  emitUpdate() {
    this.onUpdate([...this.segments]);
  }

  destroy() {
    this.segments = [];
  }
}

// テスト実行
async function runTest() {
  console.log('🧪 リアルタイム3行表示モックテスト開始\n');
  
  const testData = [
    { original: "Hello, welcome to UniVoice", translation: "こんにちは、UniVoiceへようこそ" },
    { original: "This is a real-time translation system", translation: "これはリアルタイム翻訳システムです" },
    { original: "It displays three lines at once", translation: "一度に3行を表示します" },
    { original: "Older lines fade out gradually", translation: "古い行は徐々にフェードアウトします" },
    { original: "This creates a smooth experience", translation: "これによりスムーズな体験が生まれます" }
  ];

  let currentDisplay = [];
  
  const manager = new MockRealtimeDisplayManager((segments) => {
    currentDisplay = segments;
    console.log('\n📊 表示更新:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    segments.forEach((seg, idx) => {
      const opacity = seg.opacity.toFixed(1);
      const statusIcon = seg.status === 'active' ? '🔵' : seg.status === 'fading' ? '🟡' : '⚪';
      console.log(`${statusIcon} [${idx}] opacity: ${opacity}`);
      console.log(`   原文: "${seg.original}"`);
      console.log(`   翻訳: "${seg.translation || '(翻訳待ち)'}"`);
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });

  for (let i = 0; i < testData.length; i++) {
    console.log(`\n⏱️  ステップ ${i + 1}/${testData.length}`);
    
    // Interim結果
    console.log('📝 Interim結果を追加...');
    manager.updateOriginal(testData[i].original.slice(0, -5) + '...', false);
    await sleep(500);
    
    // Final結果
    console.log('✅ Final結果に更新...');
    manager.updateOriginal(testData[i].original, true);
    await sleep(300);
    
    // 翻訳
    console.log('🌐 翻訳を追加...');
    manager.updateTranslation(testData[i].translation, testData[i].original);
    await sleep(1000);
  }

  // 最終状態の確認
  console.log('\n\n✅ テスト完了 - 最終状態サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`表示セグメント数: ${currentDisplay.length}`);
  console.log(`アクティブ: ${currentDisplay.filter(s => s.status === 'active').length}`);
  console.log(`フェーディング: ${currentDisplay.filter(s => s.status === 'fading').length}`);
  console.log(`透明度分布: ${currentDisplay.map(s => s.opacity.toFixed(1)).join(', ')}`);
  
  // 期待値の確認
  const passed = currentDisplay.length <= 3;
  console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'}: 3行以下の表示制限`);
  
  manager.destroy();
  console.log('\n🧹 クリーンアップ完了');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// テスト実行
runTest().catch(console.error);