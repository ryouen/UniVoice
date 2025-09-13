/**
 * 透過設定の診断スクリプト
 */

(function testTransparency() {
  console.group('🔍 透過設定診断');
  
  // 1. 環境情報
  console.group('💻 環境情報');
  if (window.process && window.process.versions) {
    console.log('Electron:', window.process.versions.electron);
    console.log('Chrome:', window.process.versions.chrome);
    console.log('Platform:', window.process.platform);
  }
  console.groupEnd();
  
  // 2. body要素の背景色を確認
  console.group('🎨 body要素の設定');
  const bodyStyle = getComputedStyle(document.body);
  console.log('backgroundColor:', bodyStyle.backgroundColor);
  console.log('background:', bodyStyle.background);
  console.groupEnd();
  
  // 3. app要素の確認
  console.group('📱 app要素の設定');
  const appElement = document.querySelector('[class*="app"]');
  if (appElement) {
    const appStyle = getComputedStyle(appElement);
    console.log('backgroundColor:', appStyle.backgroundColor);
    console.log('background:', appStyle.background);
    console.log('backdropFilter:', appStyle.backdropFilter);
    console.log('classes:', appElement.className);
  } else {
    console.warn('app要素が見つかりません');
  }
  console.groupEnd();
  
  // 4. グラスモーフィズム要素の確認
  console.group('🪟 グラスモーフィズム要素');
  const glassElements = document.querySelectorAll('[class*="glassmorphism"], [class*="theme"]');
  glassElements.forEach((el, i) => {
    const style = getComputedStyle(el);
    if (style.backgroundColor.includes('rgba')) {
      console.log(`要素${i+1}:`, {
        class: el.className,
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter
      });
    }
  });
  console.groupEnd();
  
  // 5. CSS変数の確認
  console.group('🎯 CSS変数');
  const root = document.documentElement;
  const rootStyle = getComputedStyle(root);
  console.log('--theme-light-bg:', rootStyle.getPropertyValue('--theme-light-bg'));
  console.log('--theme-dark-bg:', rootStyle.getPropertyValue('--theme-dark-bg'));
  console.log('--theme-purple-bg:', rootStyle.getPropertyValue('--theme-purple-bg'));
  console.groupEnd();
  
  // 6. 診断結果
  console.group('📋 診断結果');
  let transparencyIssues = [];
  
  if (bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
      bodyStyle.backgroundColor !== 'transparent') {
    transparencyIssues.push('❌ body要素に不透明な背景色が設定されています');
  }
  
  if (appElement) {
    const appStyle = getComputedStyle(appElement);
    if (appStyle.backgroundColor && 
        !appStyle.backgroundColor.includes('rgba') && 
        appStyle.backgroundColor !== 'transparent') {
      transparencyIssues.push('❌ app要素に不透明な背景色が設定されています');
    }
  }
  
  if (transparencyIssues.length === 0) {
    console.log('✅ 透過設定は正しく設定されています');
  } else {
    transparencyIssues.forEach(issue => console.log(issue));
  }
  console.groupEnd();
  
  console.groupEnd();
})();