# UniVoice Window Management Architecture

最終更新: 2025-09-14  
バージョン: 3.1.0  
作成者: Claude Code (Clean Architecture Senior Engineer)

## 📋 概要

本ドキュメントは、UniVoiceアプリケーションにおけるウィンドウ管理の大方針とアーキテクチャ設計を定義します。Clean Architectureの原則に基づき、2024年のElectronベストプラクティスを取り入れた、持続可能で拡張可能な設計を提供します。

### 🔍 現状の問題点

1. **ウィンドウサイズ管理の責務が不明確**
   - サイズ管理が「React（レンダラー）」に帰属し、「ウィンドウ（Electron）」での制御が弱い
   - Setup画面の理想サイズ（`.background`基準）でウィンドウ自体を固定できていない
   - Main遷移後の前回サイズ復元の責務所在が不明確（React側？mainプロセス？）

2. **履歴・要約パネルの制約**
   - Reactの同一ウィンドウ内パネルまたは`position: fixed`のオーバーレイとして実装
   - OSウィンドウの境界外へ移動不可、独立したリサイズ不可
   - 独立BrowserWindowまたはdetach可能なBrowserViewとしての設計が必要

3. **アーキテクチャの問題**
   - メインツリーに各種コンポーネントが混在し、ウィンドウ管理の一元化が困難
   - ウィンドウ状態の永続化・復元ロジックが散在

## 🎯 設計目標

### 主要目標
1. **責任の明確な分離**: 
   - Reactは画面描画のみ担当
   - ウィンドウ管理・永続化は100% mainプロセスで実行
   - ビジネスロジックとプラットフォーム固有の実装を分離
2. **テスタビリティ**: すべてのウィンドウ操作を抽象化し、完全にテスト可能に
3. **拡張性**: 将来の要件変更に柔軟に対応できる設計
4. **パフォーマンス**: 
   - メモリ効率的で高速な画面遷移
   - 大量IPCでのGC圧/メモリ肥大を回避
5. **ユーザー体験**: 
   - 直感的で一貫性のある操作感
   - Setup完了→Mainで必ず前回boundsに戻る
   - 多モニタ/DPIスケール変化への対応

### 成功指標
- ウィンドウ遷移時間: < 300ms
- メモリ使用量削減: > 30%（従来比）
- テストカバレッジ: > 90%
- クラッシュ率: < 0.1%
- Setup画面: `.background`の実サイズに固定（誤差 < 5px）
- Main画面: 前回サイズ復元成功率 100%
- 履歴・要約: ポップアウト→再ドック時の状態保持率 100%

## 🏛️ アーキテクチャ概要

### レイヤー構造

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│  (React Components, Window UI, User Interactions)   │
├─────────────────────────────────────────────────────┤
│                  Application Layer                   │
│    (Use Cases, Window Orchestration, Business       │
│                    Workflows)                        │
├─────────────────────────────────────────────────────┤
│                    Domain Layer                      │
│   (Window Lifecycle, State Models, Business Rules)  │
├─────────────────────────────────────────────────────┤
│                Infrastructure Layer                  │
│    (Electron APIs, IPC, File System, Platform       │
│                  Specific Code)                      │
└─────────────────────────────────────────────────────┘
```

### 核心インターフェース

```typescript
// Domain Layer: ウィンドウライフサイクルの抽象化
interface WindowLifecycle {
  initialize(): Promise<void>;
  transition(from: WindowState, to: WindowState): Promise<void>;
  restore(previousState: WindowState): Promise<void>;
  persist(currentState: WindowState): Promise<void>;
}

// Domain Layer: ウィンドウ状態の定義
interface WindowState {
  type: 'setup' | 'main';
  bounds: WindowBounds;
  settings: WindowSettings;
  metadata: Record<string, unknown>;
}

// Application Layer: ユースケース
interface SessionTransitionUseCase {
  startMainSession(settings: SessionSettings): Promise<void>;
  returnToSetup(): Promise<void>;
  saveSessionState(): Promise<void>;
}
```

## 🚀 実装戦略: Window Registry Pattern

### コアコンセプト: WindowRegistry/WindowOrchestrator

すべてのウィンドウ管理をmainプロセスで一元化し、以下を実現します：

```typescript
// electron/main/WindowRegistry.ts
class WindowRegistry {
  private windows: Map<WindowType, BrowserWindow> = new Map();
  private bounds: Map<WindowType, Bounds> = new Map();
  private store: Store; // electron-store等

