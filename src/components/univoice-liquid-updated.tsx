/**
 * UniVoice Liquid Glass Design Implementation
 * 既存のClean Architectureに準拠したUI更新版
 * 
 * このファイルは src/components/UniVoice.tsx を置き換えます
 * 既存のフック、サービス、型定義を維持しています
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUnifiedPipeline } from '../hooks/useUnifiedPipeline';
import type { DisplaySegment } from '../utils/RealtimeDisplayManager';
import type { HistoryBlock } from '../utils/FlexibleHistoryGrouper';

// セクションコンポーネントのインポート（スタイル更新版が必要）
import { SetupSection } from '../presentation/components/UniVoice/sections/SetupSection';
import { RealtimeSection } from '../presentation/components/UniVoice/sections/RealtimeSection';
import { HistorySection } from '../presentation/components/UniVoice/sections/HistorySection';
import { ProgressiveSummarySection } from '../presentation/components/UniVoice/sections/ProgressiveSummarySection';
import { UserInputSection } from '../presentation/components/UniVoice/sections/UserInputSection';
import { FullscreenModal, MemoModal, ReportModal } from '../presentation/components/UniVoice/modals';

interface SectionHeights {
  history: number;
  summary: number;
  input: number;
}

interface Memo {
  id: string;
  timestamp: string;
  japanese: string;
  english: string;
}

interface TranslationDisplay {
  original: string;
  translated: string;
  timestamp: string;
}

export const UniVoice: React.FC = () => {
  // ========== 状態管理（既存のものを維持） ==========
  const [showSetup, setShowSetup] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Liquid Glass デザイン用の新しい状態
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'purple'>('light');
  const [currentDisplay, setCurrentDisplay] = useState<'both' | 'source' | 'target'>('both');
  const [currentFontScale, setCurrentFontScale] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [showTranslationResult, setShowTranslationResult] = useState(false);
  const [translationResult, setTranslationResult] = useState<TranslationDisplay | null>(null);
  
  // LocalStorageから設定を復元
  const [sourceLanguage, setSourceLanguage] = useState(() => 
    localStorage.getItem('sourceLanguage') || 'en'
  );
  const [targetLanguage, setTargetLanguage] = useState(() => 
    localStorage.getItem('targetLanguage') || 'ja'
  );
  
  const [sectionHeights, setSectionHeights] = useState<SectionHeights>(() => {
    const saved = localStorage.getItem('sectionHeights');
    return saved ? JSON.parse(saved) : { history: 30, summary: 12, input: 20 };
  });
  
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [memoList, setMemoList] = useState<Memo[]>([]);
  
  // ========== 既存のパイプライン統合 ==========
  const pipeline = useUnifiedPipeline({
    sourceLanguage,
    targetLanguage,
    onError: (error) => {
      console.error('[UniVoice] Pipeline error:', error);
    },
    onStatusChange: (status) => {
      console.log('[UniVoice] Pipeline status:', status);
    }
  });

  const isRunning = pipeline.isRunning;
  const historyBlocks = pipeline.historyBlocks;
  const summaries = pipeline.summaries;
  const threeLineDisplay = pipeline.threeLineDisplay;
  
  // Refs
  const realtimeSectionRef = useRef<HTMLDivElement>(null);
  const recordingStartTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // ========== Liquid Glass 専用関数 ==========
  
  // スクロールを一番下に固定
  const scrollToBottom = useCallback(() => {
    if (realtimeSectionRef.current) {
      realtimeSectionRef.current.scrollTop = realtimeSectionRef.current.scrollHeight;
    }
  }, []);
  
  // テーマ切り替え
  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'purple'> = ['light', 'dark', 'purple'];
    const index = themes.indexOf(currentTheme);
    setCurrentTheme(themes[(index + 1) % themes.length]);
  };
  
  // フォントサイズ変更
  const changeFont = (direction: number) => {
    if (direction === 0) {
      setCurrentFontScale(1);
    } else if (direction === 1) {
      setCurrentFontScale(prev => Math.min(1.5, prev * 1.1));
    } else if (direction === -1) {
      setCurrentFontScale(prev => Math.max(0.7, prev * 0.9));
    }
    setTimeout(scrollToBottom, 50);
  };
  
  // 表示モード変更
  const setDisplay = (mode: 'both' | 'source' | 'target') => {
    setCurrentDisplay(mode);
  };
  
  // ========== 既存のイベントハンドラー（更新版） ==========
  
  const handleStartSession = async (className: string, sourceLang: string, targetLang: string) => {
    setSelectedClass(className);
    setSourceLanguage(sourceLang);
    setTargetLanguage(targetLang);
    localStorage.setItem('sourceLanguage', sourceLang);
    localStorage.setItem('targetLanguage', targetLang);
    
    setShowSetup(false);
    setIsPaused(false);
    recordingStartTimeRef.current = new Date();
    setRecordingTime(0);
    
    try {
      await pipeline.startFromMicrophone();
      console.log('[UniVoice] パイプライン開始成功');
    } catch (error) {
      console.error('[UniVoice] パイプライン開始エラー:', error);
      alert('音声認識の開始に失敗しました。');
      setShowSetup(true);
    }
  };
  
  const togglePause = async () => {
    if (isRunning) {
      await pipeline.stop();
      setIsPaused(true);
    } else {
      await pipeline.startFromMicrophone();
      setIsPaused(false);
    }
  };
  
  // 英訳して保存（新機能）
  const handleTranslateAndSave = async (text: string) => {
    if (!text.trim()) return;
    
    try {
      // パイプラインの翻訳機能を使用
      const translated = await pipeline.translateUserInput?.(text) || `Translation: ${text}`;
      
      const display: TranslationDisplay = {
        original: text,
        translated: translated,
        timestamp: formatTime(recordingTime)
      };
      
      setTranslationResult(display);
      setShowTranslationResult(true);
      
      // 3秒後に非表示
      setTimeout(() => {
        setShowTranslationResult(false);
      }, 3000);
      
      // メモとして保存
      const newMemo: Memo = {
        id: `memo_${Date.now()}`,
        timestamp: formatTime(recordingTime),
        japanese: text,
        english: translated
      };
      setMemoList(prev => [...prev, newMemo]);
      
    } catch (error) {
      console.error('[UniVoice] 翻訳エラー:', error);
    }
  };
  
  // ========== useEffect フック ==========
  
  // タイマー
  useEffect(() => {
    if (!showSetup && !isPaused) {
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
  }, [showSetup, isPaused]);
  
  // スクロール位置の自動調整
  useEffect(() => {
    scrollToBottom();
  }, [threeLineDisplay, currentFontScale, scrollToBottom]);
  
  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          setDisplay('source');
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          setDisplay('target');
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          setDisplay('both');
        }
      }
      
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          changeFont(1);
        } else if (e.key === '-') {
          e.preventDefault();
          changeFont(-1);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // ========== ヘルパー関数 ==========
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // ========== セットアップ画面 ==========
  if (showSetup) {
    return (
      <SetupSection
        onStartSession={handleStartSession}
        initialClassName={selectedClass || ''}
        defaultSourceLanguage={sourceLanguage}
        defaultTargetLanguage={targetLanguage}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh'
        }}
      />
    );
  }
  
  // ========== メイン画面（Liquid Glass デザイン） ==========
  return (
    <div className={`univoice-liquid-container ${demoMode ? 'demo-mode' : ''}`}>
      <style>{getLiquidGlassStyles(currentTheme, currentFontScale)}</style>
      
      <div className="app-container">
        <div className="main-window">
          {/* ヘッダー */}
          <div className={`header glass-${currentTheme}`}>
            <div className={`recording-indicator-green ${isPaused ? 'paused' : ''}`}>
              <div className={`recording-dot-green ${isPaused ? 'paused' : ''}`} />
              <span>{formatTime(recordingTime)}</span>
            </div>
            
            <button className="icon-btn" onClick={togglePause}>
              {isPaused ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2 L4 14 L12 8 Z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5 3v10h3V3H5zm5 0v10h3V3h-3z"/>
                </svg>
              )}
              <span className="tooltip">{isPaused ? '再開' : '一時停止'}</span>
            </button>
            
            <button className="icon-btn" onClick={cycleTheme}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M8 2 A6 6 0 0 1 8 14 A3 3 0 0 0 8 2" fill="currentColor"/>
              </svg>
              <span className="tooltip">テーマ</span>
            </button>
            
            <div className="spacer" />
            
            <button className="icon-btn" onClick={() => setShowSettings(!showSettings)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
                <path d="M10 3.5v-2m0 17v-2m6.5-6.5h2m-17 0h2m12.02-4.52l1.41-1.41M4.93 15.07l1.41-1.41m0-7.32L4.93 4.93m11.14 11.14l1.41 1.41"/>
              </svg>
              <span className="tooltip">設定</span>
            </button>
          </div>
          
          {/* 設定バー */}
          <div className={`settings-bar glass-${currentTheme} ${showSettings ? 'show' : ''}`}>
            <div className="settings-inner">
              <div className="settings-left">
                <button 
                  className={`s-btn ${currentDisplay === 'both' ? 'active' : ''}`}
                  onClick={() => setDisplay('both')}
                >
                  <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                    <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
                    <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
                  </svg>
                  <span className="s-tooltip">Alt+B</span>
                </button>
                <button 
                  className={`s-btn ${currentDisplay === 'source' ? 'active' : ''}`}
                  onClick={() => setDisplay('source')}
                >
                  <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                    <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
                    <rect x="10" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
                  </svg>
                  <span className="s-tooltip">Alt+S</span>
                </button>
                <button 
                  className={`s-btn ${currentDisplay === 'target' ? 'active' : ''}`}
                  onClick={() => setDisplay('target')}
                >
                  <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                    <rect x="1" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
                    <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
                  </svg>
                  <span className="s-tooltip">Alt+T</span>
                </button>
              </div>
              <div className="settings-right">
                <button className="s-btn" onClick={() => changeFont(-1)}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="s-tooltip">Ctrl+-</span>
                </button>
                <button className="s-btn" onClick={() => changeFont(0)}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>T</span>
                  <span className="s-tooltip">リセット</span>
                </button>
                <button className="s-btn" onClick={() => changeFont(1)}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 4 L9 14 M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="s-tooltip">Ctrl++</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* リアルタイムセクション（既存コンポーネントをラップ） */}
          <div 
            ref={realtimeSectionRef}
            className={`realtime-section-wrapper glass-${currentTheme}`}
            style={{ height: '280px', overflowY: 'auto' }}
          >
            {showTranslationResult && translationResult && (
              <div className="translation-result-display">
                <div className="text-row highlighted">
                  <div className="text-content">{translationResult.translated}</div>
                  <div className="text-content">{translationResult.original}</div>
                </div>
              </div>
            )}
            
            <RealtimeSection
              displayContent={{
                original: threeLineDisplay?.oldest ? {
                  oldest: threeLineDisplay.oldest.original,
                  older: threeLineDisplay.older?.original || '',
                  recent: threeLineDisplay.recent?.original || ''
                } : { oldest: '', older: '', recent: '' },
                translation: threeLineDisplay?.oldest ? {
                  oldest: threeLineDisplay.oldest.translation,
                  older: threeLineDisplay.older?.translation || '',
                  recent: threeLineDisplay.recent?.translation || ''
                } : { oldest: '', older: '', recent: '' }
              }}
              volumeLevel={0}
              isRunning={isRunning}
              style={{
                fontSize: `${18 * currentFontScale}px`,
                display: currentDisplay === 'source' ? 'source' : currentDisplay === 'target' ? 'target' : 'both'
              }}
            />
          </div>
          
          {/* 履歴セクション */}
          <HistorySection
            historyBlocks={historyBlocks}
            height={sectionHeights.history}
            isExpanded={expandedSection === 'history'}
            onClick={() => setExpandedSection('history')}
            onResize={(e) => console.log('Resize history')}
          />
          
          {/* 要約セクション */}
          <ProgressiveSummarySection
            summaries={summaries || []}
            pipelineError={pipeline.error}
            height={sectionHeights.summary}
            isExpanded={expandedSection === 'summary'}
            onClick={() => setExpandedSection('summary')}
            onResize={(e) => console.log('Resize summary')}
          />
          
          {/* ユーザー入力セクション */}
          <UserInputSection
            height={sectionHeights.input}
            isExpanded={expandedSection === 'input'}
            memoCount={memoList.length}
            onExpandInput={(expand) => setExpandedSection(expand ? 'input' : null)}
            onSaveAsMemo={() => {
              const textarea = document.getElementById('questionInput') as HTMLTextAreaElement;
              if (textarea?.value) {
                handleTranslateAndSave(textarea.value);
                textarea.value = '';
              }
            }}
            onShowMemoModal={() => setShowMemoModal(true)}
            onResize={(e) => console.log('Resize input')}
            showTranslating={false}
          />
        </div>
      </div>
      
      {/* モーダル */}
      <MemoModal
        isOpen={showMemoModal}
        onClose={() => setShowMemoModal(false)}
        memoList={memoList}
        onSaveMemo={(memoId) => console.log('Save memo:', memoId)}
      />
      
      {/* デモボタン */}
      <button 
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '8px 16px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 9999
        }}
        onClick={() => setDemoMode(!demoMode)}
      >
        デモ背景
      </button>
    </div>
  );
};

