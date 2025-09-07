import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UniVoicePerfect } from './UniVoicePerfect';
import { useUnifiedPipeline } from '../hooks/useUnifiedPipeline';
import { MicrophoneCapture } from '../utils/microphoneCapture';

/**
 * UniVoicePerfectIntegration
 * 
 * UnifiedPipelineServiceとUniVoicePerfectコンポーネントの統合
 * - test-20min-production-detailed.jsの実証済みロジックを使用
 * - 8ブロックUIにデータを流す
 */
export const UniVoicePerfectIntegration: React.FC = () => {
  const {
    isRunning,
    currentOriginal,
    currentTranslation,
    realtimeSegments,
    history,
    groupedHistory,
    summaries,
    error,
    finalReport,
    startFromFile,
    startFromMicrophone,
    stop,
    translateUserInput,
    clearError
  } = useUnifiedPipeline();
  
  const [mode, setMode] = useState<'file' | 'mic'>('mic');
  const [isStarting, setIsStarting] = useState(false);
  const micCapture = useRef<MicrophoneCapture | null>(null);
  
  // Initialize microphone capture
  useEffect(() => {
    micCapture.current = new MicrophoneCapture();
    
    return () => {
      if (micCapture.current) {
        micCapture.current.stopCapture();
      }
    };
  }, []);
  
  // Start/Stop handler
  const handleStartStop = useCallback(async () => {
    if (isRunning) {
      // 停止処理
      await stop();
      if (micCapture.current?.isCapturing()) {
        await micCapture.current.stopCapture();
      }
    } else {
      setIsStarting(true);
      try {
        if (mode === 'file') {
          // Hayes.wavを使用（テスト用）
          await startFromFile('Hayes.wav');
        } else {
          // マイクモード：先にマイクキャプチャを開始
          if (micCapture.current) {
            await micCapture.current.startCapture();
            console.log('[UniVoicePerfectIntegration] Microphone capture started');
          }
          await startFromMicrophone();
        }
      } catch (err) {
        console.error('Failed to start:', err);
        // エラー時はマイクキャプチャも停止
        if (micCapture.current?.isCapturing()) {
          await micCapture.current.stopCapture();
        }
      } finally {
        setIsStarting(false);
      }
    }
  }, [isRunning, mode, startFromFile, startFromMicrophone, stop]);
  
  // User translation handler
  const handleUserTranslate = useCallback(async (text: string, from: string, to: string): Promise<string> => {
    try {
      const result = await translateUserInput(text, from, to);
      return result;
    } catch (err) {
      console.error('Translation failed:', err);
      return '';
    }
  }, [translateUserInput]);
  
  // Error notification
  React.useEffect(() => {
    if (error) {
      console.error('[UniVoicePerfectIntegration] Error:', error);
      // Auto-clear error after 5 seconds
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);
  
  // Final report notification
  React.useEffect(() => {
    if (finalReport) {
      console.log('[UniVoicePerfectIntegration] Final report generated');
      // Could open a modal or save to file
    }
  }, [finalReport]);
  
  return (
    <>
      {/* Debug panel */}
      {true && (
        <div style={{
          position: 'fixed',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 9999,
          maxWidth: '300px'
        }}>
          <div>Status: {isRunning ? 'Running' : 'Stopped'}</div>
          <div>Mode: {mode}</div>
          <div>History: {history.length} entries</div>
          <div>Summaries: {summaries.length}</div>
          {error && <div style={{color: '#ff6b6b'}}>Error: {error}</div>}
          <div style={{ marginTop: '10px' }}>
            <label>
              <input 
                type="radio" 
                checked={mode === 'file'} 
                onChange={() => setMode('file')}
                disabled={isRunning}
              />
              Test (Hayes.wav)
            </label>
            <label style={{ marginLeft: '10px' }}>
              <input 
                type="radio" 
                checked={mode === 'mic'} 
                onChange={() => setMode('mic')}
                disabled={isRunning}
              />
              Live Mic
            </label>
          </div>
          <button 
            onClick={handleStartStop}
            disabled={isStarting}
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              background: isRunning ? '#ff6b6b' : '#51cf66',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: isStarting ? 'wait' : 'pointer'
            }}
          >
            {isStarting ? 'Starting...' : (isRunning ? 'Stop' : 'Start')}
          </button>
        </div>
      )}
      
      {/* Main UniVoicePerfect component with data injection */}
      <UniVoicePerfect
        // ③④ Current blocks - リアルタイム翻訳（複数行対比表示）
        currentOriginalOverride={currentOriginal}
        currentTranslationOverride={currentTranslation}
        realtimeSegmentsOverride={realtimeSegments}
        
        // ①② History blocks - 完了した翻訳履歴（数文ごとにグループ化）
        historyOverride={groupedHistory.map((group, groupIndex) => ({
          id: `group_${groupIndex}`,
          original: group.map(t => t.original).join(' '),
          translation: group.map(t => t.japanese).join(' '),
          isComplete: true,
          timestamp: group[group.length - 1]?.timestamp || Date.now()
        }))}
        
        // ⑤⑥ Summary blocks - Progressive要約
        summaryOverride={summaries.length > 0 ? {
          english: summaries[summaries.length - 1].english,
          japanese: summaries[summaries.length - 1].japanese
        } : undefined}
        
        // ⑦⑧ User translation - ユーザー入力翻訳
        onUserTranslate={handleUserTranslate}
        
        // Pipeline state
        isRunning={isRunning}
        pipelineError={error}
        
        // Session control - これが欠けていた！
        onStartSession={async () => {
          if (mode === 'file') {
            await startFromFile('Hayes.wav');
          } else {
            await startFromMicrophone();
          }
        }}
        onStopSession={stop}
      />
    </>
  );
};