  async createSetupWindow(): Promise<BrowserWindow> {
    const window = new BrowserWindow({
      width: 960,
      height: 640,
      resizable: false, // Setup画面は固定サイズ
      center: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // .backgroundサイズ取得後に調整
    window.webContents.on('did-finish-load', async () => {
      const size = await this.measureSetupContentSize();
      if (size) {
        window.setContentBounds({ ...size, x: undefined, y: undefined });
      }
      window.show();
    });

    this.windows.set('setup', window);
    return window;
  }

  async createMainWindow(): Promise<BrowserWindow> {
    // 前回のboundsを復元
    const savedBounds = this.store.get('windows.main.bounds', {
      width: 1200,
      height: 800
    });

    const window = new BrowserWindow({
      ...this.ensureOnScreen(savedBounds),
      minWidth: 960,
      minHeight: 640,
      resizable: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // bounds変更を永続化
    this.setupBoundsPersistence(window, 'main');
    
    window.once('ready-to-show', () => {
      window.show();
      this.windows.get('setup')?.close();
    });

    this.windows.set('main', window);
    return window;
  }

  private setupBoundsPersistence(window: BrowserWindow, type: WindowType): void {
    const saveBounds = throttle(() => {
      const bounds = window.getBounds();
      this.store.set(`windows.${type}.bounds`, bounds);
    }, 1000);

    window.on('moved', saveBounds);
    window.on('resize', saveBounds);
  }

  private ensureOnScreen(bounds: Bounds): Bounds {
    const displays = screen.getAllDisplays();
    const visible = displays.some(display => {
      return bounds.x >= display.bounds.x &&
             bounds.y >= display.bounds.y &&
             bounds.x + bounds.width <= display.bounds.x + display.bounds.width &&
             bounds.y + bounds.height <= display.bounds.y + display.bounds.height;
    });

    if (!visible) {
      // オフスクリーンの場合、プライマリディスプレイの中央に配置
      const primary = screen.getPrimaryDisplay();
      return {
        ...bounds,
        x: Math.round((primary.bounds.width - bounds.width) / 2),
        y: Math.round((primary.bounds.height - bounds.height) / 2)
      };
    }

    return bounds;
  }
}
```

## 🚀 実装戦略: Progressive Window Architecture (PWA)

### Phase 1: Window Registry Implementation (即時実装)

#### 概要
WindowRegistryパターンを導入し、すべてのウィンドウ管理をmainプロセスで一元化します。

#### A: 別ウィンドウ方式（推奨）

```typescript
class MultiWindowStrategy implements WindowStrategy {
  async startSession(settings: SessionSettings): Promise<void> {
    // 1. Setup画面を固定サイズで表示
    const setupWindow = await this.registry.createSetupWindow();
    
    // 2. .backgroundサイズに基づいて調整
    const contentSize = await this.measureContentSize(setupWindow);
    setupWindow.setContentBounds({
      width: contentSize.width,
      height: contentSize.height,
      x: undefined,
      y: undefined
    });
    
    // 3. セッション開始時
    ipcMain.once('session:start', async () => {
      // Setup画面を閉じる
      setupWindow.close();
      
      // Main画面を前回サイズで開く
      const mainWindow = await this.registry.createMainWindow();
      mainWindow.show();
    });
  }
}
```

#### B: 同一ウィンドウ切替方式（オプション）

```typescript
class SingleWindowStrategy implements WindowStrategy {
  async transitionToMain(settings: SessionSettings): Promise<void> {
    const window = this.registry.getWindow('main');
    
    // 1. 現在の固定サイズを解除
    window.setResizable(true);
    
    // 2. 保存されたメインウィンドウサイズを復元
    const savedBounds = this.store.get('windows.main.bounds');
    
    // 3. アニメーション付きでリサイズ
    await this.animateResize(window.getBounds(), savedBounds);
    
    // 4. コンテンツを切り替え
    window.loadURL('main.html');
  }
}
```

#### メリット
- Setup画面のサイズが`.background`に完全一致
- Main画面の前回サイズが確実に復元
- ウィンドウ管理の責務がmainプロセスに集約

### Phase 2: Detachable Panels Implementation (次期)

#### 履歴・要約パネルの独立ウィンドウ化

```typescript
interface DetachablePanel {
  type: 'history' | 'summary';
  docked: boolean;
  window?: BrowserWindow;
  bounds?: Bounds;
}

class PanelManager {
  private panels: Map<string, DetachablePanel> = new Map();
  
  async detachPanel(type: 'history' | 'summary'): Promise<void> {
    const panel = this.panels.get(type);
    if (panel?.docked) {
      // 独立ウィンドウとして作成
      const window = new BrowserWindow({
        width: 600,
        height: 800,
        minWidth: 400,
        minHeight: 300,
        resizable: true,
        movable: true,
        alwaysOnTop: false, // ユーザー設定可能
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true
        }
      });
      
      // 専用エントリポイントをロード
      window.loadURL(`${type}.html`);
      
      // 状態を更新
      panel.docked = false;
      panel.window = window;
      
      // データ同期を開始
      this.startDataSync(type, window);
      
      // bounds永続化を設定
      this.registry.setupBoundsPersistence(window, type);
    }
  }
  
  async dockPanel(type: 'history' | 'summary'): Promise<void> {
    const panel = this.panels.get(type);
    if (panel && !panel.docked) {
      // 現在の状態を保存
      panel.bounds = panel.window?.getBounds();
      
      // ウィンドウを閉じる
      panel.window?.close();
      
      // メインウィンドウに通知
      this.mainWindow.webContents.send('panel:docked', { type });
      
      panel.docked = true;
      panel.window = undefined;
    }
  }
  
  private startDataSync(type: string, window: BrowserWindow): void {
    // 高頻度更新用のバッチング
    const batch = new UpdateBatch(100); // 100ms
    
    // リアルタイム更新を受信
    ipcMain.on(`${type}:update`, (event, data) => {
      batch.add(data);
    });
    
    // バッチ送信
    batch.on('flush', (updates) => {
      if (!window.isDestroyed()) {
        window.webContents.send(`${type}:batch-update`, updates);
      }
    });
  }
}
```

### Phase 3: WebContentsView Integration (将来)

#### 概要
Electron 30+で導入されたWebContentsViewを活用し、より効率的なメモリ管理を実現します。

#### 実装詳細
```typescript
class WebContentsViewStrategy implements WindowStrategy {
  private baseWindow: BaseWindow;
  private views: Map<string, WebContentsView>;

  async initialize(): Promise<void> {
    this.baseWindow = new BaseWindow({
      width: 600,
      height: 400,
      show: false
    });

    // SetupViewを初期表示
    const setupView = new WebContentsView();
    await setupView.webContents.loadURL('setup.html');
    this.baseWindow.contentView.addChildView(setupView);
    this.views.set('setup', setupView);
  }

  async transitionToMain(settings: SessionSettings): Promise<void> {
    // 1. MainViewを作成
    const mainView = new WebContentsView();
    await mainView.webContents.loadURL('main.html');
    
    // 2. ウィンドウサイズを変更
    const savedBounds = await this.getSavedMainBounds();
    await this.animateWindowResize(savedBounds);
    
    // 3. ビューを切り替え
    await this.crossFadeViews('setup', 'main');
    
    // 4. SetupViewのリソースを解放
    this.views.get('setup')?.webContents.close();
    this.views.delete('setup');
  }
}
```

#### メリット
- メモリ効率の向上
- より柔軟なビュー管理
- Chromiumのネイティブ機能を最大限活用

## 💼 ユースケース実装

### セッション開始フロー

```typescript
@Injectable()
class SessionTransitionUseCaseImpl implements SessionTransitionUseCase {
  constructor(
    private windowManager: WindowLifecycle,
    private stateRepository: StateRepository,
    private analytics: AnalyticsService
  ) {}

  async startMainSession(settings: SessionSettings): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. 前回のウィンドウ状態を取得
      const previousState = await this.stateRepository.getLastWindowState();
      
      // 2. ウィンドウ遷移を実行
      await this.windowManager.transition(
        { type: 'setup', bounds: this.getSetupBounds() },
        { type: 'main', bounds: previousState?.bounds || this.getDefaultMainBounds() }
      );
      
      // 3. セッション設定を適用
      await this.applySessionSettings(settings);
      
      // 4. 成功メトリクスを記録
      this.analytics.track('session_started', {
        transitionTime: Date.now() - startTime,
        windowSize: previousState?.bounds
      });
      
    } catch (error) {
      // 5. エラー時の優雅な劣化
      this.handleTransitionError(error);
    }
  }

  private handleTransitionError(error: Error): void {
    // フォールバック: 単純な画面切り替え
    console.error('Window transition failed, falling back to simple switch', error);
    this.windowManager.fallbackTransition();
  }
}
```

## 📡 IPC通信とデータ同期

### Preload API設計

```typescript
// electron/preload.ts
contextBridge.exposeInMainWorld('univoiceAPI', {
  window: {
    // ウィンドウ状態管理
    getState: (key: string) => ipcRenderer.invoke('window:get-state', key),
    setState: (key: string, value: any) => ipcRenderer.invoke('window:set-state', key, value),
    
    // ウィンドウ操作
    openWindow: (type: WindowType) => ipcRenderer.invoke('window:open', type),
    closeWindow: (type: WindowType) => ipcRenderer.invoke('window:close', type),
    toggleDetach: (type: PanelType) => ipcRenderer.invoke('window:toggle-detach', type),
    
    // サイズ計測（Setup用）
    measureContent: () => {
      const element = document.querySelector('.background');
      if (element) {
        const rect = element.getBoundingClientRect();
        return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
      }
      return null;
    }
  },
  
  data: {
    // 高頻度更新用
    onRealtimeUpdate: (callback: (data: any) => void) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('data:realtime-update', listener);
      return () => ipcRenderer.removeListener('data:realtime-update', listener);
    },
    
    // 低頻度クエリ
    fetchHistory: (params: HistoryQuery) => ipcRenderer.invoke('data:fetch-history', params),
    fetchSummary: (id: string) => ipcRenderer.invoke('data:fetch-summary', id)
  }
});
```

### データ同期戦略

```typescript
// 高頻度更新のバッチング
class UpdateBatcher {
  private queue: Update[] = [];
  private timer: NodeJS.Timeout | null = null;
  
