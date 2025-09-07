// DevToolsコンソールで実行するデバッグコマンド
// 現在の状態を確認

console.log('=== UniVoice Debug Check ===');
console.log('1. APIs available:');
console.log('   - window.univoice:', !!window.univoice);
console.log('   - window.electron:', !!window.electron);

if (window.univoice) {
  console.log('2. UniVoice methods:', Object.keys(window.univoice));
}

console.log('\n3. Testing event listeners:');

// テスト用のリスナーを設定
let eventCount = 0;

// currentOriginalUpdateイベント
const removeOriginal = window.electron.on('currentOriginalUpdate', (event, data) => {
  eventCount++;
  console.log(`[${eventCount}] 🎤 currentOriginalUpdate:`, data);
});

// currentTranslationUpdateイベント  
const removeTranslation = window.electron.on('currentTranslationUpdate', (event, text) => {
  eventCount++;
  console.log(`[${eventCount}] 🇯🇵 currentTranslationUpdate:`, text);
});

// pipelineEventイベント
const removePipeline = window.univoice.onPipelineEvent((event) => {
  eventCount++;
  console.log(`[${eventCount}] 📡 Pipeline Event:`, event.type, event.data);
});

console.log('✅ Event listeners set up. Now try starting a session.');
console.log('   Events received so far:', eventCount);

// 10秒後にイベント数を報告
setTimeout(() => {
  console.log('\n📊 Event count after 10 seconds:', eventCount);
  if (eventCount === 0) {
    console.log('❌ No events received! Check:');
    console.log('   1. Is the session started?');
    console.log('   2. Is the microphone working?');
    console.log('   3. Check Electron logs for errors');
  }
}, 10000);

// クリーンアップ関数
window.debugCleanup = () => {
  removeOriginal();
  removeTranslation();
  removePipeline();
  console.log('🧹 Debug listeners cleaned up');
};