/**
 * UI統合テスト - 単語帳・最終レポート表示
 * 
 * UniVoicePerfect.tsx に追加するUI要素の例
 */

// ======================================
// 1. 単語帳・レポート生成ボタンの追加
// ======================================

// UniVoicePerfect.tsx の制御ボタンセクションに追加:
/*
<div className="control-buttons">
  {/* 既存のボタン... */}
  
  {/* 単語帳・レポート生成ボタン */}
  {isRunning && (
    <div className="advanced-actions" style={{ marginTop: '10px' }}>
      <button
        onClick={generateVocabulary}
        className="generate-vocab-btn"
        style={{
          padding: '8px 16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '10px'
        }}
      >
        📚 単語帳生成
      </button>
      
      <button
        onClick={generateFinalReport}
        className="generate-report-btn"
        style={{
          padding: '8px 16px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        📝 最終レポート生成
      </button>
    </div>
  )}
</div>
*/

// ======================================
// 2. 単語帳表示セクション
// ======================================

// 要約セクションの後に追加:
/*
{vocabulary.length > 0 && (
  <div className="vocabulary-section" style={{ marginTop: '20px' }}>
    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
      📚 重要用語集 ({vocabulary.length}個)
    </h3>
    <div className="vocabulary-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '15px'
    }}>
      {vocabulary.map((item, index) => (
        <div key={index} className="vocabulary-item" style={{
          backgroundColor: '#f5f5f5',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h4 style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
            {item.term}
          </h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
            {item.definition}
          </p>
          {item.context && (
            <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
              文脈: {item.context}
            </p>
          )}
        </div>
      ))}
    </div>
  </div>
)}
*/

// ======================================
// 3. 最終レポート表示セクション
// ======================================

// 単語帳セクションの後に追加:
/*
{finalReport && (
  <div className="final-report-section" style={{ marginTop: '20px' }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>
        📝 最終レポート
      </h3>
      <button
        onClick={() => downloadReport(finalReport)}
        style={{
          padding: '6px 12px',
          backgroundColor: '#FF9800',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        💾 ダウンロード
      </button>
    </div>
    <div className="report-content" style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #ddd',
      maxHeight: '500px',
      overflowY: 'auto',
      fontFamily: 'Georgia, serif',
      lineHeight: '1.6'
    }}>
      <div dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(finalReport) }} />
    </div>
  </div>
)}
*/

// ======================================
// 4. ヘルパー関数
// ======================================

// レポートダウンロード関数
const downloadReport = (report: string) => {
  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lecture-report-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 簡易Markdown→HTML変換（実際の実装では適切なライブラリを使用）
const convertMarkdownToHTML = (markdown: string) => {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Lists
    .replace(/^\* (.+)$/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // Wrap in paragraphs
    .replace(/^(.+)$/gim, '<p>$1</p>');
};

// ======================================
// 5. スタイリング例（CSS-in-JS）
// ======================================

const styles = {
  vocabularySection: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#fafafa',
    borderRadius: '10px'
  },
  vocabularyItem: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
    }
  },
  reportSection: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px'
  },
  reportContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    fontSize: '16px',
    lineHeight: '1.8',
    '& h1': { fontSize: '24px', marginBottom: '16px' },
    '& h2': { fontSize: '20px', marginBottom: '12px' },
    '& h3': { fontSize: '18px', marginBottom: '10px' },
    '& ul': { marginLeft: '20px', marginBottom: '10px' },
    '& li': { marginBottom: '5px' }
  }
};

// ======================================
// 6. 統合時の注意点
// ======================================

console.log(`
📌 UI統合チェックリスト:

1. useUnifiedPipeline から必要な値と関数を取得:
   - vocabulary (単語帳データ)
   - finalReport (レポートMarkdown)
   - generateVocabulary (単語帳生成関数)
   - generateFinalReport (レポート生成関数)

2. ボタンの配置:
   - セッション実行中のみ表示
   - 既存の制御ボタンの下に配置
   - アイコンと色で視覚的に区別

3. 表示エリア:
   - 要約セクションの後に配置
   - 折りたたみ可能にする（オプション）
   - スクロール可能な領域として実装

4. エラーハンドリング:
   - 生成中のローディング表示
   - エラー時のメッセージ表示
   - 再試行ボタンの提供

5. レスポンシブデザイン:
   - モバイル表示対応
   - グリッドレイアウトの調整
   - フォントサイズの最適化

6. アクセシビリティ:
   - キーボードナビゲーション
   - スクリーンリーダー対応
   - 適切なARIAラベル
`);

export { downloadReport, convertMarkdownToHTML, styles };