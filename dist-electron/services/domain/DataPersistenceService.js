"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataPersistenceService = void 0;
const electron_1 = require("electron");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger_1 = require("../../utils/logger");
const persistenceSchema_1 = require("./persistenceSchema");
const mainLogger = logger_1.logger.child('DataPersistence');
class DataPersistenceService {
    constructor(autoSaveIntervalMs = 180000) {
        // データ保存パスの決定（優先順位）
        // 1. 環境変数 UNIVOICE_DATA_PATH
        // 2. ユーザー設定（今後実装予定）
        // 3. デフォルト: C:\Users\{username}\UniVoice (Windows) or ~/UniVoice (Mac/Linux)
        this.saveInterval = null;
        this.currentSessionData = null;
        this.sessionStartTime = null;
        this.autoSaveIntervalMs = 180000; // 3分
        const customPath = process.env.UNIVOICE_DATA_PATH;
        if (customPath) {
            this.basePath = customPath;
            mainLogger.info(`Using custom data path from environment: ${this.basePath}`);
        }
        else {
            // Windows: C:\Users\{username}\UniVoice
            // Mac/Linux: ~/UniVoice
            const homePath = electron_1.app.getPath('home');
            this.basePath = path.join(homePath, 'UniVoice');
            mainLogger.info(`Using default data path: ${this.basePath}`);
        }
        this.autoSaveIntervalMs = autoSaveIntervalMs;
        this.ensureDirectoryExists();
    }
    /**
     * ベースディレクトリの存在確認と作成
     */
    async ensureDirectoryExists() {
        try {
            await fs.mkdir(this.basePath, { recursive: true });
            mainLogger.info(`Data directory ensured: ${this.basePath}`);
        }
        catch (error) {
            mainLogger.error('Failed to create data directory', { error });
        }
    }
    /**
     * セッションの開始
     */
    async startSession(metadata) {
        // DEEP-THINK: courseNameの検証を強化
        if (!metadata.courseName || metadata.courseName.trim() === '') {
            const error = new Error('courseName is required and cannot be empty');
            mainLogger.error('Invalid metadata for startSession', { metadata, error: error.message });
            throw error;
        }
        const now = new Date();
        this.sessionStartTime = now;
        // 授業フォルダのパス
        const coursePath = path.join(this.basePath, this.sanitizePath(metadata.courseName));
        await fs.mkdir(coursePath, { recursive: true });
        // 日付文字列（YYMMDD）
        const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
        // 同じ日の既存セッションをチェック
        const existingSession = await this.findTodaySession(metadata.courseName, dateStr);
        let sessionNumber;
        let sessionId;
        let sessionFolderName;
        let isResumed = false;
        if (existingSession) {
            // 既存セッションを再開
            sessionNumber = existingSession.sessionNumber;
            sessionId = existingSession.sessionId;
            sessionFolderName = existingSession.folderName;
            isResumed = true;
            mainLogger.info('Resuming existing session', { sessionId, courseName: metadata.courseName });
        }
        else {
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
            if (existingData && existingData.metadata) {
                this.currentSessionData = existingData;
                // 新しい開始時刻でメタデータを更新
                if (this.currentSessionData.metadata) {
                    this.currentSessionData.metadata.startTime = now.toISOString();
                }
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
        }
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
    async findTodaySession(courseName, dateStr) {
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
        }
        catch (error) {
            // フォルダが存在しない場合
            return null;
        }
    }
    /**
     * セッションデータの読み込み
     */
    async loadSessionData(sessionPath) {
        try {
            const files = await fs.readdir(sessionPath);
            const sessionData = {};
            if (files.includes('metadata.json')) {
                const metadataContent = await fs.readFile(path.join(sessionPath, 'metadata.json'), 'utf-8');
                sessionData.metadata = JSON.parse(metadataContent);
            }
            const sourceLanguage = sessionData.metadata?.sourceLanguage;
            if (files.includes('history.json')) {
                const historyContent = await fs.readFile(path.join(sessionPath, 'history.json'), 'utf-8');
                const historyData = JSON.parse(historyContent);
                const rawBlocks = Array.isArray(historyData?.blocks)
                    ? historyData.blocks
                    : Array.isArray(historyData)
                        ? historyData
                        : [];
                const normalized = (0, persistenceSchema_1.normalizeHistoryBlocks)(rawBlocks, { sourceLanguage });
                sessionData.history = {
                    blocks: normalized.blocks,
                    totalSegments: normalized.totalSegments,
                    totalWords: normalized.totalWords
                };
            }
            else {
                sessionData.history = { blocks: [], totalSegments: 0, totalWords: 0 };
            }
            if (sessionData.metadata && sessionData.history) {
                sessionData.metadata.wordCount = sessionData.history.totalWords;
            }
            let summaries = [];
            if (files.includes('summaries.json')) {
                const summariesContent = await fs.readFile(path.join(sessionPath, 'summaries.json'), 'utf-8');
                const parsed = JSON.parse(summariesContent);
                const rawSummaries = Array.isArray(parsed) ? parsed : [];
                summaries = rawSummaries.map(persistenceSchema_1.normalizeSummary);
            }
            else if (files.includes('summary.json')) {
                const legacyContent = await fs.readFile(path.join(sessionPath, 'summary.json'), 'utf-8');
                const parsed = JSON.parse(legacyContent);
                const rawSummaries = Array.isArray(parsed?.summaries) ? parsed.summaries : [];
                summaries = rawSummaries.map(persistenceSchema_1.normalizeSummary);
            }
            sessionData.summaries = summaries;
            if (files.includes('vocabulary.json')) {
                const vocabularyContent = await fs.readFile(path.join(sessionPath, 'vocabulary.json'), 'utf-8');
                sessionData.vocabularies = JSON.parse(vocabularyContent);
            }
            if (files.includes('report.md')) {
                sessionData.report = await fs.readFile(path.join(sessionPath, 'report.md'), 'utf-8');
            }
            return sessionData;
        }
        catch (error) {
            mainLogger.error('Failed to load session data', { error, sessionPath });
            return null;
        }
    }
    /**
     * 次のセッション番号を取得
     */
    async getNextSessionNumber(courseName) {
        const coursePath = path.join(this.basePath, this.sanitizePath(courseName));
        try {
            const entries = await fs.readdir(coursePath);
            const sessionFolders = entries.filter(entry => /^\d{8}_第\d+回$/.test(entry));
            if (sessionFolders.length === 0)
                return 1;
            const numbers = sessionFolders.map(folder => {
                const match = folder.match(/第(\d+)回$/);
                return match ? parseInt(match[1]) : 0;
            });
            return Math.max(...numbers) + 1;
        }
        catch (error) {
            // フォルダが存在しない場合は1を返す
            return 1;
        }
    }
    /**
     * パスのサニタイズ（Windowsで使用できない文字を除去）
     */
    sanitizePath(input) {
        return input.replace(/[<>:"|?*]/g, '_').trim();
    }
    /**
     * セッションパスの取得
     */
    getSessionPath() {
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
    async updateCourseMetadata(courseName, incrementSessions = true) {
        const coursePath = path.join(this.basePath, this.sanitizePath(courseName));
        const metadataPath = path.join(coursePath, 'course-metadata.json');
        try {
            let metadata;
            if (await this.fileExists(metadataPath)) {
                metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                metadata.lastModified = new Date().toISOString();
                // incrementSessionsがtrueの場合（新規セッション）のみカウントを増やす
                if (incrementSessions) {
                    metadata.totalSessions++;
                }
            }
            else {
                metadata = {
                    name: courseName,
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    totalSessions: 1
                };
            }
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        }
        catch (error) {
            mainLogger.error('Failed to update course metadata', { error, courseName });
        }
    }
    /**
     * 履歴ブロックの追加
     */
    async addHistoryBlock(block) {
        if (!this.currentSessionData || !this.currentSessionData.history) {
            mainLogger.warn('No active session to add history block');
            return;
        }
        const sourceLanguage = this.currentSessionData.metadata?.sourceLanguage;
        const { block: normalizedBlock, wordCount, segmentCount } = (0, persistenceSchema_1.normalizeHistoryBlock)(block, {
            sourceLanguage
        });
        this.currentSessionData.history.blocks.push(normalizedBlock);
        this.currentSessionData.history.totalSegments += segmentCount;
        this.currentSessionData.history.totalWords += wordCount;
        // 履歴ブロックが追加されたら即座に保存
        try {
            await this.saveSession();
            mainLogger.info('History block saved to file', {
                blockId: normalizedBlock.id,
                sentenceCount: normalizedBlock.sentences.length,
                wordCount,
                totalBlocks: this.currentSessionData.history.blocks.length
            });
        }
        catch (error) {
            mainLogger.error('Failed to save history block to file', { error, blockId: normalizedBlock.id });
        }
    }
    /**
     * 要約の追加
     */
    async addSummary(summary) {
        if (!this.currentSessionData) {
            mainLogger.warn('No active session to add summary');
            return;
        }
        const normalizedSummary = (0, persistenceSchema_1.normalizeSummary)(summary);
        if (!this.currentSessionData.summaries) {
            this.currentSessionData.summaries = [];
        }
        this.currentSessionData.summaries.push(normalizedSummary);
    }
    /**
     * セッションデータの保存
     */
    async saveSession() {
        if (!this.currentSessionData || !this.currentSessionData.metadata) {
            mainLogger.warn('No session data to save');
            return;
        }
        try {
            const metadata = this.currentSessionData.metadata;
            const sessionPath = this.getSessionPath();
            if (!this.currentSessionData.history) {
                this.currentSessionData.history = {
                    blocks: [],
                    totalSegments: 0,
                    totalWords: 0
                };
            }
            const { totalWords, totalSegments } = (0, persistenceSchema_1.calculateHistoryTotals)(this.currentSessionData.history.blocks, {
                sourceLanguage: metadata.sourceLanguage
            });
            this.currentSessionData.history.totalWords = totalWords;
            this.currentSessionData.history.totalSegments = totalSegments;
            metadata.wordCount = totalWords;
            // 終了時間と duration を更新
            if (this.sessionStartTime) {
                metadata.endTime = new Date().toISOString();
                metadata.duration = Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000);
            }
            await fs.writeFile(path.join(sessionPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
            await fs.writeFile(path.join(sessionPath, 'history.json'), JSON.stringify(this.currentSessionData.history, null, 2));
            if (this.currentSessionData.summaries && this.currentSessionData.summaries.length > 0) {
                await fs.writeFile(path.join(sessionPath, 'summaries.json'), JSON.stringify(this.currentSessionData.summaries, null, 2));
            }
            if (this.currentSessionData.vocabularies && this.currentSessionData.vocabularies.length > 0) {
                await fs.writeFile(path.join(sessionPath, 'vocabulary.json'), JSON.stringify({ vocabularies: this.currentSessionData.vocabularies }, null, 2));
            }
            if (this.currentSessionData.report) {
                await fs.writeFile(path.join(sessionPath, 'report.md'), this.currentSessionData.report);
            }
            mainLogger.info('Session saved successfully', { sessionId: metadata.sessionId });
        }
        catch (error) {
            mainLogger.error('Failed to save session', { error });
            throw error;
        }
    }
    /**
     * セッションデータの読み込み
     */
    async loadSession(courseName, dateStr, sessionNumber) {
        const coursePath = path.join(this.basePath, this.sanitizePath(courseName));
        const sessionFolderName = `${dateStr}_第${sessionNumber}回`;
        const sessionPath = path.join(coursePath, sessionFolderName);
        try {
            const metadata = JSON.parse(await fs.readFile(path.join(sessionPath, 'metadata.json'), 'utf-8'));
            const historyRaw = JSON.parse(await fs.readFile(path.join(sessionPath, 'history.json'), 'utf-8'));
            const historyBlocks = Array.isArray(historyRaw?.blocks)
                ? historyRaw.blocks
                : Array.isArray(historyRaw)
                    ? historyRaw
                    : [];
            const normalizedHistory = (0, persistenceSchema_1.normalizeHistoryBlocks)(historyBlocks, {
                sourceLanguage: metadata.sourceLanguage
            });
            const history = {
                blocks: normalizedHistory.blocks,
                totalSegments: normalizedHistory.totalSegments,
                totalWords: normalizedHistory.totalWords
            };
            let summaries = [];
            const summariesPath = path.join(sessionPath, 'summaries.json');
            if (await this.fileExists(summariesPath)) {
                const parsed = JSON.parse(await fs.readFile(summariesPath, 'utf-8'));
                const rawSummaries = Array.isArray(parsed) ? parsed : [];
                summaries = rawSummaries.map(persistenceSchema_1.normalizeSummary);
            }
            else {
                const legacySummariesPath = path.join(sessionPath, 'summary.json');
                if (await this.fileExists(legacySummariesPath)) {
                    const parsed = JSON.parse(await fs.readFile(legacySummariesPath, 'utf-8'));
                    const rawSummaries = Array.isArray(parsed?.summaries) ? parsed.summaries : [];
                    summaries = rawSummaries.map(persistenceSchema_1.normalizeSummary);
                }
            }
            const vocabFile = path.join(sessionPath, 'vocabulary.json');
            const vocabularies = await this.fileExists(vocabFile)
                ? JSON.parse(await fs.readFile(vocabFile, 'utf-8')).vocabularies
                : undefined;
            const reportFile = path.join(sessionPath, 'report.md');
            const report = await this.fileExists(reportFile)
                ? await fs.readFile(reportFile, 'utf-8')
                : undefined;
            metadata.wordCount = history.totalWords;
            return {
                metadata,
                history,
                summaries,
                vocabularies,
                report
            };
        }
        catch (error) {
            mainLogger.error('Failed to load session', { courseName, dateStr, sessionNumber, error });
            throw error;
        }
    }
    /**
     * ファイルの存在確認
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 自動保存の開始
     */
    startAutoSave() {
        this.stopAutoSave(); // 既存のインターバルをクリア
        this.saveInterval = setInterval(async () => {
            try {
                await this.saveSession();
                mainLogger.debug('Auto-save completed');
            }
            catch (error) {
                mainLogger.error('Auto-save failed', { error });
            }
        }, this.autoSaveIntervalMs);
        mainLogger.info('Auto-save started', { intervalMs: this.autoSaveIntervalMs });
    }
    /**
     * 自動保存の停止
     */
    stopAutoSave() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
            mainLogger.info('Auto-save stopped');
        }
    }
    /**
     * セッションの終了
     */
    async endSession() {
        try {
            await this.saveSession();
            this.stopAutoSave();
            this.currentSessionData = null;
            this.sessionStartTime = null;
            mainLogger.info('Session ended and saved');
        }
        catch (error) {
            mainLogger.error('Failed to end session', { error });
            throw error;
        }
    }
    /**
     * 利用可能なセッション一覧の取得
     * @param courseName 特定の授業名でフィルタリング（オプション）
     * @param limit 取得する最大セッション数（デフォルト: 20）
     */
    async getAvailableSessions(courseName, limit = 20) {
        try {
            // ベースディレクトリ内の全ての授業フォルダを取得
            const entries = await fs.readdir(this.basePath, { withFileTypes: true });
            const courseFolders = entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
            // 特定の授業名が指定されている場合はフィルタリング
            const targetCourses = courseName
                ? courseFolders.filter(name => name === this.sanitizePath(courseName))
                : courseFolders;
            const courseSessionsPromises = targetCourses.map(async (course) => {
                try {
                    const coursePath = path.join(this.basePath, course);
                    const sessionFolders = await fs.readdir(coursePath);
                    // YYMMDD_第N回 形式のフォルダのみを対象
                    const sessionPattern = /^(\d{6})_第(\d+)回$/;
                    const validSessions = sessionFolders.filter(folder => sessionPattern.test(folder));
                    // 各セッションのメタデータを読み込む
                    const sessions = await Promise.all(validSessions.map(async (sessionFolder) => {
                        try {
                            const metadataPath = path.join(coursePath, sessionFolder, 'metadata.json');
                            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                            return metadata;
                        }
                        catch (error) {
                            mainLogger.warn('Failed to read session metadata', { course, sessionFolder, error });
                            return null;
                        }
                    }));
                    const validMetadata = sessions.filter((s) => s !== null);
                    // 日付で降順ソート（新しいものから）
                    validMetadata.sort((a, b) => {
                        const dateA = parseInt(a.date);
                        const dateB = parseInt(b.date);
                        return dateB - dateA;
                    });
                    return {
                        courseName: course,
                        sessions: validMetadata.slice(0, limit)
                    };
                }
                catch (error) {
                    mainLogger.warn('Failed to read course sessions', { course, error });
                    return {
                        courseName: course,
                        sessions: []
                    };
                }
            });
            const coursesSessions = await Promise.all(courseSessionsPromises);
            // セッションがある授業のみを返す
            return coursesSessions.filter(cs => cs.sessions.length > 0);
        }
        catch (error) {
            mainLogger.error('Failed to get available sessions', { error });
            return [];
        }
    }
    /**
     * 今日のセッションが存在するかチェック
     */
    async checkTodaySession(courseName) {
        try {
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const todaySession = await this.findTodaySession(courseName, today);
            if (todaySession) {
                return {
                    exists: true,
                    sessionNumber: todaySession.sessionNumber
                };
            }
            return { exists: false };
        }
        catch (error) {
            mainLogger.error('Failed to check today session', { error, courseName });
            return { exists: false };
        }
    }
    /**
     * 現在のセッションの全履歴データを取得
     * HistoryWindow用にフォーマットして返す
     */
    async getFullHistory() {
        if (!this.currentSessionData || !this.currentSessionData.history) {
            return {
                blocks: [],
                entries: [],
                metadata: {
                    totalSegments: 0,
                    totalSentences: 0,
                    totalWords: 0,
                    duration: 0
                }
            };
        }
        const entries = [];
        for (const block of this.currentSessionData.history.blocks) {
            for (const sentence of block.sentences) {
                entries.push({
                    id: sentence.id,
                    sourceText: sentence.sourceText,
                    targetText: sentence.targetText,
                    timestamp: sentence.timestamp,
                    segmentIds: sentence.segmentIds,
                    speaker: sentence.speaker,
                    confidence: sentence.confidence
                });
            }
        }
        const metadata = {
            totalSegments: this.currentSessionData.history.totalSegments || 0,
            totalSentences: entries.length,
            totalWords: this.currentSessionData.history.totalWords || 0,
            duration: this.sessionStartTime ? Date.now() - this.sessionStartTime.getTime() : 0,
            startTime: this.sessionStartTime?.getTime(),
            endTime: Date.now()
        };
        return {
            blocks: (0, persistenceSchema_1.cloneHistoryBlocks)(this.currentSessionData.history.blocks),
            entries,
            metadata
        };
    }
}
exports.DataPersistenceService = DataPersistenceService;
