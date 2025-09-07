#!/usr/bin/env node

/**
 * 開発ログ読み取りツール
 * 最新のテストセッションログを解析して表示
 */

const fs = require('fs');
const path = require('path');

// 最新のセッションディレクトリを取得
function getLatestSession() {
  const sessionsDir = path.join(__dirname, 'logs', 'dev-sessions');
  
  if (!fs.existsSync(sessionsDir)) {
    console.log('❌ No dev-sessions directory found');
    return null;
  }
  
  const sessions = fs.readdirSync(sessionsDir)
    .filter(name => name.startsWith('dev-'))
    .sort()
    .reverse();
    
  if (sessions.length === 0) {
    console.log('❌ No test sessions found');
    return null;
  }
  
  return sessions[0];
}

// ログを解析して表示
function analyzeSession(sessionId) {
  const sessionDir = path.join(__dirname, 'logs', 'dev-sessions', sessionId);
  const logPath = path.join(sessionDir, 'test-log.json');
  const summaryPath = path.join(sessionDir, 'summary.json');
  
  console.log(`\n📊 Analyzing session: ${sessionId}`);
  console.log('='.repeat(50));
  
  // サマリーを表示
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    console.log('\n📈 Summary:');
    console.log(`   Total logs: ${summary.totalLogs}`);
    console.log(`   Errors: ${summary.errors} ${summary.errors > 0 ? '❌' : '✅'}`);
    console.log(`   Warnings: ${summary.warnings}`);
    console.log(`   Events: ${summary.events}`);
    console.log(`   Screenshots: ${summary.screenshots}`);
  }
  
  // 詳細ログを解析
  if (fs.existsSync(logPath)) {
    const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    const logs = data.logs;
    
    // エラーを表示
    const errors = logs.filter(l => l.level === 'error');
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => {
        console.log(`   [${new Date(err.timestamp).toISOString()}] ${JSON.stringify(err.data)}`);
      });
    }
    
    // イベントフローを表示
    console.log('\n📡 Event Flow:');
    const events = logs.filter(l => l.type === 'event');
    events.forEach(evt => {
      const time = new Date(evt.timestamp).toISOString().split('T')[1].split('.')[0];
      if (evt.data.eventType) {
        console.log(`   [${time}] ${evt.data.eventType}: ${JSON.stringify(evt.data.detail?.data?.text || evt.data.detail)}`);
      } else {
        console.log(`   [${time}] ${evt.data.action}: ${JSON.stringify(evt.data.params || {})}`);
      }
    });
    
    // 最新のUI状態を表示
    const uiStates = logs.filter(l => l.type === 'ui-state');
    if (uiStates.length > 0) {
      const latestUI = uiStates[uiStates.length - 1];
      console.log('\n🖼️  Latest UI State:');
      console.log(`   History items: ${latestUI.data.historyCount}`);
      console.log(`   Current Original: "${latestUI.data.currentOriginal}"`);
      console.log(`   Current Translation: "${latestUI.data.currentTranslation}"`);
    }
    
    // スクリーンショットパスを表示
    const screenshots = logs.filter(l => l.type === 'screenshot');
    if (screenshots.length > 0) {
      console.log('\n📷 Screenshots:');
      screenshots.forEach(ss => {
        console.log(`   ${ss.data.path}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Full logs: ${logPath}\n`);
}

// 特定のパターンを検索
function searchPattern(sessionId, pattern) {
  const logPath = path.join(__dirname, 'logs', 'dev-sessions', sessionId, 'test-log.json');
  
  if (!fs.existsSync(logPath)) {
    console.log('❌ Log file not found');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const logs = data.logs;
  
  console.log(`\n🔍 Searching for: "${pattern}"`);
  
  const matches = logs.filter(log => 
    JSON.stringify(log).toLowerCase().includes(pattern.toLowerCase())
  );
  
  console.log(`Found ${matches.length} matches:`);
  matches.forEach(match => {
    console.log(`\n[${new Date(match.timestamp).toISOString()}] ${match.type}`);
    console.log(JSON.stringify(match.data, null, 2));
  });
}

// メイン処理
const args = process.argv.slice(2);
const command = args[0];

if (command === 'search' && args[1]) {
  const sessionId = getLatestSession();
  if (sessionId) {
    searchPattern(sessionId, args[1]);
  }
} else if (command === 'session' && args[1]) {
  analyzeSession(args[1]);
} else {
  // デフォルト: 最新セッションを解析
  const sessionId = getLatestSession();
  if (sessionId) {
    analyzeSession(sessionId);
  }
  
  console.log('\nUsage:');
  console.log('  node read-dev-logs.js              # Analyze latest session');
  console.log('  node read-dev-logs.js search TEXT  # Search in latest session');
  console.log('  node read-dev-logs.js session ID   # Analyze specific session');
}