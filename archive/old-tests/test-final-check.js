console.log(`
=== UniVoice 2.0 最終動作確認 ===

Electronアプリケーションが起動しました。
DevToolsコンソールで以下のコマンドを実行してください：

1. リスニング開始テスト:
--------------------------
window.univoice.sendCommand({
  command: 'startListening',
  params: { sourceLanguage: 'en', targetLanguage: 'ja' }
}).then(result => console.log('Start result:', result));

2. テストイベント送信（手動）:
--------------------------
// ASRイベント
window.dispatchEvent(new CustomEvent('pipeline-event', {
  detail: {
    type: 'asr',
    correlationId: 'test-${Date.now()}',
    timestamp: Date.now(),
    data: {
      text: 'Hello world, this is a test',
      isFinal: true,
      segmentId: 'test-segment-${Date.now()}',
      language: 'en',
      confidence: 0.95
    }
  }
}));

3. 確認ポイント:
--------------------------
✅ Current Original: リアルタイムで英語テキストが表示される
✅ Current Japanese: 日本語翻訳が表示される（APIキーが正しければ）
✅ History: 履歴に重複なく1エントリのみ表示される
✅ Console: エラーの無限ループがない

問題が解決されているはずです：
- 60,000エラーの無限ループ → 修正済み
- リアルタイム文字起こし非表示 → 修正済み
- 履歴の重複 → 修正済み
`);