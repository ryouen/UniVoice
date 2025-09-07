/**
 * DataPersistenceService - 授業データ永続化サービス
 * 
 * 責任:
 * - 授業単位でのデータ管理
 * - セッションデータの自動保存（3分ごと）
 * - 授業回数の自動管理（日付ベース）
 * - データのエクスポート/インポート機能
 * 
 * フォルダ構造:
 * Documents/UniVoiceData/
 * ├── 経営学/
 * │   ├── 20250824_第1回/
 * │   │   ├── session.json
 * │   │   ├── transcripts.json
 * │   │   └── ...
 * │   └── course-metadata.json
 * └── システム設定.json
 */

import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../utils/logger';

const mainLogger = logger.child('DataPersistence');

// HistoryBlock型を再定義（electron側で使用するため）
export interface HistoryBlock {
  id: string;
  sentences: Array<{
    id: string;
    original: string;
    translation: string;
    timestamp: number;
  }>;
  createdAt: number;
  totalHeight: number;
}

// 型定義
export interface SessionMetadata {
  sessionId: string;
  courseName: string;  // 授業名（フォルダ名として使用）
  sessionNumber: number;  // 第N回
  date: string;  // YYYYMMDD形式
  startTime: string;
  endTime?: string;
  sourceLanguage: string;
  targetLanguage: string;
  duration?: number;
  wordCount?: number;
  version: string;
}

export interface CourseMetadata {
  name: string;
  createdAt: string;
  lastModified: string;
  totalSessions: number;
  tags?: string[];
  description?: string;
}

export interface SessionHistory {
  blocks: HistoryBlock[];
  totalSegments: number;
  totalWords: number;
}

export interface SessionSummary {
  id: string;
  timeRange: string;
  english: string;
  japanese: string;
  timestamp: number;
}

export interface SessionData {
  metadata: SessionMetadata;
  history: SessionHistory;
  summaries: SessionSummary[];
  vocabularies?: Array<{
    term: string;
    definition: string;
    context: string;
  }>;
  memos?: Array<{
    id: string;
    text: string;
    timestamp: number;
  }>;
  report?: string;
}

export class DataPersistenceService {
  private readonly basePath: string;
  private saveInterval: NodeJS.Timeout | null = null;
  private currentSessionData: Partial<SessionData> | null = null;
  private sessionStartTime: Date | null = null;
  private autoSaveIntervalMs: number = 180000; // 3分

  constructor(autoSaveIntervalMs: number = 180000) {
    // データ保存パスの決定（優先順位）
    // 1. 環境変数 UNIVOICE_DATA_PATH
    // 2. ユーザー設定（今後実装予定）
    // 3. デフォルト: C:\Users\{username}\UniVoice (Windows) or ~/UniVoice (Mac/Linux)
    
    const customPath = process.env.UNIVOICE_DATA_PATH;
    if (customPath) {
      this.basePath = customPath;
      mainLogger.info(`Using custom data path from environment: ${this.basePath}`);
    } else {
      // Windows: C:\Users\{username}\UniVoice
      // Mac/Linux: ~/UniVoice
      const homePath = app.getPath('home');
      this.basePath = path.join(homePath, 'UniVoice');
      mainLogger.info(`Using default data path: ${this.basePath}`);
    }
    
    this.autoSaveIntervalMs = autoSaveIntervalMs;
    this.ensureDirectoryExists();
  }

