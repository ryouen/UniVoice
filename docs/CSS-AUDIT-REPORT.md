# CSS監査レポート - UniVoice 2.0

## 概要

本レポートは、UniVoiceプロジェクトのCSS管理状況を詳細に分析し、問題点と改善提案をまとめたものです。

調査日: 2025-01-21
調査範囲: /src ディレクトリ内の全CSSファイル

## CSS ファイル一覧と分析

### 1. 大規模ファイル（10KB以上）

#### UniVoice.module.css (32K)
- **パス**: `src/components/UniVoice.module.css`
- **CSS変数定義**: あり（デザインシステム変数追加済み）
- **問題点**: 
  - 2890行のコンポーネントに対して巨大すぎる
  - 多くのスタイルがインラインで定義されており、CSSファイルが活用されていない
  - 新旧のスタイル定義が混在

#### SummaryWindow.module.css (18K)
- **パス**: `src/windows/SummaryWindow.module.css`
- **CSS変数定義**: あり（メインウィンドウと重複）
- **問題点**:
  - メインウィンドウのCSS変数を完全にコピーしている（行7-48）
  - 独自のコンポーネントスタイルも多数定義
  - 677行という大規模なファイル

### 2. 中規模ファイル（1KB-10KB）

#### HeaderControls.module.css
- **パス**: `src/components/UniVoice/Header/HeaderControls/HeaderControls.module.css`
- **CSS変数定義**: なし（親から継承）
- **問題点**: 
  - `.spacer { width: 20px }` がインラインの56pxと競合していた（修正済み）
  - 多くのスタイルがインライン定義に依存

#### globals.css (3.2K)
- **パス**: `src/styles/globals.css`
- **CSS変数定義**: あり（基本的なテーマ変数）
- **内容**: リセットCSS、基本スタイル、スクロールバー設定

#### VoiceLanguageSelector.module.css (2.3K)
- **パス**: `src/components/VoiceLanguageSelector/VoiceLanguageSelector.module.css`
- **CSS変数定義**: なし
- **状態**: 適切に管理されている

### 3. 小規模ファイル（1KB未満）

- QuestionInput.module.css (945B)
- TranslationDisplay.module.css (911B)
- RoleSelector.module.css (684B)
- SessionHistory.module.css (436B)
- VoiceIndicator.module.css (165B)

## 重複するCSS変数定義

### テーマ変数の重複

以下のファイルで同じテーマ変数が定義されています：

1. **UniVoice.module.css**
```css
--theme-light-bg: rgba(255, 255, 255, 0);
--theme-light-button-bg: rgba(0, 0, 0, 0.06);
--theme-light-button-hover: rgba(0, 0, 0, 0.1);
/* ... 他多数 */
```

2. **SummaryWindow.module.css**
```css
/* 完全に同じ定義がコピーされている（行8-26） */
--theme-light-bg: rgba(255, 255, 255, 0);
--theme-light-button-bg: rgba(0, 0, 0, 0.06);
--theme-light-button-hover: rgba(0, 0, 0, 0.1);
/* ... 他多数 */
```

### レイアウト変数の重複

1. **UniVoice.module.css**
```css
/* Layout System Variables - LAYOUT-RULES.mdを参照 */
--button-size: 36px;
--button-gap: 10px;
--edge-margin: 20px;
--group-gap: 56px;
```

2. **SummaryWindow.module.css**
```css
/* 同じ変数が再定義されている（行40-47） */
--button-size: 36px;
--button-gap: 10px;
--edge-margin: 20px;
--group-gap: 56px;
```

## 問題点のまとめ

### 1. CSS変数の重複定義
- 同じCSS変数が複数のファイルで定義されている
- 変更時に複数箇所を更新する必要がある
- 一貫性の欠如リスク

### 2. インラインスタイルとCSSの混在
- UniVoice.tsx: 2890行中、多くのスタイルがインラインで定義
- HeaderControls.tsx: スペーサー幅がインライン(56px)とCSS(20px)で競合
- 保守性の低下

### 3. 巨大なCSSファイル
- UniVoice.module.css: 32KB
- SummaryWindow.module.css: 18KB
- 必要なスタイルを見つけるのが困難

### 4. 命名規則の不統一
- 一部のファイル: kebab-case (voice-language-selector.module.css)
- 他のファイル: PascalCase (UniVoice.module.css)

### 5. 未使用スタイルの蓄積
- 古いコンポーネントのスタイルが残っている可能性
- 定期的なクリーンアップが必要

## 改善提案

### 1. CSS変数の一元管理
```
src/styles/
├── design-tokens.css    # 全てのCSS変数定義
├── globals.css          # リセットCSS、基本スタイル
└── themes/
    ├── light.css        # ライトテーマ変数
    ├── dark.css         # ダークテーマ変数
    └── purple.css       # パープルテーマ変数
```

### 2. コンポーネントスタイルの整理
- 巨大なCSSファイルを機能別に分割
- インラインスタイルをCSS Modulesに移行
- 未使用スタイルの削除

### 3. 共通コンポーネントの作成
```typescript
// src/components/common/Button/Button.tsx
export const Button = ({ variant, size, ...props }) => {
  // 共通ボタンスタイル
};

// src/components/common/Layout/Layout.tsx
export const Layout = ({ spacing, ...props }) => {
  // レイアウト用共通コンポーネント
};
```

### 4. ビルドプロセスの改善
- PostCSSで重複CSS変数を検出
- PurgeCSSで未使用スタイルを削除
- CSS Modulesの型定義自動生成

### 5. スタイルガイドラインの策定
- 命名規則の統一
- CSS変数の使用ルール
- インラインスタイルの使用基準

## 実装優先順位

1. **緊急**: CSS変数の重複を解消（design-tokens.cssに統合）
2. **高**: インラインスタイルのCSS Modules移行
3. **中**: 共通コンポーネントの作成
4. **低**: 未使用スタイルのクリーンアップ

## 結論

現在のCSS管理は、以下の主要な問題を抱えています：

1. **重複**: 同じ定義が複数箇所に存在
2. **混在**: インラインとCSSモジュールの無秩序な使用
3. **肥大化**: 管理不能なサイズのCSSファイル

これらの問題は、デザインシステムの導入と段階的なリファクタリングによって解決可能です。特に、CSS変数の一元管理は最優先で実施すべきです。