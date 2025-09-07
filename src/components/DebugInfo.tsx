import React, { useEffect, useState } from 'react';

export const DebugInfo: React.FC = () => {
  const [info, setInfo] = useState<any>({
    windowAPIs: [],
    errors: [],
    logs: []
  });
  
  useEffect(() => {
    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    
    const logs: string[] = [];
    const errors: string[] = [];
    
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    console.error = (...args) => {
      errors.push(args.join(' '));
      originalError(...args);
    };
    
    // Check window APIs
    const windowAPIs = Object.keys(window).filter(key => 
      key.includes('electron') || key.includes('univoice') || key === 'require'
    );
    
    // Update state
    setTimeout(() => {
      setInfo({
        windowAPIs,
        errors,
        logs,
        isElectron: !!(window as any).electron,
        isUnivoice: !!(window as any).univoice,
        location: window.location.href,
        userAgent: navigator.userAgent
      });
    }, 1000);
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      background: '#f0f0f0',
      padding: '20px',
      overflow: 'auto',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h2>Debug Information</h2>
      <div style={{ background: 'white', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
        <h3>Environment</h3>
        <p>Location: {info.location}</p>
        <p>Is Electron: {info.isElectron ? 'Yes' : 'No'}</p>
        <p>Is UniVoice API: {info.isUnivoice ? 'Yes' : 'No'}</p>
        <p>User Agent: {info.userAgent}</p>
      </div>
      
      <div style={{ background: 'white', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
        <h3>Window APIs ({info.windowAPIs.length})</h3>
        <ul>
          {info.windowAPIs.map((api: string) => (
            <li key={api}>{api}</li>
          ))}
        </ul>
      </div>
      
      {info.errors.length > 0 && (
        <div style={{ background: '#ffcccc', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
          <h3>Errors ({info.errors.length})</h3>
          <ul>
            {info.errors.map((error: string, i: number) => (
              <li key={i} style={{ color: 'red' }}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div style={{ background: 'white', padding: '10px', borderRadius: '5px' }}>
        <h3>Console Logs ({info.logs.length})</h3>
        <ul>
          {info.logs.map((log: string, i: number) => (
            <li key={i}>{log}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DebugInfo;