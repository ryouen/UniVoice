import React from 'react';

export const TestComponent: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      background: '#f0f0f0', 
      textAlign: 'center',
      fontSize: '24px',
      color: '#333'
    }}>
      <h1>🎉 UniVoice 2.0 is Working!</h1>
      <p>If you can see this, the app is rendering correctly.</p>
      <p style={{ fontSize: '16px', color: '#666' }}>
        Time: {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
};

export default TestComponent;