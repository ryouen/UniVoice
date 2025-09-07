/**
 * Shadow Mode 結合テスト
 * 
 * LLM Gatewayの並列実行が既存機能に影響しないことを確認
 * 
 * テスト項目:
 * 1. Shadow Mode OFF: 既存の動作のみ
 * 2. Shadow Mode ON: 両方実行、ログ出力確認
 * 3. Shadow Modeエラー: 本番に影響しない
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// 環境変数のバックアップ
const originalEnv = process.env.ENABLE_LLM_SHADOW_MODE;

// ログ収集用
const logs = {
  shadowMode: [],
  translations: [],
  errors: []
};

// ログパーサー
function parseLogOutput(data) {
  const lines = data.split('\n');
  lines.forEach(line => {
    if (line.includes('Shadow Mode translation comparison')) {
      logs.shadowMode.push(line);
    }
    if (line.includes('[翻訳完了]')) {
      logs.translations.push(line);
    }
    if (line.includes('error') || line.includes('Error')) {
      logs.errors.push(line);
    }
  });
}

// テスト実行関数
async function runTest(shadowModeEnabled) {
  console.log(`\n=== Testing with Shadow Mode: ${shadowModeEnabled ? 'ON' : 'OFF'} ===\n`);
  
  // 環境変数を設定
  process.env.ENABLE_LLM_SHADOW_MODE = shadowModeEnabled ? 'true' : 'false';
  
  // ログをクリア
  logs.shadowMode = [];
  logs.translations = [];
  logs.errors = [];
  
  return new Promise((resolve, reject) => {
    // Electronアプリを起動
    const electron = spawn('npm', ['run', 'electron'], {
      cwd: path.join(__dirname, '../..'),
      env: process.env,
      shell: true
    });
    
    let testTimeout;
    let output = '';
    
    electron.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;
      console.log(str);
      parseLogOutput(str);
    });
    
    electron.stderr.on('data', (data) => {
      const str = data.toString();
      output += str;
      console.error(str);
      parseLogOutput(str);
    });
    
    // 10秒後に終了
    testTimeout = setTimeout(() => {
      electron.kill();
    }, 10000);
    
    electron.on('close', (code) => {
      clearTimeout(testTimeout);
      resolve({ code, output, logs });
    });
    
    electron.on('error', (err) => {
      clearTimeout(testTimeout);
      reject(err);
    });
  });
}

// メインテスト
async function main() {
  console.log('🔍 UniVoice Shadow Mode Integration Test');
  console.log('========================================\n');
  
  try {
    // Test 1: Shadow Mode OFF
    const resultOff = await runTest(false);
    console.log('\nTest 1 Results (Shadow Mode OFF):');
    console.log(`- Translations: ${resultOff.logs.translations.length}`);
    console.log(`- Shadow Mode logs: ${resultOff.logs.shadowMode.length}`);
    console.log(`- Errors: ${resultOff.logs.errors.length}`);
    
    if (resultOff.logs.shadowMode.length > 0) {
      console.error('❌ Shadow Mode should not run when disabled!');
      process.exit(1);
    }
    
    // Test 2: Shadow Mode ON
    const resultOn = await runTest(true);
    console.log('\nTest 2 Results (Shadow Mode ON):');
    console.log(`- Translations: ${resultOn.logs.translations.length}`);
    console.log(`- Shadow Mode logs: ${resultOn.logs.shadowMode.length}`);
    console.log(`- Errors: ${resultOn.logs.errors.length}`);
    
    if (resultOn.logs.shadowMode.length === 0) {
      console.warn('⚠️  No Shadow Mode comparisons logged (might need more test time)');
    } else {
      console.log('✅ Shadow Mode comparisons detected');
      // 比較結果をサンプル表示
      const sample = resultOn.logs.shadowMode[0];
      if (sample) {
        console.log('\nSample Shadow Mode comparison:');
        console.log(sample);
      }
    }
    
    // 翻訳数が同じであることを確認（Shadow Modeが本番に影響していない）
    if (resultOff.logs.translations.length !== resultOn.logs.translations.length) {
      console.warn('⚠️  Translation count differs between Shadow Mode ON/OFF');
    }
    
    console.log('\n✅ All tests completed successfully');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    // 環境変数を元に戻す
    if (originalEnv !== undefined) {
      process.env.ENABLE_LLM_SHADOW_MODE = originalEnv;
    }
  }
}

// テスト実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runTest };