// UniVoice 2.0 データフローデバッグスクリプト
// DevToolsコンソールで実行

console.log('=== UniVoice 2.0 Complete Debug Flow ===');

// 1. 基本的なAPIの確認
console.log('\n1. API Availability Check:');
console.log('   - window.univoice:', !!window.univoice);
console.log('   - window.electron:', !!window.electron);

if (!window.univoice || !window.electron) {
  console.error('❌ Required APIs not available!');
  return;
}

// 2. イベントリスナーのセットアップ
console.log('\n2. Setting up event listeners...');

let eventLog = [];
let originalCount = 0;
let translationCount = 0;
let pipelineEventCount = 0;

// currentOriginalUpdateイベント
const removeOriginal = window.electron.on('currentOriginalUpdate', (event, data) => {
  originalCount++;
  const log = {
    time: new Date().toLocaleTimeString(),
    type: 'currentOriginalUpdate',
    data: data,
    count: originalCount
  };
  eventLog.push(log);
  console.log(`✅ [${originalCount}] currentOriginalUpdate:`, data);
});

// currentTranslationUpdateイベント
const removeTranslation = window.electron.on('currentTranslationUpdate', (event, text) => {
  translationCount++;
  const log = {
    time: new Date().toLocaleTimeString(),
    type: 'currentTranslationUpdate',
    text: text,
    count: translationCount
  };
  eventLog.push(log);
  console.log(`✅ [${translationCount}] currentTranslationUpdate:`, text);
});

// pipelineEventイベント
const removePipeline = window.univoice.onPipelineEvent((event) => {
  pipelineEventCount++;
  const log = {
    time: new Date().toLocaleTimeString(),
    type: 'pipelineEvent',
    eventType: event.type,
    data: event.data,
    count: pipelineEventCount
  };
  eventLog.push(log);
  console.log(`📡 [${pipelineEventCount}] Pipeline Event:`, event.type, event.data);
});

console.log('✅ Event listeners set up.');

// 3. 現在のReact stateを確認（React DevToolsがあれば）
console.log('\n3. Checking React component state...');
// React DevToolsから手動で確認してください：
// - currentDisplay の値
// - currentOriginal の値
// - currentTranslation の値
// - pipeline の状態

// 4. DOM要素の確認
console.log('\n4. Checking DOM elements...');
const originalDiv = document.getElementById('currentOriginal');
const translationDiv = document.getElementById('currentTranslation');

if (originalDiv) {
  console.log('✅ Original text div found:', {
    innerHTML: originalDiv.innerHTML,
    textContent: originalDiv.textContent,
    style: {
      display: originalDiv.style.display,
      visibility: originalDiv.style.visibility,
      opacity: originalDiv.style.opacity
    }
  });
} else {
  console.error('❌ Original text div not found!');
}

if (translationDiv) {
  console.log('✅ Translation text div found:', {
    innerHTML: translationDiv.innerHTML,
    textContent: translationDiv.textContent,
    style: {
      display: translationDiv.style.display,
      visibility: translationDiv.style.visibility,
      opacity: translationDiv.style.opacity
    }
  });
} else {
  console.error('❌ Translation text div not found!');
}

// 5. 10秒後にサマリーを表示
console.log('\n5. Starting 10-second monitoring...');
console.log('🎤 Please start recording and speak something...');

setTimeout(() => {
  console.log('\n=== 10-Second Summary ===');
  console.log(`Original events: ${originalCount}`);
  console.log(`Translation events: ${translationCount}`);
  console.log(`Pipeline events: ${pipelineEventCount}`);
  
  if (eventLog.length > 0) {
    console.log('\nLast 5 events:');
    eventLog.slice(-5).forEach(log => {
      console.log(`  [${log.time}] ${log.type}:`, log.data || log.text || log.eventType);
    });
  } else {
    console.error('❌ No events received!');
  }
  
  // DOM再確認
  console.log('\nFinal DOM check:');
  const finalOriginal = document.getElementById('currentOriginal');
  const finalTranslation = document.getElementById('currentTranslation');
  
  console.log('Original text:', finalOriginal?.textContent || 'EMPTY');
  console.log('Translation text:', finalTranslation?.textContent || 'EMPTY');
  
  // クリーンアップ
  console.log('\n6. Cleanup...');
  if (removeOriginal) removeOriginal();
  if (removeTranslation) removeTranslation();
  if (removePipeline) removePipeline();
  console.log('✅ Event listeners removed.');
  
}, 10000);

// 手動でReact stateを確認するための関数
window.debugCheckReactState = () => {
  // React DevToolsで以下を確認：
  // 1. UniVoicePerfect コンポーネント
  // 2. currentDisplay state の値
  // 3. currentOriginal と currentTranslation の値
  // 4. pipeline.currentOriginal と pipeline.currentTranslation の値
  console.log('Please check React DevTools for:');
  console.log('- UniVoicePerfect > currentDisplay');
  console.log('- UniVoicePerfect > currentOriginal');
  console.log('- UniVoicePerfect > currentTranslation');
  console.log('- UniVoicePerfect > pipeline');
};

console.log('\nTip: Run window.debugCheckReactState() for React state check instructions.');