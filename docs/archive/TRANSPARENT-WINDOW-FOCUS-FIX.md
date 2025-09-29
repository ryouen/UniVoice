# Transparent Window Focus Fix Guide
## UniVoice透過ウィンドウのフォーカス問題解決ガイド

### 問題の詳細

**現象**:
- 透過ウィンドウをクリックしてもフォーカスが移らない
- ボタンや入力フィールドが反応しない
- マウスイベントが背後のウィンドウに透過する

**根本原因**:
1. Windowsでは完全透明（#00000000）のピクセルはクリック不可
2. Electronの`transparent: true`設定時の制約
3. CSSのpointer-eventsとz-indexの複雑な相互作用

### 即座の解決策

#### 1. WindowRegistry.tsの修正

```typescript
// electron/main/WindowRegistry.ts
// Line 79を修正
backgroundColor: isTransparent ? '#01000000' : '#ffffff', // 1%の不透明度
```

この変更により、ほとんど見えないがクリック可能な背景になります。

#### 2. クリック可能な背景レイヤーの追加

```css
/* UniVoice.module.cssに追加 */
.clickableLayer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.01); /* ほぼ透明 */
  z-index: -3;
  pointer-events: auto;
  -webkit-app-region: no-drag;
}

/* 既存の.backgroundLayerを修正 */
.backgroundLayer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -2; /* -1から-2に変更 */
  pointer-events: none;
}
```

#### 3. UniVoice.tsxでの実装

```tsx
// UniVoice.tsxのreturn文内、最初に追加
return (
  <>
    {/* クリック可能な透明レイヤー */}
    <div className={styles.clickableLayer} />
    
    {/* グラスモーフィズム用背景 */}
    <div className={styles.backgroundLayer} />
    
    {/* アプリコンテナ */}
    <div ref={appContainerRef} className={classNames(styles.app, getThemeClass('theme', false))} style={{...}}>
      {/* ... */}
    </div>
  </>
);
```

### Windows固有の追加対策

#### WindowRegistry.tsの詳細設定

```typescript
// electron/main/WindowRegistry.ts
// Line 84-98の修正
...(process.platform === 'win32' ? {
  thickFrame: roleDefaults.resizable !== false,
  type: 'toolbar', // 'normal'から'toolbar'に変更
  skipTaskbar: false,
  hasShadow: false,
  backgroundThrottling: false,
  // Windows 11固有の追加設定
  titleBarStyle: 'hidden',
  // ウィンドウのレンダリング最適化
  webPreferences: {
    ...defaults.webPreferences,
    offscreen: false,
    backgroundThrottling: false
  }
} : {})
```

### CSSの最適化

#### pointer-eventsの明示的な制御

```css
/* インタラクティブ要素を明示的にautoに */
.app button,
.app input,
.app textarea,
.app select,
.app a,
.app [role="button"] {
  pointer-events: auto !important;
  position: relative;
  z-index: 1;
}

/* ヘッダーコントロールの最適化 */
.header {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.02); /* 微細な背景 */
}
```

### テスト手順

1. **基本動作確認**:
   - ウィンドウをクリックしてフォーカスが移るか
   - ボタンがクリックできるか
   - 入力フィールドにテキスト入力できるか

2. **透過効果の確認**:
   - グラスモーフィズム効果が維持されているか
   - 背景が適切に透過しているか

3. **パフォーマンス確認**:
   - GPU使用率の確認
   - レンダリングパフォーマンス

### 代替案：部分透過アプローチ

完全な透過を諸める場合の代替案：

```typescript
// メインウィンドウのみ透過を無効化
const isTransparent = role !== 'main';

// または、環境変数で制御
const isTransparent = process.env.ENABLE_TRANSPARENCY !== 'false';
```

### まとめ

透過ウィンドウのフォーカス問題は、Windowsプラットフォームの制約によるものです。
完全透明（#00000000）を避け、微細な不透明度（#01000000）を設定することで、
見た目を維持しながらフォーカス問題を解決できます。