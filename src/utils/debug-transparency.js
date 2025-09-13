/**
 * 透過状態デバッグユーティリティ
 * コンソールで実行して透過設定を確認
 */

// このコードをブラウザのコンソールにコピー＆ペーストして実行してください
(function debugTransparency() {
  console.group('🔍 UniVoice 透過状態デバッグ');
  
  // 1. CSS変数の確認
  console.group('📊 CSS変数');
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  const cssVars = [
    '--current-bg-gradient',
    '--bg-gradient-light',
    '--bg-gradient-dark',
    '--bg-gradient-purple',
    '--theme-light-bg',
    '--theme-dark-bg',
    '--theme-purple-bg',
    '--blur-amount',
    '--saturate-amount'
  ];
  
  cssVars.forEach(varName => {
    const value = computedStyle.getPropertyValue(varName);
    console.log(`${varName}: ${value || '未定義'}`);
  });
  console.groupEnd();
  
  // 2. body要素の状態
  console.group('🎨 Body要素');
  const body = document.body;
  const bodyStyle = getComputedStyle(body);
  console.log('backgroundColor:', bodyStyle.backgroundColor);
  console.log('opacity:', bodyStyle.opacity);
  
  // body::before疑似要素
  const bodyBefore = getComputedStyle(body, '::before');
  console.log('::before background:', bodyBefore.background);
  console.log('::before content:', bodyBefore.content);
  console.log('::before z-index:', bodyBefore.zIndex);
  console.groupEnd();
  
  // 3. メイン要素の透過状態
  console.group('📦 主要要素の透過状態');
  
  const selectors = [
    '.app',
    '[class*="header"]',
    '[class*="realtimeArea"]',
    '[class*="questionArea"]',
    '[class*="settingsBar"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
      if (el) {
        const style = getComputedStyle(el);
        const className = el.className;
        console.group(`${selector}${index > 0 ? `[${index}]` : ''} (${className})`);
        console.log('background:', style.background);
        console.log('backgroundColor:', style.backgroundColor);
        console.log('backdropFilter:', style.backdropFilter || style.webkitBackdropFilter);
        console.log('opacity:', style.opacity);
        console.groupEnd();
      }
    });
  });
  console.groupEnd();
  
  // 4. Electron環境の確認
  console.group('💻 Electron環境');
  if (window.electron || window.require) {
    console.log('✅ Electron環境で実行中');
    if (window.electron?.process) {
      console.log('Platform:', window.electron.process.platform);
      console.log('Electron Version:', window.electron.process.versions.electron);
    }
  } else {
    console.log('❌ ブラウザ環境で実行中（Electronではない）');
  }
  console.groupEnd();
  
  // 5. 現在のテーマ
  console.group('🎨 現在のテーマ');
  const themeClasses = ['Light', 'Dark', 'Purple'];
  themeClasses.forEach(theme => {
    const elements = document.querySelectorAll(`[class*="Theme${theme}"]`);
    if (elements.length > 0) {
      console.log(`✅ ${theme}テーマがアクティブ (${elements.length}要素)`);
    }
  });
  console.groupEnd();
  
  // 6. 推奨事項
  console.group('💡 推奨事項');
  
  // body背景チェック
  if (bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && bodyStyle.backgroundColor !== 'transparent') {
    console.warn('⚠️ body要素に不透明な背景色が設定されています:', bodyStyle.backgroundColor);
  }
  
  // CSS変数チェック
  if (!computedStyle.getPropertyValue('--current-bg-gradient')) {
    console.warn('⚠️ --current-bg-gradient が設定されていません');
  }
  
  // backdrop-filterサポート
  const testEl = document.createElement('div');
  testEl.style.backdropFilter = 'blur(10px)';
  if (!testEl.style.backdropFilter) {
    console.warn('⚠️ このブラウザはbackdrop-filterをサポートしていません');
  }
  
  console.groupEnd();
  console.groupEnd();
  
  // 視覚的なインジケーター追加
  const indicator = document.createElement('div');
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 99999;
      backdrop-filter: blur(10px);
    ">
      <div>🔍 Transparency Debug</div>
      <div>Blur: ${computedStyle.getPropertyValue('--blur-amount') || 'N/A'}</div>
      <div>Theme BG: ${document.querySelector('[class*="theme"]')?.style.background || 'CSS'}</div>
      <div>Body BG: ${bodyStyle.backgroundColor}</div>
    </div>
  `;
  document.body.appendChild(indicator);
  setTimeout(() => indicator.remove(), 10000);
})();