  /**
   * ベースディレクトリの存在確認と作成
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      mainLogger.info(`Data directory ensured: ${this.basePath}`);
    } catch (error) {
      mainLogger.error('Failed to create data directory', { error });
    }
  }

  /**
   * セッションの開始
   */
  async startSession(metadata: Omit<SessionMetadata, 'sessionId' | 'date' | 'startTime' | 'version' | 'sessionNumber'>): Promise<string> {
    const now = new Date();
    this.sessionStartTime = now;
    
    // 授業フォルダのパス
    const coursePath = path.join(this.basePath, this.sanitizePath(metadata.courseName));
    await fs.mkdir(coursePath, { recursive: true });
    
    // 日付文字列（YYYYMMDD）
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    
    // 同じ日の既存セッションをチェック
    const existingSession = await this.findTodaySession(metadata.courseName, dateStr);
    
    let sessionNumber: number;
    let sessionId: string;
    let sessionFolderName: string;
    let isResumed = false;
    
    if (existingSession) {
      // 既存セッションを再開
      sessionNumber = existingSession.sessionNumber;
      sessionId = existingSession.sessionId;
      sessionFolderName = existingSession.folderName;
      isResumed = true;
      mainLogger.info('Resuming existing session', { sessionId, courseName: metadata.courseName });
    } else {
      // 新規セッション
      sessionNumber = await this.getNextSessionNumber(metadata.courseName);
      sessionId = `${metadata.courseName}_${dateStr}_${sessionNumber}`;
      sessionFolderName = `${dateStr}_第${sessionNumber}回`;
    }
    
    const sessionPath = path.join(coursePath, sessionFolderName);
    await fs.mkdir(sessionPath, { recursive: true });
    
    // 既存セッションの場合、前のデータを読み込む
    if (isResumed) {
      const existingData = await this.loadSessionData(sessionPath);
      if (existingData) {
        this.currentSessionData = existingData;
        // 新しい開始時刻でメタデータを更新
        this.currentSessionData.metadata.startTime = now.toISOString();
        mainLogger.info('Loaded existing session data', { 
          historyBlocks: existingData.history.blocks.length,
          summaries: existingData.summaries.length 
        });
      }
    }
    
    // 新規またはデータ読み込み失敗の場合
    if (!this.currentSessionData) {
      this.currentSessionData = {
        metadata: {
          ...metadata,
          sessionId,
        sessionNumber,
        date: dateStr,
        startTime: now.toISOString(),
        version: '2.0.0'
      },
      history: {
        blocks: [],
        totalSegments: 0,
        totalWords: 0
      },
      summaries: [],
      memos: []
    };

    // 初回保存
    await this.saveSession();
    
    // 授業メタデータの更新
    // 授業メタデータの更新（新規セッションの場合のみtotalSessionsを増やす）
    await this.updateCourseMetadata(metadata.courseName, !isResumed);
    
    // 自動保存の開始
    this.startAutoSave();
    
    mainLogger.info(isResumed ? 'Session resumed' : 'Session started', { 
      sessionId, 
      courseName: metadata.courseName,
      sessionNumber,
      sessionPath,
      isResumed
    });
    return sessionId;
  }

  /**
   * 同じ日の既存セッションを検索
   */
  private async findTodaySession(courseName: string, dateStr: string): Promise<{ sessionNumber: number; sessionId: string; folderName: string } | null> {
    try {
      const coursePath = path.join(this.basePath, this.sanitizePath(courseName));
      const folders = await fs.readdir(coursePath);
      
      // 今日の日付で始まるフォルダを探す
      const todayFolders = folders.filter(folder => folder.startsWith(dateStr));
      
      if (todayFolders.length === 0) {
        return null;
      }
      
      // 最新のセッションを返す（番号が最大のもの）
      const sessionPattern = new RegExp(`^${dateStr}_第(\\d+)回$`);
      let maxNumber = 0;
      let latestFolder = '';
      
      for (const folder of todayFolders) {
        const match = folder.match(sessionPattern);
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > maxNumber) {
            maxNumber = number;
            latestFolder = folder;
          }
        }
      }
      
      if (maxNumber > 0) {
        return {
          sessionNumber: maxNumber,
          sessionId: `${courseName}_${dateStr}_${maxNumber}`,
          folderName: latestFolder
        };
      }
      
      return null;
    } catch (error) {
      // フォルダが存在しない場合
      return null;
    }
  }
  
  /**
   * セッションデータの読み込み
   */
  private async loadSessionData(sessionPath: string): Promise<SessionData | null> {
    try {
      const files = await fs.readdir(sessionPath);
      const sessionData: Partial<SessionData> = {};
      
      // メタデータの読み込み
      if (files.includes('metadata.json')) {
        const metadataContent = await fs.readFile(path.join(sessionPath, 'metadata.json'), 'utf-8');
        sessionData.metadata = JSON.parse(metadataContent);
      }
      
      // 履歴の読み込み
      if (files.includes('history.json')) {
        const historyContent = await fs.readFile(path.join(sessionPath, 'history.json'), 'utf-8');
        sessionData.history = JSON.parse(historyContent);
      } else {
        sessionData.history = { blocks: [], totalSegments: 0, totalWords: 0 };
      }
      
      // 要約の読み込み
      if (files.includes('summaries.json')) {
        const summariesContent = await fs.readFile(path.join(sessionPath, 'summaries.json'), 'utf-8');
        sessionData.summaries = JSON.parse(summariesContent);
      } else {
        sessionData.summaries = [];
      }
      
      // 語彙の読み込み
      if (files.includes('vocabulary.json')) {
        const vocabularyContent = await fs.readFile(path.join(sessionPath, 'vocabulary.json'), 'utf-8');
        sessionData.vocabularies = JSON.parse(vocabularyContent);
      }
      
      // レポートの読み込み
      if (files.includes('report.md')) {
        sessionData.report = await fs.readFile(path.join(sessionPath, 'report.md'), 'utf-8');
      }
      
      return sessionData as SessionData;
    } catch (error) {
      mainLogger.error('Failed to load session data', { error, sessionPath });
      return null;
    }
  }

  /**
   * 次のセッション番号を取得
   */
  private async getNextSessionNumber(courseName: string): Promise<number> {
    const coursePath = path.join(this.basePath, this.sanitizePath(courseName));
    
    try {
      const entries = await fs.readdir(coursePath);
      const sessionFolders = entries.filter(entry => 
        /^\d{8}_第\d+回$/.test(entry)
      );
      
      if (sessionFolders.length === 0) return 1;
      
      const numbers = sessionFolders.map(folder => {
        const match = folder.match(/第(\d+)回$/);
        return match ? parseInt(match[1]) : 0;
      });
      
      return Math.max(...numbers) + 1;
      
    } catch (error) {
      // フォルダが存在しない場合は1を返す
      return 1;
    }
  }

  /**
   * パスのサニタイズ（Windowsで使用できない文字を除去）
   */
  private sanitizePath(input: string): string {
    return input.replace(/[<>:"|?*]/g, '_').trim();
  }

  /**
   * セッションパスの取得
   */
  private getSessionPath(): string {
    if (!this.currentSessionData || !this.currentSessionData.metadata) {
      throw new Error('No active session');
    }
    const metadata = this.currentSessionData.metadata;
    const coursePath = path.join(this.basePath, this.sanitizePath(metadata.courseName));
    const sessionFolderName = `${metadata.date}_第${metadata.sessionNumber}回`;
    return path.join(coursePath, sessionFolderName);
  }

  /**
   * 授業メタデータの更新
   */
  private async updateCourseMetadata(courseName: string, incrementSessions: boolean = true): Promise<void> {
    const coursePath = path.join(this.basePath, this.sanitizePath(courseName));
    const metadataPath = path.join(coursePath, 'course-metadata.json');
    
    try {
      let metadata: CourseMetadata;
      
      if (await this.fileExists(metadataPath)) {
        metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
        metadata.lastModified = new Date().toISOString();
        // incrementSessionsがtrueの場合（新規セッション）のみカウントを増やす
        if (incrementSessions) {
          metadata.totalSessions++;
        }
      } else {
        metadata = {
          name: courseName,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          totalSessions: 1
        };
      }
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
    } catch (error) {
      mainLogger.error('Failed to update course metadata', { error, courseName });
    }
  }

  /**
   * 履歴ブロックの追加
   */
  async addHistoryBlock(block: HistoryBlock): Promise<void> {
    if (!this.currentSessionData) {
      mainLogger.warn('No active session to add history block');
      return;
    }

    this.currentSessionData.history!.blocks.push(block);
    this.currentSessionData.history!.totalSegments += block.sentences.length;
    this.currentSessionData.history!.totalWords += block.sentences.reduce(
      (sum, sentence) => sum + sentence.original.split(' ').length, 0
    );
  }

  /**
   * 要約の追加
   */
  async addSummary(summary: SessionSummary): Promise<void> {
    if (!this.currentSessionData) {
      mainLogger.warn('No active session to add summary');
      return;
    }

    this.currentSessionData.summaries!.push(summary);
  }

  /**
   * セッションデータの保存
   */
  async saveSession(): Promise<void> {
    if (!this.currentSessionData || !this.currentSessionData.metadata) {
      mainLogger.warn('No session data to save');
      return;
    }

    try {
      const metadata = this.currentSessionData.metadata;
      const sessionPath = this.getSessionPath();

      // 終了時間と duration を更新
      if (this.sessionStartTime) {
        metadata.endTime = new Date().toISOString();
        metadata.duration = Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000);
      }

      // 各ファイルを保存
      await fs.writeFile(
        path.join(sessionPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      await fs.writeFile(
        path.join(sessionPath, 'history.json'),
        JSON.stringify(this.currentSessionData.history, null, 2)
      );

      if (this.currentSessionData.summaries && this.currentSessionData.summaries.length > 0) {
        await fs.writeFile(
          path.join(sessionPath, 'summary.json'),
          JSON.stringify({ summaries: this.currentSessionData.summaries }, null, 2)
        );
      }

      if (this.currentSessionData.vocabularies && this.currentSessionData.vocabularies.length > 0) {
        await fs.writeFile(
          path.join(sessionPath, 'vocabulary.json'),
          JSON.stringify({ vocabularies: this.currentSessionData.vocabularies }, null, 2)
        );
      }

      if (this.currentSessionData.report) {
        await fs.writeFile(
          path.join(sessionPath, 'report.md'),
          this.currentSessionData.report
        );
      }

      mainLogger.info('Session saved successfully', { sessionId: metadata.sessionId });
    } catch (error) {
      mainLogger.error('Failed to save session', { error });
      throw error;
    }
  }

  /**
   * セッションデータの読み込み
   */
  async loadSession(courseName: string, dateStr: string, sessionNumber: number): Promise<SessionData> {
    // セッションパスを手動で構築
    const coursePath = path.join(this.basePath, this.sanitizePath(courseName));
    const sessionFolderName = `${dateStr}_第${sessionNumber}回`;
    const sessionPath = path.join(coursePath, sessionFolderName);

    try {
      const metadata = JSON.parse(
        await fs.readFile(path.join(sessionPath, 'metadata.json'), 'utf-8')
      ) as SessionMetadata;

      const history = JSON.parse(
        await fs.readFile(path.join(sessionPath, 'history.json'), 'utf-8')
      ) as SessionHistory;

      const summariesFile = path.join(sessionPath, 'summary.json');
      const summaries = await this.fileExists(summariesFile) 
        ? (JSON.parse(await fs.readFile(summariesFile, 'utf-8')) as { summaries: SessionSummary[] }).summaries
        : [];

      const vocabFile = path.join(sessionPath, 'vocabulary.json');
      const vocabularies = await this.fileExists(vocabFile)
        ? (JSON.parse(await fs.readFile(vocabFile, 'utf-8')) as { vocabularies: any[] }).vocabularies
        : undefined;

      const reportFile = path.join(sessionPath, 'report.md');
      const report = await this.fileExists(reportFile)
        ? await fs.readFile(reportFile, 'utf-8')
        : undefined;

      return {
        metadata,
        history,
        summaries,
        vocabularies,
        report
      };
    } catch (error) {
      mainLogger.error('Failed to load session', { courseName, dateStr, sessionNumber, error });
      throw error;
    }
  }

  /**
   * ファイルの存在確認
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 自動保存の開始
   */
  startAutoSave(): void {
    this.stopAutoSave(); // 既存のインターバルをクリア

    this.saveInterval = setInterval(async () => {
      try {
        await this.saveSession();
        mainLogger.debug('Auto-save completed');
      } catch (error) {
        mainLogger.error('Auto-save failed', { error });
      }
    }, this.autoSaveIntervalMs);

    mainLogger.info('Auto-save started', { intervalMs: this.autoSaveIntervalMs });
  }

  /**
   * 自動保存の停止
   */
  stopAutoSave(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
      mainLogger.info('Auto-save stopped');
    }
  }

  /**
   * セッションの終了
   */
  async endSession(): Promise<void> {
    try {
      await this.saveSession();
      this.stopAutoSave();
      this.currentSessionData = null;
      this.sessionStartTime = null;
      mainLogger.info('Session ended and saved');
    } catch (error) {
      mainLogger.error('Failed to end session', { error });
      throw error;
    }
  }


  /**
   * 利用可能なセッション一覧の取得
   */
  async getAvailableSessions(): Promise<Array<{ date: string; sessions: SessionMetadata[] }>> {
    try {
      const sessionsDir = path.join(this.basePath, 'sessions');
      const dates = await fs.readdir(sessionsDir);
      
      const sessionsByDate = await Promise.all(
        dates.map(async (date) => {
          const datePath = path.join(sessionsDir, date);
          const sessionDirs = await fs.readdir(datePath);
          
          const sessions = await Promise.all(
            sessionDirs.map(async (sessionId) => {
              try {
                const metadataPath = path.join(datePath, sessionId, 'metadata.json');
                const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8')) as SessionMetadata;
                return metadata;
              } catch {
                return null;
              }
            })
          );

          return {
            date,
            sessions: sessions.filter((s): s is SessionMetadata => s !== null)
          };
        })
      );

      return sessionsByDate.filter(d => d.sessions.length > 0);
    } catch (error) {
      mainLogger.error('Failed to get available sessions', { error });
      return [];
    }
  }
}