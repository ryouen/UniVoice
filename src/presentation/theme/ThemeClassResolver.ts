/**
 * ThemeClassResolver
 * Clean Architecture: Presentation Layer - Theme Resolution
 * 
 * 責務:
 * - テーマに基づいたCSSクラス名の解決
 * - 型安全なクラス名マッピング
 * - 一貫した命名規則の強制
 */

import styles from '../../components/UniVoice.module.css';
import { Theme } from '../../types/univoice.types';

/**
 * CSSモジュールのクラス名定義
 * 型安全性を保証するための明示的な定義
 */
interface ThemeClassMap {
  // Base classes
  app: string;
  header: string;
  settingsBar: string;
  controlButton: string;
  settingButton: string;
  realtimeArea: string;
  questionArea: string;
  
  // Theme-specific classes (consistent naming pattern)
  // Pattern: {component}Theme{Theme}
  appThemeLight: string;
  appThemeDark: string;
  appThemePurple: string;
  
  headerThemeLight: string;
  headerThemeDark: string;
  headerThemePurple: string;
  
  settingsBarThemeLight: string;
  settingsBarThemeDark: string;
  settingsBarThemePurple: string;
  
  controlButtonThemeLight: string;
  controlButtonThemeDark: string;
  controlButtonThemePurple: string;
  
  settingButtonThemeLight: string;
  settingButtonThemeDark: string;
  settingButtonThemePurple: string;
  
  realtimeAreaThemeLight: string;
  realtimeAreaThemeDark: string;
  realtimeAreaThemePurple: string;
  
  questionAreaThemeLight: string;
  questionAreaThemeDark: string;
  questionAreaThemePurple: string;
  
  // Compact variants
  headerCompact: string;
  headerCompactThemeLight: string;
  headerCompactThemeDark: string;
  headerCompactThemePurple: string;
  
  // Special effects
  glassmorphism: string;
  settingsVisible: string;
  controlButtonActive: string;
  settingActive: string;
}

/**
 * テーマクラス解決のための設定
 */
interface ThemeResolverConfig {
  theme: Theme;
  styles: Partial<ThemeClassMap>;
}

/**
 * テーマクラスリゾルバー
 * 単一責任: テーマに基づくCSSクラス名の解決
 */
export class ThemeClassResolver {
  private readonly theme: Theme;
  private readonly styles: Partial<ThemeClassMap>;
  private readonly themeMap = {
    'light': 'Light',
    'dark': 'Dark',
    'purple': 'Purple'
  } as const;

  constructor(config: ThemeResolverConfig) {
    this.theme = config.theme;
    this.styles = config.styles;
  }

  /**
   * コンポーネントのテーマクラスを解決
   * @param component - コンポーネント名 (e.g., 'header', 'settingsBar')
   * @param options - 追加オプション
   * @returns 解決されたクラス名の配列
   */
  public resolveComponentClasses(
    component: keyof Omit<ThemeClassMap, 'glassmorphism' | 'settingsVisible' | 'controlButtonActive' | 'settingActive'>,
    options: {
      includeBase?: boolean;
      additionalClasses?: string[];
      compact?: boolean;
    } = {}
  ): string[] {
    const { includeBase = true, additionalClasses = [], compact = false } = options;
    const classes: string[] = [];

    // Base class
    if (includeBase) {
      const baseKey = compact && component === 'header' ? 'headerCompact' : component;
      const baseClass = this.styles[baseKey as keyof ThemeClassMap];
      if (baseClass) {
        classes.push(baseClass);
      }
    }

    // Theme-specific class
    const themeSuffix = this.themeMap[this.theme];
    const themeKey = compact && component === 'header' 
      ? `headerCompactTheme${themeSuffix}` as keyof ThemeClassMap
      : `${component}Theme${themeSuffix}` as keyof ThemeClassMap;
    
    const themeClass = this.styles[themeKey];
    if (themeClass) {
      classes.push(themeClass);
    } else if (process.env.NODE_ENV === 'development') {
      console.warn(`Theme class not found: ${themeKey}`);
    }

    // Additional classes
    classes.push(...additionalClasses.filter(Boolean));

    return classes;
  }

  /**
   * 特殊効果クラスを取得
   */
  public getEffectClass(effect: 'glassmorphism' | 'settingsVisible' | 'controlButtonActive' | 'settingActive'): string | undefined {
    return this.styles[effect];
  }

  /**
   * 現在のテーマを取得
   */
  public getTheme(): Theme {
    return this.theme;
  }

  /**
   * 新しいテーマでリゾルバーを作成
   */
  public withTheme(theme: Theme): ThemeClassResolver {
    return new ThemeClassResolver({ theme, styles: this.styles });
  }
}

/**
 * ファクトリー関数
 */
export function createThemeClassResolver(theme: Theme): ThemeClassResolver {
  return new ThemeClassResolver({ theme, styles: styles as Partial<ThemeClassMap> });
}