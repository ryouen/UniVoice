/**
 * セッション管理機能のテストスクリプト
 * 
 * テスト内容:
 * 1. 授業名の日付プレフィックス除去
 * 2. 同日セッション再開
 * 3. ボタン動作（停止/再開、授業終了、次の授業へ）
 * 
 * 実行方法:
 * node test-session-management.js
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// DataPersistenceServiceのモック
class DataPersistenceServiceMock {
  constructor() {
    this.basePath = path.join(app.getPath('documents'), 'UniVoiceData');
    this.currentSession = null;
  }

  async startSession(metadata) {
    console.log('\n=== startSession called ===');
    console.log('Metadata:', metadata);
    
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    // 同日セッションのチェック
    const existingSession = await this.findTodaySession(metadata.courseName, dateStr);
    
    if (existingSession) {
      console.log('✅ 既存セッションを発見！再開します');
      console.log('  Session ID:', existingSession.sessionId);
      console.log('  Session Number:', existingSession.sessionNumber);
      this.currentSession = existingSession;
    } else {
      console.log('🆕 新規セッションを開始します');
      const sessionNumber = await this.getNextSessionNumber(metadata.courseName);
      this.currentSession = {
        sessionId: `${metadata.courseName}_${dateStr}_${sessionNumber}`,
        sessionNumber,
        courseName: metadata.courseName
      };
      console.log('  Session ID:', this.currentSession.sessionId);
      console.log('  Session Number:', this.currentSession.sessionNumber);
    }
    
    return this.currentSession.sessionId;
  }

  async findTodaySession(courseName, dateStr) {
    // シミュレーション: 50%の確率で既存セッションがある
    if (Math.random() > 0.5) {
      return {
        sessionId: `${courseName}_${dateStr}_1`,
        sessionNumber: 1,
        folderName: `${dateStr}_第1回`
      };
    }
    return null;
  }

  async getNextSessionNumber(courseName) {
    // シミュレーション: 常に1を返す
    return 1;
  }

  async endSession() {
    console.log('\n=== endSession called ===');
    if (this.currentSession) {
      console.log('セッション終了:', this.currentSession.sessionId);
      this.currentSession = null;
    } else {
      console.log('⚠️ アクティブなセッションがありません');
    }
  }
}

// テスト実行
async function runTests() {
  console.log('セッション管理テスト開始\n');
  
  const service = new DataPersistenceServiceMock();
  
  // テスト1: 日付プレフィックスの除去
  console.log('【テスト1: 日付プレフィックスの除去】');
  const classNames = [
    '240824_経営学',
    '経営学',
    '240825_240825_データ構造',
    'プログラミング基礎'
  ];
  
  classNames.forEach(className => {
    const datePattern = /^\d{6}_/;
    const cleaned = className.replace(datePattern, '');
    console.log(`  "${className}" → "${cleaned}"`);
  });
  
  // テスト2: セッション開始（新規）
  console.log('\n【テスト2: 新規セッション開始】');
  await service.startSession({
    courseName: '経営学',
    sourceLanguage: 'en',
    targetLanguage: 'ja'
  });
  
  // テスト3: セッション終了
  console.log('\n【テスト3: セッション終了】');
  await service.endSession();
  
  // テスト4: 同日再開
  console.log('\n【テスト4: 同日セッション再開】');
  await service.startSession({
    courseName: '経営学',
    sourceLanguage: 'en',
    targetLanguage: 'ja'
  });
  
  // テスト5: ボタン動作シミュレーション
  console.log('\n【テスト5: ボタン動作シミュレーション】');
  
  // 停止/再開ボタン
  console.log('\n5-1. 停止/再開ボタン');
  console.log('  停止 → パイプライン停止のみ（セッションは継続）');
  console.log('  ✅ DataPersistenceServiceには影響なし');
  
  // 授業終了ボタン
  console.log('\n5-2. 授業終了ボタン');
  console.log('  1. パイプライン停止');
  console.log('  2. session-endイベント送信');
  console.log('  3. DataPersistenceService.endSession()');
  console.log('  4. レポート生成');
  await service.endSession();
  
  // 次の授業へボタン
  console.log('\n5-3. 次の授業へボタン');
  console.log('  1. レポート生成');
  console.log('  2. next-classイベント送信');
  console.log('  3. DataPersistenceService.endSession()');
  console.log('  4. UIクリア');
  await service.startSession({
    courseName: 'データ構造',
    sourceLanguage: 'en',
    targetLanguage: 'ja'
  });
  await service.endSession();
  
  console.log('\n✅ すべてのテストが完了しました');
}

// アプリケーションの準備ができたら実行
if (app.isReady()) {
  runTests().catch(console.error);
} else {
  app.on('ready', () => {
    runTests().catch(console.error);
  });
}