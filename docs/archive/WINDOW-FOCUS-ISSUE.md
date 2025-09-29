# ウィンドウフォーカス問題の解決策（2025-09-20）

## 問題の説明
UniVoiceアプリを操作後、他のウィンドウ（メモ帳など）にクリックでフォーカスを移せない。Alt+Tabでの切り替えは正常に動作する。

## ✅ 実装済みの解決策（2025-09-20）

## 原因の可能性

### 1. 透過ウィンドウの設定
- `transparent: true` と `frame: false` の組み合わせ
- Windows環境での既知の問題

### 2. ドラッグ領域の設定
- `-webkit-app-region: drag` が広範囲に適用されている
- クリックイベントが正しく処理されない

### 3. z-indexの競合
- 高いz-index値（10002など）が設定されている
- ウィンドウ階層に影響を与えている可能性

## 解決策

### 1. Electronウィンドウオプションの調整
```typescript
// electron/main.ts
const mainWindow = new BrowserWindow({
  // ...
  transparent: true,
  frame: false,
  // 以下を追加
  skipTaskbar: false,
  focusable: true,
  // Windows特有の設定
  ...(process.platform === 'win32' && {
    type: 'normal', // 'toolbar'から変更
  })
});
```

### 2. フォーカス制御の改善
```typescript
// クリック時にフォーカスを明示的に設定
mainWindow.on('blur', () => {
  // ウィンドウがフォーカスを失った時の処理
});
```

### 3. CSSの調整
- 不要な`pointer-events: none`を削除
- ドラッグ領域を最小限に制限

## 一時的な回避策
- Alt+Tabで他のウィンドウに切り替える
- 最前面固定を一時的に解除する

## 根本的な解決
Electron v24以降では、この問題に対する改善が含まれているため、Electronのバージョンアップを検討。

## ✅ 実装済みの解決策（2025-09-20）

### 1. フォーカスイベントハンドラー
```typescript
// electron/main.ts
mainWindow.on('blur', () => {
  if (process.platform === 'win32') {
    mainWindow.blur();
  }
});

mainWindow.on('focus', () => {
  if (process.platform === 'win32') {
    mainWindow.focus();
  }
});
```

### 2. ドラッグ領域の最小化
```css
/* UniVoice.module.css */
.header {
  /* -webkit-app-region: drag; を削除 */
}

.dragHandle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  -webkit-app-region: drag;
  z-index: -1;
}
```

### 3. Windowsプラットフォーム固有の設定
```typescript
// electron/main.ts
const baseOptions = {
  focusable: true,
  ...(isWindows ? {
    type: 'normal',
    skipTaskbar: false,
    hasShadow: true
  } : {}),
};
```

### 4. カスタムドラッグハンドラー
- `window:startDrag`と`window:endDrag`イベントをIPC経由で実装
- ドラッグ終了時にフォーカスを適切に解放

これらの実装により、透過ウィンドウでもWindows環境でのフォーカス問題が解決されました。