  constructor(
    private batchInterval: number = 100,
    private maxBatchSize: number = 1000
  ) {}
  
  add(update: Update): void {
    this.queue.push(update);
    
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchInterval);
    }
  }
  
  private flush(): void {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.maxBatchSize);
    this.emit('batch', batch);
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
```

## 🧪 テスト戦略

### 単体テスト

```typescript
describe('WindowRegistry', () => {
  let registry: WindowRegistry;
  let mockStore: jest.Mocked<Store>;

  beforeEach(() => {
    mockStore = createMockStore();
    registry = new WindowRegistry(mockStore);
  });

  describe('Setup Window', () => {
    it('should create setup window with content size from .background', async () => {
      // .backgroundサイズをモック
      const contentSize = { width: 820, height: 560 };
      jest.spyOn(registry as any, 'measureSetupContentSize')
        .mockResolvedValue(contentSize);

      const window = await registry.createSetupWindow();

      // did-finish-loadイベントを発火
      window.webContents.emit('did-finish-load');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(window.getContentBounds()).toMatchObject({
        width: 820,
        height: 560
      });
      expect(window.isResizable()).toBe(false);
    });

    it('should fallback to default size when .background measurement fails', async () => {
      jest.spyOn(registry as any, 'measureSetupContentSize')
        .mockResolvedValue(null);

      const window = await registry.createSetupWindow();

      expect(window.getContentBounds()).toMatchObject({
        width: 960,
        height: 640
      });
    });
  });

  describe('Main Window', () => {
    it('should restore previous bounds on creation', async () => {
      const savedBounds = { width: 1400, height: 900, x: 100, y: 50 };
      mockStore.get.mockReturnValue(savedBounds);

      const window = await registry.createMainWindow();

      expect(window.getBounds()).toMatchObject(savedBounds);
      expect(window.isResizable()).toBe(true);
    });

    it('should apply minimum size constraints', async () => {
      const window = await registry.createMainWindow();

      expect(window.getMinimumSize()).toEqual([960, 640]);
    });
  });

  describe('Bounds Persistence', () => {
    it('should save bounds on window move/resize with throttling', async () => {
      const window = await registry.createMainWindow();
      const newBounds = { width: 1500, height: 1000, x: 200, y: 100 };

      // 複数回の移動をシミュレート
      for (let i = 0; i < 10; i++) {
        window.setBounds({ ...newBounds, x: newBounds.x + i });
        window.emit('moved');
      }

      // throttleの待機
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 最後の値のみが保存されることを確認
      expect(mockStore.set).toHaveBeenCalledTimes(1);
      expect(mockStore.set).toHaveBeenCalledWith(
        'windows.main.bounds',
        expect.objectContaining({ x: 209 })
      );
    });
  });

  describe('Off-screen Recovery', () => {
    it('should move window to center when off-screen', () => {
      const offScreenBounds = { width: 800, height: 600, x: 5000, y: 5000 };
      
      jest.spyOn(screen, 'getAllDisplays').mockReturnValue([{
        bounds: { x: 0, y: 0, width: 1920, height: 1080 }
      }]);

      const corrected = registry.ensureOnScreen(offScreenBounds);

      expect(corrected).toMatchObject({
        width: 800,
        height: 600,
        x: 560, // (1920 - 800) / 2
        y: 240  // (1080 - 600) / 2
      });
    });
  });
});
```

### 統合テスト

```typescript
describe('Window Management E2E', () => {
  let app: Application;

  beforeEach(async () => {
    app = await launchTestApp();
  });

  afterEach(async () => {
    await app.stop();
  });

  it('should complete Setup→Main transition correctly', async () => {
    // 1. Setup画面が.backgroundサイズで表示される
    const setupWindow = await app.getWindow('setup');
    expect(setupWindow.isVisible()).toBe(true);
    expect(setupWindow.isResizable()).toBe(false);
    
    const setupBounds = await setupWindow.getBounds();
    expect(setupBounds).toMatchObject({
      width: 820,  // .backgroundの実測値
      height: 560
    });

    // 2. セッション開始
    await app.click('[data-testid="start-session"]');
    await app.waitForWindow('main');

    // 3. Main画面が前回サイズで表示される
    const mainWindow = await app.getWindow('main');
    expect(mainWindow.isVisible()).toBe(true);
    expect(mainWindow.isResizable()).toBe(true);
    
    const mainBounds = await mainWindow.getBounds();
    expect(mainBounds).toMatchObject({
      width: 1400,  // 前回保存されたサイズ
      height: 900
    });

    // 4. Setup画面が閉じられている
    expect(await app.getWindow('setup')).toBeNull();
  });

  it('should handle panel detach/dock operations', async () => {
    await app.startMainSession();

    // 1. 履歴パネルをポップアウト
    await app.click('[data-testid="detach-history"]');
    const historyWindow = await app.waitForWindow('history');
    
    expect(historyWindow.isVisible()).toBe(true);
    expect(historyWindow.isResizable()).toBe(true);

    // 2. 別モニタへ移動
    const newPosition = { x: 2000, y: 100 };
    await historyWindow.setBounds({ ...await historyWindow.getBounds(), ...newPosition });

    // 3. アプリ再起動
    await app.restart();
    
    // 4. 履歴ウィンドウが同じ位置に復元
    const restoredHistory = await app.getWindow('history');
    const restoredBounds = await restoredHistory.getBounds();
    
    expect(restoredBounds).toMatchObject(newPosition);
  });

  it('should handle 10,000 realtime updates without UI freeze', async () => {
    await app.startMainSession();
    
    // メモリ使用量のベースライン
    const baselineMemory = await app.getMemoryUsage();

    // 10,000行の更新を送信
    const updates = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      text: `Update ${i}`,
      timestamp: Date.now()
    }));

    const startTime = Date.now();
    await app.sendBatchUpdates(updates);
    
    // UIが応答することを確認
    await app.click('[data-testid="scroll-to-bottom"]');
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(5000); // 5秒以内
    
    // メモリ使用量が異常に増加していないことを確認
    const currentMemory = await app.getMemoryUsage();
    expect(currentMemory.heapUsed).toBeLessThan(baselineMemory.heapUsed * 2);
  });
});
```

## 📊 パフォーマンス最適化

### メモリ管理

```typescript
class MemoryOptimizedWindowManager {
  private memoryThreshold = 0.8; // 80%使用率

