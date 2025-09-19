import React, { useEffect, useState } from 'react';
import styles from './HistoryView.module.css';

interface HistoryItem {
  id: string;
  timestamp: Date;
  original: string;
  translation: string;
  speaker?: string;
}

/**
 * HistoryView - 独立した履歴ウィンドウ用コンポーネント
 *
 * 責務:
 * - 履歴データの表示
 * - IPCで履歴データを取得
 * - 独立ウィンドウとして動作
 */
const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // IPCで履歴データを取得
    const fetchHistory = async () => {
      try {
        // TODO: 実際のIPC実装待ち
        // 現在のgetHistory APIはデータを直接返さないため、デモデータを使用

        // デモデータ（開発用）
        setHistory([
          {
            id: '1',
            timestamp: new Date(),
            original: 'This is a test message',
            translation: 'これはテストメッセージです',
            speaker: 'Speaker 1'
          },
          {
            id: '2',
            timestamp: new Date(),
            original: 'Welcome to the history window',
            translation: '履歴ウィンドウへようこそ',
            speaker: 'Speaker 2'
          }
        ]);
      } catch (err) {
        console.error('Error loading history:', err);
        setError('Error loading history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>履歴を読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>履歴</h1>
        <div className={styles.controls}>
          <button onClick={() => window.close()}>閉じる</button>
        </div>
      </header>

      <main className={styles.content}>
        {history.length === 0 ? (
          <div className={styles.empty}>履歴がありません</div>
        ) : (
          <div className={styles.historyList}>
            {history.map((item) => (
              <div key={item.id} className={styles.historyItem}>
                <div className={styles.timestamp}>
                  {new Date(item.timestamp).toLocaleString()}
                </div>
                {item.speaker && (
                  <div className={styles.speaker}>{item.speaker}</div>
                )}
                <div className={styles.original}>{item.original}</div>
                <div className={styles.translation}>{item.translation}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryView;