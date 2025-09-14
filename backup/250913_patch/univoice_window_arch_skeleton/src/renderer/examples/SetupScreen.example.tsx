import React, { useEffect, useRef } from 'react';

export default function SetupScreenExample() {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const cr = entry.contentRect;
      window.uv.setup.setDesiredBounds(Math.ceil(cr.width), Math.ceil(cr.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const proceed = async () => {
    await window.uv.setup.enterMain();
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div
        ref={bgRef}
        className="background"
        style={{ width: 720, height: 420, borderRadius: 16, backdropFilter: 'blur(6px)', padding: 24, background: 'rgba(255,255,255,0.1)' }}
      >
        <h2>Setup</h2>
        <p>背景ボックスのサイズにウィンドウをフィットします。</p>
        <button onClick={proceed}>メインへ</button>
      </div>
    </div>
  );
}