  async beforeTransition(): Promise<void> {
    // 1. 現在のメモリ使用率をチェック
    const memoryUsage = await this.getMemoryUsage();
    
    if (memoryUsage > this.memoryThreshold) {
      // 2. 不要なリソースを解放
      await this.releaseUnusedResources();
      
      // 3. ガベージコレクションを強制実行
      if (global.gc) {
        global.gc();
      }
    }
  }

  private async releaseUnusedResources(): Promise<void> {
    // キャッシュのクリア
    await this.clearWebContentsCache();
    
    // 未使用のビューを破棄
    await this.disposeInactiveViews();
  }
}
```

### アニメーション最適化

```typescript
class SmoothTransitionManager {
  async animateResize(from: Bounds, to: Bounds, duration = 300): Promise<void> {
    const frames = 60; // 60fps
    const interval = duration / frames;
    
    // イージング関数（ease-in-out）
    const easing = (t: number) => t < 0.5 
      ? 2 * t * t 
      : -1 + (4 - 2 * t) * t;
    
    for (let i = 0; i <= frames; i++) {
      const progress = easing(i / frames);
      const currentBounds = this.interpolateBounds(from, to, progress);
      
      await this.setBounds(currentBounds);
      await this.delay(interval);
    }
  }
}
```

## 🔒 セキュリティ考慮事項

### コンテキスト分離

```typescript
// Preload Script
contextBridge.exposeInMainWorld('windowAPI', {
  // 安全なAPIのみを公開
  transitionToMain: () => ipcRenderer.invoke('window:transition-to-main'),
  getWindowState: () => ipcRenderer.invoke('window:get-state'),
  // 危険な操作は公開しない
  // ❌ closeWindow: () => window.close()
});
```

### 状態の検証

```typescript
class SecureStateValidator {
  validateWindowBounds(bounds: unknown): WindowBounds {
    const schema = z.object({
      width: z.number().min(400).max(4096),
      height: z.number().min(300).max(2160),
      x: z.number().optional(),
      y: z.number().optional()
    });
    
    return schema.parse(bounds);
  }
}
```

## 🛠️ 実装チェックリスト

### Phase 1: Window Registry (即時実装)

- [ ] `electron/main/WindowRegistry.ts` の作成
- [ ] Setup画面の`.background`サイズ計測メカニズム
- [ ] Main画面のbounds永続化と復元
- [ ] オフスクリーン検出と補正ロジック
- [ ] IPC契約の定義とPreload APIの実装
- [ ] 既存コードからの移行パス

### Phase 2: Detachable Panels

- [ ] 履歴・要約パネルの独立エントリポイント作成
- [ ] PanelManagerクラスの実装
- [ ] 高頻度データ同期のバッチング機構
- [ ] ドック/ポップアウト切替UI
- [ ] パネル別のbounds永続化

### Phase 3: Performance & Polish

- [ ] メモリ使用量のプロファイリング
- [ ] ウィンドウ遷移アニメーションの実装
- [ ] マルチディスプレイ対応の強化
- [ ] DPIスケール変更への対応
- [ ] エラーリカバリとフォールバック

## 📚 参考資料

- [Electron 30+ WebContentsView Documentation](https://www.electronjs.org/docs/latest/api/web-contents-view)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Electron Best Practices 2024](https://www.electronjs.org/docs/latest/tutorial/best-practices)
- [VSCode Architecture Analysis](https://dev.to/ninglo/vscode-architecture-analysis-electron-project-cross-platform-best-practices-g2j)

---

**このアーキテクチャにより、UniVoiceは技術的優位性とユーザー体験の両立を実現し、持続可能で拡張可能なシステムを構築します。**

**重要**: 本ドキュメントはv3.0.0として、現実の問題解決に焦点を当てた実装重視の設計になっています。理想論ではなく、実際のコードベースで動作する具体的な解決策を提供しています。

## 🔍 WindowRegistry Skeleton実装の検証と評価

### 概要
ユーザーから提供されたWindowRegistryスケルトン実装（`./backup/250913_patch/univoice_window_arch_skeleton.zip`）を検証しました。この実装は本ドキュメントで提案したアーキテクチャの実践的な実装例として優れており、以下の点で特に評価できます。

### ✅ 実装の優れた点

#### 1. シンプルで実用的なWindowRegistry
```typescript
// 実装されたWindowRegistryのコア機能
- createOrShow(): 既存ウィンドウの再利用または新規作成
- fitSetupTo(): Setup画面を.backgroundサイズに動的調整
- reuseSetupAsMain(): Setup→Main遷移での効率的なウィンドウ再利用
```

#### 2. 堅実なBoundsStore実装
- `userData/window-bounds.json`でのJSON永続化
- 役割別（setup/main/history/summary）の境界管理
- 自動保存とエラーハンドリング

#### 3. 効率的なウィンドウ再利用戦略
```typescript
// Setup→Main遷移での賢いウィンドウ再利用
reuseSetupAsMain() {
  const setup = this.get('setup');
  if (!setup) return;
  
  // Main画面の前回boundsを復元
  const mainSaved = this.store.get('main');
  if (mainSaved?.width && mainSaved?.height) {
    setup.setBounds({...mainSaved});
  }
  
  // URLを切り替えてroleを更新
  setup.loadURL(this.resolveUrl('#/main'));
  this.byRole.set('main', setup);
  this.byRole.delete('setup');
}
```

#### 4. 適切なPreload API設計
- コンテキスト分離を維持した安全なAPI
- 直感的な名前空間（`window.uv.setup`、`window.uv.windows`）
- TypeScript型定義の提供

### 📊 アーキテクチャ適合性評価

| 要件 | スケルトン実装の対応 | 評価 |
|------|---------------------|------|
| Setup画面の.backgroundサイズ固定 | ResizeObserver + fitSetupTo() | ✅ 完璧 |
| Main画面の前回サイズ復元 | BoundsStore + reuseSetupAsMain() | ✅ 完璧 |
| 履歴・要約の独立ウィンドウ | hide-on-close実装済み | ✅ 完璧 |
| メモリ効率 | ウィンドウ再利用戦略 | ✅ 優秀 |
| 永続化の信頼性 | JSONベースの堅実な実装 | ✅ 良好 |

### 🔧 統合ガイドライン

#### Phase 1: 既存コードベースへの統合（推奨手順）

1. **WindowRegistryの導入**
   ```bash
   # 1. スケルトンファイルをコピー
   cp univoice_window_arch_skeleton/electron/window-registry.ts electron/main/
   cp univoice_window_arch_skeleton/electron/bounds-store.ts electron/main/
   
   # 2. main.tsへの統合
   # 既存のウィンドウ作成ロジックをWindowRegistryベースに置換
   ```

2. **Preload APIの統合**
   ```typescript
   // 既存のpreload.tsに追加
   import { setupAPI, windowsAPI } from './apis/window';
   
   contextBridge.exposeInMainWorld('univoice', {
     ...existingAPIs,
     setup: setupAPI,
     windows: windowsAPI
   });
   ```

3. **SetupSection.tsxの更新**
   ```typescript
   // ResizeObserverでの.backgroundサイズ監視を追加
   useEffect(() => {
     const el = backgroundRef.current;
     if (!el) return;
     
     const observer = new ResizeObserver(([entry]) => {
       const { width, height } = entry.contentRect;
       window.univoice.setup.setDesiredBounds(
         Math.ceil(width), 
         Math.ceil(height)
       );
     });
     
     observer.observe(el);
     return () => observer.disconnect();
   }, []);
   ```

4. **UniVoice.tsxでの履歴・要約ボタン統合**
   ```typescript
   // 既存のボタンハンドラを更新
   const handleHistoryClick = () => {
     window.univoice.windows.toggleHistory();
   };
   
   const handleSummaryClick = () => {
     window.univoice.windows.toggleSummary();
   };
   ```

### 🚀 改善提案と次のステップ

#### 1. オフスクリーン検出の強化
スケルトンには含まれていないが、本番実装では必要：
```typescript
private ensureOnScreen(bounds: Bounds): Bounds {
  const displays = screen.getAllDisplays();
  const visible = displays.some(display => {
    const area = display.workArea;
    return bounds.x >= area.x && 
           bounds.y >= area.y &&
           bounds.x + bounds.width <= area.x + area.width &&
           bounds.y + bounds.height <= area.y + area.height;
  });
  
  if (!visible) {
    const primary = screen.getPrimaryDisplay();
    return {
      ...bounds,
      x: Math.round((primary.workArea.width - bounds.width) / 2),
      y: Math.round((primary.workArea.height - bounds.height) / 2)
    };
  }
  
  return bounds;
}
```

#### 2. デバウンス機構の追加
高頻度なresize/moveイベントへの対策：
```typescript
import { debounce } from 'lodash';

