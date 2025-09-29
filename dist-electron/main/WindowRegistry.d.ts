/**
 * WindowRegistry - UniVoice Window Management Core
 *
 * 責務:
 * - ウィンドウのライフサイクル管理
 * - 前回位置/サイズの復元
 * - Setup/Main/History/Summary ウィンドウの一元管理
 */
import { BrowserWindow } from 'electron';
import { WindowRole } from './BoundsStore';
export declare class WindowRegistry {
    private store;
    private windows;
    private isQuitting;
    constructor();
    /**
     * URLを解決（開発/本番環境対応）
     */
    resolveUrl(hash?: string): string;
    /**
     * 指定された役割のウィンドウを取得
     */
    get(role: WindowRole): BrowserWindow | undefined;
    /**
     * ウィンドウを作成または表示
     */
    createOrShow(role: WindowRole, options?: Electron.BrowserWindowConstructorOptions): BrowserWindow;
    /**
     * ロール別のデフォルト設定
     */
    private getRoleDefaults;
    /**
     * 位置/サイズの永続化設定
     */
    private setupBoundsPersistence;
    /**
     * ウィンドウが画面内に収まるよう調整
     */
    private ensureOnScreen;
    /**
     * Setup画面を.backgroundサイズにフィット
     */
    fitSetupTo(_width: number, _height: number): void;
    /**
     * Setup画面をMain画面として再利用（メモリ効率化）
     */
    reuseSetupAsMain(): void;
    /**
     * 履歴ウィンドウを開く
     */
    openHistory(): Promise<BrowserWindow>;
    /**
     * 要約ウィンドウを開く
     */
    openSummary(): Promise<BrowserWindow>;
    /**
     * 履歴ウィンドウのトグル
     * @returns ウィンドウが表示されているかどうか
     */
    toggleHistory(): boolean;
    /**
     * 要約ウィンドウのトグル
     * @returns ウィンドウが表示されているかどうか
     */
    toggleSummary(): boolean;
    /**
     * すべてのウィンドウを閉じる
     */
    closeAll(): void;
}
export declare const windowRegistry: WindowRegistry;
