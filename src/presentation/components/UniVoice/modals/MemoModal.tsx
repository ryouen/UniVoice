/**
 * MemoModal Component
 * メモ一覧モーダル - 保存したメモの表示と編集
 * 
 * 機能:
 * - メモ一覧の表示
 * - メモの編集
 * - 保存機能
 * 
 * Clean Architecture:
 * - プレゼンテーション層
 * - 編集ロジックは親コンポーネントに委譲
 */

import React from 'react';
import { BaseModalProps, Memo } from './types';

interface MemoModalProps extends BaseModalProps {
  memoList: Memo[];
  onSaveMemo: (memoId: string) => void;
}

export const MemoModal: React.FC<MemoModalProps> = ({
  isOpen,
  onClose,
  memoList,
  onSaveMemo
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
        width: '80%',
        maxHeight: '80%',
        borderRadius: '20px',
        overflow: 'hidden'
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0 }}>📝 メモ一覧 ({memoList.length}件)</h2>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
        
        {/* コンテンツ */}
        <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
          {memoList.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>メモがまだありません</p>
          ) : (
            memoList.map(memo => (
              <div key={memo.id} style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 80px',
                gap: '15px',
                padding: '15px',
                marginBottom: '15px',
                background: '#f8f9fa',
                borderRadius: '10px',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#999' }}>{memo.timestamp}</div>
                <textarea
                  id={`${memo.id}-ja`}
                  defaultValue={memo.targetText}
                  style={{
                    padding: '8px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '13px',
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                />
                <textarea
                  id={`${memo.id}-en`}
                  defaultValue={memo.sourceText}
                  style={{
                    padding: '8px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '13px',
                    resize: 'vertical',
                    minHeight: '60px',
                    color: '#0066cc'
                  }}
                />
                <button
                  onClick={() => onSaveMemo(memo.id)}
                  style={{
                    padding: '6px 12px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  保存
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};