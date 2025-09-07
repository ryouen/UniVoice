/**
 * Clean Architecture コンポーネント抽出の統合テスト
 * 
 * 目的：
 * - SetupSectionが正しく動作するか
 * - RealtimeSectionが正しく動作するか
 * - コンポーネント間の連携が保たれているか
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

// テスト結果を記録
const testResults = {
  timestamp: new Date().toISOString(),
  tests: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  testResults.tests.push({ timestamp, type, message });
}

async function runTests() {
  log('Clean Architecture コンポーネント抽出テスト開始');
  
  try {
    // 1. アプリケーション起動テスト
    log('Test 1: アプリケーション起動確認');
    await app.whenReady();
    log('✅ Electronアプリケーションが正常に起動', 'success');
    
    // 2. メインウィンドウ作成
    log('Test 2: メインウィンドウ作成');
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../../electron/preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    
    await mainWindow.loadURL('http://localhost:5173');
    log('✅ メインウィンドウが正常に作成され、URLがロードされた', 'success');
    
    // 3. SetupSectionの存在確認
    log('Test 3: SetupSectionコンポーネントの存在確認');
    const setupExists = await mainWindow.webContents.executeJavaScript(`
      (() => {
        const setupSection = document.querySelector('.setup-section');
        const title = document.querySelector('h1');
        return {
          exists: !!setupSection,
          hasTitle: !!title,
          titleText: title ? title.textContent : null
        };
      })()
    `);
    
    if (setupExists.exists && setupExists.hasTitle && setupExists.titleText === 'UniVoice') {
      log('✅ SetupSectionが正常に表示されている', 'success');
    } else {
      log('❌ SetupSectionが見つからない', 'error');
    }
    
    // 4. セッション開始ボタンの動作確認
    log('Test 4: セッション開始機能の確認');
    const sessionStarted = await mainWindow.webContents.executeJavaScript(`
      (() => {
        const button = document.querySelector('button');
        if (button && button.textContent.includes('セッション開始')) {
          button.click();
          return true;
        }
        return false;
      })()
    `);
    
    if (sessionStarted) {
      log('✅ セッション開始ボタンがクリックされた', 'success');
      
      // 少し待ってからRealtimeSectionを確認
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 5. RealtimeSectionの表示確認
      log('Test 5: RealtimeSectionの表示確認');
      const realtimeExists = await mainWindow.webContents.executeJavaScript(`
        (() => {
          const currentOriginal = document.getElementById('currentOriginal');
          const currentTranslation = document.getElementById('currentTranslation');
          return {
            originalExists: !!currentOriginal,
            translationExists: !!currentTranslation
          };
        })()
      `);
      
      if (realtimeExists.originalExists && realtimeExists.translationExists) {
        log('✅ RealtimeSectionが正常に表示されている', 'success');
      } else {
        log('❌ RealtimeSectionが見つからない', 'error');
      }
    }
    
    // 6. コンソールエラーの確認
    log('Test 6: コンソールエラーの確認');
    const consoleErrors = await mainWindow.webContents.executeJavaScript(`
      window.__consoleErrors || []
    `);
    
    if (consoleErrors.length === 0) {
      log('✅ コンソールエラーなし', 'success');
    } else {
      log(`⚠️ コンソールエラーが${consoleErrors.length}件発生`, 'warning');
      consoleErrors.forEach(error => log(`  - ${error}`, 'warning'));
    }
    
    // テスト結果の保存
    const fs = require('fs');
    const resultsPath = path.join(__dirname, '../test-results/component-extraction-test.json');
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    log('✅ テスト結果を保存しました', 'success');
    
    // 成功数の集計
    const successCount = testResults.tests.filter(t => t.type === 'success').length;
    const totalTests = 6;
    log(`\n📊 テスト結果: ${successCount}/${totalTests} 成功`, 'info');
    
  } catch (error) {
    log(`❌ テスト中にエラーが発生: ${error.message}`, 'error');
  } finally {
    // 5秒後にアプリケーションを終了
    setTimeout(() => {
      app.quit();
    }, 5000);
  }
}

// エラーハンドリング
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリケーション準備完了時にテスト実行
app.whenReady().then(runTests);