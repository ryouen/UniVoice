/**
 * HistoryWindow - 全文履歴表示ウィンドウ
 * 
 * SummaryWindowの実装をベースに、履歴データ表示用に最適化
 * メイン画面と同じ設定（テーマ、フォントサイズ、表示モード）を共有
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import classNames from 'classnames';
import type { HistoryWindowProps, HistoryEntry, FullHistoryData } from '../types/history-window.types';
import styles from './HistoryWindow.module.css';

/**
 * 履歴ウィンドウコンポーネント
 */
export const HistoryWindow: React.FC<HistoryWindowProps> = ({
  historyData,
  currentTheme,
  fontScale,
  displayMode,
  searchQuery = '',
  onThemeChange,
  onFontScaleChange,
  onDisplayModeChange,
  onSearchChange,
  onExport,
  onClose
}) => {
  // 内部状態（プロップスと同期）
  const [internalTheme, setInternalTheme] = useState(currentTheme);
  const [internalFontScale, setInternalFontScale] = useState(fontScale);
  const [internalDisplayMode, setInternalDisplayMode] = useState(displayMode);
  const [internalSearchQuery, setInternalSearchQuery] = useState(searchQuery);
  const [loading, setLoading] = useState(!historyData);
  const [localHistoryData, setLocalHistoryData] = useState<FullHistoryData | null>(historyData || null);

  // プロップスの変更を内部状態に反映
  useEffect(() => {
    setInternalTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    setInternalFontScale(fontScale);
  }, [fontScale]);

  useEffect(() => {
    setInternalDisplayMode(displayMode);
  }, [displayMode]);

  // 履歴データの取得（プロップスで渡されない場合）
  useEffect(() => {
    if (!historyData && loading) {
      // IPCで履歴データを取得
      fetchHistoryData();
    }
  }, [historyData, loading]);

  // IPCで履歴データを取得
  const fetchHistoryData = async () => {
    try {
      if (window.univoice?.getFullHistory) {
        const data = await window.univoice.getFullHistory();
        setLocalHistoryData(data);
        setLoading(false);
      } else {
        // デモデータ（開発用）
        setLocalHistoryData({
          blocks: [],
          entries: [
            {
              id: '1',
              original: 'Welcome to UniVoice history window.',
              translation: 'UniVoiceの履歴ウィンドウへようこそ。',
              timestamp: Date.now() - 60000
            },
            {
              id: '2',
              original: 'This window shows all your transcription and translation history.',
              translation: 'このウィンドウには、すべての文字起こしと翻訳の履歴が表示されます。',
              timestamp: Date.now() - 30000
            }
          ],
          metadata: {
            totalSegments: 2,
            totalSentences: 2,
            totalWords: 15,
            duration: 60000
          }
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch history data:', error);
      setLoading(false);
    }
  };

  // 検索フィルタリング
  const filteredEntries = useMemo(() => {
    if (!localHistoryData?.entries) return [];
    if (!internalSearchQuery.trim()) return localHistoryData.entries;

    const query = internalSearchQuery.toLowerCase();
    return localHistoryData.entries.filter(entry =>
      entry.original.toLowerCase().includes(query) ||
      entry.translation.toLowerCase().includes(query)
    );
  }, [localHistoryData, internalSearchQuery]);

  // 表示モード変更ハンドラー
  const handleDisplayModeChange = useCallback((mode: 'both' | 'source' | 'target') => {
    setInternalDisplayMode(mode);
    onDisplayModeChange(mode);
    
    // メインウィンドウに設定変更を通知
    if (window.electronAPI) {
      window.electronAPI.send('settings-updated', {
        theme: internalTheme,
        fontScale: internalFontScale,
        displayMode: mode
      });
    }
  }, [internalTheme, internalFontScale, onDisplayModeChange]);

  // テーマ切り替えハンドラー
  const cycleTheme = useCallback(() => {
    const themes: Array<'light' | 'dark' | 'purple'> = ['light', 'dark', 'purple'];
    const currentIndex = themes.indexOf(internalTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setInternalTheme(nextTheme);
    onThemeChange(nextTheme);
    
    // メインウィンドウに設定変更を通知
    if (window.electronAPI) {
      window.electronAPI.send('settings-updated', {
        theme: nextTheme,
        fontScale: internalFontScale,
        displayMode: internalDisplayMode
      });
    }
  }, [internalTheme, internalFontScale, internalDisplayMode, onThemeChange]);

  // フォントサイズ変更ハンドラー
  const changeFontScale = useCallback((direction: -1 | 0 | 1) => {
    let newScale = internalFontScale;
    
    switch (direction) {
      case 0:
        newScale = 1;
        break;
      case 1:
        newScale = Math.min(2.0, internalFontScale * 1.1);
        break;
      case -1:
        newScale = Math.max(0.7, internalFontScale * 0.9);
        break;
    }
    
    setInternalFontScale(newScale);
    onFontScaleChange(newScale);
    
    // メインウィンドウに設定変更を通知
    if (window.electronAPI) {
      window.electronAPI.send('settings-updated', {
        theme: internalTheme,
        fontScale: newScale,
        displayMode: internalDisplayMode
      });
    }
  }, [internalTheme, internalDisplayMode, internalFontScale, onFontScaleChange]);

  // 検索ハンドラー
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInternalSearchQuery(value);
    onSearchChange?.(value);
  }, [onSearchChange]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+B/S/T: 表示モード
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            handleDisplayModeChange('source');
            break;
          case 'b':
            handleDisplayModeChange('both');
            break;
          case 't':
            handleDisplayModeChange('target');
            break;
        }
      }
      
      // Ctrl/Cmd+0/+/-: フォントサイズ
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '0':
            changeFontScale(0);
            break;
          case '+':
          case '=':
            changeFontScale(1);
            break;
          case '-':
            changeFontScale(-1);
            break;
          case 'f':
            // フォーカスを検索ボックスに移動
            e.preventDefault();
            const searchInput = document.getElementById('history-search-input');
            searchInput?.focus();
            break;
        }
      }
      
      // Escape: ウィンドウを閉じる
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleDisplayModeChange, changeFontScale, onClose]);

  // テーマクラスの取得
  const getThemeClass = useCallback((baseClass: string) => {
    const themeSuffix = internalTheme.charAt(0).toUpperCase() + internalTheme.slice(1);
    
    if (baseClass === 'button') {
      return classNames(styles.button, styles[`button${themeSuffix}`]);
    }
    
    return classNames(
      styles[baseClass],
      styles[`${baseClass}${themeSuffix}`]
    );
  }, [internalTheme]);

  // フォントスケールのCSS変数設定
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', internalFontScale.toString());
  }, [internalFontScale]);
  
  // メインウィンドウからの設定変更を受信
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const cleanup = window.electronAPI.on('settings-updated', (_event: any, settings: {
      theme?: string;
      fontScale?: number;
      displayMode?: string;
    }) => {
      if (settings.theme && settings.theme !== internalTheme) {
        setInternalTheme(settings.theme as 'light' | 'dark' | 'purple');
      }
      if (settings.fontScale && settings.fontScale !== internalFontScale) {
        setInternalFontScale(settings.fontScale);
      }
      if (settings.displayMode && settings.displayMode !== internalDisplayMode) {
        setInternalDisplayMode(settings.displayMode as 'both' | 'source' | 'target');
      }
    });
    
    return cleanup;
  }, [internalTheme, internalFontScale, internalDisplayMode]);

  return (
    <div className={classNames(styles.historyWindow, styles.glassmorphism, getThemeClass('window'))}>
      {/* ヘッダーバー */}
      <div className={getThemeClass('headerBar')}>
        {/* 左側: 表示モードボタン群 + テーマボタン */}
        <div style={{display: 'flex', alignItems: 'center', gap: 'var(--button-gap)'}}>
          <button
            className={classNames(
              getThemeClass('button'),
              internalDisplayMode === 'both' && styles.active
            )}
            onClick={() => handleDisplayModeChange('both')}
            title="両方表示 (Alt+B)"
            style={{width: 'var(--button-size)', height: 'var(--button-size)'}}
          >
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
              <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.5"/>
            </svg>
          </button>
          
          <button
            className={classNames(
              getThemeClass('button'),
              internalDisplayMode === 'source' && styles.active
            )}
            onClick={() => handleDisplayModeChange('source')}
            title="原文のみ (Alt+S)"
            style={{width: 'var(--button-size)', height: 'var(--button-size)'}}
          >
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
              <rect x="1" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
              <rect x="10" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
            </svg>
          </button>
          
          <button
            className={classNames(
              getThemeClass('button'),
              internalDisplayMode === 'target' && styles.active
            )}
            onClick={() => handleDisplayModeChange('target')}
            title="翻訳のみ (Alt+T)"
            style={{width: 'var(--button-size)', height: 'var(--button-size)'}}
          >
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
              <rect x="1" y="1" width="7" height="10" rx="1" stroke="currentColor" fill="none" opacity="0.3"/>
              <rect x="10" y="1" width="7" height="10" rx="1" fill="currentColor" opacity="0.8"/>
            </svg>
          </button>
          
          {/* テーマボタン - 56pxグループ間隔 */}
          <div style={{ marginLeft: 'calc(var(--group-gap) - var(--button-gap))' }}>
            <button className={getThemeClass('button')} onClick={cycleTheme} title="テーマ切り替え" style={{ width: 'var(--button-size)', height: 'var(--button-size)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M8 2 A6 6 0 0 1 8 14 A3 3 0 0 0 8 2" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 中央: 検索ボックス */}
        <div className={styles.centerSection}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={styles.searchIcon}>
              <circle cx="6.5" cy="6.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M10 10L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              id="history-search-input"
              type="text"
              value={internalSearchQuery}
              onChange={handleSearchChange}
              placeholder="検索... (Ctrl+F)"
              className={styles.searchInput}
            />
            {internalSearchQuery && (
              <button
                className={styles.clearButton}
                onClick={() => {
                  setInternalSearchQuery('');
                  onSearchChange?.('');
                }}
                title="クリア"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
          {localHistoryData && (
            <span className={styles.resultCount}>
              {filteredEntries.length} / {localHistoryData.entries.length} 件
            </span>
          )}
        </div>

        {/* 右側: フォントサイズ + エクスポート + 閉じるボタン */}
        <div className={styles.rightSection}>
          {/* フォントサイズボタン群 */}
          <div className={styles.fontButtonGroup}>
            <button className={getThemeClass('button')} onClick={() => changeFontScale(-1)} title="文字を小さく (Ctrl+-)" style={{width: 'var(--button-size)', height: 'var(--button-size)'}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            <button className={getThemeClass('button')} onClick={() => changeFontScale(0)} title="リセット (Ctrl+0)" style={{width: 'var(--button-size)', height: 'var(--button-size)'}}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>T</span>
            </button>
            
            <button className={getThemeClass('button')} onClick={() => changeFontScale(1)} title="文字を大きく (Ctrl++)" style={{width: 'var(--button-size)', height: 'var(--button-size)'}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4 L9 14 M4 9 L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* エクスポートボタン */}
          {onExport && (
            <button 
              className={getThemeClass('button')} 
              onClick={onExport} 
              title="エクスポート" 
              style={{ marginLeft: 'calc(var(--button-gap))', width: 'var(--button-size)', height: 'var(--button-size)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2L8 10M5 7L8 10L11 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L14 12L14 14L2 14Z" fill="currentColor"/>
              </svg>
            </button>
          )}

          {/* 閉じるボタン - Chromeタブスタイル、56pxマージン */}
          <button className={getThemeClass('button')} onClick={onClose} title="閉じる (Esc)" style={{ marginLeft: 'calc(var(--group-gap) - var(--button-gap))', width: 'var(--button-size)', height: 'var(--button-size)' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" fill="currentColor" fillOpacity="0.1"/>
              <path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className={styles.contentArea}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>履歴を読み込み中...</span>
          </div>
        ) : !localHistoryData || filteredEntries.length === 0 ? (
          <div className={styles.empty}>
            {internalSearchQuery ? '検索結果が見つかりませんでした' : '履歴がありません'}
          </div>
        ) : (
          <div className={classNames(
            styles.historyContent,
            styles[`mode-${internalDisplayMode}`]
          )}>
            {/* 履歴エントリーのリスト */}
            <div className={styles.historyList}>
              {filteredEntries.map((entry) => (
                <div key={entry.id} className={styles.historyItem}>
                  <div className={styles.timestamp}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  
                  {/* 両方表示または原文のみ */}
                  {internalDisplayMode !== 'target' && (
                    <div className={styles.originalText}>
                      {entry.speaker && (
                        <span className={styles.speaker}>{entry.speaker}: </span>
                      )}
                      {entry.original}
                    </div>
                  )}
                  
                  {/* 両方表示の場合の区切り線 */}
                  {internalDisplayMode === 'both' && (
                    <div className={styles.itemDivider} />
                  )}
                  
                  {/* 両方表示または翻訳のみ */}
                  {internalDisplayMode !== 'source' && (
                    <div className={styles.translatedText}>
                      {entry.translation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};