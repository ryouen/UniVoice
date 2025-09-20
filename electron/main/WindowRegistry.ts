/**
 * WindowRegistry - UniVoice Window Management Core
 * 
 * 責務:
 * - ウィンドウのライフサイクル管理
 * - 前回位置/サイズの復元
 * - Setup/Main/History/Summary ウィンドウの一元管理
 */

import { BrowserWindow, app, screen } from 'electron';
import * as path from 'path';
import { BoundsStore, WindowRole, Bounds } from './BoundsStore';

// 開発モードの判定
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

export class WindowRegistry {
  private store = new BoundsStore();
  private windows = new Map<WindowRole, BrowserWindow>();
  private isQuitting = false;

  constructor() {
    // アプリ終了時のフラグ管理
    app.on('before-quit', () => {
      this.isQuitting = true;
    });
  }
  
  /**
   * URLを解決（開発/本番環境対応）
   */
  private resolveUrl(hash: string = ''): string {
    if (isDev) {
      // 開発環境: Viteのポートを試す
      const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182, 5183, 5190, 5195];
      // TODO: 実際の接続はmain.tsで行うため、ここでは最初のポートを返す
      // HashRouter用にhashが空の場合は/を追加
      const url = `http://localhost:${ports[0]}/${hash}`;
      return url;
    }
    // 本番環境
    // HashRouter用にhashが空の場合はindex.htmlのみ
    if (hash) {
      return `file://${path.join(app.getAppPath(), 'dist', 'index.html')}${hash}`;
    }
    return `file://${path.join(app.getAppPath(), 'dist', 'index.html')}`;
  }

  /**
   * 指定された役割のウィンドウを取得
   */
  get(role: WindowRole): BrowserWindow | undefined {
    return this.windows.get(role);
  }

  /**
   * ウィンドウを作成または表示
   */
  createOrShow(role: WindowRole, options?: Electron.BrowserWindowConstructorOptions): BrowserWindow {
    // 既存ウィンドウの確認
    const existing = this.windows.get(role);
    if (existing && !existing.isDestroyed()) {
      existing.show();
      existing.focus();
      return existing;
    }

    // デフォルト設定
    const defaults: Electron.BrowserWindowConstructorOptions = {
      show: false,
      frame: false, // UniVoiceはフレームレス
      transparent: true, // 透過を有効化（グラスモーフィズム効果）
      backgroundColor: '#00000000', // 完全透明の背景
      focusable: true, // フォーカス可能を明示
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    };

    // ロール別のデフォルト設定
    const roleDefaults = this.getRoleDefaults(role);
    
    console.log(`[WindowRegistry] Creating window for role: ${role}`, {
      defaults: { width: defaults.width, height: defaults.height },
      roleDefaults,
      options
    });
    
    // ウィンドウ作成
    const window = new BrowserWindow({
      ...defaults,
      ...roleDefaults,
      ...options
    });
    
    this.windows.set(role, window);

    // 前回の位置/サイズを復元（setup画面は除外）
    if (role !== 'setup') {
      const saved = this.store.get(role);
      if (saved?.width && saved?.height) {
        const validBounds = this.ensureOnScreen(saved);
        window.setBounds(validBounds);
      }
      if (saved?.maximized) {
        window.maximize();
      }
    } else {
      // setup画面は常に固定サイズを強制（374px問題の修正）
      const display = screen.getPrimaryDisplay();
      const workArea = display.workArea;
      
      // 画面サイズより大きくならないよう調整
      const targetWidth = 600;
      const targetHeight = 800;
      const safeWidth = Math.min(targetWidth, workArea.width - 100);
      const safeHeight = Math.min(targetHeight, workArea.height - 100);
      
      window.setMinimumSize(safeWidth, safeHeight);
      window.setMaximumSize(safeWidth, safeHeight);
      window.setBounds({ 
        width: safeWidth, 
        height: safeHeight,
        x: Math.round((workArea.width - safeWidth) / 2),
        y: Math.round((workArea.height - safeHeight) / 2)
      });
      console.log('[WindowRegistry] Setup window size enforced:', { safeWidth, safeHeight });
    }

    // 位置/サイズの自動保存を設定
    this.setupBoundsPersistence(window, role);

    // 履歴・要約ウィンドウはhide-on-close
    if (role === 'history' || role === 'summary') {
      window.on('close', (event) => {
        if (!window.isDestroyed() && !this.isQuitting) {
          event.preventDefault();
          window.hide();
        }
      });
    } else {
      window.on('closed', () => {
        this.windows.delete(role);
      });
    }

    return window;
  }

  /**
   * ロール別のデフォルト設定
   */
  private getRoleDefaults(role: WindowRole): Electron.BrowserWindowConstructorOptions {
    switch (role) {
      case 'setup':
        return {
          width: 600,    // 縦長のレイアウトに適した幅
          height: 800,   // 十分な高さを確保
          minHeight: 700, // 最小高さを強制
          resizable: false,
          center: true,
          title: 'UniVoice - Setup'
        };
      
      case 'main':
        return {
          width: 1200,
          height: 400,
          minWidth: 800,
          minHeight: 200,
          resizable: true,
          title: 'UniVoice - Streaming UI Optimization'
        };
      
      case 'history':
        return {
          width: 600,
          height: 800,
          minWidth: 400,
          minHeight: 300,
          resizable: true,
          title: 'UniVoice - 履歴',
          alwaysOnTop: false
        };
      
      case 'summary':
        return {
          width: 600,
          height: 800,
          minWidth: 400,
          minHeight: 300,
          resizable: true,
          title: 'UniVoice - 要約',
          alwaysOnTop: false
        };
      
      default:
        return {};
    }
  }

  /**
   * 位置/サイズの永続化設定
   */
  private setupBoundsPersistence(window: BrowserWindow, role: WindowRole): void {
    // setup画面は位置・サイズを保存しない
    if (role === 'setup') {
      return;
    }

    // デバウンス用タイマー
    let saveTimer: NodeJS.Timeout | null = null;
    
    const saveBounds = () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      
      saveTimer = setTimeout(() => {
        if (!window.isDestroyed()) {
          const bounds = window.getBounds();
          const maximized = window.isMaximized();
          this.store.set(role, { ...bounds, maximized });
        }
      }, 300); // 300msのデバウンス
    };

    window.on('moved', saveBounds);
    window.on('resize', saveBounds);
    window.on('maximize', saveBounds);
    window.on('unmaximize', saveBounds);
  }

  /**
   * ウィンドウが画面内に収まるよう調整
   */
  private ensureOnScreen(bounds: Bounds): Bounds {
    const displays = screen.getAllDisplays();
    
    // いずれかのディスプレイに表示されているか確認
    const isVisible = displays.some(display => {
      const area = display.workArea;
      return bounds.x >= area.x &&
             bounds.y >= area.y &&
             bounds.x + bounds.width <= area.x + area.width &&
             bounds.y + bounds.height <= area.y + area.height;
    });

    if (!isVisible) {
      // オフスクリーンの場合、プライマリディスプレイの中央に配置
      const primary = screen.getPrimaryDisplay();
      return {
        ...bounds,
        x: Math.round((primary.workArea.width - bounds.width) / 2),
        y: Math.round((primary.workArea.height - bounds.height) / 2)
      };
    }

    return bounds;
  }

  // ========== Setup画面専用メソッド ==========

  /**
   * Setup画面を.backgroundサイズにフィット
   */
  fitSetupTo(_width: number, _height: number): void {
    const setup = this.get('setup');
    if (!setup || setup.isDestroyed()) return;

    // Setup画面は固定サイズ（374px問題の修正）
    const FIXED_WIDTH = 600;
    const FIXED_HEIGHT = 800;
    
    // ディスプレイ中央に配置
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());

    setup.setContentBounds({
      width: FIXED_WIDTH,
      height: FIXED_HEIGHT,
      x: Math.round((display.workArea.width - FIXED_WIDTH) / 2) + display.workArea.x,
      y: Math.round((display.workArea.height - FIXED_HEIGHT) / 2) + display.workArea.y
    });
    
    setup.show();
  }

  /**
   * Setup画面をMain画面として再利用（メモリ効率化）
   */
  reuseSetupAsMain(): void {
    const setup = this.get('setup');
    if (!setup || setup.isDestroyed()) return;

    // Main画面の前回サイズを復元
    const mainSaved = this.store.get('main');
    if (mainSaved?.width && mainSaved?.height) {
      const validBounds = this.ensureOnScreen(mainSaved);
      setup.setBounds(validBounds);
    }
    if (mainSaved?.maximized) {
      setup.maximize();
    }

    // リサイズ可能に変更
    setup.setResizable(true);
    setup.setMinimumSize(800, 200);

    // URLをmainに切り替え（実際のロードはmain.tsで行う）
    // setup.loadURL(this.resolveUrl('#/main'));

    // ロールを切り替え
    this.windows.set('main', setup);
    this.windows.delete('setup');

    // bounds永続化を再設定
    this.setupBoundsPersistence(setup, 'main');
  }

  // ========== History/Summary専用メソッド ==========

  /**
   * 履歴ウィンドウを開く
   */
  async openHistory(): Promise<BrowserWindow> {
    const window = this.createOrShow('history');
    
    // React Routerに対応したURL（#/history）をロード
    const targetUrl = this.resolveUrl('#/history');
    const currentUrl = window.webContents.getURL();
    
    // 既に正しいURLがロードされていない場合のみロード
    if (!currentUrl.includes('#/history')) {
      await window.loadURL(targetUrl);
    }
    
    window.show();
    return window;
  }

  /**
   * 要約ウィンドウを開く
   */
  async openSummary(): Promise<BrowserWindow> {
    const window = this.createOrShow('summary');
    
    // React Routerに対応したURL（#/summary）をロード
    const targetUrl = this.resolveUrl('#/summary');
    const currentUrl = window.webContents.getURL();
    
    // 既に正しいURLがロードされていない場合のみロード
    if (!currentUrl.includes('#/summary')) {
      await window.loadURL(targetUrl);
    }
    
    window.show();
    return window;
  }

  /**
   * 履歴ウィンドウのトグル
   */
  toggleHistory(): void {
    const window = this.get('history');
    if (window && !window.isDestroyed()) {
      if (window.isVisible()) {
        window.hide();
      } else {
        window.show();
        window.focus();
      }
    } else {
      this.openHistory();
    }
  }

  /**
   * 要約ウィンドウのトグル
   */
  toggleSummary(): void {
    const window = this.get('summary');
    if (window && !window.isDestroyed()) {
      if (window.isVisible()) {
        window.hide();
      } else {
        window.show();
        window.focus();
      }
    } else {
      this.openSummary();
    }
  }

  /**
   * すべてのウィンドウを閉じる
   */
  closeAll(): void {
    for (const [, window] of this.windows) {
      if (!window.isDestroyed()) {
        window.destroy();
      }
    }
    this.windows.clear();
  }
}

// シングルトンインスタンス
export const windowRegistry = new WindowRegistry();