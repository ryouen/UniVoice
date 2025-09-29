# Setup画面が表示されない問題のデバッグガイド

## 問題の症状
- アプリ起動時に直接メイン画面が表示される
- Setup画面（授業選択画面）が表示されない
- 「セッションを開始」ボタンを押しても反応しない

## 根本原因
1. LocalStorageに前回のセッションデータが残っている可能性
2. activeSessionが何らかの方法で自動的に設定されている可能性
3. showSetupの状態管理に問題がある可能性

## デバッグ手順

### 1. ブラウザのコンソールでデバッグログを確認

```javascript
// コンソールで以下を実行してLocalStorageの内容を確認
console.log('Active Session:', localStorage.getItem('univoice-active-session'));
console.log('Source Language:', localStorage.getItem('sourceLanguage'));
console.log('Target Language:', localStorage.getItem('targetLanguage'));
console.log('All localStorage keys:', Object.keys(localStorage));
```

### 2. LocalStorageをクリアする方法

#### 方法A: ブラウザの開発者ツールから
1. F12で開発者ツールを開く
2. Applicationタブを選択
3. 左側のStorage > Local Storageを展開
4. 該当のURLを選択
5. 右クリックして「Clear」を選択

#### 方法B: コンソールから実行
```javascript
// 特定のキーのみクリア
localStorage.removeItem('univoice-active-session');
localStorage.removeItem('sourceLanguage');
localStorage.removeItem('targetLanguage');

// または全てクリア（注意：他のデータも消える）
localStorage.clear();

// クリア後にページをリロード
location.reload();
```

### 3. コード側での問題確認

以下のログが出力されているか確認：
- `[UniVoice] Component mounted:` - showSetupの値を確認
- `[SessionStorageService] Active session loaded:` - 前回のセッションが読み込まれているか

### 4. 期待される動作

1. **アプリ起動時**
   - activeSession: null
   - showSetup: true
   - Setup画面が表示される

2. **セッション開始ボタンクリック時**
   - handleStartSessionが呼ばれる
   - activeSessionが設定される
   - showSetup: false
   - メイン画面に遷移

## 一時的な回避策

UniVoice.tsxの初期化時に強制的にセッションをクリアする：

```typescript
useEffect(() => {
  // デバッグ用：起動時に必ずSetup画面を表示
  sessionStorageService.clearActiveSession();
  setActiveSession(null);
}, []);
```

## 恒久的な解決策

1. セッション有効期限チェックの実装
2. セッション異常終了検出の実装
3. ユーザーが明示的に選択するまでセッションを自動復元しない

詳細は `docs/SESSION-BEHAVIOR-DESIGN.md` を参照。