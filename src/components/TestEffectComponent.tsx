import React, { useEffect } from 'react';

export function TestEffectComponent() {
  console.log('[TestEffectComponent] Component rendering');
  
  useEffect(() => {
    console.log('[TestEffectComponent] useEffect running!');
    return () => {
      console.log('[TestEffectComponent] useEffect cleanup');
    };
  }, []);
  
  return <div>Test Effect Component</div>;
}