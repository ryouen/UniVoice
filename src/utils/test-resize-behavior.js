/**
 * ウィンドウリサイズ動作の検証スクリプト
 * 
 * このスクリプトは、ウィンドウリサイズ時の各要素の高さと
 * リアルタイムエリアの動作を検証します。
 */

(function testResizeBehavior() {
  console.group('🔍 ウィンドウリサイズ動作検証');
  
  // 1. 現在の高さ情報を取得
  console.group('📐 現在の高さ情報');
  
  const windowHeight = window.innerHeight;
  console.log('ウィンドウ高さ:', windowHeight + 'px');
  
  // 各セクションの高さを取得
  const sections = {
    header: document.querySelector('[class*="header"]:not([class*="headerCompact"])')?.offsetHeight || 0,
    compactHeader: document.querySelector('[class*="headerCompact"]')?.offsetHeight || 0,
    settingsBar: document.querySelector('[class*="settingsBar"]')?.offsetHeight || 0,
    realtimeArea: document.querySelector('[class*="realtimeArea"]')?.offsetHeight || 0,
    questionArea: document.querySelector('[class*="questionArea"]')?.offsetHeight || 0
  };
  
  console.log('セクション高さ:', sections);
  
  const totalHeight = Object.values(sections).reduce((sum, h) => sum + h, 0);
  console.log('合計高さ:', totalHeight + 'px');
  console.log('差分（余白）:', (windowHeight - totalHeight) + 'px');
  
  console.groupEnd();
  
  // 2. リアルタイムエリアのスタイル確認
  console.group('🎨 リアルタイムエリアのスタイル');
  const realtimeArea = document.querySelector('[class*="realtimeArea"]');
  if (realtimeArea) {
    const style = getComputedStyle(realtimeArea);
    console.log('height:', style.height);
    console.log('minHeight:', style.minHeight);
    console.log('maxHeight:', style.maxHeight);
    console.log('flexGrow:', style.flexGrow);
    console.log('flexShrink:', style.flexShrink);
    console.log('overflow:', style.overflowY);
    
    // インラインスタイルも確認
    console.log('インラインstyle.height:', realtimeArea.style.height);
  }
  console.groupEnd();
  
  // 3. 親コンテナの高さ確認
  console.group('📦 親コンテナの高さ');
  const app = document.querySelector('[class*="app"]');
  const mainWindow = document.querySelector('[class*="mainWindow"]');
  
  if (app) {
    console.log('appコンテナ:');
    console.log('  height:', getComputedStyle(app).height);
    console.log('  display:', getComputedStyle(app).display);
  }
  
  if (mainWindow) {
    console.log('mainWindow:');
    console.log('  height:', getComputedStyle(mainWindow).height);
    console.log('  display:', getComputedStyle(mainWindow).display);
  }
  console.groupEnd();
  
  // 4. リサイズイベントのテスト
  console.group('🔄 リサイズイベントテスト');
  let resizeCount = 0;
  const originalHeight = window.innerHeight;
  
  const testResize = () => {
    resizeCount++;
    const newHeight = window.innerHeight;
    console.log(`リサイズ ${resizeCount}回目:`, {
      元の高さ: originalHeight,
      新しい高さ: newHeight,
      差分: newHeight - originalHeight
    });
    
    // リアルタイムエリアの新しい高さを確認
    setTimeout(() => {
      const newRealtimeHeight = document.querySelector('[class*="realtimeArea"]')?.offsetHeight;
      console.log('リアルタイムエリアの新しい高さ:', newRealtimeHeight + 'px');
    }, 200);
  };
  
  window.addEventListener('resize', testResize);
  console.log('ウィンドウをリサイズしてテストしてください（5秒後に自動削除）');
  
  setTimeout(() => {
    window.removeEventListener('resize', testResize);
    console.log('リサイズイベントリスナーを削除しました');
  }, 5000);
  
  console.groupEnd();
  
  // 5. 推奨事項
  console.group('💡 診断結果');
  
  if (windowHeight - totalHeight > 10) {
    console.warn(`⚠️ ${windowHeight - totalHeight}pxの余白が発生しています`);
    console.log('考えられる原因:');
    console.log('1. リアルタイムエリアが固定高さで設定されている');
    console.log('2. 親コンテナの高さ設定に問題がある');
    console.log('3. ウィンドウリサイズイベントが正しく処理されていない');
  } else {
    console.log('✅ 余白は最小限です');
  }
  
  console.groupEnd();
  console.groupEnd();
})();