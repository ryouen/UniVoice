/**
 * Backdrop-filter サポートチェック
 */

(function checkBackdropFilter() {
  console.group('🔍 Backdrop-filter診断');
  
  // 1. CSSサポートチェック
  const supportsBackdropFilter = CSS && CSS.supports && (
    CSS.supports('backdrop-filter', 'blur(5px)') ||
    CSS.supports('-webkit-backdrop-filter', 'blur(5px)')
  );
  
  console.log('CSS.supports backdrop-filter:', supportsBackdropFilter);
  
  // 2. 実際の適用状況を確認
  const testEl = document.createElement('div');
  testEl.style.backdropFilter = 'blur(5px)';
  testEl.style.webkitBackdropFilter = 'blur(5px)';
  
  console.log('Test element backdrop-filter:', testEl.style.backdropFilter || 'not supported');
  console.log('Test element -webkit-backdrop-filter:', testEl.style.webkitBackdropFilter || 'not supported');
  
  // 3. 現在の要素の状態
  console.group('現在の要素のbackdrop-filter状態');
  const elements = document.querySelectorAll('.glassmorphism, [class*="glassmorphism"]');
  
  elements.forEach((el, index) => {
    const computed = getComputedStyle(el);
    console.log(`要素${index} (${el.className}):`);
    console.log('  backdrop-filter:', computed.backdropFilter);
    console.log('  -webkit-backdrop-filter:', computed.webkitBackdropFilter);
  });
  console.groupEnd();
  
  // 4. Electronでの追加設定確認
  if (window.process && window.process.versions && window.process.versions.electron) {
    console.log('Electron version:', window.process.versions.electron);
    console.log('Chromium version:', window.process.versions.chrome);
    
    // Chromium 76以降でbackdrop-filterがサポート
    const chromiumVersion = parseInt(window.process.versions.chrome.split('.')[0]);
    if (chromiumVersion < 76) {
      console.warn('⚠️ Chromium version が古い可能性があります。backdrop-filterには76以降が必要です。');
    }
  }
  
  // 5. 修正提案
  console.group('💡 修正提案');
  
  if (!supportsBackdropFilter) {
    console.warn('backdrop-filterがサポートされていません。以下を試してください：');
    console.log('1. Electronを最新版にアップデート');
    console.log('2. webPreferencesでexperimentalFeaturesを有効化');
  }
  
  // 強制的にblur効果を適用するコード
  console.log('強制適用テスト（コンソールで実行）:');
  console.log(`
// すべてのglassmorphism要素に強制適用
document.querySelectorAll('[class*="glassmorphism"]').forEach(el => {
  el.style.backdropFilter = 'blur(5px) saturate(200%)';
  el.style.webkitBackdropFilter = 'blur(5px) saturate(200%)';
  console.log('Applied to:', el.className);
});
  `);
  
  console.groupEnd();
  console.groupEnd();
})();