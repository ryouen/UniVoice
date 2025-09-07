/**
 * Session Resume機能の動作確認スクリプト
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// DataPersistenceServiceの簡易版
class TestDataPersistence {
  constructor() {
    this.basePath = path.join(app.getPath('home'), 'UniVoice');
  }

  async createTestSessions() {
    try {
      // テスト用のセッションデータを作成
      const courses = ['機械学習基礎', 'データ構造とアルゴリズム', 'システム設計'];
      
      for (const courseName of courses) {
        const coursePath = path.join(this.basePath, courseName);
        await fs.mkdir(coursePath, { recursive: true });
        
        // 各コースに複数のセッションを作成
        for (let i = 1; i <= 3; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (i * 2)); // 2日おきに過去のセッション
          const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
          
          const sessionFolder = `${dateStr}_第${i}回`;
          const sessionPath = path.join(coursePath, sessionFolder);
          await fs.mkdir(sessionPath, { recursive: true });
          
          // metadata.json を作成
          const metadata = {
            sessionId: `${courseName}_${dateStr}_${i}`,
            courseName: courseName,
            sessionNumber: i,
            date: dateStr,
            startTime: new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9:00
            endTime: new Date(date.getTime() + 10.5 * 60 * 60 * 1000).toISOString(), // 10:30
            sourceLanguage: 'en',
            targetLanguage: 'ja',
            duration: 5400, // 90分
            wordCount: Math.floor(Math.random() * 5000) + 2000,
            version: '2.0.0'
          };
          
          await fs.writeFile(
            path.join(sessionPath, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
          );
          
          // ダミーの history.json も作成
          const history = {
            blocks: [],
            totalSegments: 0,
            totalWords: metadata.wordCount
          };
          
          await fs.writeFile(
            path.join(sessionPath, 'history.json'),
            JSON.stringify(history, null, 2)
          );
          
          console.log(`Created test session: ${courseName} - ${sessionFolder}`);
        }
      }
      
      console.log('\nTest sessions created successfully!');
      console.log(`Data location: ${this.basePath}`);
    } catch (error) {
      console.error('Failed to create test sessions:', error);
    }
  }
}

// メイン処理
app.whenReady().then(async () => {
  const tester = new TestDataPersistence();
  await tester.createTestSessions();
  app.quit();
});