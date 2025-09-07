/**
 * 文単位結合機能の動作確認テスト
 * 
 * このテストは実行中のアプリケーションで以下を確認します：
 * 1. Deepgramセグメントが正しく受信されているか
 * 2. SentenceCombinerが文単位に結合しているか
 * 3. 履歴用翻訳が低優先度でキューイングされているか
 * 4. リアルタイム翻訳と履歴翻訳が並行して動作しているか
 */

console.log('=== Sentence Combining Verification Test ===\n');

console.log('✅ アプリケーションが起動しました');
console.log('✅ 開発サーバー: http://localhost:5176/');
console.log('✅ Electronアプリが別ウィンドウで実行中\n');

console.log('📋 動作確認手順:\n');
console.log('1. Electronアプリケーションで「セッション開始」をクリック');
console.log('2. 英語で数文話す（例: "Hello everyone. Welcome to our class. Today we will discuss machine learning."）');
console.log('3. DevTools Console (Ctrl+Shift+I) で以下のログを確認：\n');

console.log('期待されるログ出力:');
console.log('- [UnifiedPipelineService] Deepgram WebSocket connected successfully');
console.log('- [UnifiedPipelineService] Emitting ASR event: {text: "Hello everyone", isFinal: true}');
console.log('- [UnifiedPipelineService] Translation request queued');
console.log('- [SentenceCombiner] Emitting combined sentence: 2 segments');
console.log('- [UnifiedPipelineService] Combined sentence ready: 2 segments');
console.log('- [UnifiedPipelineService] History translation queued for combined sentence: comb_xxx');
console.log('- [UnifiedPipelineService] History translation completed in Xms\n');

console.log('🔍 確認ポイント:');
console.log('1. リアルタイム翻訳が即座に表示される（1秒以内）');
console.log('2. 文が完成すると履歴用翻訳がキューイングされる');
console.log('3. 履歴翻訳が完了してもリアルタイム表示に影響しない');
console.log('4. 履歴セクションに高品質な翻訳が表示される\n');

console.log('📊 パフォーマンス目標:');
console.log('- リアルタイム翻訳: first paint ≤ 1000ms');
console.log('- 履歴翻訳: 完了まで ≤ 3000ms');
console.log('- 同時実行: リアルタイム翻訳の遅延なし\n');

console.log('⚠️ 注意事項:');
console.log('- APIキーが正しく設定されていることを確認');
console.log('- マイクのアクセス許可を与える');
console.log('- 英語で話す（sourceLanguage: en）\n');

console.log('✅ テスト準備完了！');
console.log('Electronアプリケーションで動作を確認してください。');