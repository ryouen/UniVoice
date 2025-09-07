console.log(`
=== リアルタイム表示修正確認 ===

問題の原因と修正:
1. SegmentManagerを削除したことでイベントが壊れた
2. 親フォルダでは currentOriginalUpdate と currentTranslationUpdate イベントを使用
3. UniVoice 2.0 にこれらのイベントを追加

Electronアプリで以下を実行してください：

// 1. リスニング開始
window.univoice.sendCommand({
  command: 'startListening',
  params: { sourceLanguage: 'en', targetLanguage: 'ja' }
}).then(result => console.log('Started:', result));

// 2. 直接イベントリスナーの確認
window.electron.on('currentOriginalUpdate', (event, data) => {
  console.log('Original:', data);
});

window.electron.on('currentTranslationUpdate', (event, text) => {
  console.log('Translation:', text);
});

// 3. マイクに向かって話す、またはテストイベント送信
// Deepgramからの音声認識がcurrentOriginalUpdateとして表示されるはず
// OpenAIからの翻訳がcurrentTranslationUpdateとして表示されるはず

確認ポイント:
✅ Current Original に英語テキストが表示される
✅ Current Japanese に日本語翻訳が表示される  
✅ History に重複なく表示される
✅ コンソールにエラーの無限ループがない
`);