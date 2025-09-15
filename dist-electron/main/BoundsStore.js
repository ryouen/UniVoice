"use strict";
/**
 * BoundsStore - Window Position/Size Persistence
 *
 * 責務:
 * - ウィンドウの位置/サイズの永続化
 * - マルチディスプレイ環境での安全な復元
 * - 設定ファイルの管理
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
exports.boundsStore = exports.BoundsStore = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class BoundsStore {
    constructor() {
        // ユーザーデータディレクトリに保存
        const userDataPath = electron_1.app.getPath('userData');
        this.dataPath = path.join(userDataPath, 'window-bounds.json');
        // 既存データを読み込む
        this.data = this.load();
    }
    /**
     * ウィンドウの位置/サイズを取得
     */
    get(role) {
        return this.data.windows[role];
    }
    /**
     * ウィンドウの位置/サイズを保存
     */
    set(role, bounds) {
        this.data.windows[role] = bounds;
        this.save();
    }
    /**
     * 特定のウィンドウの設定を削除
     */
    delete(role) {
        delete this.data.windows[role];
        this.save();
    }
    /**
     * すべての設定をクリア
     */
    clear() {
        this.data = this.createEmptyData();
        this.save();
    }
    /**
     * ファイルからデータを読み込む
     */
    load() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const content = fs.readFileSync(this.dataPath, 'utf-8');
                const parsed = JSON.parse(content);
                // バージョンチェック
                if (parsed.version === '2.0.0') {
                    return parsed;
                }
            }
        }
        catch (error) {
            console.warn('[BoundsStore] Failed to load bounds data:', error);
        }
        // デフォルトデータを返す
        return this.createEmptyData();
    }
    /**
     * データをファイルに保存
     */
    save() {
        try {
            // ディレクトリが存在しない場合は作成
            const dir = path.dirname(this.dataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // JSON形式で保存
            const json = JSON.stringify(this.data, null, 2);
            fs.writeFileSync(this.dataPath, json, 'utf-8');
        }
        catch (error) {
            console.error('[BoundsStore] Failed to save bounds data:', error);
            // 保存に失敗してもアプリは継続
        }
    }
    /**
     * 空のデータ構造を作成
     */
    createEmptyData() {
        return {
            version: '2.0.0',
            windows: {}
        };
    }
    /**
     * デバッグ用：現在のデータを取得
     */
    getAll() {
        return { ...this.data };
    }
}
exports.BoundsStore = BoundsStore;
// シングルトンインスタンス（オプション）
exports.boundsStore = new BoundsStore();
