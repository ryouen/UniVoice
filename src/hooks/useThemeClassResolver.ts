/**
 * useThemeClassResolver Hook
 * Clean Architecture: Presentation Layer - React Integration
 * 
 * 責務:
 * - ReactコンポーネントでThemeClassResolverを使用するためのフック
 * - テーマ変更時の自動更新
 * - classNamesユーティリティとの統合
 */

import { useMemo } from 'react';
import classNames from 'classnames';
import { Theme } from '../types/univoice.types';
import { createThemeClassResolver, ThemeClassResolver } from '../presentation/theme/ThemeClassResolver';

export interface UseThemeClassResolverReturn {
  /**
   * テーマクラスを解決してclassNames形式で返す
   */
  resolveClasses: (
    component: Parameters<ThemeClassResolver['resolveComponentClasses']>[0],
    options?: Parameters<ThemeClassResolver['resolveComponentClasses']>[1]
  ) => string;
  
  /**
   * 特殊効果クラスを取得
   */
  getEffectClass: (effect: Parameters<ThemeClassResolver['getEffectClass']>[0]) => string | undefined;
  
  /**
   * ThemeClassResolverインスタンスへの直接アクセス
   */
  resolver: ThemeClassResolver;
}

/**
 * テーマクラス解決のためのフック
 * @param theme - 現在のテーマ
 * @returns テーマクラス解決関数
 */
export function useThemeClassResolver(theme: Theme): UseThemeClassResolverReturn {
  const resolver = useMemo(() => createThemeClassResolver(theme), [theme]);

  const resolveClasses = useMemo(
    () => (component: Parameters<typeof resolver.resolveComponentClasses>[0], options?: Parameters<typeof resolver.resolveComponentClasses>[1]) => {
      const classes = resolver.resolveComponentClasses(component, options);
      return classNames(...classes);
    },
    [resolver]
  );

  return {
    resolveClasses,
    getEffectClass: resolver.getEffectClass.bind(resolver),
    resolver
  };
}