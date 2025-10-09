import { DataPersistenceService } from '../../electron/services/domain/DataPersistenceService';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('DataPersistenceService Integration', () => {
  let service: DataPersistenceService;
  const testBasePath = path.join(process.cwd(), 'test-data-persistence');
  
  beforeEach(async () => {
    // テスト用のカスタムパスを設定
    process.env.UNIVOICE_DATA_PATH = testBasePath;
    service = new DataPersistenceService();
    
    // テストディレクトリをクリーンアップ
    try {
      await fs.rm(testBasePath, { recursive: true });
    } catch (e) {
      // ディレクトリが存在しない場合は無視
    }
  });
  
  afterEach(async () => {
    // クリーンアップ
    if (service) {
      await service.endSession();
    }
    delete process.env.UNIVOICE_DATA_PATH;
    
    // テストディレクトリを削除
    try {
      await fs.rm(testBasePath, { recursive: true });
    } catch (e) {
      // 無視
    }
  });
  
  it('should save history blocks and persist session data', async () => {
    // セッションを開始
    const sessionId = await service.startSession({
      courseName: 'Test Course',
      sourceLanguage: 'en',
      targetLanguage: 'ja'
    });
    
    expect(sessionId).toBeTruthy();
    
    // 履歴ブロックを追加
    await service.addHistoryBlock({
      id: 'block-1',
      sentences: [
        {
          id: 's1',
          sourceText: 'Hello world',
          targetText: 'こんにちは世界',
          timestamp: Date.now()
        },
        {
          id: 's2',
          sourceText: 'This is a test',
          targetText: 'これはテストです',
          timestamp: Date.now()
        }
      ],
      createdAt: Date.now(),
      totalHeight: 100
    });
    
    // セッションを保存
    await service.saveSession();
    
    // ファイルが作成されているか確認
    const coursePath = path.join(testBasePath, 'Test Course');
    const sessionFolder = await fs.readdir(coursePath);
    expect(sessionFolder.length).toBeGreaterThan(0);
    
    const sessionPath = path.join(coursePath, sessionFolder[0]);
    const files = await fs.readdir(sessionPath);
    
    expect(files).toContain('metadata.json');
    expect(files).toContain('history.json');
    
    // history.jsonの内容を確認
    const historyContent = await fs.readFile(path.join(sessionPath, 'history.json'), 'utf-8');
    const historyData = JSON.parse(historyContent);
    
    expect(historyData.blocks).toHaveLength(1);
    expect(historyData.blocks[0].sentences).toHaveLength(2);
    expect(historyData.totalWords).toBeGreaterThan(0);
  });
  
  it('should handle session resumption on same day', async () => {
    // 最初のセッション
    const sessionId1 = await service.startSession({
      courseName: 'Resume Test',
      sourceLanguage: 'en',
      targetLanguage: 'ja'
    });
    
    await service.addHistoryBlock({
      id: 'block-1',
      sentences: [{
        id: 's1',
        sourceText: 'First session',
        targetText: '最初のセッション',
        timestamp: Date.now()
      }],
      createdAt: Date.now(),
      totalHeight: 50
    });
    
    await service.endSession();
    
    // 新しいサービスインスタンス（アプリ再起動のシミュレーション）
    const service2 = new DataPersistenceService();
    
    // 同じ日に再度セッションを開始
    const sessionId2 = await service2.startSession({
      courseName: 'Resume Test',
      sourceLanguage: 'en',
      targetLanguage: 'ja'
    });
    
    // 同じセッションIDであることを確認
    expect(sessionId2).toBe(sessionId1);
    
    // 前のデータが読み込まれていることを確認
    const history = await service2.getFullHistory();
    expect(history.blocks).toHaveLength(1);
    expect(history.blocks[0].sentences[0].sourceText).toBe('First session');
    
    await service2.endSession();
  });
});