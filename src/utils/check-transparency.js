/**
 * Electron透過状態チェック（開発用）
 */

// コンソールで実行して、Electronウィンドウの透過設定を確認
(function checkElectronTransparency() {
  console.group('🪟 Electronウィンドウ透過チェック');
  
  // Electron APIの確認
  if (window.electron && window.electron.ipcRenderer) {
    console.log('✅ Electron環境検出');
    
    // IPCでメインプロセスに問い合わせ
    try {
      // 透過状態を取得するためのリクエスト
      console.log('📡 メインプロセスに透過状態を問い合わせ中...');
      
      // 簡易的な確認方法
      const bodyStyle = getComputedStyle(document.body);
      const htmlStyle = getComputedStyle(document.documentElement);
      
      console.log('HTML backgroundColor:', htmlStyle.backgroundColor);
      console.log('Body backgroundColor:', bodyStyle.backgroundColor);
      
      // Electronウィンドウの設定確認（開発者ツールから）
      if (require && require('electron')) {
        const { remote } = require('electron');
        if (remote && remote.getCurrentWindow) {
          const win = remote.getCurrentWindow();
          console.log('Window transparent:', win.isTransparent ? win.isTransparent() : 'メソッド未定義');
          console.log('Window backgroundColor:', win.backgroundColor);
        }
      }
    } catch (e) {
      console.warn('⚠️ Electron APIアクセスエラー:', e.message);
    }
  } else {
    console.warn('❌ Electron環境が検出されません');
  }
  
  // 追加の診断情報
  console.group('🎨 透過に影響する可能性のある要素');
  
  // 不透明な背景を持つ要素を検出
  const allElements = document.querySelectorAll('*');
  const opaqueElements = [];
  
  allElements.forEach(el => {
    const style = getComputedStyle(el);
    const bgColor = style.backgroundColor;
    
    // rgba以外の背景色、または不透明なrgba
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        const alpha = parseFloat(match[4] || '1');
        if (alpha > 0.9) {
          opaqueElements.push({
            element: el,
            className: el.className,
            backgroundColor: bgColor
          });
        }
      } else if (!bgColor.includes('rgba')) {
        // rgb() または 16進数カラー
        opaqueElements.push({
          element: el,
          className: el.className,
          backgroundColor: bgColor
        });
      }
    }
  });
  
  if (opaqueElements.length > 0) {
    console.warn(`⚠️ ${opaqueElements.length}個の不透明な要素を検出:`, opaqueElements);
  } else {
    console.log('✅ 不透明な背景を持つ要素は検出されませんでした');
  }
  
  console.groupEnd();
  
  // 修正提案
  console.group('💡 修正提案');
  
  if (opaqueElements.length > 0) {
    console.log('以下のコードで不透明な要素を一時的に透過できます:');
    console.log(`
// 全ての不透明な要素を半透明に
document.querySelectorAll('*').forEach(el => {
  const style = getComputedStyle(el);
  if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    el.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  }
});
    `);
  }
  
  console.log('背景グラデーションをより透明にするには:');
  console.log(`
document.documentElement.style.setProperty('--bg-gradient-light', 'linear-gradient(135deg, rgba(245, 247, 250, 0.1) 0%, rgba(195, 207, 226, 0.1) 100%)');
  `);
  
  console.groupEnd();
  console.groupEnd();
})();