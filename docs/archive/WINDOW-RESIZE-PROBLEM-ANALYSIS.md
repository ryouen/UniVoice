# ウィンドウリサイズ問題の構造的分析

## 作成日: 2025-09-16
## 作成者: Claude Code (DEEP THINK mode)

---

## 1. 問題の症状（ユーザー報告）

### 正常に動作している部分
- ✅ 音声認識機能が復活
- ✅ 起動時のサイズと起動→メインセッション移行

### 問題のある動作
1. **セクショントグル時の意図しないリサイズ**
   - 設定ボタン、質問ボタンを押すとウィンドウ全体のサイズが変わる
   - 期待：リアルタイムエリアのサイズは固定されるべき

2. **初回起動時のレイアウト問題**
   - 質問エリアがリアルタイムエリアを圧迫する

3. **Setup画面のサイズ異常（374px問題）**
   - Ctrl+Shift+Rでの強制更新後、Setup画面が前回のメイン画面のサイズで表示
   - リサイズも不可能
   - セッション開始すると、一瞬メイン画面に行くがすぐSetup画面に戻る

---

## 2. 真の原因（構造分析結果）

### 2.1 window-bounds.jsonの不正データ
```json
{
  "setup": {
    "width": 1327,
    "height": 291,  // ← 374px問題の原因
  }
}
```

**問題点**：
- BoundsStore/WindowRegistryの設計では、setup画面は保存されないはず
- しかし実際には保存されており、異常に低い高さ（291px）が記録されている
- この値が次回起動時に適用される

### 2.2 無効化されたAPIを呼び出している
```typescript
// electron/main.ts
ipcMain.handle('window:autoResize', async () => {
  // COMPLETELY DISABLED to prevent infinite loops
  return false;
});

// 調査結果: src/components/UniVoice.tsxにはautoResize呼び出しが存在しない
// つまり、セクション切替時のリサイズは別の原因による可能性が高い
```

**問題点**：
- autoResize APIは無限ループ防止のため完全に無効化されている
- しかし、実際にはフロントエンドからの呼び出しは見つからない
- **真の問題**: セクショントグル時のリサイズは、CSSやReactのレイアウト変更が原因の可能性

### 2.3 Setup→Main遷移の不完全な実装
```typescript
// WindowRegistry.ts
reuseSetupAsMain(): void {
  // setupウィンドウをmainとして再利用
  this.windows.set('main', setup);
  this.windows.delete('setup');
  
  // bounds永続化を再設定
  this.setupBoundsPersistence(setup, 'main');
}
```

**問題点**：
- setupウィンドウをmainとして再利用する際、bounds永続化が再設定される
- しかし、なぜかsetup画面のboundsも保存されてしまっている

---

## 3. 根本原因の仮説

### 仮説1: WindowRegistryのバグ
setupBoundsPersistence()が誤ってsetup画面にも適用されている可能性：
- createOrShow()内でロール判定前にbounds永続化が設定されている？
- reuseSetupAsMain()実行前にすでにbounds保存が有効になっている？

### 仮説2: 過去のバージョンの残骸
window-bounds.jsonに残っている"setup"エントリは：
- 過去のバージョンで保存されたもの？
- 現在のコードでは削除されない？

### 仮説3: リサイズモードの混乱
ResizeMode（USER_DRAG, SECTION_TOGGLE）の管理が不適切：
- ユーザーのウィンドウドラッグとセクショントグルが区別できていない
- 両方のイベントが同時に発火して競合状態を引き起こしている？

---

## 4. 解決策の提案

### 短期的解決策（即効性重視）

1. **window-bounds.jsonのクリーンアップ**
   ```typescript
   // BoundsStore.load()に追加
   if (parsed.windows.setup) {
     delete parsed.windows.setup;  // setup画面のデータは強制削除
   }
   ```

2. **autoResize APIの再有効化（条件付き）**
   ```typescript
   ipcMain.handle('window:autoResize', async (_event, height: number) => {
     const mainWindow = windowRegistry.get('main');
     if (!mainWindow || mainWindow.isDestroyed()) return false;
     
     // main画面のみリサイズを許可
     const role = windowRegistry.getRoleForWindow(mainWindow);
     if (role !== 'main') return false;
     
     // 妥当な範囲内でのみリサイズ
     const MIN_HEIGHT = 200;
     const MAX_HEIGHT = 1200;
     const safeHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height));
     
     mainWindow.setBounds({ height: safeHeight });
     return true;
   });
   ```

3. **Setup画面の強制サイズ設定**
   ```typescript
   // WindowRegistry.createOrShow()に追加
   if (role === 'setup') {
     window.setResizable(false);
     window.setMinimumSize(600, 800);
     window.setMaximumSize(600, 800);
     window.setBounds({ width: 600, height: 800 });
   }
   ```

### 長期的解決策（根本解決）

1. **ウィンドウサイズ管理の再設計**
   - セクショントグル時：リアルタイムエリアのサイズを固定
   - ウィンドウ全体のリサイズ：リアルタイムエリアが伸縮
   - 最小サイズの保証：各セクションが圧迫されない

2. **Setup/Main画面の分離**
   - 再利用ではなく、別ウィンドウとして管理
   - 明確な状態遷移とクリーンアップ

3. **ResizeModeの廃止**
   - 複雑なモード管理をやめ、シンプルなルールベースに

---

## 5. 実装優先順位

1. ✅ **完了**: window-bounds.jsonのsetupエントリ削除
2. ✅ **完了**: Setup画面の固定サイズ強制
3. ✅ **完了**: CSS原因のリサイズ問題修正（min-height: 100vh削除）
4. 🔵 **長期**: ウィンドウ管理の根本的再設計

---

## 5.5. 実装された修正の詳細（2025-09-16）

### CSS原因のリサイズ修正
UniVoice.module.css の分析により、以下の問題を発見・修正：

1. **重複する`.app`クラス定義の統合**
   - 71-80行目と138-144行目に重複定義があった
   - 統合して単一の定義に

2. **`min-height: 100vh`の削除**
   - ビューポート高さ100%の最小高さ指定がウィンドウリサイズを引き起こしていた
   - デスクトップアプリケーションでは不適切

3. **修正後の`.app`クラス**
   ```css
   .app {
     /* フォント設定はそのまま維持 */
     width: 100%;
     height: auto;
     display: flex;
     flex-direction: column;
     /* min-height: 100vh は削除 */
   }
   ```

---

## 6. リスクと対策

### リスク
1. autoResize再有効化による無限ループの可能性
2. 既存のwindow-bounds.jsonを持つユーザーへの影響
3. Setup→Main遷移時の画面のちらつき

### 対策
1. デバウンス処理とフラグ管理で無限ループを防止
2. マイグレーションコードで既存データをクリーンアップ
3. 遷移アニメーションで視覚的な違和感を軽減