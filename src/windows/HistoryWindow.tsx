/**
 * HistoryWindow - 全文履歴表示ウィンドウ
 * 
 * 共通コンポーネントを使用してリファクタリング済み
 * メイン画面と同じ設定（テーマ、フォントサイズ、表示モード）を共有
 */

import React, { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef } from 'react';
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
import { ParagraphBuilder, Paragraph } from '../utils/ParagraphBuilder';
import styles from './HistoryWindow.module.css';

const countWords = (text: string): number => {
  if (!text) return 0;
  const hasCJK = /[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uF900-\uFAFF\uFF66-\uFF9D]/u.test(text);
  const cleaned = text.replace(/[。、，．？！,.!?\\s]/g, '');
  if (hasCJK) {
    return cleaned.length;
  }
  return text.trim().split(/\\s+/).filter(Boolean).length;
};

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
  // 内部状態（プロップスと同期）
  const [internalTheme, setInternalTheme] = useState(currentTheme);
  const [internalFontScale, setInternalFontScale] = useState(fontScale);
  const [internalDisplayMode, setInternalDisplayMode] = useState(displayMode);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  
  // ParagraphBuilder ref
  const paragraphBuilderRef = useRef<ParagraphBuilder | null>(null);

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
              { id: '1', sourceText: 'Hello world', targetText: 'こんにちは世界', timestamp: Date.now() - 5000 },
              { id: '2', sourceText: 'This is a test', targetText: 'これはテストです', timestamp: Date.now() - 3000 },
              { id: '3', sourceText: 'History window implementation', targetText: '履歴ウィンドウの実装', timestamp: Date.now() - 1000 }
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

  // パラグラフ再翻訳の実行
  const retranslateParagraph = useCallback(async (paragraph: Paragraph) => {
    console.log('[HistoryWindow] Retranslating paragraph:', paragraph.id);
    
    if (!window.univoice?.translateParagraph) {
      console.warn('[HistoryWindow] translateParagraph not available');
      return;
    }
    
    try {
      // 再翻訳APIを呼び出し
      await window.univoice.translateParagraph({
        paragraphId: paragraph.id,
        sourceText: paragraph.combinedSourceText,
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        correlationId: `para_trans_${paragraph.id}`
      });
      
      // 翻訳結果はtranslation-completeイベントで受信される
      console.log('[HistoryWindow] Paragraph retranslation requested:', paragraph.id);
    } catch (error) {
      console.error('[HistoryWindow] Failed to retranslate paragraph:', error);
      setParagraphs(prev => prev.map(p => 
        p.id === paragraph.id 
          ? { ...p, status: 'completed' as const }
          : p
      ));
    }
  }, []);

  // 履歴データからパラグラフを構築
  useEffect(() => {
    if (!historyData?.entries || historyData.entries.length === 0) return;
    
    // 既存の履歴エントリーからパラグラフを構築
    if (!paragraphBuilderRef.current) {
      paragraphBuilderRef.current = new ParagraphBuilder({
        minChunks: 15,
        maxChunks: 30,
        silenceThresholdMs: 5000,
        onParagraphComplete: (paragraph) => {
          console.log('[HistoryWindow] Paragraph completed:', paragraph.id);
          setParagraphs(prev => [...prev, paragraph]);
          // パラグラフ完成時に再翻訳を実行
          retranslateParagraph(paragraph);
        }
      });
    }
    
    // 履歴エントリーをParagraphBuilderに追加
    historyData.entries.forEach((entry) => {
      if (paragraphBuilderRef.current && entry.timestamp) {
        paragraphBuilderRef.current.addSegment({
          id: entry.id,
          sourceText: entry.sourceText,
          targetText: entry.targetText,
          timestamp: entry.timestamp
        });
      }
    });
    
    // 最後のパラグラフをフラッシュ
    if (paragraphBuilderRef.current) {
      paragraphBuilderRef.current.flush();
    }
    
    return () => {
      if (paragraphBuilderRef.current) {
        paragraphBuilderRef.current.reset();
      }
    };
  }, [historyData, retranslateParagraph]);

  // パラグラフ再翻訳の結果のみを受信
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const handleTranslationComplete = (_event: any, data: {
      sourceText: string;
      targetText: string;
      sourceLanguage: string;
      targetLanguage: string;
      correlationId: string;
      segmentId?: string;
    }) => {
      // パラグラフ再翻訳の場合のみ処理
      if (data.correlationId?.startsWith('para_trans_')) {
        console.log('[HistoryWindow] Received paragraph retranslation:', data);
        const paragraphId = data.segmentId || data.correlationId.replace('para_trans_', '');
        setParagraphs(prev => prev.map(p => 
          p.id === paragraphId 
            ? { ...p, retranslatedText: data.targetText, status: 'completed' as const }
            : p
        ));
        console.log('[HistoryWindow] Updated paragraph translation:', paragraphId);
      }
      // 通常の翻訳は無視（リアルタイム更新は不要）
    };
    
    const cleanup = window.electronAPI.on('translation-complete', handleTranslationComplete);
    
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
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
      const matches = entry.sourceText.toLowerCase().includes(query) ||
                     entry.targetText.toLowerCase().includes(query);
      if (matches) count++;
      return matches;
    });
  }, [historyData, deferredSearchQuery]);

  // パラグラフの検索フィルタリング
  const filteredParagraphs = useMemo(() => {
    if (!deferredSearchQuery) return paragraphs;
    
    const query = deferredSearchQuery.toLowerCase();
    return paragraphs.filter(para => 
      para.combinedSourceText.toLowerCase().includes(query) ||
      para.combinedTargetText?.toLowerCase().includes(query) ||
      para.retranslatedText?.toLowerCase().includes(query)
    );
  }, [paragraphs, deferredSearchQuery]);

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
  const handleClose = useCallback(async () => {
    // パラグラフデータを保存
    if (paragraphs.length > 0 && window.univoice?.saveHistoryBlock) {
      console.log('[HistoryWindow] Saving paragraph data...');
      
      // 各パラグラフをブロックとして保存
      for (const paragraph of paragraphs) {
        try {
          await window.univoice.saveHistoryBlock({
            block: {
              id: paragraph.id,
              sentences: paragraph.segments.map(seg => ({
                id: seg.id,
                sourceText: seg.sourceText,
                targetText: paragraph.retranslatedText || seg.targetText,
                timestamp: seg.timestamp
              })),
              createdAt: paragraph.startTime,
              totalHeight: paragraph.segments.length * 60, // 推定高さ
              isParagraph: true,
              paragraphId: paragraph.id,
              rawText: paragraph.combinedSourceText,
              duration: paragraph.endTime - paragraph.startTime
            }
          });
          console.log('[HistoryWindow] Saved paragraph:', paragraph.id);
        } catch (error) {
          console.error('[HistoryWindow] Failed to save paragraph:', paragraph.id, error);
        }
      }
    }
    
    // 現在のパラグラフをフラッシュして保存
    if (paragraphBuilderRef.current) {
      paragraphBuilderRef.current.flush();
    }
    
    // コールバックを実行
    onClose();
    
    // 実際にウィンドウを閉じる
    if (window.univoice?.window?.close) {
      window.univoice.window.close();
    }
  }, [onClose, paragraphs]);

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
          ) : filteredParagraphs.length === 0 && filteredEntries.length > 0 ? (
            <div className={styles.emptyState}>
              <span>パラグラフを構築中です...</span>
            </div>
          ) : (filteredEntries.length === 0 && filteredParagraphs.length === 0) ? (
            <div className={styles.emptyState}>
              <span>
                {searchQuery ? '検索結果がありません' : '履歴データがありません'}
              </span>
            </div>
          ) : (
            // パラグラフビュー
            <>
              {/* 左側: 原文パラグラフ */}
              {internalDisplayMode !== 'target' && (
                <div className={styles.sourceColumn}>
                  {filteredParagraphs.map((para) => (
                    <div key={para.id} className={classNames(styles.historyEntry, styles.paragraphEntry)}>
                      <div className={styles.entryHeader}>
                        <span className={styles.entryTime}>
                          {new Date(para.startTime).toLocaleTimeString('ja-JP')} - {new Date(para.endTime).toLocaleTimeString('ja-JP')}
                        </span>
                        <span className={styles.paragraphInfo}>
                          {para.segments.length}チャンク / {para.combinedSourceText.split(' ').length}語
                        </span>
                      </div>
                      <div className={styles.entryContent}>
                        {para.combinedSourceText}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 中央の区切り線 */}
              {internalDisplayMode === 'both' && (
                <div className={styles.divider} />
              )}

              {/* 右側: 再翻訳 or 結合翻訳 */}
              {internalDisplayMode !== 'source' && (
                <div className={styles.targetColumn}>
                  {filteredParagraphs.map((para) => (
                    <div key={para.id} className={classNames(styles.historyEntry, styles.paragraphEntry)}>
                      <div className={styles.entryHeader}>
                        <span className={styles.entryTime}>
                          {new Date(para.startTime).toLocaleTimeString('ja-JP')} - {new Date(para.endTime).toLocaleTimeString('ja-JP')}
                        </span>
                        {para.status === 'translating' && (
                          <span className={styles.translatingIndicator}>再翻訳中...</span>
                        )}
                      </div>
                      <div className={styles.entryContent}>
                        {para.retranslatedText || para.combinedTargetText}
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


