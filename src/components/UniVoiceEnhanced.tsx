/**
 * UniVoiceEnhanced - 改善されたUIコンポーネント
 * 
 * 改善点:
 * 1. interim結果を表示しない（finalのみ）
 * 2. 左右同期表示（原文と翻訳が同じ高さ）
 * 3. 翻訳完了後1.5秒で両方削除
 * 4. 5〜8文の柔軟な履歴グループ化
 */

import React, { useState, useEffect } from 'react';
import { useUnifiedPipeline } from '../hooks/useUnifiedPipeline';
import { SyncedRealtimeDisplay } from './SyncedRealtimeDisplay';
import { FlexibleHistoryDisplay } from './FlexibleHistoryDisplay';
import { HistoryBlock } from '../utils/FlexibleHistoryGrouper';

export const UniVoiceEnhanced: React.FC = () => {
  const {
    isRunning,
    displayPairs,
    historyBlocks,
    summaries,
    error,
    vocabulary,
    finalReport,
    startFromMicrophone,
    stop,
    generateVocabulary,
    generateFinalReport,
    clearAll
  } = useUnifiedPipeline({
    sourceLanguage: 'en',
    targetLanguage: 'ja'
  });
  
  const [activeTab, setActiveTab] = useState<'realtime' | 'history' | 'summary'>('realtime');
  const [selectedBlock, setSelectedBlock] = useState<HistoryBlock | null>(null);
  
  // エラー表示
  useEffect(() => {
    if (error) {
      console.error('[UniVoiceEnhanced] Pipeline error:', error);
    }
  }, [error]);
  
  return (
    <div className="univoice-enhanced">
      {/* ヘッダー */}
      <header className="app-header">
        <h1>UniVoice 2.0 - リアルタイム授業支援</h1>
        <div className="status-indicator">
          <span className={`status-dot ${isRunning ? 'active' : 'inactive'}`} />
          {isRunning ? '録音中' : '停止中'}
        </div>
      </header>
      
      {/* コントロールバー */}
      <div className="control-bar">
        <button
          className={`control-btn ${isRunning ? 'stop' : 'start'}`}
          onClick={isRunning ? stop : startFromMicrophone}
        >
          {isRunning ? '停止' : '開始'}
        </button>
        
        <button
          className="control-btn secondary"
          onClick={clearAll}
          disabled={isRunning}
        >
          クリア
        </button>
        
        <div className="tab-selector">
          <button
            className={`tab-btn ${activeTab === 'realtime' ? 'active' : ''}`}
            onClick={() => setActiveTab('realtime')}
          >
            リアルタイム
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            履歴
          </button>
          <button
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            要約
          </button>
        </div>
      </div>
      
      {/* メインコンテンツ */}
      <main className="main-content">
        {/* リアルタイム表示 */}
        {activeTab === 'realtime' && (
          <div className="realtime-section">
            <h2>リアルタイム字幕</h2>
            <SyncedRealtimeDisplay displayPairs={displayPairs} />
            
            {/* デバッグ情報 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="debug-info">
                <p>表示中のペア: {displayPairs.length}</p>
                <p>完了ブロック: {historyBlocks.length}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 履歴表示 */}
        {activeTab === 'history' && (
          <div className="history-section">
            <h2>履歴（5〜8文ごと）</h2>
            <FlexibleHistoryDisplay
              historyBlocks={historyBlocks}
              onBlockClick={setSelectedBlock}
            />
          </div>
        )}
        
        {/* 要約表示 */}
        {activeTab === 'summary' && (
          <div className="summary-section">
            <h2>段階的要約</h2>
            {summaries.length === 0 ? (
              <p className="no-data">要約はまだありません</p>
            ) : (
              <div className="summaries-list">
                {summaries.map((summary, index) => (
                  <div key={summary.id} className="summary-item">
                    <h3>要約 {index + 1}</h3>
                    <div className="summary-content">
                      <div className="summary-original">
                        {summary.english}
                      </div>
                      <div className="summary-translation">
                        {summary.japanese}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* フッター */}
      <footer className="app-footer">
        <button
          className="footer-btn"
          onClick={generateVocabulary}
          disabled={!isRunning && historyBlocks.length === 0}
        >
          単語帳生成
        </button>
        <button
          className="footer-btn"
          onClick={generateFinalReport}
          disabled={!isRunning && historyBlocks.length === 0}
        >
          レポート生成
        </button>
      </footer>
      
      {/* モーダル: 選択されたブロック */}
      {selectedBlock && (
        <div className="modal-overlay" onClick={() => setSelectedBlock(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>ブロック詳細</h3>
            <button className="modal-close" onClick={() => setSelectedBlock(null)}>
              ×
            </button>
            <div className="block-details">
              {selectedBlock.sentences.map((sentence, index) => (
                <div key={sentence.id} className="sentence-detail">
                  <div className="sentence-number">{index + 1}</div>
                  <div className="sentence-texts">
                    <div className="original">{sentence.original}</div>
                    <div className="translation">{sentence.translation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .univoice-enhanced {
          min-height: 100vh;
          background: #0a0a0a;
          color: #ffffff;
          display: flex;
          flex-direction: column;
        }
        
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #1a1a1a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .app-header h1 {
          font-size: 24px;
          margin: 0;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #666;
        }
        
        .status-dot.active {
          background: #4CAF50;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .control-bar {
          display: flex;
          gap: 16px;
          padding: 16px 20px;
          background: #1a1a1a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .control-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .control-btn.start {
          background: #4CAF50;
          color: white;
        }
        
        .control-btn.stop {
          background: #f44336;
          color: white;
        }
        
        .control-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        
        .control-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .tab-selector {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }
        
        .tab-btn {
          padding: 8px 16px;
          border: none;
          background: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
        }
        
        .tab-btn.active {
          color: white;
          border-bottom-color: #4CAF50;
        }
        
        .main-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }
        
        .realtime-section,
        .history-section,
        .summary-section {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .realtime-section h2,
        .history-section h2,
        .summary-section h2 {
          font-size: 20px;
          margin-bottom: 16px;
        }
        
        .debug-info {
          margin-top: 16px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-family: monospace;
          font-size: 14px;
        }
        
        .no-data {
          text-align: center;
          color: rgba(255, 255, 255, 0.5);
          padding: 40px;
        }
        
        .summaries-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .summary-item {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 20px;
        }
        
        .summary-item h3 {
          font-size: 18px;
          margin-bottom: 12px;
        }
        
        .summary-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .summary-original,
        .summary-translation {
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          line-height: 1.6;
        }
        
        .app-footer {
          display: flex;
          gap: 16px;
          padding: 16px 20px;
          background: #1a1a1a;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .footer-btn {
          padding: 10px 20px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: none;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .footer-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .footer-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* モーダル */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .modal-content {
          background: #1a1a1a;
          border-radius: 16px;
          padding: 24px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
        }
        
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
        }
        
        .block-details {
          margin-top: 20px;
        }
        
        .sentence-detail {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .sentence-detail:last-child {
          border-bottom: none;
        }
        
        .sentence-texts {
          flex: 1;
        }
        
        .sentence-texts .original {
          margin-bottom: 8px;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .sentence-texts .translation {
          color: rgba(255, 255, 255, 0.7);
          padding-left: 16px;
          border-left: 2px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};