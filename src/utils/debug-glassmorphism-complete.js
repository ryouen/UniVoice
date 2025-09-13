/**
 * UniVoice グラスモーフィズム完全デバッグスクリプト
 * コンソールで実行して設定を確認・テスト
 */

(function debugGlassmorphismComplete() {
  console.group('🎨 UniVoice グラスモーフィズム & スタイル診断');
  
  // 1. Blur効果の確認
  console.group('🌫️ Blur効果の状態');
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  console.log('--blur-amount:', computedStyle.getPropertyValue('--blur-amount') || '未設定');
  console.log('--saturate-amount:', computedStyle.getPropertyValue('--saturate-amount') || '未設定');
  
  // glassmorphismクラスを持つ要素を確認
  const glassmorphismElements = document.querySelectorAll('[class*="glassmorphism"]');
  console.log(`glassmorphismクラスを持つ要素数: ${glassmorphismElements.length}`);
  
  glassmorphismElements.forEach((el, i) => {
    const style = getComputedStyle(el);
    console.log(`要素${i+1}:`, {
      className: el.className,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'なし',
      実際の要素: el
    });
  });
  console.groupEnd();
  
  // 2. 角丸の確認
  console.group('🔲 角丸の状態');
  const appElements = document.querySelectorAll('[class*="app"]');
  appElements.forEach((el, i) => {
    const style = getComputedStyle(el);
    console.log(`App要素${i+1}:`, {
      className: el.className,
      borderRadius: style.borderRadius,
      overflow: style.overflow
    });
  });
  console.groupEnd();
  
  // 3. リアルタイムエリアのフォントカラー
  console.group('📝 リアルタイムエリアのテキストスタイル');
  const realtimeAreas = document.querySelectorAll('[class*="realtimeArea"]');
  
  realtimeAreas.forEach((area, i) => {
    const areaStyle = getComputedStyle(area);
    console.log(`リアルタイムエリア${i+1}:`, {
      className: area.className,
      color: areaStyle.color,
      backgroundColor: areaStyle.backgroundColor
    });
    
    // 内部のテキスト要素を探す
    const textElements = area.querySelectorAll('div, span, p');
    textElements.forEach((text, j) => {
      if (text.textContent && text.textContent.trim()) {
        const textStyle = getComputedStyle(text);
        console.log(`  テキスト要素${j+1}:`, {
          text: text.textContent.substring(0, 30) + '...',
          color: textStyle.color,
          fontWeight: textStyle.fontWeight,
          インラインスタイル: text.style.color || 'なし'
        });
      }
    });
  });
  console.groupEnd();
  
  // 4. 現在のテーマ
  console.group('🎨 現在のテーマ状態');
  const themeClasses = {
    Light: 0,
    Dark: 0,
    Purple: 0
  };
  
  document.querySelectorAll('*').forEach(el => {
    const className = el.className;
    if (typeof className === 'string') {
      if (className.includes('ThemeLight')) themeClasses.Light++;
      if (className.includes('ThemeDark')) themeClasses.Dark++;
      if (className.includes('ThemePurple')) themeClasses.Purple++;
    }
  });
  
  const activeTheme = Object.entries(themeClasses)
    .sort(([,a], [,b]) => b - a)[0][0];
  
  console.log('アクティブテーマ:', activeTheme);
  console.log('テーマ別要素数:', themeClasses);
  console.groupEnd();
  
  // 5. 動的テスト機能
  console.group('🧪 動的テスト機能');
  console.log('以下のコマンドで設定を変更できます:');
  
  console.log(`
// Blur効果を変更
document.documentElement.style.setProperty('--blur-amount', '20px');

// 角丸を変更
document.querySelector('[class*="app"]').style.borderRadius = '20px';

// テーマを切り替え（要React操作）
// Light: currentTheme = 'light'
// Dark: currentTheme = 'dark'
// Purple: currentTheme = 'purple'

// リアルタイムエリアのテキスト色を一時的に変更
document.querySelectorAll('[class*="realtimeArea"] div').forEach(el => {
  if (el.textContent) el.style.color = '#00ff00';
});
  `);
  console.groupEnd();
  
  // 6. 問題の診断
  console.group('⚠️ 問題診断');
  
  // Blur効果チェック
  if (!computedStyle.getPropertyValue('--blur-amount')) {
    console.error('❌ --blur-amount CSS変数が設定されていません');
  } else if (glassmorphismElements.length === 0) {
    console.error('❌ glassmorphismクラスを持つ要素が見つかりません');
  }
  
  // テーマクラスチェック
  const appWithTheme = document.querySelector('[class*="app"][class*="theme"]');
  if (!appWithTheme) {
    console.warn('⚠️ appコンテナにテーマクラスが適用されていない可能性があります');
  }
  
  // フォントカラーの推奨
  if (activeTheme === 'Dark' || activeTheme === 'Purple') {
    const darkTexts = document.querySelectorAll('[class*="realtimeArea"] *');
    let darkColorCount = 0;
    darkTexts.forEach(el => {
      const color = getComputedStyle(el).color;
      if (color === 'rgb(51, 51, 51)' || color === 'rgb(0, 68, 204)') {
        darkColorCount++;
      }
    });
    if (darkColorCount > 0) {
      console.warn(`⚠️ ${darkColorCount}個の要素がダークテーマで見にくい色を使用しています`);
    }
  }
  console.groupEnd();
  
  console.groupEnd();
  
  // ビジュアルインジケーター
  const indicator = document.createElement('div');
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 99999;
      backdrop-filter: blur(10px);
      max-width: 300px;
    ">
      <h3 style="margin: 0 0 10px 0; font-size: 14px;">🎨 UniVoice スタイル状態</h3>
      <div>Blur: ${computedStyle.getPropertyValue('--blur-amount') || 'N/A'}</div>
      <div>テーマ: ${activeTheme}</div>
      <div>Glassmorphism要素: ${glassmorphismElements.length}</div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #666;">
        <small>このパネルは15秒後に自動的に消えます</small>
      </div>
    </div>
  `;
  document.body.appendChild(indicator);
  setTimeout(() => indicator.remove(), 15000);
})();

// リアルタイムエリアのフォントカラーを適切に設定する関数
window.setRealtimeTextColors = function(theme) {
  const colorMap = {
    light: { source: '#333', target: '#0044cc' },
    dark: { source: '#e0e0e0', target: '#66b3ff' },
    purple: { source: '#ffffff', target: '#b3d9ff' }
  };
  
  const colors = colorMap[theme] || colorMap.light;
  
  // ここでリアルタイムエリアのテキスト色を設定
  // 実際の実装はReact側で行う必要があります
  console.log(`テーマ ${theme} のカラー設定:`, colors);
  
  return colors;
};