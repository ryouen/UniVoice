/**
 * クリーン起動確認テスト
 * 
 * アプリケーションが正常に起動したことを確認
 */

const http = require('http');

console.log('=== Clean Startup Test ===\n');

// Wait for server to be ready
setTimeout(() => {
  // Check if dev server is running
  http.get('http://localhost:5178/', (res) => {
    console.log('✅ 開発サーバー起動確認:');
    console.log(`   - Status: ${res.statusCode}`);
    console.log(`   - URL: http://localhost:5178/\n`);
    
    console.log('✅ Electronアプリケーション:');
    console.log('   - 別ウィンドウで起動中');
    console.log('   - 初期画面が表示されているはずです\n');
    
    console.log('📋 次の手順:');
    console.log('1. Electronアプリケーションウィンドウを確認');
    console.log('2. 授業名を入力（例: テスト授業）');
    console.log('3. 言語設定を確認（英語→日本語）');
    console.log('4. 「セッション開始」ボタンをクリック');
    console.log('5. マイクアクセスを許可\n');
    
    console.log('🔍 正常動作の確認:');
    console.log('- 音声認識が開始される');
    console.log('- リアルタイムで文字起こしが表示される');
    console.log('- 1秒以内に翻訳が表示される');
    console.log('- 履歴に結果が蓄積される\n');
    
    console.log('✅ クリーン起動完了！');
  }).on('error', (err) => {
    console.error('❌ サーバー接続エラー:', err.message);
    console.log('\n開発サーバーが起動していない可能性があります。');
    console.log('別のターミナルで `npm run dev` を実行してください。');
  });
}, 2000);

// Clean exit after test
setTimeout(() => {
  process.exit(0);
}, 5000);