// UniVoice 2.0 Complete Debugging Script
// Run this in DevTools Console after the app loads

console.log('=== UniVoice 2.0 Complete Debug ===');

// 1. Check APIs availability
console.log('\n1. API Check:');
console.log('   window.univoice:', !!window.univoice);
console.log('   window.electron:', !!window.electron);

if (!window.univoice || !window.electron) {
  console.error('❌ Required APIs not available!');
  return;
}

// 2. Test event listeners
console.log('\n2. Testing Event Listeners...');

let eventCounts = {
  original: 0,
  translation: 0,
  pipeline: 0
};

// Setup listeners
const removeOriginal = window.electron.on('currentOriginalUpdate', (event, data) => {
  eventCounts.original++;
  console.log(`✅ [${eventCounts.original}] currentOriginalUpdate:`, data);
});

const removeTranslation = window.electron.on('currentTranslationUpdate', (event, text) => {
  eventCounts.translation++;
  console.log(`✅ [${eventCounts.translation}] currentTranslationUpdate:`, text);
});

const removePipeline = window.univoice.onPipelineEvent((event) => {
  eventCounts.pipeline++;
  console.log(`📡 [${eventCounts.pipeline}] Pipeline Event:`, event.type, event.data);
});

console.log('✅ Listeners set up');

// 3. Check DOM elements
console.log('\n3. Checking DOM Elements...');

const checkDOM = () => {
  const originalDiv = document.getElementById('currentOriginal');
  const translationDiv = document.getElementById('currentTranslation');
  
  console.log('Original div:', {
    exists: !!originalDiv,
    content: originalDiv?.textContent || 'NOT FOUND',
    innerHTML: originalDiv?.innerHTML?.substring(0, 100) || 'NOT FOUND'
  });
  
  console.log('Translation div:', {
    exists: !!translationDiv,
    content: translationDiv?.textContent || 'NOT FOUND',
    innerHTML: translationDiv?.innerHTML?.substring(0, 100) || 'NOT FOUND'
  });
  
  // Check for any elements with current-text class
  const currentTexts = document.querySelectorAll('.current-text');
  console.log(`Found ${currentTexts.length} elements with class 'current-text'`);
  currentTexts.forEach((el, i) => {
    console.log(`  [${i}] content:`, el.textContent?.substring(0, 50));
  });
};

// Initial check
checkDOM();

// 4. Check React Component State
console.log('\n4. Checking React Component State...');
console.log('Use React DevTools to check:');
console.log('  - UniVoicePerfect > currentDisplay state');
console.log('  - UniVoicePerfect > currentOriginal prop');
console.log('  - UniVoicePerfect > currentTranslation prop');
console.log('  - UniVoicePerfect > pipeline object');

// 5. Start a test session after 2 seconds
console.log('\n5. Starting test session in 2 seconds...');

setTimeout(async () => {
  try {
    console.log('\n=== Starting Test Session ===');
    
    const result = await window.univoice.startListening({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      correlationId: `debug-${Date.now()}`
    });
    
    console.log('Start result:', result);
    
    if (result.success) {
      console.log('✅ Session started successfully');
      console.log('🎤 Please speak something...');
      
      // Monitor for 10 seconds
      setTimeout(() => {
        console.log('\n=== 10-Second Summary ===');
        console.log('Event counts:', eventCounts);
        
        // Check DOM again
        checkDOM();
        
        // Check if React is updating
        const originalDiv = document.getElementById('currentOriginal');
        const translationDiv = document.getElementById('currentTranslation');
        
        if (!originalDiv || !translationDiv) {
          console.error('❌ DOM elements not found!');
        } else if (!originalDiv.textContent && !translationDiv.textContent) {
          console.error('❌ DOM elements exist but have no content!');
          console.log('Possible issues:');
          console.log('  - React state not updating');
          console.log('  - Event listeners not firing');
          console.log('  - currentDisplay state not being set');
        } else {
          console.log('✅ Content is being displayed!');
        }
        
        // Cleanup
        console.log('\nCleaning up...');
        removeOriginal?.();
        removeTranslation?.();
        removePipeline?.();
        
        // Stop listening
        window.univoice.stopListening({});
        console.log('✅ Test complete');
        
      }, 10000);
      
    } else {
      console.error('❌ Failed to start:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}, 2000);

// 6. Helper functions for manual testing
window.debugUniVoice = {
  checkDOM,
  checkEvents: () => console.log('Event counts:', eventCounts),
  
  // Manually trigger an event to test display
  testDisplay: () => {
    console.log('Manually dispatching test events...');
    window.dispatchEvent(new CustomEvent('currentOriginalUpdate', {
      detail: { text: 'Test original text', isFinal: true }
    }));
    window.dispatchEvent(new CustomEvent('currentTranslationUpdate', {
      detail: 'Test translation text'
    }));
    
    setTimeout(checkDOM, 100);
  },
  
  // Get current React state
  getReactState: () => {
    console.log('Check React DevTools for component state');
    console.log('Or use: $r (after selecting UniVoicePerfect in React DevTools)');
  }
};

console.log('\nDebug helpers available:');
console.log('  window.debugUniVoice.checkDOM()');
console.log('  window.debugUniVoice.checkEvents()');
console.log('  window.debugUniVoice.testDisplay()');
console.log('  window.debugUniVoice.getReactState()');