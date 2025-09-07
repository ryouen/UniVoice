/**
 * セッション制御の動作確認テスト
 * 
 * 「一時停止中」から再開できない問題の調査用
 */

console.log('=== Session Control Test ===\n');

console.log('📋 確認手順:\n');
console.log('1. Electronアプリケーションを起動');
console.log('2. 授業名を入力（または選択）');
console.log('3. 言語設定を確認（英語→日本語）');
console.log('4. 「セッション開始」ボタンをクリック');
console.log('5. マイクアクセスを許可\n');

console.log('🔍 確認ポイント:');
console.log('- セッション開始後の状態表示');
console.log('- 「一時停止中」と表示される場合の条件');
console.log('- 再開ボタンの有無と動作\n');

console.log('⚠️ 既知の問題:');
console.log('- 一時停止/再開機能が実装されていない可能性');
console.log('- 状態管理の不整合による表示エラー\n');

console.log('💡 推奨される対処法:');
console.log('1. アプリケーションを完全に再起動');
console.log('2. ブラウザのキャッシュをクリア');
console.log('3. DevTools Consoleでエラーを確認\n');

console.log('🛠️ デバッグ情報収集:');
console.log('DevTools Console (Ctrl+Shift+I) で以下を確認:');
console.log('- [useUnifiedPipeline] のログ');
console.log('- エラーメッセージの有無');
console.log('- pipeline.isRunning の値');
console.log('- state.status の値\n');

console.log('✅ 正常な動作フロー:');
console.log('1. セッション開始 → 録音中の表示');
console.log('2. 音声認識結果がリアルタイムに表示');
console.log('3. 翻訳結果が1秒以内に表示');
console.log('4. セッション終了 → 停止状態\n');

console.log('📝 問題が継続する場合:');
console.log('- コンソールログをコピーして保存');
console.log('- 再現手順を記録');
console.log('- 状態遷移のタイミングを確認');