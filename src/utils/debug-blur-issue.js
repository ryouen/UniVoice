/**
 * Blur効果が適用されない問題の詳細診断
 */

(function debugBlurIssue() {
  console.group('🔍 Blur効果の詳細診断');
  
  // 1. 背景要素の確認
  console.group('📌 背景要素の状態');
  
  // body::before要素の確認
  const bodyBefore = window.getComputedStyle(document.body, '::before');
  console.log('body::before:', {
    content: bodyBefore.content,
    position: bodyBefore.position,
    background: bodyBefore.background,
    zIndex: bodyBefore.zIndex,
    opacity: bodyBefore.opacity,
    backdropFilter: bodyBefore.backdropFilter || 'なし'
  });
  
  // 実際の背景要素を探す
  const allElements = Array.from(document.querySelectorAll('*'));
  const backgroundElements = allElements.filter(el => {
    const style = getComputedStyle(el);
    return style.background && style.background.includes('gradient');
  });
  
  console.log(`グラデーション背景を持つ要素: ${backgroundElements.length}個`);
  backgroundElements.forEach((el, i) => {
    const style = getComputedStyle(el);
    console.log(`背景要素${i+1}:`, {
      element: el,
      className: el.className,
      background: style.background,
      position: style.position,
      zIndex: style.zIndex
    });
  });
  console.groupEnd();
  
  // 2. Blur効果の適用状況
  console.group('🌫️ Blur効果の階層構造');
  
  // glassmorphism要素とその位置関係
  const glassmorphismElements = document.querySelectorAll('[class*="glassmorphism"]');
  glassmorphismElements.forEach((el, i) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    console.log(`Glassmorphism要素${i+1}:`, {
      className: el.className.split(' ').filter(c => c.includes('_')).join(' '),
      backdropFilter: style.backdropFilter,
      position: style.position,
      zIndex: style.zIndex,
      opacity: style.opacity,
      位置: `top: ${rect.top}, left: ${rect.left}`,
      サイズ: `${rect.width} x ${rect.height}`
    });
  });
  console.groupEnd();
  
  // 3. 重なり順序の分析
  console.group('📊 要素の重なり順序（z-index）');
  
  const elementsWithZIndex = allElements
    .map(el => {
      const style = getComputedStyle(el);
      const zIndex = style.zIndex;
      if (zIndex !== 'auto' && zIndex !== '0') {
        return {
          element: el,
          className: el.className,
          zIndex: parseInt(zIndex) || zIndex,
          position: style.position,
          backdropFilter: style.backdropFilter
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aZ = typeof a.zIndex === 'number' ? a.zIndex : -999;
      const bZ = typeof b.zIndex === 'number' ? b.zIndex : -999;
      return bZ - aZ;
    });
  
  console.table(elementsWithZIndex.slice(0, 10));
  console.groupEnd();
  
  // 4. Blur効果が機能しない原因の分析
  console.group('⚠️ 問題の診断');
  
  // 背景が前面にある可能性
  const bgZIndex = parseInt(bodyBefore.zIndex) || -999;
  const hasHigherBg = elementsWithZIndex.some(el => el.zIndex < bgZIndex);
  
  if (hasHigherBg) {
    console.warn('❌ 背景要素のz-indexが他の要素より高い可能性があります');
  }
  
  // backdrop-filterが効かない要因
  const blurElements = Array.from(glassmorphismElements);
  blurElements.forEach((el, i) => {
    const style = getComputedStyle(el);
    const parent = el.parentElement;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    
    // 問題のチェック
    const issues = [];
    
    if (style.position === 'static') {
      issues.push('position: static（backdrop-filterには影響しないが、z-indexが効かない）');
    }
    
    if (parentStyle && parentStyle.transform !== 'none') {
      issues.push('親要素にtransformが設定されている');
    }
    
    if (parentStyle && parentStyle.willChange && parentStyle.willChange !== 'auto') {
      issues.push('親要素にwill-changeが設定されている');
    }
    
    // 背景との位置関係
    const rect = el.getBoundingClientRect();
    const elementsBelow = document.elementsFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
    const hasBgBelow = elementsBelow.some(below => {
      const s = getComputedStyle(below);
      return s.background && s.background.includes('gradient');
    });
    
    if (!hasBgBelow) {
      issues.push('この要素の下に背景グラデーションが見つかりません');
    }
    
    if (issues.length > 0) {
      console.warn(`要素${i+1}の問題:`, issues);
    }
  });
  
  console.groupEnd();
  
  // 5. 修正案
  console.group('💡 修正案');
  
  console.log('1. 背景を別の要素として配置する案:');
  console.log(`
// 背景専用の要素を作成
const bgDiv = document.createElement('div');
bgDiv.style.cssText = \`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--current-bg-gradient);
  z-index: -1;
  pointer-events: none;
\`;
document.body.insertBefore(bgDiv, document.body.firstChild);
  `);
  
  console.log('2. Blur効果をテストする:');
  console.log(`
// より強いBlur効果でテスト
document.documentElement.style.setProperty('--blur-amount', '30px');
document.querySelectorAll('[class*="glassmorphism"]').forEach(el => {
  el.style.backdropFilter = 'blur(30px) saturate(2)';
  el.style.webkitBackdropFilter = 'blur(30px) saturate(2)';
});
  `);
  
  console.log('3. 背景の不透明度を上げてテスト:');
  console.log(`
// 背景をより不透明に
document.querySelector('body::before') && (document.body.style.setProperty('--bg-opacity', '0.8'));
  `);
  
  console.groupEnd();
  console.groupEnd();
  
  // 実際のテスト用関数
  window.testBlurFix = function() {
    // 背景専用要素を追加
    const existing = document.getElementById('blur-test-bg');
    if (existing) existing.remove();
    
    const bgDiv = document.createElement('div');
    bgDiv.id = 'blur-test-bg';
    bgDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      z-index: -1;
      pointer-events: none;
    `;
    document.body.insertBefore(bgDiv, document.body.firstChild);
    
    console.log('✅ テスト背景を追加しました。Blur効果が見えるか確認してください。');
  };
  
  console.log('\n📌 testBlurFix() を実行してBlur効果をテストできます');
})();