# CSS Modules 移行対応表

## 概要
このドキュメントは、UniVoiceコンポーネントのCSS Modules移行における、旧クラス名から新クラス名への対応関係を明確にします。

## 対応表

### テーマクラス
| 旧クラス名 | 新クラス名（推奨） | レガシーマッピング |
|-----------|-------------------|------------------|
| `.glass-light` | `.themeLight` | `.glassLight` |
| `.glass-dark` | `.themeDark` | `.glassDark` |
| `.glass-purple` | `.themePurple` | `.glassPurple` |

### コンポーネントクラス

#### ヘッダー関連
| 旧クラス名 | 新クラス名 | 使用例 |
|-----------|-----------|--------|
| `.header` | `.header` | `styles.header` |
| `.header.glass-light` | `.headerThemeLight` | `styles.headerThemeLight` |
| `.header.glass-dark` | `.headerThemeDark` | `styles.headerThemeDark` |
| `.header.glass-purple` | `.headerThemePurple` | `styles.headerThemePurple` |

#### ボタン関連
| 旧クラス名 | 新クラス名（推奨） | レガシーマッピング |
|-----------|-------------------|------------------|
| `.icon-btn` | `.controlButton` | `.iconBtn` |
| `.icon-btn.active` | `.controlButtonActive` | `.iconBtnActive` |
| `.s-btn` | `.settingButton` | `.sBtn` |
| `.s-btn.active` | `.settingActive` | `.sBtnActive` |

#### 録音インジケーター
| 旧クラス名 | 新クラス名 | 備考 |
|-----------|-----------|------|
| `.recording-indicator-green` | `.recordingIndicator` + テーマ | 録音時間表示 |
| `.recording-dot-green` | `.recordingDot` | 録音状態ドット |
| `.recording-dot-green.paused` | `.recordingDotPaused` | 一時停止状態 |

#### 設定バー
| 旧クラス名 | 新クラス名 | 備考 |
|-----------|-----------|------|
| `.settings-bar` | `.settingsBar` | |
| `.settings-bar.show` | `.settingsVisible` | 表示状態 |
| `.settings-inner` | `.settingsContent` | |
| `.settings-left` | `.settingsGroupLeft` | |
| `.settings-right` | `.settingsGroupRight` | |

#### コンテンツエリア
| 旧クラス名 | 新クラス名 | 備考 |
|-----------|-----------|------|
| `.realtime-section` | `.realtimeArea` | |
| `.question-section` | `.questionArea` | |
| `.minimal-control` | `.headerCompact` | コンパクトヘッダー |

## 実装例

### 1. 基本的な使用
```tsx
import styles from './UniVoice.module.css';

// 旧: className="icon-btn"
// 新: className={styles.controlButton}
```

### 2. テーマ付きクラス
```tsx
// 旧: className={`icon-btn glass-${currentTheme}`}
// 新: className={styles[`controlButton${capitalize(currentTheme)}`]}

// ヘルパー関数
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
```

### 3. 複数クラスの組み合わせ（classnames使用推奨）
```tsx
import classNames from 'classnames';

// 旧: className={`icon-btn ${isActive ? 'active' : ''} glass-${currentTheme}`}
// 新: 
className={classNames(
  styles.controlButton,
  styles[`controlButton${capitalize(currentTheme)}`],
  { [styles.controlButtonActive]: isActive }
)}
```

### 4. 移行期間中の互換性
CSS Modulesファイルには旧クラス名のマッピングが含まれているため、段階的な移行が可能です：

```tsx
// これらは両方とも動作します
className={styles.iconBtn}  // レガシーマッピング
className={styles.controlButton}  // 推奨
```

## 移行手順

1. **バックアップの作成**
   ```bash
   cp src/components/UniVoice.tsx backup/UniVoice_$(date +%y%m%d_%H%M)_before_migration.tsx
   ```

2. **classnamesのインストール**
   ```bash
   npm install classnames
   npm install --save-dev @types/classnames
   ```

3. **段階的な置換**
   - ヘッダー部分から開始
   - 各セクションごとに動作確認
   - 最後にgetLiquidGlassStyles関数を削除

4. **テスト実行**
   ```bash
   npm run test
   npm run build
   ```

## 注意事項

1. **動的クラス名の生成**
   - テンプレートリテラルではなく、ブラケット記法を使用
   - 例: `styles[`controlButton${theme}`]`

2. **TypeScript型安全性**
   - CSS Modulesの型定義が適切に設定されていることを確認
   - `src/types/css-modules.d.ts`が存在すること

3. **パフォーマンス**
   - 不要な再レンダリングを避けるため、classNamesの使用を推奨
   - メモ化が必要な場合はuseMemoを使用

最終更新: 2025-09-13