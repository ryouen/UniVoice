/**
 * ReportModal Component
 * 授業レポートモーダル - セッション終了時のレポート表示
 * 
 * 機能:
 * - 要約の表示（英日対比）
 * - メモの表示
 * - エクスポート機能
 * - 次の授業への遷移
 * 
 * Clean Architecture:
 * - プレゼンテーション層
 * - エクスポートロジックは親コンポーネントに委譲
 */

import React from 'react';
import { BaseModalProps, Memo } from './types';

interface ReportModalProps extends BaseModalProps {
  selectedClass: string;
  recordingTime: number;
  summaryEnglish?: string;
  summaryJapanese?: string;
  memoList: Memo[];
  onWordExport: () => void;
  onPDFExport: () => void;
  onNextClass: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  selectedClass,
  recordingTime,
  summaryEnglish,
  summaryJapanese,
  memoList,
  onWordExport,
  onPDFExport,
  onNextClass
}) => {
  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
        maxWidth: '800px',
        maxHeight: '90%',
        borderRadius: '20px',
        padding: '30px',
        overflowY: 'auto',
        position: 'relative'
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
        
        <h1 style={{ marginBottom: '20px', color: '#333' }}>📚 授業レポート</h1>
        
        {/* セッション情報 */}
        <div style={{ marginBottom: '20px' }}>
          <strong>{selectedClass}</strong><br/>
          <span>録音時間: {formatTime(recordingTime)}</span>
        </div>
        
        {/* 要約セクション */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div>
            <h3>English Summary</h3>
            <p style={{ lineHeight: '1.8' }}>
              {summaryEnglish || 'No summary available yet. Recording will generate a summary after 10 minutes.'}
            </p>
          </div>
          <div>
            <h3>日本語要約</h3>
            <p style={{ lineHeight: '1.8' }}>
              {summaryJapanese || '要約はまだありません。録音開始10分後に要約が生成されます。'}
            </p>
          </div>
        </div>
        
        {/* メモセクション */}
        <div style={{ marginBottom: '20px' }}>
          <h3>メモ ({memoList.length}件)</h3>
          {memoList.slice(0, 3).map(memo => (
            <div key={memo.id} style={{ 
              marginBottom: '10px', 
              padding: '10px', 
              background: '#f8f9fa', 
              borderRadius: '6px' 
            }}>
              <span style={{ fontSize: '12px', color: '#999' }}>{memo.timestamp}</span>
              <div>{memo.targetText}</div>
            </div>
          ))}
          {memoList.length > 3 && (
            <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
              他 {memoList.length - 3} 件のメモがあります
            </p>
          )}
        </div>
        
        {/* アクションボタン */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={onWordExport} style={{
            padding: '12px 30px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            📄 Wordでエクスポート
          </button>
          <button onClick={onPDFExport} style={{
            padding: '12px 30px',
            background: 'white',
            color: '#667eea',
            border: '2px solid #667eea',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            📑 PDFでエクスポート
          </button>
          <button onClick={onNextClass} style={{
            padding: '12px 30px',
            background: 'white',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            次の授業へ
          </button>
        </div>
      </div>
    </div>
  );
};