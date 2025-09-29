# CSS Refactoring Proposal
## UniVoice CSS Modulesリファクタリング提案

### 目的

1. CSSクラス名の一貫性を確保
2. テーマ切り替えロジックの簡素化
3. 保守性と拡張性の向上
4. TypeScriptの型安全性を活用

### 現状の問題点

```typescript
// 現在のgetThemeClass関数の複雑さ
const getThemeClass = (base: string, includeBase: boolean = true) => {
  // 特殊ケースの処理
  if (base === 'button') { ... }
  
  // 条件分岐の複雑さ
  const themeClassName = base.endsWith('theme') || base === 'theme' 
    ? `${base}${themeSuffix}`
    : `${base}Theme${themeSuffix}`;
  
  // includeBaseパラメータの処理
  return includeBase ? classNames(styles[base], themeClass) : themeClass;
};
```

### 提案：デザイントークンシステム

#### 1. CSS変数を使用したテーマシステム

```css
/* design-tokens.css */
:root {
  /* Light Theme */
  --theme-light-bg: rgba(255, 255, 255, 0.95);
  --theme-light-text: #333333;
  --theme-light-border: rgba(0, 0, 0, 0.06);
  --theme-light-button-bg: rgba(0, 0, 0, 0.06);
  --theme-light-button-hover: rgba(0, 0, 0, 0.1);
  
  /* Dark Theme */
  --theme-dark-bg: rgba(30, 30, 30, 0.95);
  --theme-dark-text: rgba(255, 255, 255, 0.95);
  --theme-dark-border: rgba(255, 255, 255, 0.06);
  --theme-dark-button-bg: rgba(255, 255, 255, 0.1);
  --theme-dark-button-hover: rgba(255, 255, 255, 0.2);
  
  /* Purple Theme */
  --theme-purple-bg: rgba(120, 70, 180, 0.95);
  --theme-purple-text: #ffffff;
  --theme-purple-border: rgba(255, 255, 255, 0.1);
  --theme-purple-button-bg: rgba(255, 255, 255, 0.2);
  --theme-purple-button-hover: rgba(255, 255, 255, 0.3);
}

/* テーマ切り替え用クラス */
.theme-light {
  --bg: var(--theme-light-bg);
  --text: var(--theme-light-text);
  --border: var(--theme-light-border);
  --button-bg: var(--theme-light-button-bg);
  --button-hover: var(--theme-light-button-hover);
}

.theme-dark {
  --bg: var(--theme-dark-bg);
  --text: var(--theme-dark-text);
  --border: var(--theme-dark-border);
  --button-bg: var(--theme-dark-button-bg);
  --button-hover: var(--theme-dark-button-hover);
}

.theme-purple {
  --bg: var(--theme-purple-bg);
  --text: var(--theme-purple-text);
  --border: var(--theme-purple-border);
  --button-bg: var(--theme-purple-button-bg);
  --button-hover: var(--theme-purple-button-hover);
}
```

#### 2. コンポーネントスタイルの簡素化

```css
/* UniVoice.module.css */
.app {
  /* テーマ変数を使用 */
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.button {
  background: var(--button-bg);
  color: var(--text);
}

.button:hover {
  background: var(--button-hover);
}

/* 特殊なケースのみ個別定義 */
.header {
  background: linear-gradient(135deg, var(--bg), var(--bg));
}
```

#### 3. TypeScriptの型安全な実装

```typescript
// types/theme.types.ts
export const THEMES = ['light', 'dark', 'purple'] as const;
export type Theme = typeof THEMES[number];

// hooks/useTheme.ts
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('light');
  
  const applyTheme = useCallback((newTheme: Theme) => {
    // ルート要素にテーマクラスを追加
    document.documentElement.className = `theme-${newTheme}`;
    setTheme(newTheme);
  }, []);
  
  return { theme, applyTheme };
};

// components/UniVoice.tsx
const { theme, applyTheme } = useTheme();

// シンプル化された使用方法
return (
  <div className={styles.app}>
    {/* テーマ変数が自動的に適用される */}
    <button className={styles.button}>Click me</button>
  </div>
);
```

### 移行計画

#### Phase 1: 準備（影響なし）
1. design-tokens.cssファイルの作成
2. useThemeフックの実装
3. 既存コードと並行してテスト

#### Phase 2: 段階的移行
1. ボタンコンポーネントから移行開始
2. ヘッダーコンポーネントの移行
3. メインコンテナの移行

#### Phase 3: 旧コードの削除
1. getThemeClass関数の削除
2. 未使用CSSクラスの削除
3. theme.utils.tsの整理

### 予想されるメリット

1. **コードの簡素化**:
   - getThemeClass関数が不要に
   - CSSクラス名の重複が減少

2. **パフォーマンス**:
   - CSS変数はブラウザネイティブで高速
   - テーマ切り替え時の再レンダリングが最小限

3. **保守性**:
   - 新しいテーマの追加が容易
   - デザイントークンの一元管理

4. **開発体験**:
   - CSSとTypeScriptの分離が明確
   - デバッグが容易

### サンプル実装

```typescript
// 完全なボタンコンポーネントの例
import React from 'react';
import styles from './Button.module.css';
import classNames from 'classnames';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  active = false,
  children,
  onClick
}) => {
  return (
    <button
      className={classNames(
        styles.button,
        styles[variant],
        styles[size],
        active && styles.active
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

```css
/* Button.module.css */
.button {
  /* ベーススタイル */
  background: var(--button-bg);
  color: var(--text);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

/* バリアント */
.primary {
  background: var(--primary-bg);
  color: var(--primary-text);
}

.secondary {
  background: var(--secondary-bg);
  color: var(--secondary-text);
}

/* サイズ */
.small {
  padding: 6px 12px;
  font-size: 12px;
}

.medium {
  padding: 10px 18px;
  font-size: 14px;
}

.large {
  padding: 14px 24px;
  font-size: 16px;
}

/* ステート */
.active {
  box-shadow: 0 0 0 2px var(--active-ring);
}
```

### まとめ

このリファクタリング提案は、現在の複雑なCSSクラス名生成ロジックを、
CSS変数を使用したシンプルで保守性の高いシステムに置き換えます。
段階的な移行が可能で、リスクを最小限に抑えながら改善を進められます。