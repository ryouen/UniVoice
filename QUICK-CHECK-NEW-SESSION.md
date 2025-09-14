# 🚀 新セッション クイックチェックリスト

## 1️⃣ Setup画面374px問題の原因と解決

**原因**: BoundsStoreが前回の374pxを保存・復元している（WindowRegistry.ts:89-93）

**解決方法**:
```bash
# Windows: %APPDATA%\univoice\window-bounds.json を削除
# macOS: ~/Library/Application Support/univoice/window-bounds.json を削除
```

または

```typescript
// WindowRegistry.ts:89付近を修正
if (role !== 'setup') {  // setup画面は保存値を無視
  const saved = this.store.get(role);
  // ...
}
```

## 2️⃣ 未実装IPCハンドラー（3つ）

- `check-today-session`
- `get-available-sessions`
- `load-session`

main.tsに実装が必要。SetupSection.tsxでコメントアウトされている部分を有効化。

## 3️⃣ プロセス重複防止

```typescript
// main.tsの先頭に追加
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  return;
}
```

## ✅ 解決済み（再作業不要）

- ✅ mainWindow参照エラー（51箇所）→ getMainWindow()で解決済み
- ✅ リサイズ無限ループ → autoResize無効化で解決済み
- ✅ 透明度設定 → 既存設定でOK（変更不要）

---

**最重要**: Setup画面は window-bounds.json の削除が最も確実な解決方法です。