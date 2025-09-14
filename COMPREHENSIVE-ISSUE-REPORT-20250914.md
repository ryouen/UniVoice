# UniVoice 2.0 包括的問題レポート
*作成日: 2025-09-14*

## 🔴 エグゼクティブサマリー

UniVoice 2.0は現在、複数の実装上の問題により正常に動作していません。主な問題は以下の通りです：

1. **Setup画面のサイズ問題**: 設定した800pxではなく374pxで表示
2. **未実装のIPCハンドラー**: セッション管理関連の機能が未実装
3. **ウィンドウの透明度設定**: デバッグのため一時的に無効化されている
4. **プロセス管理**: 複数のElectronプロセスが実行されている

## 📊 現在の状態分析

### 1. Setup画面のサイズ問題

**現状**: 
- 期待値: 600x800px
- 実際: 600x374px

**原因**:
1. BoundsStoreが前回の374pxを保存・復元している（WindowRegistry.ts:89-93）
2. `window-bounds.json`に保存された値が優先されている
3. デフォルトの800pxが適用されていない

**該当コード**:
```typescript
// WindowRegistry.ts line 66
transparent: false, // 一時的に透明を無効化（JavaScriptエラーのデバッグ用）

// SetupSection.tsx lines 124-129
case 'setup':
  return {
    width: 600,    // 縦長のレイアウトに適した幅
    height: 800,   // 十分な高さを確保
    resizable: false,
    center: true,
    title: 'UniVoice - Setup'
  };
```

### 2. 未実装のIPCハンドラー

**欠落しているハンドラー**:
- `check-today-session`: 当日のセッション確認
- `get-available-sessions`: 利用可能なセッション一覧取得
- `load-session`: セッションデータの読み込み

**影響**: SetupSectionの以下の機能が動作しない
- 過去のセッションから選択
- 今日のセッションの確認
- セッションデータの統合

### 3. ウィンドウ管理の問題

**プロセス状態**:
```
electron.exe (36404) - 109MB
electron.exe (32868) - 141MB
electron.exe (47532) - 53MB
electron.exe (42844) - 109MB
electron.exe (50500) - 79MB
```

**問題**: 複数のElectronインスタンスが同時実行されている

### 4. 実装の不整合

**実装率**: 全体で50%（2025-09-10時点）
- リアルタイム機能: 100% ✅
- プログレッシブ要約: 70% 🟨
- 最終成果物: 0% ❌

## 🔧 解決策と実装計画

### Phase 1: 即座に修正すべき項目（1-2時間）

#### 1.1 Setup画面のサイズ修正

```typescript
// 解決策1: window-bounds.jsonを削除
// %APPDATA%\univoice\window-bounds.json (Windows)
// ~/Library/Application Support/univoice/window-bounds.json (macOS)

// 解決策2: WindowRegistry.ts:89付近を修正
// setup画面の場合は保存値を無視
if (role !== 'setup') {
  const saved = this.store.get(role);
  if (saved?.width && saved?.height) {
    const validBounds = this.ensureOnScreen(saved);
    window.setBounds(validBounds);
  }
}

// 解決策3: setup画面に最小高さを強制
case 'setup':
  return {
    width: 600,
    height: 800,
    minHeight: 700,  // 最小高さを追加
    resizable: false,
    center: true,
    title: 'UniVoice - Setup'
  };
```

#### 1.2 プロセスクリーンアップ

```typescript
// main.ts に追加
app.on('second-instance', () => {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// 起動時のプロセスチェック強化
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  return;
}
```

### Phase 2: IPCハンドラーの実装（2-3時間）

#### 2.1 セッション管理ハンドラー

```typescript
// main.ts に追加
ipcMain.handle('check-today-session', async (event, courseName: string) => {
  try {
    const result = await dataPersistenceService.checkTodaySession(courseName);
    return result;
  } catch (error) {
    mainLogger.error('Failed to check today session', { error });
    return { exists: false };
  }
});

ipcMain.handle('get-available-sessions', async (event, options: { limit?: number }) => {
  try {
    const sessions = await dataPersistenceService.getAvailableSessions(options.limit || 100);
    return sessions;
  } catch (error) {
    mainLogger.error('Failed to get available sessions', { error });
    return [];
  }
});

ipcMain.handle('load-session', async (event, params: { courseName: string; dateStr: string; sessionNumber: number }) => {
  try {
    const sessionData = await dataPersistenceService.loadSession(params);
    return sessionData;
  } catch (error) {
    mainLogger.error('Failed to load session', { error });
    return null;
  }
});
```

