/**
 * 共通ウィンドウコンポーネントのエクスポート
 * 
 * Clean Architecture:
 * - Barrel export pattern で依存関係を整理
 * - 使用側は個別ファイルではなくこのindexからimport
 */

export { WindowContainer, type WindowContainerProps } from './WindowContainer';
export { WindowHeader, type WindowHeaderProps } from './WindowHeader';
export { BaseButton, type BaseButtonProps } from './BaseButton';
export { DisplayModeButtons, type DisplayModeButtonsProps } from './DisplayModeButtons';
export { ThemeButton, type ThemeButtonProps } from './ThemeButton';
export { FontSizeButtons, type FontSizeButtonsProps } from './FontSizeButtons';
export { CloseButton, type CloseButtonProps } from './CloseButton';
export { ContentArea, type ContentAreaProps } from './ContentArea';