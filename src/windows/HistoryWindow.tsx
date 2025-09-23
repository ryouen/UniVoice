/**
 * HistoryWindow - 全文履歴表示ウィンドウ
 * 
 * 共通コンポーネントを使用してリファクタリング済み
 * メイン画面と同じ設定（テーマ、フォントサイズ、表示モード）を共有
 */

import React, { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import type { HistoryWindowProps, HistoryEntry, HistoryData } from '../types/history-window.types';
import {
  WindowContainer,
  WindowHeader,
  DisplayModeButtons,
  ThemeButton,
  FontSizeButtons,
  CloseButton,
  BaseButton,
  ContentArea
} from '../components/shared/window';
import styles from './HistoryWindow.module.css';

/**
 * 履歴ウィンドウコンポーネント
 */
export const HistoryWindow: React.FC<HistoryWindowProps> = ({
  currentTheme = 'light',
  fontScale = 1.0,
  displayMode = 'both',
  onThemeChange = () => {},
  onFontScaleChange = () => {},
  onDisplayModeChange = () => {},
  onClose = () => {}
}) => {
  const navigate = useNavigate();
  // 内部状態（プロップスと同期）
  const [internalTheme, setInternalTheme] = useState(currentTheme);
  const [internalFontScale, setInternalFontScale] = useState(fontScale);
  const [internalDisplayMode, setInternalDisplayMode] = useState(displayMode);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // 履歴データの取得
  useEffect(() => {
    const loadHistoryData = async () => {
      setIsLoading(true);
      try {
        // 開発環境用のモックデータ
        if (!window.univoice?.getFullHistory) {
          console.warn('[HistoryWindow] getFullHistory not available, using mock data');
          setHistoryData({
            entries: [
              { id: '1', original: 'Hello world', translation: 'こんにちは世界', timestamp: Date.now() - 5000 },
              { id: '2', original: 'This is a test', translation: 'これはテストです', timestamp: Date.now() - 3000 },
              { id: '3', original: 'History window implementation', translation: '履歴ウィンドウの実装', timestamp: Date.now() - 1000 }
            ],
            metadata: {
              totalSegments: 3,
              totalSentences: 3,
              totalWords: 10,
              duration: 5000,
              startTime: Date.now() - 5000,
              endTime: Date.now()
            }
          });
          setIsLoading(false);
          return;
        }
        
        const data = await window.univoice.getFullHistory();
        if (data && data.entries) {
          setHistoryData(data);
        }
      } catch (error) {
        console.error('Failed to load history data:', error);
        setError(error instanceof Error ? error.message : '履歴データの読み込みに失敗しました');
        // エラー時もUIが確認できるようモックデータを設定
        setHistoryData({
          entries: [],
          metadata: {
            totalSegments: 0,
            totalSentences: 0,
            totalWords: 0,
            duration: 0
          }
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHistoryData();
  }, []);
  
  // 検索クエリの遅延値（パフォーマンス向上）
  const deferredSearchQuery = useDeferredValue(searchQuery);
  
  // 検索フィルタリング（最適化済み）
  const filteredEntries = useMemo(() => {
    if (!historyData?.entries) return [];
    
    if (!deferredSearchQuery) return historyData.entries;
    
    const query = deferredSearchQuery.toLowerCase();
    // パフォーマンス改善：最大10,000件まで表示
    const MAX_DISPLAY_ITEMS = 10000;
    let count = 0;
    
    return historyData.entries.filter(entry => {
      if (count >= MAX_DISPLAY_ITEMS) return false;
      const matches = entry.original.toLowerCase().includes(query) ||
                     entry.translation.toLowerCase().includes(query);
      if (matches) count++;
      return matches;
    });
  }, [historyData, deferredSearchQuery]);

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

  // テーマ変更ハンドラー
  const handleThemeChange = useCallback((nextTheme: 'light' | 'dark' | 'purple') => {
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
  }, [internalFontScale, internalDisplayMode, onThemeChange]);

  // フォントサイズ変更ハンドラー
  const handleFontScaleChange = useCallback((newScale: number) => {
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
  }, [internalTheme, internalDisplayMode, onFontScaleChange]);

  // 検索クエリのクリア
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // ウィンドウを閉じる処理
  const handleClose = useCallback(() => {
    // コールバックを実行
    onClose();
    // メイン画面に戻る
    navigate('/');
  }, [onClose, navigate]);

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
            handleFontScaleChange(1);
            break;
          case '+':
          case '=':
            handleFontScaleChange(Math.min(2.0, internalFontScale * 1.1));
            break;
          case '-':
            handleFontScaleChange(Math.max(0.7, internalFontScale / 1.1));
            break;
        }
      }
      
      // Escapeキー: ウィンドウを閉じる
      if (e.key === 'Escape') {
        if (searchQuery) {
          clearSearch();
        } else {
          handleClose();
        }
      }
      
      // Ctrl/Cmd+F: 検索にフォーカス
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleDisplayModeChange, handleFontScaleChange, internalFontScale, searchQuery, clearSearch, handleClose]);


  
  // メインウィンドウからの設定変更を受信
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const handleSettingsUpdate = (_event: any, settings: {
      theme?: string;
      fontScale?: number;
      displayMode?: string;
    }) => {
      if (settings.theme) {
        setInternalTheme(settings.theme as 'light' | 'dark' | 'purple');
      }
      if (settings.fontScale) {
        setInternalFontScale(settings.fontScale);
      }
      if (settings.displayMode) {
        setInternalDisplayMode(settings.displayMode as 'both' | 'source' | 'target');
      }
    };
    
    window.electronAPI.on('settings-updated', handleSettingsUpdate);
    
    return () => {
      window.electronAPI.removeListener('settings-updated', handleSettingsUpdate);
    };
  }, []); // 依存配列を空にして再登録を防ぐ

  return (
    <WindowContainer theme={internalTheme} fontScale={internalFontScale} className={styles.historyWindow}>
      <WindowHeader
        theme={internalTheme}
        leftSection={
          <div style={{display: 'flex', alignItems: 'center', gap: 'var(--button-gap)'}}>
            <DisplayModeButtons
              mode={internalDisplayMode}
              onModeChange={handleDisplayModeChange}
              theme={internalTheme}
            />
            {/* テーマボタン - 56pxグループ間隔 */}
            <div style={{ marginLeft: 'calc(var(--group-gap) - var(--button-gap))' }}>
              <ThemeButton
                theme={internalTheme}
                onThemeChange={handleThemeChange}
              />
            </div>
          </div>
        }

        centerSection={
          <div className={styles.searchSection}>
            <div className={styles.searchBox}>
              <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M10 10l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                className={`${styles.searchInput} search-input`}
                placeholder="履歴を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <BaseButton
                  theme={internalTheme}
                  className={styles.clearButton}
                  onClick={clearSearch}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </BaseButton>
              )}
            </div>
          </div>
        }

        rightSection={
          <div className={styles.rightSection}>
            {/* フォントサイズボタン群 */}
            <FontSizeButtons
              fontScale={internalFontScale}
              onFontScaleChange={handleFontScaleChange}
              theme={internalTheme}
            />

            {/* 閉じるボタン - Chromeタブスタイル、56pxマージン */}
            <div style={{ marginLeft: 'calc(var(--group-gap) - var(--button-gap))' }}>
              <CloseButton
                theme={internalTheme}
                onClick={handleClose}
              />
            </div>
          </div>
        }
      />

      {/* メインコンテンツ */}
      <ContentArea theme={internalTheme}>
        <div className={classNames(
          styles.historyContent,
          styles[`mode-${internalDisplayMode}`]
        )}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <span>履歴を読み込み中...</span>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <span>⚠️ {error}</span>
              <button onClick={() => window.location.reload()} className={styles.retryButton}>
                再読み込み
              </button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className={styles.emptyState}>
              <span>
                {searchQuery ? '検索結果がありません' : '履歴データがありません'}
              </span>
            </div>
          ) : (
            <>
              {/* 左側: 原文 */}
              {internalDisplayMode !== 'target' && (
                <div className={styles.sourceColumn}>
                  {filteredEntries.map((entry, index) => (
                    <div key={entry.id || index} className={styles.historyEntry}>
                      <div className={styles.entryHeader}>
                        <span className={styles.entryTime}>
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('ja-JP') : ''}
                        </span>
                      </div>
                      <div className={styles.entryContent}>
                        {entry.original}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 中央の区切り線 */}
              {internalDisplayMode === 'both' && (
                <div className={styles.divider} />
              )}

              {/* 右側: 翻訳 */}
              {internalDisplayMode !== 'source' && (
                <div className={styles.targetColumn}>
                  {filteredEntries.map((entry, index) => (
                    <div key={entry.id || index} className={styles.historyEntry}>
                      <div className={styles.entryHeader}>
                        <span className={styles.entryTime}>
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('ja-JP') : ''}
                        </span>
                      </div>
                      <div className={styles.entryContent}>
                        {entry.translation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ContentArea>
    </WindowContainer>
  );
};