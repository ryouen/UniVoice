/**
 * リアルタイムエリアのレイアウト検証
 */

(function testRealtimeLayout() {
  console.group('🔍 リアルタイムエリアレイアウト検証');
  
  // 1. リアルタイムエリアの検証
  console.group('📐 リアルタイムエリア');
  const realtimeArea = document.querySelector('[class*="realtimeArea"]');
  if (realtimeArea) {
    const style = getComputedStyle(realtimeArea);
    console.log('height:', style.height);
    console.log('minHeight:', style.minHeight);
    console.log('flexGrow:', style.flexGrow);
    console.log('flexShrink:', style.flexShrink);
    console.log('overflow:', style.overflowY);
    console.log('padding:', style.padding);
    
    // 実際の高さとビューポート高さの比較
    const rect = realtimeArea.getBoundingClientRect();
    console.log('実際の高さ:', rect.height + 'px');
    console.log('ビューポート高さ:', window.innerHeight + 'px');
    console.log('高さの割合:', Math.round(rect.height / window.innerHeight * 100) + '%');
  } else {
    console.warn('リアルタイムエリアが見つかりません');
  }
  console.groupEnd();
  
  // 2. コンテンツの配置確認
  console.group('📝 コンテンツ配置');
  const gridContainer = realtimeArea?.querySelector('[style*="grid"]');
  if (gridContainer) {
    const gridStyle = getComputedStyle(gridContainer);
    console.log('display:', gridStyle.display);
    console.log('alignContent:', gridStyle.alignContent);
    console.log('grid高さ:', gridContainer.getBoundingClientRect().height + 'px');
    
    // 各行の内容確認
    const rows = gridContainer.querySelectorAll('[style*="gridRow"]');
    console.log('表示行数:', rows.length);
    rows.forEach((row, i) => {
      const text = row.textContent?.trim();
      if (text) {
        console.log(`行${i+1}: "${text.substring(0, 30)}..."`);
      }
    });
  } else {
    console.log('グリッドコンテナが見つかりません（単一行表示モード？）');
  }
  console.groupEnd();
  
  // 3. 親コンテナの確認
  console.group('📦 親コンテナ');
  const appContainer = document.querySelector('[class*="app"]');
  if (appContainer) {
    const appStyle = getComputedStyle(appContainer);
    console.log('display:', appStyle.display);
    console.log('flexDirection:', appStyle.flexDirection);
    console.log('height:', appStyle.height);
    console.log('実際の高さ:', appContainer.getBoundingClientRect().height + 'px');
  }
  console.groupEnd();
  
  // 4. 修正の効果確認
  console.group('✅ 修正効果の確認');
  const issues = [];
  
  if (realtimeArea) {
    const style = getComputedStyle(realtimeArea);
    
    if (style.flexGrow !== '1') {
      issues.push('❌ flex-growが1ではありません');
    } else {
      console.log('✅ flex-grow: 1 が適用されています');
    }
    
    if (!style.minHeight || parseInt(style.minHeight) < 100) {
      issues.push('❌ 最小高さが設定されていません');
    } else {
      console.log('✅ 最小高さが設定されています:', style.minHeight);
    }
    
    if (gridContainer) {
      const gridStyle = getComputedStyle(gridContainer);
      if (gridStyle.alignContent === 'flex-end') {
        issues.push('❌ コンテンツがまだ下揃えです');
      } else if (gridStyle.alignContent === 'flex-start') {
        console.log('✅ コンテンツが上揃えに設定されています');
      }
    }
  }
  
  if (issues.length === 0) {
    console.log('🎉 すべての修正が正しく適用されています！');
  } else {
    console.warn('⚠️ 問題が見つかりました:');
    issues.forEach(issue => console.warn(issue));
  }
  console.groupEnd();
  
  console.groupEnd();
})();