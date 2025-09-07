/**
 * テストセッションのクリーンアップスクリプト
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

async function cleanup() {
  try {
    const basePath = path.join(app.getPath('home'), 'UniVoice');
    const testCourses = ['機械学習基礎', 'データ構造とアルゴリズム', 'システム設計'];
    
    for (const courseName of testCourses) {
      const coursePath = path.join(basePath, courseName);
      try {
        await fs.rm(coursePath, { recursive: true, force: true });
        console.log(`Removed: ${courseName}`);
      } catch (error) {
        // Already removed or doesn't exist
      }
    }
    
    console.log('Cleanup completed!');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

app.whenReady().then(async () => {
  await cleanup();
  app.quit();
});