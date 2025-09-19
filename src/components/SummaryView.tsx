import React, { useEffect, useState } from 'react';
import styles from './SummaryView.module.css';

interface Summary {
  id: string;
  timestamp: Date;
  content: string;
  wordCount: number;
  type: 'short' | 'medium' | 'long' | 'full'; // 400, 800, 1600, 2400 words
}

/**
 * SummaryView - 独立した要約ウィンドウ用コンポーネント
 *
 * 責務:
 * - Progressive Summaryの表示
 * - 400/800/1600/2400語の要約切り替え
 * - IPCで要約データを取得
 * - 独立ウィンドウとして動作
 */
const SummaryView: React.FC = () => {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selectedWordCount, setSelectedWordCount] = useState<400 | 800 | 1600 | 2400>(400);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // IPCで要約データを取得
    const fetchSummaries = async () => {
      try {
        // IPCから要約を取得する処理
        // TODO: 実際のIPC実装
        setLoading(false);

        // デモデータ
        setSummaries([
          {
            id: '1',
            timestamp: new Date(),
            content: 'これは400語の要約サンプルです。授業の重要なポイントがコンパクトにまとまっています。',
            wordCount: 400,
            type: 'short'
          },
          {
            id: '2',
            timestamp: new Date(),
            content: 'これは800語の要約サンプルです。より詳細な情報が含まれ、授業の流れがよく分かります。',
            wordCount: 800,
            type: 'medium'
          },
          {
            id: '3',
            timestamp: new Date(),
            content: 'これは1600語の要約サンプルです。詳細な説明と例が含まれ、深い理解が得られます。',
            wordCount: 1600,
            type: 'long'
          },
          {
            id: '4',
            timestamp: new Date(),
            content: 'これは2400語の要約サンプルです。完全な授業内容が網羅され、すべての重要な詳細が含まれています。',
            wordCount: 2400,
            type: 'full'
          }
        ]);
      } catch (err) {
        console.error('Error loading summaries:', err);
        setError('要約の読み込みに失敗しました');
        setLoading(false);
      }
    };

    fetchSummaries();

    // IPCイベントリスナー
    const handleSummaryUpdate = (_event: any, data: any) => {
      console.log('Received summary update:', data);
      // 新しい要約を追加
    };

    // @ts-ignore
    if (window.electron?.on) {
      // @ts-ignore
      window.electron.on('progressive-summary', handleSummaryUpdate);
    }

    return () => {
      // @ts-ignore
      if (window.electron?.removeListener) {
        // @ts-ignore
        window.electron.removeListener('progressive-summary', handleSummaryUpdate);
      }
    };
  }, []);

  const handleGenerateSummary = async (wordCount: 400 | 800 | 1600 | 2400) => {
    try {
      // IPCで要約生成をリクエスト
      console.log(`Generating ${wordCount} word summary...`);
      // TODO: 実際のIPC実装
    } catch (err) {
      console.error('Error generating summary:', err);
    }
  };

  const currentSummary = summaries.find(s => s.wordCount === selectedWordCount);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>要約を読み込み中...</div>
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
        <h1>プログレッシブ要約</h1>
        <div className={styles.controls}>
          <button onClick={() => window.close()}>閉じる</button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.wordCountSelector}>
          {[400, 800, 1600, 2400].map((count) => (
            <button
              key={count}
              className={`${styles.wordCountButton} ${selectedWordCount === count ? styles.active : ''}`}
              onClick={() => setSelectedWordCount(count as 400 | 800 | 1600 | 2400)}
            >
              {count}語
            </button>
          ))}
        </div>
        <button
          className={styles.generateButton}
          onClick={() => handleGenerateSummary(selectedWordCount)}
        >
          再生成
        </button>
      </div>

      <main className={styles.content}>
        {currentSummary ? (
          <div className={styles.summary}>
            <div className={styles.summaryHeader}>
              <span className={styles.wordCount}>{currentSummary.wordCount}語の要約</span>
              <span className={styles.timestamp}>
                {new Date(currentSummary.timestamp).toLocaleString()}
              </span>
            </div>
            <div className={styles.summaryContent}>
              {currentSummary.content}
            </div>
          </div>
        ) : (
          <div className={styles.empty}>
            <p>{selectedWordCount}語の要約がまだ生成されていません</p>
            <button
              className={styles.generateButton}
              onClick={() => handleGenerateSummary(selectedWordCount)}
            >
              要約を生成
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default SummaryView;