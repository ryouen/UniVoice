import React, { useEffect, useLayoutEffect, useState } from 'react';

export function EffectDebugComponent() {
  console.log('[EffectDebugComponent] === RENDER START ===');
  
  const [count, setCount] = useState(0);
  
  // コンストラクタ相当の処理（レンダー中に実行）
  (() => {
    console.log('[EffectDebugComponent] Constructor-like code running');
  })();
  
  // useLayoutEffect - DOMマウント前に同期的に実行
  useLayoutEffect(() => {
    console.log('[EffectDebugComponent] useLayoutEffect running!');
    return () => {
      console.log('[EffectDebugComponent] useLayoutEffect cleanup');
    };
  }, []);
  
  // useEffect - DOMマウント後に非同期で実行
  useEffect(() => {
    console.log('[EffectDebugComponent] useEffect running!');
    
    // タイマーテスト
    const timer = setTimeout(() => {
      console.log('[EffectDebugComponent] Timer fired after 1 second');
      setCount(c => c + 1);
    }, 1000);
    
    return () => {
      console.log('[EffectDebugComponent] useEffect cleanup');
      clearTimeout(timer);
    };
  }, []);
  
  // React自体の動作確認
  React.useEffect(() => {
    console.log('[EffectDebugComponent] Direct React.useEffect running!');
  }, []);
  
  console.log('[EffectDebugComponent] === RENDER END ===');
  
  return (
    <div style={{ padding: '10px', border: '2px solid red', background: 'yellow' }}>
      <h3>Effect Debug Component</h3>
      <p>Count: {count}</p>
      <p>If you see this but no effect logs, React is broken!</p>
    </div>
  );
}