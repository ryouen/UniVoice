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
export interface SessionMetadata {
    sessionId: string;
    courseName: string;
    sessionNumber: number;
    date: string;
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
export declare class DataPersistenceService {
    private readonly basePath;
    private saveInterval;
    private currentSessionData;
    private sessionStartTime;
    private autoSaveIntervalMs;
    constructor(autoSaveIntervalMs?: number);
    /**
     * ベースディレクトリの存在確認と作成
     */
    private ensureDirectoryExists;
    /**
     * セッションの開始
     */
    startSession(metadata: Omit<SessionMetadata, 'sessionId' | 'date' | 'startTime' | 'version' | 'sessionNumber'>): Promise<string>;
    /**
     * 同じ日の既存セッションを検索
     */
    findTodaySession(courseName: string, dateStr: string): Promise<{
        sessionNumber: number;
        sessionId: string;
        folderName: string;
    } | null>;
    /**
     * セッションデータの読み込み
     */
    private loadSessionData;
    /**
     * 次のセッション番号を取得
     */
    private getNextSessionNumber;
    /**
     * パスのサニタイズ（Windowsで使用できない文字を除去）
     */
    private sanitizePath;
    /**
     * セッションパスの取得
     */
    private getSessionPath;
    /**
     * 授業メタデータの更新
     */
    private updateCourseMetadata;
    /**
     * 履歴ブロックの追加
     */
    addHistoryBlock(block: HistoryBlock): Promise<void>;
    /**
     * 要約の追加
     */
    addSummary(summary: SessionSummary): Promise<void>;
    /**
     * セッションデータの保存
     */
    saveSession(): Promise<void>;
    /**
     * セッションデータの読み込み
     */
    loadSession(courseName: string, dateStr: string, sessionNumber: number): Promise<SessionData>;
    /**
     * ファイルの存在確認
     */
    private fileExists;
    /**
     * 自動保存の開始
     */
    startAutoSave(): void;
    /**
     * 自動保存の停止
     */
    stopAutoSave(): void;
    /**
     * セッションの終了
     */
    endSession(): Promise<void>;
    /**
     * 利用可能なセッション一覧の取得
     * @param courseName 特定の授業名でフィルタリング（オプション）
     * @param limit 取得する最大セッション数（デフォルト: 20）
     */
    getAvailableSessions(courseName?: string, limit?: number): Promise<Array<{
        courseName: string;
        sessions: SessionMetadata[];
    }>>;
    /**
     * 今日のセッションが存在するかチェック
     */
    checkTodaySession(courseName: string): Promise<{
        exists: boolean;
        sessionNumber?: number;
    }>;
    /**
     * 現在のセッションの全履歴データを取得
     * HistoryWindow用にフォーマットして返す
     */
    getFullHistory(): Promise<{
        blocks: any[];
        entries: Array<{
            id: string;
            original: string;
            translation: string;
            timestamp: number;
            segmentIds?: string[];
            speaker?: string;
            confidence?: number;
        }>;
        metadata: {
            totalSegments: number;
            totalSentences: number;
            totalWords: number;
            duration: number;
            startTime?: number;
            endTime?: number;
        };
    }>;
}
