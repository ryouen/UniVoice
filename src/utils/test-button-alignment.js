/**
 * ボタン配置の検証スクリプト
 */

(function testButtonAlignment() {
  console.group('🔍 ボタン配置検証');
  
  // 1. メニューバーのボタン位置を取得
  console.group('📐 メニューバー');
  const headerButtons = document.querySelector('.header, [class*="header"]:not([class*="headerCompact"])')?.querySelectorAll('button');
  if (headerButtons) {
    const rightButtons = [];
    headerButtons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const tooltip = btn.querySelector('[class*="tooltip"]');
      const label = tooltip?.textContent || 'ボタン';
      
      // 右側のボタンのみ抽出（画面幅の半分より右側）
      if (rect.left > window.innerWidth / 2) {
        rightButtons.push({
          label,
          left: rect.left,
          center: rect.left + rect.width / 2,
          width: rect.width
        });
      }
    });
    
    // 左から順にソート
    rightButtons.sort((a, b) => a.left - b.left);
    console.log('右側のボタン（左から順）:');
    rightButtons.forEach(btn => {
      console.log(`  ${btn.label}: 中心 ${Math.round(btn.center)}px`);
    });
  }
  console.groupEnd();
  
  // 2. 設定バーのボタン位置を取得
  console.group('📐 設定バー');
  const settingsBar = document.querySelector('[class*="settingsBar"]');
  if (settingsBar && settingsBar.offsetHeight > 0) {
    const settingsButtons = settingsBar.querySelectorAll('button');
    const rightButtons = [];
    
    settingsButtons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const tooltip = btn.querySelector('[class*="sTooltip"]');
      const label = tooltip?.textContent || btn.textContent || 'ボタン';
      
      // 右側のボタンのみ抽出
      if (rect.left > window.innerWidth / 2) {
        rightButtons.push({
          label,
          left: rect.left,
          center: rect.left + rect.width / 2,
          width: rect.width
        });
      }
    });
    
    // 左から順にソート
    rightButtons.sort((a, b) => a.left - b.left);
    console.log('右側のボタン（左から順）:');
    rightButtons.forEach(btn => {
      console.log(`  ${btn.label}: 中心 ${Math.round(btn.center)}px`);
    });
  } else {
    console.warn('設定バーが非表示または見つかりません');
  }
  console.groupEnd();
  
  // 3. 垂直方向の整列確認
  console.group('✅ 垂直整列の確認');
  
  // メニューバーと設定バーの両方のボタンを取得
  const menuButtons = {};
  const settingsButtons = {};
  
  // メニューバーのボタン
  const header = document.querySelector('.header, [class*="header"]:not([class*="headerCompact"])');
  if (header) {
    header.querySelectorAll('button').forEach(btn => {
      const tooltip = btn.querySelector('[class*="tooltip"]');
      const label = tooltip?.textContent || '';
      const rect = btn.getBoundingClientRect();
      
      if (label.includes('設定')) menuButtons['settings'] = rect;
      if (label.includes('最前面')) menuButtons['alwaysOnTop'] = rect;
      if (label.includes('メニューを隠す')) menuButtons['hideMenu'] = rect;
      if (label.includes('閉じる')) menuButtons['close'] = rect;
    });
  }
  
  // 設定バーのボタン
  if (settingsBar && settingsBar.offsetHeight > 0) {
    settingsBar.querySelectorAll('button').forEach(btn => {
      const tooltip = btn.querySelector('[class*="sTooltip"]');
      const label = tooltip?.textContent || btn.textContent || '';
      const rect = btn.getBoundingClientRect();
      
      if (label.includes('Ctrl+-')) settingsButtons['minus'] = rect;
      if (label.includes('テーマ')) settingsButtons['theme'] = rect;
      if (label.includes('Ctrl++')) settingsButtons['plus'] = rect;
      if (label === 'T' || label.includes('リセット')) settingsButtons['T'] = rect;
      if (label.includes('ヘッダー')) settingsButtons['toggleHeader'] = rect;
    });
  }
  
  // 整列チェック
  const alignmentChecks = [
    { menu: 'settings', settings: 'minus', label: '[設定] ↔ [-]' },
    { menu: 'alwaysOnTop', settings: 'plus', label: '[最前面] ↔ [+]' },
    { menu: 'hideMenu', settings: 'T', label: '[メニュー隠す] ↔ [T]' },
    { menu: 'close', settings: 'toggleHeader', label: '[X] ↔ [ヘッダー表示/非表示]' }
  ];
  
  alignmentChecks.forEach(check => {
    if (menuButtons[check.menu] && settingsButtons[check.settings]) {
      const menuCenter = menuButtons[check.menu].left + menuButtons[check.menu].width / 2;
      const settingsCenter = settingsButtons[check.settings].left + settingsButtons[check.settings].width / 2;
      const diff = Math.abs(menuCenter - settingsCenter);
      
      if (diff < 5) {
        console.log(`✅ ${check.label}: 完璧に整列 (差: ${diff.toFixed(1)}px)`);
      } else if (diff < 10) {
        console.log(`⚠️ ${check.label}: ほぼ整列 (差: ${diff.toFixed(1)}px)`);
      } else {
        console.warn(`❌ ${check.label}: ずれている (差: ${diff.toFixed(1)}px)`);
      }
    } else {
      console.warn(`❓ ${check.label}: ボタンが見つかりません`);
    }
  });
  
  console.groupEnd();
  
  // 4. テーマボタンの配置確認
  console.group('🎨 テーマボタンの配置');
  if (settingsButtons.theme && settingsButtons.minus) {
    const themeRect = settingsButtons.theme;
    const minusRect = settingsButtons.minus;
    
    if (themeRect.right < minusRect.left) {
      const gap = minusRect.left - themeRect.right;
      console.log(`✅ テーマボタンは[-]の左側にあります (間隔: ${gap.toFixed(0)}px)`);
    } else {
      console.warn('❌ テーマボタンの位置が正しくありません');
    }
  }
  console.groupEnd();
  
  console.groupEnd();
})();