import React, { useEffect, useState } from 'react';
import UniVoice from './components/UniVoice';
import TestComponent from './components/TestComponent';
import DebugInfo from './components/DebugInfo';
import { setupDebugHelpers } from './utils/debug-helper';
import './App.css';

function App() {
  const [error, setError] = useState<string | null>(null);
  
  // Debug: Check if window.univoice is available
  useEffect(() => {
    console.log('[App] Initial check - window.univoice:', !!window.univoice);
    console.log('[App] Window object keys:', Object.keys(window).filter(k => k.includes('uni') || k.includes('electron')));
    
    if (window.univoice) {
      console.log('[App] univoice methods:', Object.keys(window.univoice));
    }
    
    // Check periodically
    const checkInterval = setInterval(() => {
      if (window.univoice) {
        console.log('[App] window.univoice is now available!');
        clearInterval(checkInterval);
      }
    }, 500);
    
    return () => clearInterval(checkInterval);
  }, []);
  
  // Error boundary
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[App] Error caught:', event.error);
      setError(event.error?.message || 'Unknown error');
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error Loading UniVoice</h2>
        <pre>{error}</pre>
      </div>
    );
  }
  
  // For debugging - show debug info if requested
  const urlParams = new URLSearchParams(window.location.search);
  const showDebug = urlParams.get('debug') === 'true';
  
  if (showDebug) {
    return <DebugInfo />;
  }
  

  return (
    <div className="App">
      <UniVoice />
    </div>
  )
}

export default App