/**
 * ClassSelector - 授業選択コンポーネント
 * 
 * 責任:
 * - 授業リストの表示
 * - 選択状態の管理
 * - 選択イベントの通知
 */

import React from 'react';

export interface ClassSelectorProps {
  /**
   * 授業リスト
   */
  classes: string[];
  
  /**
   * 選択中の授業名
   */
  selectedClass: string;
  
  /**
   * 授業選択時のコールバック
   */
  onSelectClass: (className: string) => void;
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({
  classes,
  selectedClass,
  onSelectClass
}) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '15px',
      marginBottom: '30px'
    }}>
      {classes.map((className) => (
        <button
          key={className}
          onClick={() => onSelectClass(className)}
          style={{
            padding: '15px 20px',
            border: '2px solid',
            borderColor: selectedClass === className ? '#667eea' : '#e0e0e0',
            borderRadius: '10px',
            background: selectedClass === className 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'white',
            color: selectedClass === className ? 'white' : '#333',
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontWeight: selectedClass === className ? 'bold' : 'normal'
          }}
          onMouseOver={(e) => {
            if (selectedClass !== className) {
              e.currentTarget.style.borderColor = '#764ba2';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (selectedClass !== className) {
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {className}
        </button>
      ))}
    </div>
  );
};