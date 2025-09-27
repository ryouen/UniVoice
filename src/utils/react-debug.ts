// React internals debugging utility
import React from 'react';

export function debugReactInternals() {
  console.log('[ReactDebug] === React Internals Check ===');
  
  // Check React version
  console.log('[ReactDebug] React version:', React.version);
  
  // Check if React is in production mode
  if ('_self' in React) {
    console.log('[ReactDebug] React appears to be in development mode');
  } else {
    console.log('[ReactDebug] React appears to be in production mode');
  }
  
  // Check React Fiber
  const rootElement = document.getElementById('root');
  if (rootElement && (rootElement as any)._reactRootContainer) {
    console.log('[ReactDebug] React Root Container found:', (rootElement as any)._reactRootContainer);
    
    // Try to access fiber root
    const fiberRoot = (rootElement as any)._reactRootContainer._internalRoot;
    if (fiberRoot) {
      console.log('[ReactDebug] Fiber Root:', {
        tag: fiberRoot.tag,
        mode: fiberRoot.mode,
        current: fiberRoot.current
      });
    }
  }
  
  // Check if scheduler is working
  if (typeof window.requestIdleCallback === 'function') {
    console.log('[ReactDebug] requestIdleCallback is available');
    window.requestIdleCallback(() => {
      console.log('[ReactDebug] requestIdleCallback fired!');
    });
  }
  
  // Check if timers work
  console.log('[ReactDebug] Testing setTimeout...');
  setTimeout(() => {
    console.log('[ReactDebug] setTimeout fired after 0ms');
  }, 0);
  
  setTimeout(() => {
    console.log('[ReactDebug] setTimeout fired after 100ms');
  }, 100);
  
  // Check Promise
  console.log('[ReactDebug] Testing Promise...');
  Promise.resolve().then(() => {
    console.log('[ReactDebug] Promise.resolve() fired');
  });
  
  // Check queueMicrotask
  if (typeof queueMicrotask === 'function') {
    console.log('[ReactDebug] Testing queueMicrotask...');
    queueMicrotask(() => {
      console.log('[ReactDebug] queueMicrotask fired');
    });
  }
  
  console.log('[ReactDebug] === Check Complete ===');
}

// Expose globally for debugging
(window as any).debugReactInternals = debugReactInternals;