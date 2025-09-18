# ウィンドウリサイズ動作確認チェックリスト

## 起動前の準備
- [ ] `npm run clean` 実行済み
- [ ] `C:\Users\ryosu\AppData\Roaming\univoice\window-bounds.json` 削除済み
- [ ] `npm run build` 実行済み

## 起動時の確認

### 1. 初回起動（Setup画面）
```bash
npm run electron
```

**確認項目:**
- [ ] Setup画面が表示される
- [ ] ウィンドウサイズが約600x800（または画面サイズに応じた調整サイズ）
- [ ] ウィンドウがリサイズ不可（Setup画面は固定サイズ）
- [ ] DevToolsコンソールに `[WindowRegistry] Setup window size enforced:` ログが出力される

**期待されるログ:**
```
[WindowRegistry] Setup window size enforced: { safeWidth: 600, safeHeight: 800 }
[BoundsStore] Removing invalid setup window data: { x: ..., y: ..., width: ..., height: ... }
```

### 2. セッション開始 → Main画面遷移

**操作:**
1. クラス名を入力
2. 言語を選択（日本語 → 英語など）
3. 「開始」ボタンをクリック

**確認項目:**
- [ ] Main画面に正常に遷移する
- [ ] ウィンドウがリサイズ可能になる
- [ ] 音声認識が開始される

### 3. セクショントグル動作

**操作と確認:**

#### 設定ボタン
- [ ] 設定ボタンをクリック
- [ ] 設定バーが表示/非表示される
- [ ] **ウィンドウ全体のサイズは変わらない**

#### 質問セクション
- [ ] 質問ボタンをクリック
- [ ] 質問エリアが表示/非表示される
- [ ] **ウィンドウ全体のサイズは変わらない**

### 4. リロード動作（Ctrl+R）

**操作:**
1. Main画面でCtrl+Rを押す

**確認項目:**
- [ ] Main画面のまま再表示される（Setup画面に戻らない）
- [ ] ウィンドウサイズが維持される
- [ ] activeSessionが復元される

### 5. window-bounds.json の確認

**確認方法:**
```powershell
type "C:\Users\ryosu\AppData\Roaming\univoice\window-bounds.json"
```

**期待される内容:**
```json
{
  "version": "2.0.0",
  "windows": {
    "main": {
      "x": ...,
      "y": ...,
      "width": ...,
      "height: ...,
      "maximized": false
    }
  }
}
```

**重要:** `"setup"` エントリが存在しないこと

## コンソールログの確認

DevTools (Ctrl+Shift+I) を開いて以下のログを確認:

### 正常なログパターン
```
[UniVoice] Component initialized: { activeSession: {...}, hasActiveSession: true }
[UniVoice] Starting session: { className: "...", sourceLang: "ja", targetLang: "en" }
[WindowRegistry] Setup window size enforced: { safeWidth: 600, safeHeight: 800 }
[BoundsStore] Removing invalid setup window data: ...
```

### エラーログ（あってはいけない）
```
❌ [UniVoice] Failed to start pipeline
❌ TypeError: Cannot read property ... of undefined
❌ ResizeObserver loop limit exceeded
```

## 問題が発生した場合の対処

### Setup画面が374pxで表示される
1. window-bounds.jsonを確認 → setupエントリがあれば削除
2. アプリを再起動

### セクショントグルでウィンドウサイズが変わる
1. DevToolsで`.app`要素のスタイルを確認
2. `min-height: 100vh`が残っていないか確認
3. CSSのビルドが正しく反映されているか確認

### リロードでSetup画面に戻る
1. LocalStorageの`univoice_activeSession`を確認
2. SessionStorageServiceが正しく動作しているか確認

## デバッグモードでの詳細確認

```javascript
// DevToolsコンソールで実行
console.log('=== UniVoice Debug Info ===');
console.log('Window size:', window.innerWidth, 'x', window.innerHeight);
console.log('activeSession:', localStorage.getItem('univoice_activeSession'));
console.log('App element styles:', window.getComputedStyle(document.querySelector('.app')));
console.log('Document height:', document.documentElement.scrollHeight);
```

---

## 結果報告テンプレート

```
【動作確認結果】
実施日時: 2025-09-16 XX:XX

1. Setup画面: [OK/NG]
   - サイズ: XXX x XXX
   - 問題点: 

2. Main画面遷移: [OK/NG]
   - 問題点:

3. セクショントグル: [OK/NG]
   - 設定: [OK/NG]
   - 質問: [OK/NG]
   - 問題点:

4. リロード: [OK/NG]
   - 問題点:

5. window-bounds.json: [OK/NG]
   - setupエントリ: [あり/なし]

【ログ】
（重要なログをペースト）
```