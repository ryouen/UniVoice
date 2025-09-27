/**
 * UniVoiceModals
 * UniVoiceで使用される全てのモーダルコンポーネント群
 */

import React from 'react';

interface Memo {
  id: string;
  timestamp: string;
  sourceText: string;
  targetText: string;
}

interface UniVoiceModalsProps {
  // フルスクリーンモーダル
  showFullscreenModal: boolean;
  modalTitle: string;
  modalContent: string;
  onCloseFullscreen: () => void;
  
  // メモモーダル
  showMemoModal: boolean;
  memoList: Memo[];
  onCloseMemo: () => void;
  onSaveMemoEdit: (memoId: string) => void;
  
  // レポートモーダル
  showReportModal: boolean;
  selectedClass: string | null;
  recordingTime: number;
  summaryOverride?: { sourceText: string; targetText: string };
  onCloseReport: () => void;
  onWordExport: () => void;
  onPDFExport: () => void;
  onNextClass: () => void;
  formatTime: (seconds: number) => string;
}

export const UniVoiceModals: React.FC<UniVoiceModalsProps> = ({
  showFullscreenModal,
  modalTitle,
  modalContent,
  onCloseFullscreen,
  showMemoModal,
  memoList,
  onCloseMemo,
  onSaveMemoEdit,
  showReportModal,
  selectedClass,
  recordingTime,
  summaryOverride,
  onCloseReport,
  onWordExport,
  onPDFExport,
  onNextClass,
  formatTime
}) => {
  return (
    <>
      {/* フルスクリーンモーダル */}
      {showFullscreenModal && (
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
              onClick={onCloseFullscreen}
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
            <h2 style={{ marginBottom: '20px', color: '#333' }}>{modalTitle}</h2>
            <div dangerouslySetInnerHTML={{ __html: modalContent }} />
          </div>
        </div>
      )}
      
      {/* メモモーダル */}
      {showMemoModal && (
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
                onClick={onCloseMemo}
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
                      defaultValue={memo.sourceText}
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
                      defaultValue={memo.targetText}
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
                      onClick={() => onSaveMemoEdit(memo.id)}
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
      )}
      
      {/* レポートモーダル */}
      {showReportModal && (
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
            overflowY: 'auto'
          }}>
            <button
              onClick={onCloseReport}
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
            <div style={{ marginBottom: '20px' }}>
              <strong>{selectedClass}</strong><br/>
              <span>録音時間: {formatTime(recordingTime)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div>
                <h3>Source Text Summary</h3>
                <p style={{ lineHeight: '1.8' }}>
                  {summaryOverride?.sourceText || 'No summary available yet. Recording will generate a summary after 10 minutes.'}
                </p>
              </div>
              <div>
                <h3>Target Text Summary</h3>
                <p style={{ lineHeight: '1.8' }}>
                  {summaryOverride?.targetText || '要約はまだありません。録音開始10分後に要約が生成されます。'}
                </p>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3>メモ ({memoList.length}件)</h3>
              {memoList.slice(0, 3).map(memo => (
                <div key={memo.id} style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>{memo.timestamp}</span>
                  <div>{memo.sourceText}</div>
                </div>
              ))}
            </div>
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
      )}
    </>
  );
};