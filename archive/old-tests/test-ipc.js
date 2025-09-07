// Test IPC communication
console.log('Testing IPC communication...');

// Wait for window.univoice to be available
let checkCount = 0;
const checkAPI = setInterval(() => {
  if (window.univoice) {
    console.log('✅ window.univoice is available');
    console.log('Available methods:', Object.keys(window.univoice));
    
    // Test correlation ID generation
    const correlationId = window.univoice.generateCorrelationId();
    console.log('Generated correlation ID:', correlationId);
    
    // Test start listening
    console.log('\nTesting startListening...');
    window.univoice.startListening({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      correlationId: correlationId
    }).then(result => {
      console.log('✅ StartListening result:', result);
      
      // Test stop listening after 2 seconds
      setTimeout(() => {
        console.log('\nTesting stopListening...');
        window.univoice.stopListening({
          correlationId: correlationId
        }).then(stopResult => {
          console.log('✅ StopListening result:', stopResult);
        }).catch(err => {
          console.error('❌ StopListening error:', err);
        });
      }, 2000);
    }).catch(err => {
      console.error('❌ StartListening error:', err);
    });
    
    clearInterval(checkAPI);
  } else if (checkCount++ > 50) {
    console.error('❌ window.univoice not available after 5 seconds');
    clearInterval(checkAPI);
  } else if (checkCount % 10 === 0) {
    console.log('Waiting for window.univoice...', checkCount / 10, 'seconds');
  }
}, 100);