# UniVoice LocalStorage クリアガイド

## 問題の症状
- アプリ起動時にSetup画面が表示されない
- Ctrl+RでリロードしてもSetup画面に戻れない
- 言語設定が空文字で送信される

## 原因
SessionStorageServiceがactiveSessionをlocalStorageに保存し、アプリ起動時に自動復元するため

## 解決方法

### 方法1: Electronアプリ内でクリア（推奨）

1. アプリが起動している状態で**F12**キーを押してDevToolsを開く
2. **Console**タブをクリック
3. 以下のコマンドを入力して実行：

```javascript
// 現在のLocalStorageの内容を確認
console.log('Current localStorage:', {...localStorage});

// UniVoice関連のデータをクリア
localStorage.removeItem('univoice-active-session');
localStorage.removeItem('sourceLanguage');
localStorage.removeItem('targetLanguage');

// 全てクリアする場合
localStorage.clear();

// 確認
console.log('After clear:', {...localStorage});
```

4. アプリを**Ctrl+R**でリロード

### 方法2: 強制Setup画面表示

URLパラメータを使用してSetup画面を強制表示（今後実装予定）：
```
http://localhost:5173/?setup=true
```

### 方法3: アプリケーションデータをリセット

1. アプリを完全に終了
2. 以下のフォルダを削除：
   - Windows: `%APPDATA%\univoice`
   - macOS: `~/Library/Application Support/univoice`
   - Linux: `~/.config/univoice`
3. アプリを再起動

## デバッグ用ログの確認方法

DevToolsのConsoleで以下を確認：
- `[UniVoice] 📱 No active session found, showing Setup screen` - 正常
- `[UniVoice] 🔄 Restored active session from storage` - セッションが復元されている
- `[Main] Starting listening with params` - 言語設定を確認

## 今後の改善案

1. **セッション有効期限の実装**
   - 24時間後に自動的にクリア
   - タイムスタンプをチェック

2. **明示的なリセットボタン**
   - Setup画面へ戻るボタンをUIに追加
   - キーボードショートカット（例：Ctrl+Shift+R）

3. **デバッグモード**
   - `?debug=true`でデバッグ情報表示
   - `?reset=true`で自動リセット