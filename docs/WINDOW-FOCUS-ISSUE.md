# ウィンドウフォーカス問題の解決策（2025-09-20）

## 問題の説明
UniVoiceアプリを操作後、他のウィンドウ（メモ帳など）にクリックでフォーカスを移せない。Alt+Tabでの切り替えは正常に動作する。

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