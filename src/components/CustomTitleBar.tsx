/**
 * CustomTitleBar Component
 * Frameless window用のカスタムタイトルバー
 */

import React, { useState, useEffect } from 'react';

interface CustomTitleBarProps {
  theme: 'light' | 'dark' | 'purple';
  onThemeChange?: (theme: 'light' | 'dark' | 'purple') => void;
}

// Themeに基づいた背景色を取得
const getThemeBackground = (theme: 'light' | 'dark' | 'purple') => {
  switch (theme) {
    case 'dark':
      return 'rgba(31, 41, 55, 0.8)';
    case 'purple':
      return 'rgba(79, 70, 229, 0.1)';
    default:
      return 'rgba(255, 255, 255, 0.8)';
  }
};

// Themeに基づいたテキスト色を取得
const getThemeTextColor = (theme: 'light' | 'dark' | 'purple') => {
  switch (theme) {
    case 'dark':
      return '#f3f4f6';
    case 'purple':
      return '#6366f1';
    default:
      return '#1f2937';
  }
};

export const CustomTitleBar: React.FC<CustomTitleBarProps> = ({
  theme,
  onThemeChange,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('win32');

  useEffect(() => {
    // Platform detection
    const detectPlatform = async () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('mac')) {
        setPlatform('darwin');
      } else if (userAgent.includes('win')) {
        setPlatform('win32');
      } else {
        setPlatform('linux');
      }
    };
    detectPlatform();

    // Check initial maximized state
    const checkMaximized = async () => {
      if (window.univoice?.window?.isMaximized) {
        const maximized = await window.univoice.window.isMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();

    // Update theme for title bar overlay
    if (platform !== 'darwin' && window.univoice?.window?.updateTheme) {
      const color = getThemeBackground(theme);
      const symbolColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
      window.univoice.window.updateTheme({ color, symbolColor });
    }
  }, [theme, platform]);

  const handleMinimize = () => {
    window.univoice?.window?.minimize();
  };

  const handleMaximize = () => {
    window.univoice?.window?.maximize();
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    window.univoice?.window?.close();
  };

  return (
    <div 
      className="custom-titlebar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '40px',
        WebkitAppRegion: 'drag',
        background: getThemeBackground(theme),
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: platform === 'darwin' ? '80px' : '20px', // macOS traffic lights space
        paddingRight: '10px',
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      {/* Application Title */}
      <div style={{ 
        fontSize: '14px', 
        fontWeight: '500',
        color: getThemeTextColor(theme),
      }}>
        UniVoice 2.0
      </div>

      {/* Window Controls - Windows only (macOS has native traffic lights) */}
      {platform !== 'darwin' && (
        <div 
          className="window-controls" 
          style={{ 
            WebkitAppRegion: 'no-drag',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <button
            onClick={handleMinimize}
            style={{
              width: '46px',
              height: '100%',
              border: 'none',
              background: 'transparent',
              color: getThemeTextColor(theme),
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label="Minimize"
          >
            ─
          </button>

          <button
            onClick={handleMaximize}
            style={{
              width: '46px',
              height: '100%',
              border: 'none',
              background: 'transparent',
              color: getThemeTextColor(theme),
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? '◱' : '□'}
          </button>

          <button
            onClick={handleClose}
            className="close-button"
            style={{
              width: '46px',
              height: '100%',
              border: 'none',
              background: 'transparent',
              color: getThemeTextColor(theme),
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e11d48';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = getThemeTextColor(theme);
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};