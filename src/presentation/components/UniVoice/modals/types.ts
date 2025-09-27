/**
 * Modal Component Types
 * モーダルコンポーネントの共通型定義
 */

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface Memo {
  id: string;
  timestamp: string;
  sourceText: string;
  targetText: string;
}