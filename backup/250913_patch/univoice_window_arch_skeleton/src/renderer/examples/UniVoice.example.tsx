import React from 'react';

export default function UniVoiceMainExample() {
  return (
    <div style={{ padding: 16 }}>
      <h2>UniVoice Main</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => window.uv.windows.openHistory()}>履歴を開く</button>
        <button onClick={() => window.uv.windows.openSummary()}>要約を開く</button>
        <button onClick={() => window.uv.windows.toggleHistory()}>履歴トグル</button>
        <button onClick={() => window.uv.windows.toggleSummary()}>要約トグル</button>
      </div>
    </div>
  );
}
