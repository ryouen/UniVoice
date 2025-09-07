/**
 * 3段階表示デバッグスクリプト
 * ブラウザのコンソールで実行して、現在の状態を確認
 */

// このスクリプトをブラウザのコンソールで実行してください
console.log('=== 3段階表示デバッグ開始 ===');

// React Developer Toolsがインストールされていることを前提
// もしくは、windowオブジェクトに公開されているデータを確認

// 1. displayContentの中身を確認
const displayElements = document.querySelectorAll('[id*="currentOriginal"], [id*="currentTranslation"]');
console.log('表示要素:', displayElements.length);

displayElements.forEach(el => {
  console.log({
    id: el.id,
    className: el.className,
    innerText: el.innerText?.substring(0, 50),
    children: el.children.length,
    style: el.style.cssText
  });
});

// 2. 3行表示の各行を確認
const checkThreeLineDisplay = () => {
  const container = document.querySelector('.current-text');
  if (!container) {
    console.warn('3行表示コンテナが見つかりません');
    return;
  }
  
  const lines = container.querySelectorAll('div[style*="opacity"]');
  console.log(`表示されている行数: ${lines.length}`);
  
  lines.forEach((line, index) => {
    const style = window.getComputedStyle(line);
    console.log(`行${index + 1}:`, {
      opacity: style.opacity,
      text: line.innerText?.substring(0, 30),
      display: style.display,
      visibility: style.visibility
    });
  });
};

// 3. React Propsを確認（React DevTools必要）
const checkReactProps = () => {
  console.log('React DevToolsで以下を確認してください:');
  console.log('1. RealtimeSection コンポーネントを探す');
  console.log('2. props.displayContent の中身を確認');
  console.log('3. props.currentOriginal と props.currentTranslation の値を確認');
  console.log('4. ThreeLineDisplay コンポーネントの props を確認');
};

// 4. 定期的に状態を監視
let monitorInterval;
const startMonitoring = () => {
  console.log('3秒ごとに状態を監視します（stopMonitoring()で停止）');
  monitorInterval = setInterval(() => {
    console.log('--- 監視中 ---');
    checkThreeLineDisplay();
  }, 3000);
};

const stopMonitoring = () => {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    console.log('監視を停止しました');
  }
};

// グローバルに関数を公開
window.debugThreeLineDisplay = {
  checkThreeLineDisplay,
  checkReactProps,
  startMonitoring,
  stopMonitoring
};

console.log('=== デバッグ関数が利用可能になりました ===');
console.log('以下のコマンドが使用できます:');
console.log('- debugThreeLineDisplay.checkThreeLineDisplay() : 現在の表示状態を確認');
console.log('- debugThreeLineDisplay.startMonitoring() : 定期監視開始');
console.log('- debugThreeLineDisplay.stopMonitoring() : 定期監視停止');
console.log('- debugThreeLineDisplay.checkReactProps() : React Propsの確認方法');

// 初回実行
checkThreeLineDisplay();