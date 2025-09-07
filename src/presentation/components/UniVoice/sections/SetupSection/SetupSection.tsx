/**
 * SetupSection - 初期設定画面コンポーネント
 * 
 * 責任:
 * - 授業選択
 * - 新規授業名入力
 * - セッション開始
 * 
 * Clean Architecture:
 * - UIロジックのみ（プレゼンテーション層）
 * - ビジネスロジックは含まない
 * - イベントハンドラを通じて親コンポーネントと通信
 */

import React, { useState, useEffect } from 'react';
import { ClassSelector } from './ClassSelector';
import { SessionResumeModal } from '../../modals';

// 言語選択用の設定（一時的にここで定義、後でLanguageConfigから取得）
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' }
];

export interface SetupSectionProps {
  /**
   * セッション開始時のコールバック
   * @param className 選択または入力された授業名
   * @param sourceLanguage 授業の言語
   * @param targetLanguage 母国語
   */
  onStartSession: (className: string, sourceLanguage: string, targetLanguage: string) => void;
  
  /**
   * 事前選択された授業名（オプション）
   */
  initialClassName?: string;
  
  /**
   * デフォルトの授業言語（オプション）
   */
  defaultSourceLanguage?: string;
  
  /**
   * デフォルトの母国語（オプション）
   */
  defaultTargetLanguage?: string;
  
  /**
   * カスタムスタイル（オプション）
   */
  style?: React.CSSProperties;
}

/**
 * 最近の授業リスト（LocalStorageから取得）
 */
const getRecentClasses = (): string[] => {
  try {
    const stored = localStorage.getItem('recentClasses');
    if (stored) {
      const parsed: string[] = JSON.parse(stored);
      // 日付プレフィックスを除去して重複を削除
      const cleanedArray = parsed.map((className: string) => {
        // 複数の日付プレフィックスを再帰的に除去
        let clean = className;
        while (/^\d{6}_/.test(clean)) {
          clean = clean.replace(/^\d{6}_/, '');
        }
        return clean;
      });
      const cleaned: string[] = [...new Set(cleanedArray)];
      
      // クリーンなリストが元のリストと異なる場合は保存
      if (JSON.stringify(cleaned) !== JSON.stringify(parsed)) {
        localStorage.setItem('recentClasses', JSON.stringify(cleaned));
      }
      
      return cleaned;
    }
  } catch (error) {
    console.error('Failed to load recent classes:', error);
  }
  return [];
};

/**
 * 授業リストを保存
 */
const saveRecentClasses = (classes: string[]): void => {
  try {
    localStorage.setItem('recentClasses', JSON.stringify(classes));
  } catch (error) {
    console.error('Failed to save recent classes:', error);
  }
};

