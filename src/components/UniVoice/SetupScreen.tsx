/**
 * SetupScreen - Session setup UI component
 * 
 * Responsibilities:
 * - Language selection
 * - Class name input
 * - Session configuration
 * - Start session trigger
 */

import React, { useState, useEffect } from 'react';

interface SetupScreenProps {
  onStartSession: (config: {
    className: string;
    sourceLanguage: string;
    targetLanguage: string;
  }) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartSession }) => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState(() => 
    localStorage.getItem('sourceLanguage') || 'en'
  );
  const [targetLanguage, setTargetLanguage] = useState(() => 
    localStorage.getItem('targetLanguage') || 'ja'
  );

  // Save language preferences
  useEffect(() => {
    localStorage.setItem('sourceLanguage', sourceLanguage);
  }, [sourceLanguage]);

  useEffect(() => {
    localStorage.setItem('targetLanguage', targetLanguage);
  }, [targetLanguage]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleStartSession();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedClass]);

  const handleStartSession = () => {
    const newClassName = (document.getElementById('newClassName') as HTMLInputElement)?.value;
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const finalClassName = selectedClass || newClassName ? 
      `${date}_${newClassName || selectedClass}` : 
      `${date}_授業`;

    onStartSession({
      className: finalClassName,
      sourceLanguage,
      targetLanguage
    });
  };

  const selectClass = (className: string) => {
    setSelectedClass(className);
  };

  return (
    <div className="setup-screen" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="setup-container" style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        width: '90%',
        maxWidth: '700px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{
          fontSize: '32px',
          color: '#333',
          marginBottom: '30px',
          textAlign: 'center'
        }}>UniVoice - 授業設定</h1>
        
        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '18px', marginBottom: '15px', color: '#555' }}>📚 授業を選択</div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
            {/* Class selection buttons would go here */}
          </div>
          <input
            type="text"
            id="newClassName"
            placeholder="新しい授業名を入力（空欄OK - 自動で日付が付きます）"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#555' }}>📖 授業の言語</h3>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                background: 'white'
              }}
            >
              <option value="en">English (英語)</option>
              <option value="ja">日本語</option>
              <option value="zh">中文 (中国語)</option>
              <option value="ko">한국어 (韓国語)</option>
              <option value="es">Español (スペイン語)</option>
              <option value="fr">Français (フランス語)</option>
              <option value="de">Deutsch (ドイツ語)</option>
            </select>
          </div>
          
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#555' }}>🌏 翻訳したい言語</h3>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                background: 'white'
              }}
            >
              <option value="ja">日本語</option>
              <option value="en">English (英語)</option>
              <option value="zh">中文 (中国語)</option>
              <option value="ko">한국어 (韓国語)</option>
              <option value="es">Español (スペイン語)</option>
              <option value="fr">Français (フランス語)</option>
              <option value="de">Deutsch (ドイツ語)</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={handleStartSession}
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🎤 授業を開始
        </button>
        
        <p style={{
          textAlign: 'center',
          color: '#999',
          fontSize: '14px',
          marginTop: '15px'
        }}>
          ヒント: スペースキーでも開始できます
        </p>
      </div>
    </div>
  );
};