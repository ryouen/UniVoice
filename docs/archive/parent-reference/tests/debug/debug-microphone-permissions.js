/**
 * マイク許可診断スクリプト
 * o3-pro技術監査に基づく段階的デバッグツール
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 UniVoice マイク許可診断ツール');
console.log('=================================\n');

// 1. Electron設定チェック
console.log('1️⃣ Electron設定チェック');
const mainTsPath = path.join(__dirname, 'electron', 'main.ts');
try {
  const mainContent = fs.readFileSync(mainTsPath, 'utf8');
  
  // webPreferencesチェック
  const hasMediaPermissions = mainContent.includes('permissions') && 
                              mainContent.includes('microphone');
  console.log(`   メディア許可設定: ${hasMediaPermissions ? '✅' : '❌ 未設定'}`);
  
  // Command line switchesチェック
  const hasMediaStream = mainContent.includes('enable-media-stream');
  console.log(`   メディアストリーム許可: ${hasMediaStream ? '✅' : '❌ 未設定'}`);
  
  if (!hasMediaPermissions || !hasMediaStream) {
    console.log('   📝 修正必要: webPreferencesにmedia許可設定を追加');
  }
} catch (error) {
  console.log('   ❌ main.tsの読み込みエラー:', error.message);
}

// 2. AudioWorkletパスチェック
console.log('\n2️⃣ AudioWorkletパス設定チェック');
const useAudioCapturePath = path.join(__dirname, 'src', 'hooks', 'useAudioCapture.ts');
try {
  const audioContent = fs.readFileSync(useAudioCapturePath, 'utf8');
  
  const workletPath = audioContent.match(/addModule\(['"`]([^'"`]+)['"`]\)/);
  if (workletPath) {
    console.log(`   AudioWorkletパス: ${workletPath[1]}`);
    
    // 絶対パスチェック
    const isAbsolutePath = workletPath[1].startsWith('/');
    if (isAbsolutePath) {
      console.log('   ⚠️ 警告: 絶対パスはElectron環境で問題を起こす可能性');
    }
    
    // ファイル存在チェック
    const actualFile = path.join(__dirname, 'public', 'audio-worklet-processor.js');
    const fileExists = fs.existsSync(actualFile);
    console.log(`   ファイル存在: ${fileExists ? '✅' : '❌ 見つからない'}`);
  }
} catch (error) {
  console.log('   ❌ useAudioCapture.tsの読み込みエラー:', error.message);
}

// 3. 環境変数チェック
console.log('\n3️⃣ 環境変数チェック');
require('dotenv').config({ quiet: true });

const requiredKeys = ['DEEPGRAM_API_KEY', 'OPENAI_API_KEY'];
requiredKeys.forEach(key => {
  const value = process.env[key];
  console.log(`   ${key}: ${value ? '✅ 設定済み' : '❌ 未設定'}`);
});

// 4. ポート状態チェック
console.log('\n4️⃣ 開発サーバー状態チェック');
exec('netstat -an | findstr 5173', (error, stdout, stderr) => {
  if (stdout && stdout.includes('5173')) {
    console.log('   開発サーバー: ✅ ポート5173で稼働中');
  } else {
    console.log('   開発サーバー: ❌ ポート5173が見つからない');
  }
});

// 5. パッケージ依存関係チェック
console.log('\n5️⃣ 重要な依存関係チェック');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  const criticalDeps = ['electron', 'vite', 'react'];
  criticalDeps.forEach(dep => {
    const version = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
    console.log(`   ${dep}: ${version || '❌ 未インストール'}`);
  });
} catch (error) {
  console.log('   ❌ package.jsonの読み込みエラー:', error.message);
}

// 6. 修正提案
console.log('\n🔧 修正提案');
console.log('================');
console.log('1. electron/main.tsに以下を追加:');
console.log(`   webPreferences: {
     ...existing,
     permissions: ['microphone']
   }`);
console.log('2. Windows用メディアフラグを追加:');
console.log(`   app.commandLine.appendSwitch('--enable-media-stream')`);
console.log('3. AudioWorkletパスを動的化:');
console.log(`   const path = window.electron ? 'file://...' : '/audio-worklet-processor.js'`);

// 7. テスト手順
console.log('\n🧪 テスト手順');
console.log('===============');
console.log('1. npm run dev でアプリを起動');
console.log('2. Chromeデベロッパーツールを開く');
console.log('3. console.log で navigator.mediaDevices を確認');
console.log('4. セッション開始ボタンをクリック');
console.log('5. 許可ダイアログが表示されるか確認');
console.log('6. エラーがあればConsoleタブで詳細を確認');

console.log('\n✅ 診断完了');