/**
 * UniVoice Design Tokens
 * 
 * 一貫性のあるレイアウトシステムのための定数定義
 * すべての値は基本単位（ボタンサイズ36px、間隔10px）から導出
 */

export const SPACING = {
  // 基本単位
  edge: 20,           // 画面端からの標準マージン
  gap: 10,            // ボタン間の標準間隔
  groupGap: 56,       // グループ間隔（ボタン1つ分 = 36 + 10×2）
  
  // 特殊な間隔
  themeButtonGap: 56, // 表示モードボタンとテーマボタンの間隔
  sectionGap: 20,     // フォントボタンと▲ボタンの間隔
} as const;

export const SIZES = {
  // ボタンサイズ
  button: {
    width: 36,
    height: 36,
  },
  centerButton: {
    width: 82,   // ボタン2つ分（36×2 + 10）
    height: 36,
  },
  
  // 特殊要素のサイズ
  recordingIndicator: {
    width: 128,  // ボタン3つ分（36×3 + 10×2）
    height: 36,
  },
} as const;

export const POSITIONS = {
  // メイン設定バーの右側ボタン位置
  settingsRightButtons: 112, // 右端から（20 + 36×2 + 10×2）
} as const;

/**
 * レイアウト計算ヘルパー
 */
export const calculateButtonGroupWidth = (buttonCount: number): number => {
  return SIZES.button.width * buttonCount + SPACING.gap * (buttonCount - 1);
};

export const calculateRightPosition = (buttonCount: number): number => {
  return SPACING.edge + calculateButtonGroupWidth(buttonCount);
};

// TypeScript型定義
export type Spacing = typeof SPACING;
export type Sizes = typeof SIZES;
export type Positions = typeof POSITIONS;