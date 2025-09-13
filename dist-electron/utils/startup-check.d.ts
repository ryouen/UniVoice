/**
 * スタートアップチェック - アプリ起動時のクリーンアップ処理
 *
 * 責任:
 * - nulファイルの自動削除
 * - 環境の健全性チェック
 * - 初期化時のクリーンアップ
 */
/**
 * nulファイルのクリーンアップ
 * Windowsで誤って生成されるnulファイルを削除
 */
export declare function cleanupNulFile(): void;
/**
 * ログパスのサニタイズ
 * Windowsの予約語を回避
 */
export declare function sanitizeLogPath(logPath: string): string;
/**
 * 環境変数の検証
 * 予約語を含む環境変数をチェック
 */
export declare function validateEnvironment(): void;
/**
 * スタートアップチェックの実行
 * アプリ起動時に一度だけ実行
 */
export declare function runStartupChecks(): void;
/**
 * デバッグ用：nulファイル生成の監視
 * 開発環境でのみ使用
 */
export declare function watchForNulCreation(): (() => void) | undefined;