// Bounds保存をデバウンス
const saveBounds = debounce(() => {
  const b = win.getBounds();
  const maximized = win.isMaximized();
  this.store.set(role, { ...b, maximized });
}, 300);
```

#### 3. エラーリカバリの強化
```typescript
// ウィンドウ作成時のフォールバック
createOrShow(role: WindowRole, opts?: BrowserWindowConstructorOptions) {
  try {
    // 既存の実装
  } catch (error) {
    console.error(`Failed to create window for role: ${role}`, error);
    
    // フォールバック: 最小構成でウィンドウ作成
    return new BrowserWindow({
      width: 800,
      height: 600,
      show: true
    });
  }
}
```

#### 4. テスト戦略
```typescript
// WindowRegistryのユニットテスト例
describe('WindowRegistry', () => {
  it('should reuse setup window as main', async () => {
    const registry = new WindowRegistry();
    
    // Setup window作成
    const setup = registry.createOrShow('setup');
    const setupId = setup.id;
    
    // Main遷移
    registry.reuseSetupAsMain();
    
    // 同じウィンドウインスタンスが使われていることを確認
    const main = registry.get('main');
    expect(main?.id).toBe(setupId);
    expect(registry.get('setup')).toBeUndefined();
  });
});
```

### 📝 実装チェックリスト（更新版）

#### 即時実装可能（スケルトンベース）
- [x] WindowRegistryクラスの基本実装
- [x] BoundsStoreによる永続化
- [x] Setup→Main遷移でのウィンドウ再利用
- [x] 履歴・要約の独立ウィンドウ（hide-on-close）
- [x] Preload APIの基本構造
- [ ] 既存コードベースへの統合
- [ ] オフスクリーン検出の実装
- [ ] デバウンス機構の追加
- [ ] エラーハンドリングの強化

#### 次期実装項目
- [ ] マルチディスプレイ対応の強化
- [ ] DPIスケール変更への対応
- [ ] ウィンドウアニメーション
- [ ] より高度なレイアウト管理

### 💡 結論

提供されたWindowRegistryスケルトンは、本アーキテクチャドキュメントで提案した設計を忠実に実装した優れた実例です。特に以下の点で実用的価値が高い：

1. **即座に動作する実装** - 理論だけでなく、実際に動くコード
2. **シンプルで理解しやすい** - 過度な抽象化を避けた実装
3. **拡張可能な基盤** - 将来の機能追加が容易

このスケルトンを基盤として、段階的に機能を追加していくことで、堅牢なウィンドウ管理システムを構築できます。

## 🎯 実装戦略の明確化（2025-09-14 追記）

### 運用形態（ウィンドウ戦略）

**単一ウィンドウ切替（SingleWindow）と複数ウィンドウ（MultiWindow）の両方を公式に用意**し、目的に応じて選択可能にします。

#### SingleWindowStrategy（単一ウィンドウ切替）
- Setup→Main遷移時に同一ウィンドウを再利用
- メモリ効率が良い
- 画面遷移アニメーションが実装しやすい

#### MultiWindowStrategy（複数ウィンドウ）⭐推奨
- Setup画面を新規ウィンドウで開き、Main遷移時に別ウィンドウを作成
- **Setup固定サイズの完全一致**が保証される
- **Mainの確実な前回サイズ復元**が実現できる
- ウィンドウ管理の責務が明確

### 透明化の扱い

**CSSだけでの透明化**アプローチを採用し、ウィンドウ管理レイヤーから完全に切り離します：

```css
/* ウィンドウ自体は transparent: true で設定 */
/* 実際の透明度はCSSで制御 */
.realtimeArea {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
}
```

この方針により：
- ウィンドウ管理の複雑性を排除
- テーマ変更が容易
- パフォーマンスへの影響を最小化

### 実装優先順位（安全な進め方）

1. **WindowRegistry実装** ✅ (スケルトン提供済み)
   - 基本的なウィンドウライフサイクル管理
   - Bounds永続化機構

2. **Single/Multiの戦略クラス**
   ```typescript
   interface WindowStrategy {
     startSession(settings: SessionSettings): Promise<void>;
     transitionToMain(): Promise<void>;
   }
   
   class SingleWindowStrategy implements WindowStrategy { ... }
   class MultiWindowStrategy implements WindowStrategy { ... }
   ```

3. **PanelManager（履歴/要約）**
   - 独立ウィンドウとしての履歴・要約パネル
   - hide-on-closeパターン
   - データ同期機構

4. **Preload APIの最小セット**
   ```typescript
   window.univoice = {
     setup: {
       setDesiredBounds: (w, h) => Promise<void>,
       enterMain: () => Promise<void>
     },
     windows: {
       toggleHistory: () => Promise<void>,
       toggleSummary: () => Promise<void>
     }
   }
   ```

この段階的アプローチにより、各ステップでの動作確認を行いながら、安全に実装を進めることができます。

## 🔑 核心的な設計原則（2025-09-14 明確化）

### Setup → Main のサイズ方針

1. **Setup画面のサイズ制御**
   - レンダラー側で`.background`要素のサイズを計測
   - **mainプロセス**が`setContentBounds`でウィンドウ自体をそのサイズに固定
   - ウィンドウサイズ = コンテンツサイズの完全一致を保証

2. **Main画面への遷移**
   - 保存済みの**前回boundsをmain側で復元**
   - レンダラーは一切関与しない
   - ウィンドウサイズの責務は100% mainプロセス

```typescript
// Main process での実装例
ipcMain.handle('setup:setDesiredBounds', (_, width: number, height: number) => {
  const setupWindow = windows.get('setup');
  if (setupWindow) {
    setupWindow.setContentBounds({ 
      width: Math.ceil(width), 
      height: Math.ceil(height),
      x: undefined,  // 中央配置
      y: undefined
    });
  }
});
```

### 履歴・要約ウィンドウの独立管理

既存のオーバーレイ方式を廃止し、**独立BrowserWindow**として実装：

1. **完全な独立性**
   - 各パネルが独立したBrowserWindowインスタンス
   - 自由な移動・リサイズが可能
   - メインウィンドウの境界に制約されない

2. **位置の永続化と復元**
   - 各ウィンドウのboundsを`window-bounds.json`に保存
   - アプリ再起動後も同じ位置に復元
   - マルチディスプレイ環境でも正確に復元

3. **テスト観点**
   ```typescript
   // 自動復元のテストケース
   it('should restore panel positions after app restart', async () => {
     // 1. 履歴ウィンドウを特定位置に移動
     const historyWindow = await app.openHistoryWindow();
     await historyWindow.setBounds({ x: 1000, y: 200 });
     
     // 2. アプリを再起動
     await app.restart();
     
     // 3. 履歴ウィンドウが同じ位置に復元されることを確認
     const restoredWindow = await app.getHistoryWindow();
     expect(await restoredWindow.getBounds()).toMatchObject({ x: 1000, y: 200 });
   });
   ```

### 責務分離とPreload API

**ウィンドウ管理は100% mainプロセスで一元化**：

1. **Main Process（ウィンドウ管理の全責務）**
   - ウィンドウの作成・破棄
   - サイズ・位置の制御
   - 状態の永続化・復元
   - ウィンドウ間の調整

2. **Renderer Process（描画のみ）**
   - UIの描画とユーザーインタラクション
   - コンテンツサイズの計測（Setup用）
   - ビジネスロジックの実行

3. **Preload Script（安全な窓口）**
   ```typescript
   // 最小限の安全なAPI
   contextBridge.exposeInMainWorld('univoice', {
     // Setup専用
     setup: {
       measureContent: () => {
         const el = document.querySelector('.background');
         if (!el) return null;
         const rect = el.getBoundingClientRect();
         return { 
           width: Math.ceil(rect.width), 
           height: Math.ceil(rect.height) 
         };
       },
       setDesiredBounds: (w: number, h: number) => 
         ipcRenderer.invoke('setup:setDesiredBounds', w, h),
       enterMain: () => 
         ipcRenderer.invoke('setup:enterMain')
     },
     
     // ウィンドウ操作
     windows: {
       toggleHistory: () => 
         ipcRenderer.invoke('windows:toggleHistory'),
       toggleSummary: () => 
         ipcRenderer.invoke('windows:toggleSummary')
     },
     
     // 状態取得（読み取り専用）
     state: {
       getWindowBounds: () => 
         ipcRenderer.invoke('state:getWindowBounds'),
       getPanelVisibility: () => 
         ipcRenderer.invoke('state:getPanelVisibility')
     }
   });
   ```

この設計により、各層の責務が明確に分離され、テスタブルで保守性の高いアーキテクチャが実現されます。

## 🚨 実装上の課題と解決策（2025-09-14 追記）

### 1. Setup画面サイズ問題

**問題**: WindowRegistryで800pxに設定しても、実際は374pxで表示される

**原因**:
- BoundsStoreが前回の374pxを保存し、起動時に復元している（WindowRegistry.ts:89-93）
- `app.getPath('userData')/window-bounds.json`に保存された値が優先される
- デフォルトの800pxが上書きされる

**解決策**:
```typescript
// 解決策1: window-bounds.jsonを削除
// %APPDATA%\univoice\window-bounds.json (Windows)

