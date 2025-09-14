# UniVoice Window Management Architecture

最終更新: 2025-01-14  
バージョン: 1.0.0  
作成者: Claude Code (Clean Architecture Senior Engineer)

## 📋 概要

本ドキュメントは、UniVoiceアプリケーションにおけるウィンドウ管理の大方針とアーキテクチャ設計を定義します。Clean Architectureの原則に基づき、2024年のElectronベストプラクティスを取り入れた、持続可能で拡張可能な設計を提供します。

## 🎯 設計目標

### 主要目標
1. **責任の明確な分離**: ビジネスロジックとプラットフォーム固有の実装を分離
2. **テスタビリティ**: すべてのウィンドウ操作を抽象化し、完全にテスト可能に
3. **拡張性**: 将来の要件変更に柔軟に対応できる設計
4. **パフォーマンス**: メモリ効率的で高速な画面遷移
5. **ユーザー体験**: 直感的で一貫性のある操作感

### 成功指標
- ウィンドウ遷移時間: < 300ms
- メモリ使用量削減: > 30%（従来比）
- テストカバレッジ: > 90%
- クラッシュ率: < 0.1%

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

## 🚀 実装戦略: Progressive Window Architecture (PWA)

### Phase 1: Single Window with State Transitions (現在)

#### 概要
単一ウィンドウ内で、SetupSectionとMainSectionを切り替える現在の実装を洗練させます。

#### 実装詳細
```typescript
class SingleWindowStrategy implements WindowStrategy {
  async transitionToMain(settings: SessionSettings): Promise<void> {
    // 1. 現在のウィンドウサイズを取得
    const currentBounds = await this.getCurrentBounds();
    
    // 2. 保存されたメインウィンドウサイズを復元
    const savedBounds = await this.stateRepository.getMainWindowBounds();
    
    // 3. アニメーション付きでリサイズ
    await this.animateResize(currentBounds, savedBounds);
    
    // 4. コンテンツを切り替え
    await this.contentManager.switchToMain(settings);
  }
}
```

#### メリット
- 実装がシンプル
- 既存コードへの影響が最小限
- ユーザーにとって予測可能な動作

### Phase 2: WebContentsView Integration (次期)

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

### Phase 3: Adaptive Multi-Window (将来)

#### 概要
ユーザーの設定や使用パターンに基づいて、単一ウィンドウと複数ウィンドウを動的に切り替えます。

#### 実装詳細
```typescript
class AdaptiveWindowStrategy implements WindowStrategy {
  async determineStrategy(): Promise<WindowStrategy> {
    const userPreference = await this.settings.getWindowMode();
    const screenSize = await this.platform.getScreenSize();
    const memoryAvailable = await this.platform.getAvailableMemory();

    // インテリジェントな戦略選択
    if (userPreference === 'multi' && screenSize.width > 1920 && memoryAvailable > 4096) {
      return new MultiWindowStrategy();
    } else if (memoryAvailable > 2048) {
      return new WebContentsViewStrategy();
    } else {
      return new SingleWindowStrategy();
    }
  }
}
```

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

## 🧪 テスト戦略

### 単体テスト

```typescript
describe('SessionTransitionUseCase', () => {
  let useCase: SessionTransitionUseCase;
  let mockWindowManager: jest.Mocked<WindowLifecycle>;
  let mockStateRepository: jest.Mocked<StateRepository>;

  beforeEach(() => {
    mockWindowManager = createMockWindowManager();
    mockStateRepository = createMockStateRepository();
    useCase = new SessionTransitionUseCaseImpl(
      mockWindowManager,
      mockStateRepository,
      createMockAnalytics()
    );
  });

  it('should restore previous window size on session start', async () => {
    const savedBounds = { width: 1200, height: 800, x: 100, y: 100 };
    mockStateRepository.getLastWindowState.mockResolvedValue({
      type: 'main',
      bounds: savedBounds
    });

    await useCase.startMainSession(createTestSettings());

    expect(mockWindowManager.transition).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ bounds: savedBounds })
    );
  });
});
```

### 統合テスト

```typescript
describe('Window Management E2E', () => {
  it('should complete full session transition within 300ms', async () => {
    const app = await launchTestApp();
    const startTime = Date.now();
    
    await app.startSession(testSettings);
    
    const transitionTime = Date.now() - startTime;
    expect(transitionTime).toBeLessThan(300);
    
    const mainWindow = await app.getMainWindow();
    expect(mainWindow.isVisible()).toBe(true);
    expect(mainWindow.getBounds()).toMatchObject(expectedBounds);
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

## 🚦 実装ロードマップ

### 2025 Q1
- [x] アーキテクチャドキュメント作成
- [ ] Phase 1: Single Window改善の実装
- [ ] 単体テストの整備（カバレッジ90%以上）

### 2025 Q2
- [ ] Phase 2: WebContentsView統合の検証
- [ ] パフォーマンステストの実施
- [ ] ベータ版リリース

### 2025 Q3
- [ ] Phase 2の本番リリース
- [ ] ユーザーフィードバックの収集
- [ ] Phase 3の設計開始

### 2025 Q4
- [ ] Phase 3: Adaptive Multi-Windowの実装
- [ ] 全体的な最適化
- [ ] 最終リリース

## 📚 参考資料

- [Electron 30+ WebContentsView Documentation](https://www.electronjs.org/docs/latest/api/web-contents-view)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Electron Best Practices 2024](https://www.electronjs.org/docs/latest/tutorial/best-practices)
- [VSCode Architecture Analysis](https://dev.to/ninglo/vscode-architecture-analysis-electron-project-cross-platform-best-practices-g2j)

---

**このアーキテクチャにより、UniVoiceは技術的優位性とユーザー体験の両立を実現し、持続可能で拡張可能なシステムを構築します。**