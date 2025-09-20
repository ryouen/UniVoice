/**
 * Theme Utilities
 * Clean Architecture: Infrastructure Layer
 */

import { Theme } from '../types/univoice.types';
import { THEME_CONFIGS } from '../constants/layout.constants';

/**
 * Generate background gradient based on theme
 */
export const getBackgroundGradient = (theme: Theme): string => {
  switch (theme) {
    case 'light':
      return 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
    case 'dark':
      return 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)';
    case 'purple':
      return 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
    default:
      return 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
  }
};

/**
 * Get theme configuration
 */
export const getThemeConfig = (theme: Theme) => {
  return THEME_CONFIGS[theme] || THEME_CONFIGS.light;
};

/**
 * Generate CSS class names based on theme
 */
export const getThemeClassName = (baseClass: string, theme: Theme): string => {
  return `${baseClass} ${baseClass}--${theme}`;
};

/**
 * Apply theme to document root
 */
export const applyThemeToRoot = (theme: Theme): void => {
  const root = document.documentElement;
  const config = getThemeConfig(theme);
  
  root.style.setProperty('--bg-color', config.backgroundColor);
  root.style.setProperty('--primary-color', config.primaryColor);
  root.style.setProperty('--secondary-color', config.secondaryColor);
  root.style.setProperty('--text-color', config.textColor);
  root.style.setProperty('--border-color', config.borderColor);
};

/**
 * Get contrasting text color for background
 */
export const getContrastColor = (backgroundColor: string): string => {
  // Simple contrast calculation - can be enhanced
  const isDark = backgroundColor.includes('dark') || backgroundColor.includes('#1a');
  return isDark ? '#ffffff' : '#333333';
};