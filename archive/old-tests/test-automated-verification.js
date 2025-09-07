// UniVoice 2.0 Automated Verification Script
// This script runs after the app loads to verify all fixes are working

const runVerification = async () => {
  console.log('=== UniVoice 2.0 Automated Verification ===');
  console.log('Starting verification in 3 seconds...\n');
  
  const results = {
    apiAvailability: false,
    eventListeners: false,
    domElements: false,
    dataFlow: false,
    overall: false
  };
  
  // Test 1: API Availability
  console.log('1. Checking API availability...');
  if (window.univoice && window.electron) {
    console.log('✅ APIs are available');
    results.apiAvailability = true;
  } else {
    console.error('❌ APIs not found');
    return results;
  }
  
  // Test 2: Event Listeners
  console.log('\n2. Setting up event listeners...');
  let eventReceived = { original: false, translation: false };
  
  const removeOriginal = window.electron.on('currentOriginalUpdate', (event, data) => {
    console.log('✅ Received currentOriginalUpdate:', data);
    eventReceived.original = true;
  });
  
  const removeTranslation = window.electron.on('currentTranslationUpdate', (event, text) => {
    console.log('✅ Received currentTranslationUpdate:', text);
    eventReceived.translation = true;
  });
  
  results.eventListeners = true;
  console.log('✅ Event listeners registered');
  
  // Test 3: DOM Elements
  console.log('\n3. Checking DOM elements...');
  const checkDOM = () => {
    const originalDiv = document.getElementById('currentOriginal');
    const translationDiv = document.getElementById('currentTranslation');
    return originalDiv && translationDiv;
  };
  
  if (checkDOM()) {
    console.log('✅ DOM elements found');
    results.domElements = true;
  } else {
    console.error('❌ DOM elements not found');
  }
  
  // Test 4: Data Flow Test
  console.log('\n4. Testing data flow...');
  console.log('Starting session...');
  
  try {
    const sessionResult = await window.univoice.startListening({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      correlationId: `verify-${Date.now()}`
    });
    
    if (sessionResult.success) {
      console.log('✅ Session started successfully');
      
      // Wait for events
      console.log('Waiting for events (10 seconds)...');
      
      await new Promise(resolve => {
        setTimeout(() => {
          // Check if events were received
          if (eventReceived.original || eventReceived.translation) {
            console.log('✅ Events received during test');
            results.dataFlow = true;
          } else {
            console.log('⚠️ No events received - microphone may not be active');
          }
          
          // Check DOM updates
          const originalDiv = document.getElementById('currentOriginal');
          const translationDiv = document.getElementById('currentTranslation');
          
          if (originalDiv && originalDiv.textContent) {
            console.log('✅ Original text displayed:', originalDiv.textContent);
          }
          
          if (translationDiv && translationDiv.textContent) {
            console.log('✅ Translation displayed:', translationDiv.textContent);
          }
          
          resolve();
        }, 10000);
      });
      
      // Stop session
      await window.univoice.stopListening({});
      console.log('✅ Session stopped');
      
    } else {
      console.error('❌ Failed to start session:', sessionResult.error);
    }
  } catch (error) {
    console.error('❌ Data flow test failed:', error);
  }
  
  // Cleanup
  removeOriginal?.();
  removeTranslation?.();
  
  // Summary
  console.log('\n=== Verification Summary ===');
  console.log('API Availability:', results.apiAvailability ? '✅' : '❌');
  console.log('Event Listeners:', results.eventListeners ? '✅' : '❌');
  console.log('DOM Elements:', results.domElements ? '✅' : '❌');
  console.log('Data Flow:', results.dataFlow ? '✅' : '❌');
  
  results.overall = results.apiAvailability && results.eventListeners && results.domElements;
  console.log('\nOverall Status:', results.overall ? '✅ READY' : '❌ ISSUES FOUND');
  
  if (!results.dataFlow) {
    console.log('\n⚠️ Note: Data flow test requires microphone input.');
    console.log('Please test manually by speaking into the microphone.');
  }
  
  return results;
};

// Run verification after app loads
setTimeout(() => {
  runVerification().then(results => {
    window.verificationResults = results;
    console.log('\nVerification complete. Results saved to window.verificationResults');
  });
}, 3000);