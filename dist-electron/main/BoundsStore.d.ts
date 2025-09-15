/**
 * BoundsStore - Window Position/Size Persistence
 *
 * 責務:
 * - ウィンドウの位置/サイズの永続化
 * - マルチディスプレイ環境での安全な復元
 * - 設定ファイルの管理
 */
export type WindowRole = 'setup' | 'main' | 'history' | 'summary';
export interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
    maximized?: boolean;
}
interface BoundsData {
    version: string;
    windows: {
        [K in WindowRole]?: Bounds;
    };
}
export declare class BoundsStore {
    private dataPath;
    private data;
    constructor();
    /**
     * ウィンドウの位置/サイズを取得
     */
    get(role: WindowRole): Bounds | undefined;
    /**
     * ウィンドウの位置/サイズを保存
     */
    set(role: WindowRole, bounds: Bounds): void;
    /**
     * 特定のウィンドウの設定を削除
     */
    delete(role: WindowRole): void;
    /**
     * すべての設定をクリア
     */
    clear(): void;
    /**
     * ファイルからデータを読み込む
     */
    private load;
    /**
     * データをファイルに保存
     */
    private save;
    /**
     * 空のデータ構造を作成
     */
    private createEmptyData;
    /**
     * デバッグ用：現在のデータを取得
     */
    getAll(): BoundsData;
}
export declare const boundsStore: BoundsStore;
export {};