export const SetupSection: React.FC<SetupSectionProps> = ({
  onStartSession,
  initialClassName = '',
  defaultSourceLanguage = 'en',
  defaultTargetLanguage = 'ja',
  style = {}
}) => {
  const [selectedClass, setSelectedClass] = useState(initialClassName);
  const [newClassName, setNewClassName] = useState('');
  const [recentClasses, setRecentClasses] = useState<string[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [todaySession, setTodaySession] = useState<{
    exists: boolean;
    sessionId?: string;
    sessionNumber?: number;
    folderName?: string;
  }>({ exists: false });
  const [checkingSession, setCheckingSession] = useState(false);
  const [showSessionResumeModal, setShowSessionResumeModal] = useState(false);
  
  // 最近の授業リストをロード
  useEffect(() => {
    const loadClasses = async () => {
      // まずLocalStorageから読み込み
      const localClasses = getRecentClasses();
      setRecentClasses(localClasses);
      
      // 実際のセッションデータから授業名を取得
      try {
        if (window.electron?.invoke) {
          const sessions = await window.electron.invoke('get-available-sessions', { limit: 100 });
          if (sessions && sessions.length > 0) {
            // 授業名のユニークなリストを作成
            const uniqueClassNames = Array.from(new Set(sessions.map((s: any) => s.courseName))) as string[];
            
            // LocalStorageのリストとマージ（重複を除く）
            const allClasses = [...localClasses, ...uniqueClassNames];
            const mergedClasses = Array.from(new Set(allClasses)) as string[];
            setRecentClasses(mergedClasses);
            
            // LocalStorageを更新
            saveRecentClasses(mergedClasses);
          }
        }
      } catch (error) {
        console.error('Failed to load saved classes:', error);
      }
    };
    
    loadClasses();
  }, []);
  
  // 当日セッション検出
  useEffect(() => {
    const checkTodaySession = async () => {
      const className = selectedClass || newClassName;
      if (!className) return;
      
      setCheckingSession(true);
      try {
        if (window.electron?.invoke) {
          const result = await window.electron.invoke('check-today-session', className);
          setTodaySession(result || { exists: false });
          console.log('[SetupSection] Today session check:', result);
        }
      } catch (error) {
        console.error('[SetupSection] Failed to check today session:', error);
        setTodaySession({ exists: false });
      } finally {
        setCheckingSession(false);
      }
    };
    
    checkTodaySession();
  }, [selectedClass, newClassName]);
  
  // キーボードショートカット（Space キー）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleStartSession();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedClass, newClassName]);
  
  /**
   * セッション開始処理
   */
  const handleStartSession = () => {
    let className = selectedClass || newClassName;
    
    if (!className) {
      // デフォルト名を生成（日付なし）
      className = '授業';
    }
    
    // 日付プレフィックスがあれば除去（後方互換性のため）
    const datePattern = /^\d{6}_/;
    if (datePattern.test(className)) {
      className = className.replace(datePattern, '');
    }
    
    // 最近の授業リストに追加（日付なしで保存）
    if (!recentClasses.includes(className)) {
      const updatedClasses = [className, ...recentClasses.slice(0, 9)];
      setRecentClasses(updatedClasses);
      saveRecentClasses(updatedClasses);
    }
    
    onStartSession(className, sourceLanguage, targetLanguage);
  };

  /**
   * セッション選択からの再開処理
   */
  const handleSelectSession = async (courseName: string, dateStr: string, sessionNumber: number) => {
    try {
      // セッションデータを読み込む
      const sessionData = await window.electron.invoke('load-session', {
        courseName,
        dateStr,
        sessionNumber
      });
      
      if (sessionData) {
        // 言語設定をセッションから復元
        setSourceLanguage(sessionData.metadata.sourceLanguage);
        setTargetLanguage(sessionData.metadata.targetLanguage);
        setSelectedClass(courseName);
        
        // セッションを開始（既存セッションとして）
        onStartSession(courseName, sessionData.metadata.sourceLanguage, sessionData.metadata.targetLanguage);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };
  
  return (
    <>
      <SessionResumeModal
        isOpen={showSessionResumeModal}
        onClose={() => setShowSessionResumeModal(false)}
        onSelectSession={handleSelectSession}
        {...(selectedClass || newClassName ? { currentCourseName: selectedClass || newClassName } : {})}
      />
      
      <div className="setup-section" style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '50px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        width: '90%',
        maxWidth: '600px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-1px'
        }}>
          UniVoice
        </h1>
        
        <p style={{
          fontSize: '20px',
          color: '#666',
          marginBottom: '50px',
          fontWeight: '300'
        }}>
          言語の壁を超えて、あなたの能力を発揮しよう
        </p>
        
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            marginBottom: '20px', 
            color: '#333',
            fontWeight: '500'
          }}>
            授業を選択
          </h3>
          
          <ClassSelector
            classes={recentClasses}
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
          />
        </div>
        
        <div style={{ marginBottom: '40px' }}>
          <p style={{
            fontSize: '14px',
            color: '#999',
            marginBottom: '10px'
          }}>
            または新しい授業名を入力
          </p>
          <input
            id="newClassName"
            type="text"
            placeholder="例: プログラミング基礎"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            style={{
              width: '100%',
              padding: '15px 20px',
              border: '2px solid #e0e0e0',
              borderRadius: '10px',
              fontSize: '16px',
              transition: 'all 0.3s',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
              setSelectedClass('');
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0';
            }}
          />
        </div>
        
        {/* 言語選択セクション */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            marginBottom: '20px', 
            color: '#333',
            fontWeight: '500'
          }}>
            言語設定
          </h3>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            {/* 授業の言語 */}
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#666',
                marginBottom: '8px'
              }}>
                授業の言語
              </label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
            
            {/* 母国語 */}
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#666',
                marginBottom: '8px'
              }}>
                母国語（翻訳先）
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* 同じ言語が選択された場合の警告 */}
          {sourceLanguage === targetLanguage && (
            <p style={{
              fontSize: '14px',
              color: '#ff6b6b',
              marginTop: '10px'
            }}>
              ⚠️ 授業の言語と母国語が同じです。翻訳は行われません。
            </p>
          )}
        </div>
        
        <button
          onClick={handleStartSession}
          style={{
            background: todaySession.exists 
              ? 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            padding: '20px 60px',
            fontSize: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: todaySession.exists
              ? '0 10px 30px rgba(67, 206, 162, 0.3)'
              : '0 10px 30px rgba(102, 126, 234, 0.3)',
            opacity: checkingSession ? 0.7 : 1
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = todaySession.exists
              ? '0 15px 40px rgba(67, 206, 162, 0.4)'
              : '0 15px 40px rgba(102, 126, 234, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = todaySession.exists
              ? '0 10px 30px rgba(67, 206, 162, 0.3)'
              : '0 10px 30px rgba(102, 126, 234, 0.3)';
          }}
          disabled={checkingSession}
        >
          {checkingSession ? '確認中...' : 
           todaySession.exists ? `続きから再開（第${todaySession.sessionNumber}回）` : 
           'セッション開始'}
        </button>
        
        <button
          onClick={() => setShowSessionResumeModal(true)}
          style={{
            background: 'transparent',
            color: '#667eea',
            border: '2px solid #667eea',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s',
            marginTop: '12px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#667eea';
            e.currentTarget.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#667eea';
          }}
        >
          過去のセッションから選択
        </button>
        
        <p style={{
          marginTop: '20px',
          fontSize: '14px',
          color: '#999'
        }}>
          スペースキーでも開始できます
        </p>
      </div>
    </div>

    {/* Session Resume Modal は上部で既に定義済み */}
  </>
  );
};