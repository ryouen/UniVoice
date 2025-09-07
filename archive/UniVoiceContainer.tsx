/**
 * UniVoiceContainer - Main container component
 * 
 * Responsibilities:
 * - Orchestrate all sub-components
 * - Manage UI state
 * - Coordinate between hooks and components
 * - Handle layout and modals
 */

import React, { useState, useEffect, useRef } from 'react';
import { SetupScreen } from './SetupScreen';
// import { TranslationDisplay } from './TranslationDisplay'; // Temporarily disabled
import { HistorySection } from './HistorySection';
import { useSession } from '../../hooks/useSession';
import { useUnifiedPipeline } from '../../hooks/useUnifiedPipeline';
import { useSessionMemory } from '../../hooks/useSessionMemory';

interface SectionHeights {
  history: number;
  summary: number;
  input: number;
}

interface TranslationSegment {
  oldest: string;
  older: string;
  recent: string;
}

interface Memo {
  id: string;
  timestamp: string;
  japanese: string;
  english: string;
}

export const UniVoiceContainer: React.FC = () => {
  // UI State
  const [showSetup, setShowSetup] = useState(true);
  const [showBlockGuides, setShowBlockGuides] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [memoList, setMemoList] = useState<Memo[]>([]);
  const [userTranslation, setUserTranslation] = useState('');
  
  // Modal State
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  
  // Layout State
  const [sectionHeights, setSectionHeights] = useState<SectionHeights>(() => {
    const saved = localStorage.getItem('sectionHeights');
    return saved ? JSON.parse(saved) : { history: 30, summary: 18, input: 18 };
  });
  
  // Translation Display State is now managed by RealtimeDisplayManager

  // Hooks
  const session = useSession();
  const sessionMemory = useSessionMemory();
  
  // Pipeline with session memory callbacks
  const pipeline = useUnifiedPipeline({
    onTranslation: (translation) => {
      sessionMemory.addTranslation(translation);
    },
    onSummary: (summary) => {
      sessionMemory.addSummary(summary);
    }
  });
  
  const recordingStartTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 3行表示はRealtimeDisplayManagerが管理するため、このロジックは不要

  // Hide block guides after 5 seconds
  useEffect(() => {
    if (!showSetup && showBlockGuides) {
      const timer = setTimeout(() => {
        setShowBlockGuides(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showSetup, showBlockGuides]);

  // Timer for recording time
  useEffect(() => {
    if (!showSetup && pipeline.isRunning) {
      timerRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current.getTime()) / 1000);
          setRecordingTime(elapsed);
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showSetup, pipeline.isRunning]);

  // Save section heights
  useEffect(() => {
    localStorage.setItem('sectionHeights', JSON.stringify(sectionHeights));
  }, [sectionHeights]);

  // Helper function
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handlers
  const handleStartSession = async (config: {
    className: string;
    sourceLanguage: string;
    targetLanguage: string;
  }) => {
    try {
      console.log('[UniVoiceContainer] Starting session...', config);
      console.log('[UniVoiceContainer] window.univoice available?', !!window.univoice);
      
      // Wait a bit for API to be ready if needed
      if (!window.univoice) {
        console.log('[UniVoiceContainer] Waiting for API...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!window.univoice) {
          throw new Error('UniVoice APIが初期化されていません。アプリを再起動してください。');
        }
      }
      
      console.log('[UniVoiceContainer] Starting session.startSession...');
      await session.startSession(config);
      console.log('[UniVoiceContainer] session.startSession completed');
      
      console.log('[UniVoiceContainer] Starting pipeline.startFromMicrophone...');
      await pipeline.startFromMicrophone();
      console.log('[UniVoiceContainer] pipeline.startFromMicrophone completed');
      
      // Start session memory tracking
      console.log('[UniVoiceContainer] Starting session memory...');
      await sessionMemory.startSession(
        config.className,
        config.sourceLanguage,
        config.targetLanguage
      );
      console.log('[UniVoiceContainer] Session memory started');
      
      setShowSetup(false);
      setShowBlockGuides(true);
      recordingStartTimeRef.current = new Date();
      setRecordingTime(0);
    } catch (error) {
      console.error('[UniVoiceContainer] Failed to start session:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`セッションの開始に失敗しました: ${errorMessage}`);
    }
  };

  const handleStopSession = async () => {
    try {
      await pipeline.stop();
      await session.stopSession();
      
      // Complete session memory tracking
      await sessionMemory.completeSession();
      
      setShowReportModal(true);
    } catch (error) {
      console.error('[UniVoiceContainer] Failed to stop session:', error);
    }
  };

  const handleTogglePause = async () => {
    try {
      if (session.isPaused) {
        await session.resumeSession();
        await pipeline.startFromMicrophone();
        sessionMemory.resumeSession();
      } else {
        await pipeline.stop();
        await session.pauseSession();
        sessionMemory.pauseSession();
      }
    } catch (error) {
      console.error('[UniVoiceContainer] Failed to toggle pause:', error);
    }
  };

  // Handle resize mouse down
  const handleResizeMouseDown = (section: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = sectionHeights[section as keyof SectionHeights];
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY;
      const viewportHeight = window.innerHeight;
      const deltaVH = (deltaY / viewportHeight) * 100;
      
      setSectionHeights(prev => ({
        ...prev,
        [section]: Math.max(10, Math.min(60, startHeight + deltaVH))
      }));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  // Calculate section styles
  const getSectionStyle = (section: string) => {
    let height = sectionHeights[section as keyof SectionHeights];
    
    if (expandedSection === section) {
      height = 60; // Expanded
    } else if (expandedSection && expandedSection !== section && section !== 'current') {
      height = 10; // Compressed
    }
    
    return {
      height: `${height}vh`,
      transition: 'height 0.3s ease'
    };
  };

  // Render setup screen
  if (showSetup) {
    return <SetupScreen onStartSession={handleStartSession} />;
  }

  // Main UI
  return (
    <div style={{ height: '100vh', background: '#f0f0f2' }}>
      {/* ヘッダー - 元のUniVoicePerfectと完全に同じデザイン */}
      <div style={{
        background: 'white',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        height: '50px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: pipeline.isRunning ? '#ff4444' : '#999',
            animation: pipeline.isRunning ? 'pulse 1.5s infinite' : 'none'
          }} />
          <span style={{ fontSize: '14px', color: '#666' }}>
            {pipeline.isRunning ? '文字起こし中' : '一時停止中'}
          </span>
          <span style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>
            {formatTime(recordingTime)}
          </span>
          {/* メモ機能は後で実装 */}
          <button onClick={handleTogglePause} style={{
            padding: '4px 10px',
            background: pipeline.isRunning ? '#dc3545' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            marginLeft: '10px'
          }}>
            {pipeline.isRunning ? '⏸ 停止' : '▶ 再開'}
          </button>
          {/* 自動保存機能は後で実装 */}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleStopSession} style={{
            padding: '6px 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}>
            📚 授業終了
          </button>
          <button onClick={() => {
            // 次の授業への機能は後で実装
            handleStopSession();
          }} style={{
            padding: '6px 16px',
            background: 'white',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}>
            ➡️ 次の授業へ
          </button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div style={{ height: 'calc(100vh - 50px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* ブロックガイド - 元のデザインを完全再現 */}
        {showBlockGuides && (
          <>
            <div style={{
              position: 'absolute',
              top: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '0 0 8px 8px',
              fontSize: '11px',
              zIndex: 100,
              pointerEvents: 'none'
            }}>
              📖 クリックで全文を時間軸付きで英日対比表示 | ドラッグで高さ調整可能
            </div>
            <div style={{
              position: 'absolute',
              top: `${sectionHeights.history}vh`,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              zIndex: 100,
              pointerEvents: 'none'
            }}>
              🎤 リアルタイム文字起こし（固定高さ）
            </div>
            <div style={{
              position: 'absolute',
              top: `${sectionHeights.history + 22}vh`,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              zIndex: 100,
              pointerEvents: 'none'
            }}>
              📊 クリックで要約を英日対比表示 | ドラッグで高さ調整可能
            </div>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '8px 8px 0 0',
              fontSize: '11px',
              zIndex: 100,
              pointerEvents: 'none'
            }}>
              💭 質問・メモを入力 → 英訳生成 | フォーカスで自動拡大
            </div>
          </>
        )}
        
        {/* History Section (①②) */}
        <section 
          className="history-section"
          style={getSectionStyle('history')}
        >
        <HistorySection 
          history={pipeline.groupedHistory.map((group, groupIndex) => ({
            id: `group_${groupIndex}`,
            original: group.map(t => t.original).join(' '),
            translation: group.map(t => t.japanese).join(' '),
            isComplete: true,
            timestamp: group[group.length - 1]?.timestamp || Date.now()
          }))}
          onClick={() => {
            // クリックで全文履歴を表示
            setModalTitle('📖 全文履歴（時間整列表示）');
            const historyHtml = pipeline.history.map((entry) => {
              const startTime = formatTime(Math.floor((entry.timestamp || 0) / 1000));
              const endTime = formatTime(Math.floor(((entry.timestamp || 0) + 150000) / 1000));
              
              return `
                <div class="aligned-paragraph" style="
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 20px;
                  margin-bottom: 20px;
                  padding: 15px;
                  background: #fafafa;
                  border-radius: 6px;
                ">
                  <div class="paragraph-time" style="
                    grid-column: 1 / -1;
                    font-size: 11px;
                    color: #999;
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #e0e0e0;
                  ">⏱ ${startTime} - ${endTime}</div>
                  <div class="aligned-original" style="
                    padding-right: 15px;
                    border-right: 1px solid #e0e0e0;
                    line-height: 1.7;
                  ">${entry.original}</div>
                  <div class="aligned-translation" style="
                    padding-left: 15px;
                    line-height: 1.7;
                    color: #0066cc;
                  ">${entry.japanese}</div>
                </div>
              `;
            }).join('');
            setModalContent(historyHtml);
            setShowFullscreenModal(true);
          }}
          onResizeStart={(e) => handleResizeMouseDown('history', e)}
        />
        </section>

        {/* Current Translation (③④) */}
      <section 
        className="current-section"
        style={{ height: '22vh', flexShrink: 0, position: 'relative' }}
      >
        {/* <TranslationDisplay
          segments={pipeline.realtimeSegments}
          showBlockGuides={showBlockGuides}
          height="100%"
        /> */}
        {/* Temporary placeholder for translation display */}
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'linear-gradient(to bottom, #fafafa, #ffffff)',
          borderBottom: '2px solid #ddd'
        }}>
          <div style={{ flex: 1, padding: '20px', textAlign: 'center', color: '#999' }}>
            {pipeline.currentOriginal || 'Waiting for transcript...'}
          </div>
          <div style={{ flex: 1, padding: '20px', textAlign: 'center', color: '#0066cc' }}>
            {pipeline.currentTranslation || 'Waiting for translation...'}
          </div>
        </div>
        </section>

        {/* Summary Section (⑤⑥) - 元のデザインを完全再現 */}
        <section 
          className="summary-section"
          onClick={() => {
            // クリックで要約の英日対比表示モーダルを開く
            setModalTitle('📊 要約（英日対比）');
            setModalContent(`
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 20px; background: #fafafa; border-radius: 8px;">
                <div style="padding: 20px; background: white; border-radius: 6px; line-height: 1.8;">
                  <div style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #667eea; padding-bottom: 10px; border-bottom: 2px solid #667eea;">English Summary</div>
                  <div style="color: #333; line-height: 1.8; white-space: pre-wrap;">${pipeline.summaries?.[0]?.english || 'Waiting for summary...'}</div>
                </div>
                <div style="padding: 20px; background: white; border-radius: 6px; line-height: 1.8;">
                  <div style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #667eea; padding-bottom: 10px; border-bottom: 2px solid #667eea;">日本語要約</div>
                  <div style="color: #333; line-height: 1.8; white-space: pre-wrap;">${pipeline.summaries?.[0]?.japanese || '要約を待っています...'}</div>
                </div>
              </div>
            `);
            setShowFullscreenModal(true);
          }}
          style={{
            ...getSectionStyle('summary'),
            display: 'flex',
            background: '#f8f9fa',
            borderBottom: '1px solid #ddd',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          <div 
            className="resize-handle"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleResizeMouseDown('summary', e);
            }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '4px',
              top: '-2px',
              background: 'transparent',
              cursor: 'ns-resize',
              zIndex: 10
            }}
          />
          <div style={{ flex: 1, padding: '15px 20px' }}>
            <div style={{
              background: 'white',
              padding: '15px',
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.6',
              height: '100%',
              overflowY: 'auto'
            }}>
              {pipeline.summaries?.[0]?.english || 'Waiting for summary...'}
            </div>
          </div>
          <div style={{ flex: 1, padding: '15px 20px' }}>
            <div style={{
              background: 'white',
              padding: '15px',
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.6',
              height: '100%',
              overflowY: 'auto'
            }}>
              {pipeline.summaries?.[0]?.japanese || '要約を待っています...'}
              {pipeline.error && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#dc3545', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                  ⚠️ エラー: {pipeline.error}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* User Input Section (⑦⑧) - 元のデザインを完全再現 */}
        <section 
          className="input-section"
          style={{
            ...getSectionStyle('input'),
            display: 'flex',
            background: 'white',
            borderTop: '2px solid #667eea',
            position: 'relative'
          }}
        >
          <div 
            className="resize-handle"
            onMouseDown={(e) => handleResizeMouseDown('input', e)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '4px',
              top: '-2px',
              background: 'transparent',
              cursor: 'ns-resize',
              zIndex: 10
            }}
          />
          <div style={{ flex: 1, padding: '15px 20px' }}>
            <div style={{
              background: '#f0f9ff',
              padding: '15px',
              borderRadius: '8px',
              height: '100%',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#0066cc',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div id="translatedQuestion">
                {userTranslation || '質問を入力してください'}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '15px 20px', display: 'flex', gap: '10px' }}>
            <textarea
              id="questionInput"
              placeholder="質問・発言したい内容・メモ（日本語でOK）"
              onFocus={() => setExpandedSection('input')}
              onBlur={() => expandedSection === 'input' && setExpandedSection(null)}
              defaultValue=""
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'none'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => setShowMemoModal(true)} style={{
                padding: '8px 16px',
                background: 'white',
                border: '1px solid #667eea',
                borderRadius: '6px',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                position: 'relative'
              }}>
                📝 一覧
                {memoList.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: '#ffd700',
                    color: '#333',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: 600
                  }}>
                    {memoList.length}
                  </span>
                )}
              </button>
              <button onClick={async () => {
                const textarea = document.getElementById('questionInput') as HTMLTextAreaElement;
                const text = textarea?.value;
                if (text?.trim()) {
                  // 保存と英訳処理
                  try {
                    const englishText = await pipeline.translateUserInput(text, 'ja', 'en');
                    setUserTranslation(englishText);
                    
                    const newMemo = {
                      id: `memo_${Date.now()}`,
                      timestamp: formatTime(recordingTime),
                      japanese: text,
                      english: englishText
                    };
                    
                    setMemoList([...memoList, newMemo]);
                    alert('メモを保存しました');
                  } catch (error) {
                    console.error('[UniVoice] メモ保存エラー:', error);
                    alert('メモの保存に失敗しました');
                  }
                }
              }} style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}>
                メモ/英訳
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Modals would go here */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <h2>セッション終了</h2>
            <p>レポートを生成しました</p>
            <button
              onClick={() => {
                setShowReportModal(false);
                setShowSetup(true);
              }}
              style={{
                padding: '10px 20px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              新しいセッションを開始
            </button>
          </div>
        </div>
      )}
      
      {/* Fullscreen Modal - 全文表示と要約表示用 */}
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
              onClick={() => setShowFullscreenModal(false)}
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
      
      {/* Memo Modal - メモ一覧表示と編集 */}
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
                onClick={() => setShowMemoModal(false)}
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
                      defaultValue={memo.japanese}
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
                      defaultValue={memo.english}
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
                      onClick={() => {
                        const jaElement = document.getElementById(`${memo.id}-ja`) as HTMLTextAreaElement;
                        const enElement = document.getElementById(`${memo.id}-en`) as HTMLTextAreaElement;
                        setMemoList(prev => prev.map(m => {
                          if (m.id === memo.id) {
                            return {
                              ...m,
                              japanese: jaElement?.value || m.japanese,
                              english: enElement?.value || m.english
                            };
                          }
                          return m;
                        }));
                        alert('メモを保存しました');
                      }}
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
    </div>
  );
};