/**
 * 最終レイアウト検証スクリプト
 */

(function testFinalLayout() {
  console.group('🔍 最終レイアウト検証');
  
  // 1. 高さ計算の検証
  console.group('📐 高さ計算');
  
  // 各セクションの表示状態を確認
  const header = document.querySelector('[class*="header"]:not([class*="headerCompact"])');
  const compactHeader = document.querySelector('[class*="headerCompact"]');
  const settingsBar = document.querySelector('[class*="settingsBar"]');
  const realtimeArea = document.querySelector('[class*="realtimeArea"]');
  const questionArea = document.querySelector('[class*="questionArea"]');
  
  const sections = {
    header: header ? header.getBoundingClientRect().height : 0,
    compactHeader: compactHeader ? compactHeader.getBoundingClientRect().height : 0,
    settings: settingsBar ? settingsBar.getBoundingClientRect().height : 0,
    realtime: realtimeArea ? realtimeArea.getBoundingClientRect().height : 0,
    question: questionArea ? questionArea.getBoundingClientRect().height : 0
  };
  
  console.log('各セクションの高さ:', sections);
  
  const totalHeight = Object.values(sections).reduce((sum, h) => sum + h, 0);
  console.log('合計高さ:', totalHeight + 'px');
  console.log('ウィンドウ高さ:', window.innerHeight + 'px');
  console.log('差分:', Math.abs(window.innerHeight - totalHeight) + 'px');
  
  console.groupEnd();
  
  // 2. リアルタイムエリアの設定確認
  console.group('📝 リアルタイムエリア');
  if (realtimeArea) {
    const style = getComputedStyle(realtimeArea);
    console.log('height:', style.height);
    console.log('flex-grow:', style.flexGrow);
    console.log('overflow:', style.overflowY);
    console.log('padding:', style.padding);
    console.log('background:', style.backgroundColor);
    
    // コンテンツの配置確認
    const gridContainer = realtimeArea.querySelector('[style*="grid"]');
    if (gridContainer) {
      const gridStyle = getComputedStyle(gridContainer);
      console.log('alignContent:', gridStyle.alignContent);
    }
  }
  console.groupEnd();
  
  // 3. 背景の重複確認
  console.group('🎨 背景の重複チェック');
  const elementsWithBg = document.querySelectorAll('[class*="theme"]');
  let duplicateBgCount = 0;
  
  elementsWithBg.forEach((el, i) => {
    const style = getComputedStyle(el);
    if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      console.log(`要素${i+1}:`, {
        class: el.className,
        background: style.backgroundColor
      });
      
      // 親要素も背景を持っているか確認
      const parent = el.parentElement;
      if (parent) {
        const parentStyle = getComputedStyle(parent);
        if (parentStyle.backgroundColor && parentStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          console.warn('⚠️ 親要素も背景色を持っています:', parentStyle.backgroundColor);
          duplicateBgCount++;
        }
      }
    }
  });
  
  if (duplicateBgCount > 0) {
    console.warn(`❌ ${duplicateBgCount}個の背景重複が見つかりました`);
  } else {
    console.log('✅ 背景の重複はありません');
  }
  console.groupEnd();
  
  // 4. 修正結果のサマリー
  console.group('✅ 修正結果');
  const issues = [];
  
  // 高さの確認
  if (Math.abs(window.innerHeight - totalHeight) > 5) {
    issues.push('❌ ウィンドウ高さと合計高さが一致しません');
  } else {
    console.log('✅ ウィンドウ高さが正しく計算されています');
  }
  
  // リアルタイムエリアの確認
  if (realtimeArea) {
    const style = getComputedStyle(realtimeArea);
    if (style.flexGrow === '1') {
      issues.push('❌ flex-growがまだ1に設定されています');
    } else {
      console.log('✅ リアルタイムエリアは固定高さです');
    }
    
    const gridContainer = realtimeArea.querySelector('[style*="grid"]');
    if (gridContainer) {
      const gridStyle = getComputedStyle(gridContainer);
      if (gridStyle.alignContent === 'flex-start') {
        console.log('✅ コンテンツは上揃えです');
      } else {
        issues.push('❌ コンテンツが上揃えになっていません');
      }
    }
  }
  
  if (issues.length === 0) {
    console.log('🎉 すべての修正が正しく適用されています！');
  } else {
    console.warn('⚠️ 以下の問題が残っています:');
    issues.forEach(issue => console.warn(issue));
  }
  console.groupEnd();
  
  console.groupEnd();
})();