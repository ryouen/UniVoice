// UniVoice 2.0 Comprehensive Debug Script
// This script will help identify where the data flow is breaking

console.log('=== UniVoice 2.0 Comprehensive Debug ===');
console.log('Run this after the app loads');

// Step 1: Check API availability
console.log('\n1. API Availability:');
console.log('   window.univoice:', !!window.univoice);
console.log('   window.electron:', !!window.electron);

if (!window.univoice || !window.electron) {
  console.error('❌ Required APIs not available!');
  return;
}

// Step 2: Monitor events
console.log('\n2. Setting up event monitors...');

const eventLog = [];
let eventCounts = {
  original: 0,
  translation: 0,
  pipeline: 0,
  asr: 0
};

// Monitor currentOriginalUpdate
const removeOriginal = window.electron.on('currentOriginalUpdate', (event, data) => {
  eventCounts.original++;
  const logEntry = {
    time: new Date().toISOString(),
    type: 'currentOriginalUpdate',
    data: data,
    count: eventCounts.original
  };
  eventLog.push(logEntry);
  console.log(`✅ [${eventCounts.original}] currentOriginalUpdate:`, data);
});

// Monitor currentTranslationUpdate
const removeTranslation = window.electron.on('currentTranslationUpdate', (event, text) => {
  eventCounts.translation++;
  const logEntry = {
    time: new Date().toISOString(),
    type: 'currentTranslationUpdate',
    text: text,
    count: eventCounts.translation
  };
  eventLog.push(logEntry);
  console.log(`✅ [${eventCounts.translation}] currentTranslationUpdate:`, text);
});

// Monitor pipeline events
const removePipeline = window.univoice.onPipelineEvent((event) => {
  eventCounts.pipeline++;
  if (event.type === 'asr') eventCounts.asr++;
  
  const logEntry = {
    time: new Date().toISOString(),
    type: 'pipelineEvent',
    eventType: event.type,
    data: event.data,
    count: eventCounts.pipeline
  };
  eventLog.push(logEntry);
  console.log(`📡 [${eventCounts.pipeline}] Pipeline Event:`, event.type, event.data);
});

console.log('✅ Event monitors set up');

// Step 3: Check DOM structure
console.log('\n3. Checking DOM structure...');

function checkDOM() {
  const originalDiv = document.getElementById('currentOriginal');
  const translationDiv = document.getElementById('currentTranslation');
  
  console.log('DOM Check:');
  console.log('  Original div:', {
    exists: !!originalDiv,
    id: originalDiv?.id,
    className: originalDiv?.className,
    content: originalDiv?.textContent || 'EMPTY',
    innerHTML: originalDiv?.innerHTML?.substring(0, 200) || 'EMPTY'
  });
  
  console.log('  Translation div:', {
    exists: !!translationDiv,
    id: translationDiv?.id,
    className: translationDiv?.className,
    content: translationDiv?.textContent || 'EMPTY',
    innerHTML: translationDiv?.innerHTML?.substring(0, 200) || 'EMPTY'
  });
  
  // Check parent structure
  if (originalDiv) {
    console.log('  Original div parent:', originalDiv.parentElement?.className);
  }
  if (translationDiv) {
    console.log('  Translation div parent:', translationDiv.parentElement?.className);
  }
  
  return { originalDiv, translationDiv };
}

// Initial DOM check
const { originalDiv, translationDiv } = checkDOM();

// Step 4: Check React Component (manual)
console.log('\n4. React Component Check:');
console.log('Open React DevTools and check:');
console.log('  1. Find UniVoicePerfect component');
console.log('  2. Check props: pipeline, currentOriginal, currentTranslation');
console.log('  3. Check state: currentDisplay, isRunning');
console.log('  4. Look for any error boundaries');

// Step 5: Start test session
console.log('\n5. Starting test session in 3 seconds...');
console.log('🎤 Make sure to allow microphone access and speak something!');

setTimeout(async () => {
  try {
    console.log('\n=== Starting Test Session ===');
    
    // First check if already running
    const statusCheck = await window.univoice.getHistory({ limit: 1 });
    console.log('Current status:', statusCheck);
    
    // Start listening
    const result = await window.univoice.startListening({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      correlationId: `debug-${Date.now()}`
    });
    
    console.log('Start result:', result);
    
    if (!result.success) {
      console.error('❌ Failed to start:', result.error);
      return;
    }
    
    console.log('✅ Session started successfully');
    console.log('🎤 Please speak now...');
    
    // Monitor for 15 seconds
    const checkInterval = setInterval(() => {
      console.log(`\n--- Status at ${new Date().toLocaleTimeString()} ---`);
      console.log('Event counts:', eventCounts);
      checkDOM();
    }, 3000);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      
      console.log('\n=== Final Report ===');
      console.log('Total events received:', eventCounts);
      console.log('Event log (last 10):', eventLog.slice(-10));
      
      // Final DOM check
      console.log('\nFinal DOM state:');
      const finalCheck = checkDOM();
      
      // Check for common issues
      console.log('\n=== Diagnostics ===');
      
      if (eventCounts.original === 0) {
        console.error('❌ No currentOriginalUpdate events received!');
        console.log('Possible issues:');
        console.log('  - Microphone not working');
        console.log('  - Backend not emitting events');
        console.log('  - IPC channel blocked');
      }
      
      if (eventCounts.translation === 0 && eventCounts.original > 0) {
        console.error('❌ Original events received but no translations!');
        console.log('Possible issues:');
        console.log('  - Translation service failing');
        console.log('  - Translation events not being emitted');
      }
      
      if (eventCounts.original > 0 && !finalCheck.originalDiv?.textContent) {
        console.error('❌ Events received but DOM not updating!');
        console.log('Possible issues:');
        console.log('  - React state not updating');
        console.log('  - useEffect not firing');
        console.log('  - currentDisplay state issue');
      }
      
      // Cleanup
      console.log('\nCleaning up...');
      removeOriginal?.();
      removeTranslation?.();
      removePipeline?.();
      
      // Stop listening
      window.univoice.stopListening({}).then(() => {
        console.log('✅ Session stopped');
      });
      
    }, 15000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}, 3000);

// Step 6: Manual test helpers
window.debugUniVoice = {
  checkDOM,
  getEventLog: () => eventLog,
  getEventCounts: () => eventCounts,
  
  // Manually dispatch test events
  testEvents: () => {
    console.log('\nManually dispatching test events...');
    
    // Simulate receiving events through IPC
    if (window.electron && window.electron.on) {
      // This won't actually work since we can't trigger IPC from client
      // But we can check if the handlers would work
      console.log('Event handlers are registered and ready');
    }
  },
  
  // Force update DOM (for testing)
  forceUpdateDOM: (text) => {
    const originalDiv = document.getElementById('currentOriginal');
    if (originalDiv) {
      console.log('Force updating original div with:', text);
      originalDiv.textContent = text;
    }
  }
};

console.log('\n✅ Debug script loaded. Helper functions available:');
console.log('  window.debugUniVoice.checkDOM()');
console.log('  window.debugUniVoice.getEventLog()');
console.log('  window.debugUniVoice.getEventCounts()');
console.log('  window.debugUniVoice.testEvents()');
console.log('  window.debugUniVoice.forceUpdateDOM("test text")');