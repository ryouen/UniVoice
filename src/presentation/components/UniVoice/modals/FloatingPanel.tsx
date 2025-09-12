/**
 * FloatingPanel Component
 * 理想UIのフローティングパネル実装
 * 
 * 機能:
 * - 左右位置指定可能
 * - Liquid Glass効果
 * - アニメーション付き表示/非表示
 * - 既存のHTML content表示をサポート
 */

import React, { useEffect, useState } from 'react';
import { BaseModalProps } from './types';

interface FloatingPanelProps extends BaseModalProps {
  title: string;
  position: 'left' | 'right';
  theme: 'light' | 'dark' | 'purple';
  children?: React.ReactNode;
  htmlContent?: string; // 既存のHTML content互換性のため
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  isOpen,
  onClose,
  title,
  position,
  theme,
  children,
  htmlContent
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // アニメーションのため、少し遅延を入れる
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getGlassStyle = () => {
    const baseStyles = {
      light: {
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        color: '#333'
      },
      dark: {
        background: 'rgba(20, 20, 20, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        color: 'white'
      },
      purple: {
        background: 'rgba(102, 51, 153, 0.95)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        boxShadow: '0 20px 60px rgba(102, 51, 153, 0.3)',
        color: 'white'
      }
    };
    return baseStyles[theme];
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    [position]: '30px',
    transform: `translateY(-50%) ${isVisible ? 'scale(1)' : 'scale(0.95)'}`,
    width: position === 'left' ? '600px' : '500px',
    maxHeight: '70vh',
    borderRadius: '12px',
    padding: '25px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    opacity: isVisible ? 1 : 0,
    transition: 'all 0.3s ease',
    zIndex: 999,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    ...getGlassStyle()
  };

  return (
    <div style={panelStyle}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>{title}</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background 0.2s',
            color: theme === 'light' ? '#666' : 'white'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
          }}
        >
          ×
        </button>
      </div>

      {/* コンテンツエリア */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        paddingRight: '10px'
      }}>
        {/* HTMLコンテンツがある場合は既存の方法で表示 */}
        {htmlContent ? (
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ) : (
          children
        )}
      </div>
    </div>
  );
};