#### 2.2 DataPersistenceServiceの拡張

```typescript
// DataPersistenceService.ts に追加
async checkTodaySession(courseName: string): Promise<{ exists: boolean; sessionNumber?: number }> {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const sessionFolder = `${today}_第*回`;
  
  try {
    const coursePath = path.join(this.dataPath, courseName);
    const folders = await fs.readdir(coursePath);
    const todayFolders = folders.filter(f => f.startsWith(today));
    
    if (todayFolders.length > 0) {
      const match = todayFolders[0].match(/第(\d+)回/);
      return {
        exists: true,
        sessionNumber: match ? parseInt(match[1]) : 1
      };
    }
  } catch (error) {
    this.logger.error('Failed to check today session', { error });
  }
  
  return { exists: false };
}
```

### Phase 3: SetupSectionの有効化（1時間）

```typescript
// SetupSection.tsx の該当部分のコメントを解除
useEffect(() => {
  const loadData = async () => {
    // 既存のコード...
    
    // Electronからセッションデータを取得して統合
    try {
      if (window.electron?.invoke) {
        const sessions = await window.electron.invoke('get-available-sessions', { limit: 100 });
        if (sessions && sessions.length > 0) {
          // セッションデータをコースメタデータに統合
          sessions.forEach((session: any) => {
            const existing = courseData.find(c => c.name === session.courseName);
            if (!existing) {
              courseData.push({
                id: `session_${Date.now()}_${Math.random()}`,
                name: session.courseName,
                lastUsed: new Date(session.sessions?.[0]?.date || Date.now()),
                isPinned: false,
                labels: [],
                sessionCount: session.sessions?.length || 0
              });
            } else if (existing.sessionCount !== undefined) {
              existing.sessionCount = session.sessions?.length || 0;
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load sessions from electron:', error);
    }
    
    setCourses(courseData);
    // 既存のコード...
  };
  
  loadData();
}, []);
```

### Phase 4: UI/UXの改善（2-3時間）

1. **エラーハンドリングの強化**
   - IPCエラーの適切な表示
   - ユーザーへのフィードバック改善

2. **ローディング状態の追加**
   - セッション読み込み中の表示
   - 非同期処理のインジケーター

3. **レスポンシブデザインの改善**
   - 画面サイズに応じた調整
   - スクロール領域の最適化

## 📋 チェックリスト

- [ ] WindowRegistry.tsの透明度設定を修正
- [ ] Setup画面の最小高さを設定
- [ ] 重複プロセスの防止処理を追加
- [ ] check-today-sessionハンドラーを実装
- [ ] get-available-sessionsハンドラーを実装
- [ ] load-sessionハンドラーを実装
- [ ] DataPersistenceServiceを拡張
- [ ] SetupSectionのコメントアウトを解除
- [ ] エラーハンドリングを改善
- [ ] ローディング状態を追加
- [ ] 統合テストを実施

## 🚀 推奨される実装順序

1. **Day 1 (今日)**:
   - プロセスクリーンアップ
   - Setup画面のサイズ修正
   - 基本的なIPCハンドラー実装

2. **Day 2**:
   - DataPersistenceService拡張
   - SetupSection有効化
   - 統合テスト

3. **Day 3**:
   - UI/UX改善
   - エラーハンドリング
   - 最終テスト

## 📊 期待される成果

実装完了後：
- Setup画面が正しいサイズ（600x800）で表示
- 過去のセッションが正しく読み込まれる
- 当日のセッション確認が機能する
- エラーが適切にハンドリングされる
- ユーザー体験が大幅に改善される

---

*このレポートは2025-09-14時点の調査結果に基づいています。*
*実装の際は、最新のコードベースとの整合性を確認してください。*