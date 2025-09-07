/**
 * EmptyState - 空状態表示コンポーネント
 * 
 * 責任:
 * - 履歴が空の場合のメッセージ表示
 * - 視覚的なフィードバック
 */

import React from 'react';

export interface EmptyStateProps {
  /**
   * 表示するメッセージ
   */
  message: string;
  
  /**
   * アイコン（オプション）
   */
  icon?: string;
  
  /**
   * カスタムスタイル
   */
  style?: React.CSSProperties;
}

/**
 * 空状態表示
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon = '📝',
  style = {}
}) => {
  return (
    <div style={{ 
      textAlign: 'center', 
      color: '#999', 
      padding: '40px 20px',
      fontSize: '14px',
      ...style
    }}>
      <div style={{
        fontSize: '32px',
        marginBottom: '12px',
        opacity: 0.5
      }}>
        {icon}
      </div>
      <div>{message}</div>
    </div>
  );
};