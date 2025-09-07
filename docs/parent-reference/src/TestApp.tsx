import React, { useState } from 'react';

export const TestApp: React.FC = () => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('初期状態');

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1 style={{ color: 'blue' }}>UniVoice テストアプリ</h1>
      <p>これが表示されていれば、Reactは正常に動作しています。</p>
      
      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc' }}>
        <p>カウント: {count}</p>
        <button 
          onClick={() => setCount(count + 1)}
          style={{ padding: '10px', marginRight: '10px' }}
        >
          カウントアップ
        </button>
        <button 
          onClick={() => setCount(0)}
          style={{ padding: '10px' }}
        >
          リセット
        </button>
      </div>

      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc' }}>
        <p>メッセージ: {message}</p>
        <button 
          onClick={() => setMessage('ボタンがクリックされました！')}
          style={{ padding: '10px' }}
        >
          メッセージ変更
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <p>window.electron存在チェック: {window.electron ? '✅ あり' : '❌ なし'}</p>
        <p>現在時刻: {new Date().toLocaleTimeString('ja-JP')}</p>
      </div>
    </div>
  );
};