// Liquid Glass スタイル（インライン）
const getLiquidGlassStyles = (theme: string, fontScale: number) => `
  .univoice-liquid-container {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
    background: #f0f0f2;
    min-height: 100vh;
    overflow: hidden;
    position: relative;
  }
  
  .univoice-liquid-container.demo-mode {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  }
  
  .glass-light {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }
  
  .glass-dark {
    background: rgba(20, 20, 20, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  
  .glass-purple {
    background: rgba(102, 51, 153, 0.4);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(168, 85, 247, 0.3);
    box-shadow: 0 8px 32px rgba(102, 51, 153, 0.2);
  }
  
  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: 20px 20px 0 0;
  }
  
  .recording-indicator-green {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: rgba(76, 175, 80, 0.2);
    border-radius: 10px;
    color: white;
    font-size: 14px;
    height: 36px;
  }
  
  .glass-light .recording-indicator-green {
    background: rgba(76, 175, 80, 0.15);
    color: #2e7d32;
  }
  
  .recording-dot-green {
    width: 8px;
    height: 8px;
    background: #4caf50;
    border-radius: 50%;
  }
  
  .recording-dot-green.paused {
    background: #999;
  }
  
  .icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: none;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    position: relative;
  }
  
  .glass-light .icon-btn {
    background: rgba(0, 0, 0, 0.06);
    color: #333;
  }
  
  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
  }
  
  .tooltip {
    position: absolute;
    top: -32px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 11px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    z-index: 10000;
  }
  
  .icon-btn:hover .tooltip {
    opacity: 1;
  }
  
  .spacer {
    margin-left: auto;
  }
  
  .settings-bar {
    height: 0;
    overflow: hidden;
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 100;
    border: none !important;
  }
  
  .settings-bar.show {
    height: 56px;
  }
  
  .settings-inner {
    padding: 10px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.03);
  }
  
  .settings-left, .settings-right {
    display: flex;
    gap: 6px;
  }
  
  .s-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: none;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    position: relative;
  }
  
  .glass-light .s-btn {
    background: rgba(0, 0, 0, 0.06);
    color: #333;
  }
  
  .s-btn.active {
    background: #667eea;
    color: white;
  }
  
  .s-tooltip {
    position: absolute;
    bottom: -28px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    z-index: 10000;
  }
  
  .s-btn:hover .s-tooltip {
    opacity: 1;
  }
  
  .realtime-section-wrapper {
    