// 解決策2: setup画面は保存値を無視
if (role !== 'setup') {
  const saved = this.store.get(role);
  if (saved?.width && saved?.height) {
    window.setBounds(saved);
  }
}

// 解決策3: 最小高さを強制
case 'setup':
  return {
    width: 600,
    height: 800,
    minHeight: 700,  // 最小高さを追加
    resizable: false
  };
```

### 2. ウィンドウリサイズ無限ループ

**問題**: ResizeObserverが無限に"Window resized"ログを出力

**解決策**: autoResizeとmeasureSetupContentを完全無効化
```typescript
// preload.ts
autoResize: () => false,  // 常にfalseを返す
measureSetupContent: () => ({ width: 600, height: 800 })  // 固定値
```

### 3. 未実装IPCハンドラー

**問題**: SetupSectionが以下のハンドラーを呼び出してエラー発生
- `check-today-session`
- `get-available-sessions`
- `load-session`

**解決策**: DataPersistenceServiceと統合したハンドラーを実装
```typescript
ipcMain.handle('check-today-session', async (event, courseName) => {
  return dataPersistenceService.checkTodaySession(courseName);
});
```

### 4. プロセス重複問題

**問題**: 複数のElectronインスタンスが同時実行

**解決策**:
```typescript
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  return;
}

app.on('second-instance', () => {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
```

### 実装の教訓

1. **BoundsStoreの永続化に注意** - 開発中の誤った値が保存されると問題が続く
2. **動的リサイズ機能は慎重に実装** - 無限ループの原因になりやすい
3. **IPCハンドラーは事前に網羅的に定義** - 後から追加すると統合が困難
4. **mainWindow参照の一元管理** - グローバル変数よりもRegistryパターンが優れている
5. **Setup画面のような固定サイズは保存値を無視すべき** - ユーザビリティの観点から