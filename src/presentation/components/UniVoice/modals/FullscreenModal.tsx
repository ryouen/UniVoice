/**
 * FullscreenModal Component
 * 全画面モーダル - 履歴や要約の詳細表示用
 * 
 * 機能:
 * - 全画面表示
 * - HTMLコンテンツの表示
 * - 閉じるボタン
 * 
 * Clean Architecture:
 * - 純粋なプレゼンテーション層
 * - ビジネスロジックなし
 */

import React from 'react';
import { BaseModalProps } from './types';

interface FullscreenModalProps extends BaseModalProps {
  title: string;
  content: string; // HTML content
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  isOpen,
  onClose,
  title,
  content
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        width: '90%',
        height: '90%',
        maxWidth: '1400px',
        borderRadius: '20px',
        padding: '30px',
        position: 'relative',
        overflow: 'auto'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            background: '#f0f0f0',
            fontSize: '24px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>{title}</h2>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};