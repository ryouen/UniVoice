# CSS Class Naming Analysis Report
## UniVoice CSS Modules命名規則問題の根本分析

### 発見された問題

#### 1. 命名規則の不統一

**CSS Module定義 (UniVoice.module.css)**:
```css
/* 基本テーマクラス */
.themeLight { ... }    /* line 140 */
.themeDark { ... }     /* line 154 */
.themePurple { ... }   /* line 163 */

/* コンポーネント別テーマクラス */
.headerThemeLight { ... }    /* line 216 */
.buttonLight { ... }         /* line 269 */
.settingsBarThemeDark { ... } /* line 463 */
```

**getThemeClass関数の実装 (UniVoice.tsx:2179)**:
```typescript
const getThemeClass = (base: string, includeBase: boolean = true) => {
  const themeMap: Record<string, string> = {
    'light': 'Light',
    'dark': 'Dark',  
    'purple': 'Purple'
  };
  const themeSuffix = themeMap[currentTheme] || 'Light';
  
  // 新しい統一ボタンシステムの場合
  if (base === 'button') {
    const buttonThemeClass = `button${themeSuffix}`;
    return includeBase ? classNames(styles.button, styles[buttonThemeClass]) : styles[buttonThemeClass];
  }
  
  // 従来のパターン: {base}Theme{suffix}
  const themeClassName = base.endsWith('theme') || base === 'theme' 
    ? `${base}${themeSuffix}`
    : `${base}Theme${themeSuffix}`;
```

**未使用のgetThemeClassName関数 (theme.utils.ts:35)**:
```typescript
export const getThemeClassName = (baseClass: string, theme: Theme): string => {
  return `${baseClass} ${baseClass}--${theme}`; // BEM形式
};
```

### 2. 設計意図の理解

#### なぜgetThemeClass('theme', false)という呼び出しがあるのか

**UniVoice.tsx:2217の呼び出し**:
```typescript
<div ref={appContainerRef} className={classNames(styles.app, getThemeClass('theme', false))} style={{...}}>
```

- `'theme'`というbaseは、アプリ全体の基本テーマを表現
- `includeBase=false`は、基本クラス（styles.theme）を含めず、テーマ固有のクラスのみを適用
- これにより`styles.app`と`styles.themeLight`の2つのクラスが適用される

#### 問題点
1. **命名の一貫性の欠如**: 
   - `buttonLight` vs `headerThemeLight` vs `themeLight`
   - 3つの異なる命名パターンが混在

2. **getThemeClass関数の複雑さ**:
   - 特殊ケース（button）の処理
   - 'theme'で終わるかどうかの条件分岐
   - includeBaseパラメータの必要性

3. **未使用コードの存在**:
   - theme.utils.tsのgetThemeClassName関数が完全に未使用

### 3. 根本的な解決策の提案

#### Option 1: CSS Modules側の統一（推奨）

**統一された命名規則**:
```css
/* 基本テーマ（グローバル適用） */
.theme--light { ... }
.theme--dark { ... }
.theme--purple { ... }

/* コンポーネント別バリアント */
.header--light { ... }
.header--dark { ... }
.button--light { ... }
.button--dark { ... }
```

**シンプル化されたgetThemeClass関数**:
```typescript
const getThemeClass = (component: string, theme: Theme = currentTheme): string => {
  return styles[`${component}--${theme}`] || '';
};

// 使用例
className={classNames(styles.app, getThemeClass('theme'))}
className={classNames(styles.header, getThemeClass('header'))}
className={classNames(styles.button, getThemeClass('button'))}
```

#### Option 2: CSS-in-JSへの移行

CSS Modulesの制約を回避し、より動的なテーマシステムを構築：

```typescript
const useThemeStyles = (component: string) => {
  const theme = useTheme();
  return {
    base: styles[component],
    themed: styles[`${component}--${theme}`],
    combined: classNames(styles[component], styles[`${component}--${theme}`])
  };
};
```

### 4. 透過ウィンドウのフォーカス問題

#### 根本原因

**WindowRegistry.ts:73-98**:
```typescript
const isTransparent = true;
const defaults: Electron.BrowserWindowConstructorOptions = {
  transparent: isTransparent,
  backgroundColor: isTransparent ? '#00000000' : '#ffffff',
  focusable: true,
  acceptFirstMouse: true,
  // Windows固有の設定
  ...(process.platform === 'win32' ? {
    type: 'normal',
    hasShadow: false, // 透過時はシャドウ無効
    backgroundThrottling: false
  } : {})
};
```

#### 問題点
1. **Windowsの透過ウィンドウの制約**:
   - 完全透明（#00000000）の領域はクリックイベントを透過
   - マウスイベントが背後のウィンドウに通過してしまう

2. **CSS層の問題**:
   - グラスモーフィズム効果のためのbackdrop-filterが透過を強化
   - z-indexの複雑な階層構造

#### 解決策

**1. 半透明の背景色を使用**:
```typescript
backgroundColor: '#01000000', // 1%の不透明度でクリック可能に
```

**2. クリック可能な背景レイヤーの追加**:
```css
.clickableBackground {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.01); /* 見えないがクリック可能 */
  z-index: -2;
  pointer-events: auto;
}
```

**3. Electron側の追加設定**:
```typescript
// WindowRegistry.tsに追加
transparent: true,
vibrancy: 'under-window', // macOS
visualEffectState: 'active', // macOS
// Windows固有
...(process.platform === 'win32' ? {
  type: 'toolbar', // 'normal'の代わりに
  skipTaskbar: false,
  thickFrame: true
} : {})
```

### 推奨アクションプラン

1. **即座の対応（フォーカス問題）**:
   - backgroundColor を '#01000000' に変更
   - clickableBackground レイヤーの追加

2. **短期対応（CSS整理）**:
   - 未使用のgetThemeClassName関数を削除
   - getThemeClass関数の簡略化

3. **中長期対応（根本解決）**:
   - CSS Modulesの命名規則統一
   - デザイントークンシステムの導入
   - テーマシステムの再設計