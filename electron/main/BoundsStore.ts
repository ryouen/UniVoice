/**
 * BoundsStore - Window Position/Size Persistence
 * 
 * 責務:
 * - ウィンドウの位置/サイズの永続化
 * - マルチディスプレイ環境での安全な復元
 * - 設定ファイルの管理
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// ウィンドウロールの定義
export type WindowRole = 'setup' | 'main' | 'history' | 'summary';

// 位置/サイズ情報
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized?: boolean;
}

// 永続化データの型
interface BoundsData {
  version: string;
  windows: {
    [K in WindowRole]?: Bounds;
  };
}

export class BoundsStore {
  private dataPath: string;
  private data: BoundsData;
  
  constructor() {
    // ユーザーデータディレクトリに保存
    const userDataPath = app.getPath('userData');
    this.dataPath = path.join(userDataPath, 'window-bounds.json');
    
    // 既存データを読み込む
    this.data = this.load();
  }
  
  /**
   * ウィンドウの位置/サイズを取得
   */
  get(role: WindowRole): Bounds | undefined {
    return this.data.windows[role];
  }
  
  /**
   * ウィンドウの位置/サイズを保存
   */
  set(role: WindowRole, bounds: Bounds): void {
    this.data.windows[role] = bounds;
    this.save();
  }
  
  /**
   * 特定のウィンドウの設定を削除
   */
  delete(role: WindowRole): void {
    delete this.data.windows[role];
    this.save();
  }
  
  /**
   * すべての設定をクリア
   */
  clear(): void {
    this.data = this.createEmptyData();
    this.save();
  }
  
  /**
   * ファイルからデータを読み込む
   */
  private load(): BoundsData {
    try {
      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf-8');
        const parsed = JSON.parse(content);
        
        // バージョンチェック
        if (parsed.version === '2.0.0') {
          // setup画面のデータは強制削除（374px問題の修正）
          if (parsed.windows && parsed.windows.setup) {
            console.log('[BoundsStore] Removing invalid setup window data:', parsed.windows.setup);
            delete parsed.windows.setup;
          }
          
          return parsed;
        }
      }
    } catch (error) {
      console.warn('[BoundsStore] Failed to load bounds data:', error);
    }
    
    // デフォルトデータを返す
    return this.createEmptyData();
  }
  
  /**
   * データをファイルに保存
   */
  private save(): void {
    try {
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // JSON形式で保存
      const json = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(this.dataPath, json, 'utf-8');
      
    } catch (error) {
      console.error('[BoundsStore] Failed to save bounds data:', error);
      // 保存に失敗してもアプリは継続
    }
  }
  
  /**
   * 空のデータ構造を作成
   */
  private createEmptyData(): BoundsData {
    return {
      version: '2.0.0',
      windows: {}
    };
  }
  
  /**
   * デバッグ用：現在のデータを取得
   */
  getAll(): BoundsData {
    return { ...this.data };
  }
}

// シングルトンインスタンス（オプション）
export const boundsStore = new BoundsStore();