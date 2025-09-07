// UniVoice 2.0 Complete Check Script
// Run this in DevTools Console to check everything

(function() {
  console.log('=== UniVoice 2.0 Complete Check ===\n');

  // 1. Basic API Check
  console.log('1. API Check:');
  console.log('   window.univoice exists:', !!window.univoice);
  console.log('   window.electron exists:', !!window.electron);

  if (!window.electron) {
    console.error('❌ window.electron is missing! This is critical.');
    console.log('Checking window object...');
    console.log('Window keys:', Object.keys(window).filter(k => k.includes('electron') || k.includes('uni')));
    return; // This is now valid inside a function
  }

  // 2. Check what methods are available
  console.log('\n2. Available Methods:');
  if (window.univoice) {
    console.log('   univoice methods:', Object.keys(window.univoice));
  }
  if (window.electron) {
    console.log('   electron methods:', Object.keys(window.electron));
  }

  // 3. Check DOM
  console.log('\n3. DOM Check:');
  const originalDiv = document.getElementById('currentOriginal');
  const translationDiv = document.getElementById('currentTranslation');

  console.log('   Original div exists:', !!originalDiv);
  console.log('   Translation div exists:', !!translationDiv);

  if (originalDiv) {
    console.log('   Original div content:', originalDiv.textContent || '(empty)');
    console.log('   Original div HTML:', originalDiv.innerHTML.substring(0, 100));
  }

  if (translationDiv) {
    console.log('   Translation div content:', translationDiv.textContent || '(empty)');
    console.log('   Translation div HTML:', translationDiv.innerHTML.substring(0, 100));
  }

  // 4. Check React Component (if using React DevTools)
  console.log('\n4. React Component Info:');
  console.log('   Open React DevTools and look for:');
  console.log('   - UniVoicePerfect component');
  console.log('   - Check currentDisplay state');
  console.log('   - Check pipeline props');

  // 5. Set up event monitoring
  console.log('\n5. Setting up event monitoring...');
  let eventCounts = { original: 0, translation: 0, error: 0, univoice: 0 };

  try {
    // Monitor currentOriginalUpdate
    const removeOriginal = window.electron.on('currentOriginalUpdate', (event, data) => {
      eventCounts.original++;
      console.log(`📝 [${eventCounts.original}] Original Update:`, data);
      
      // Check if DOM updates
      setTimeout(() => {
        const div = document.getElementById('currentOriginal');
        if (div) {
          console.log('   DOM after update:', div.textContent);
        }
      }, 100);
    });

    // Monitor currentTranslationUpdate
    const removeTranslation = window.electron.on('currentTranslationUpdate', (event, data) => {
      eventCounts.translation++;
      console.log(`💬 [${eventCounts.translation}] Translation Update:`, data);
      
      // Check if DOM updates
      setTimeout(() => {
        const div = document.getElementById('currentTranslation');
        if (div) {
          console.log('   DOM after update:', div.textContent);
        }
      }, 100);
    });

    // Monitor univoice events
    if (window.univoice?.onPipelineEvent) {
      const removeUnivoice = window.univoice.onPipelineEvent((event) => {
        eventCounts.univoice++;
        console.log(`🔄 [${eventCounts.univoice}] UniVoice Event:`, event);
      });
      
      window.cleanupUnivoice = removeUnivoice;
    }

    console.log('✅ Event listeners registered successfully');
    
    // Save cleanup function
    window.cleanupListeners = () => {
      removeOriginal?.();
      removeTranslation?.();
      window.cleanupUnivoice?.();
      console.log('Listeners cleaned up');
    };
    
  } catch (error) {
    console.error('❌ Failed to set up listeners:', error);
  }

  // 6. Check current state
  console.log('\n6. Checking current state...');

  // Try to get current pipeline state
  if (window.univoice?.getHistory) {
    window.univoice.getHistory({ limit: 1 }).then(result => {
      console.log('History check result:', result);
    }).catch(err => {
      console.error('History check error:', err);
    });
  }

  // 7. Manual test function
  window.testSession = async () => {
    console.log('\n=== Starting Test Session ===');
    
    if (!window.univoice) {
      console.error('❌ window.univoice not available');
      return;
    }
    
    try {
      const result = await window.univoice.startListening({
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        correlationId: `test-${Date.now()}`
      });
      
      console.log('Start result:', result);
      
      if (result.success) {
        console.log('✅ Session started! Speak now...');
        console.log('   Monitoring events for 10 seconds...');
        
        // Monitor for 10 seconds
        setTimeout(async () => {
          console.log('\nEvent counts after 10s:', eventCounts);
          
          // Stop session
          const stopResult = await window.univoice.stopListening({});
          console.log('Stop result:', stopResult);
        }, 10000);
      }
    } catch (error) {
      console.error('❌ Test session failed:', error);
    }
  };

  // 8. Check hooks registration
  console.log('\n8. Checking React hooks...');
  console.log('   Look for useUnifiedPipeline hook in React DevTools');
  console.log('   It should have event listeners registered');

  // 9. Direct DOM inspection
  console.log('\n9. Direct DOM Inspection:');
  const displaySections = document.querySelectorAll('.display-section');
  console.log('   Display sections found:', displaySections.length);
  
  displaySections.forEach((section, index) => {
    console.log(`   Section ${index}:`, {
      className: section.className,
      childCount: section.children.length,
      text: section.textContent?.substring(0, 50)
    });
  });

  // Summary
  console.log('\n=== Summary ===');
  console.log('✅ APIs:', window.univoice && window.electron ? 'Available' : 'Missing');
  console.log('✅ DOM:', originalDiv && translationDiv ? 'Found' : 'Missing');
  console.log('✅ Events:', 'Monitoring started');

  console.log('\n🎯 Next Steps:');
  console.log('1. Run: window.testSession()');
  console.log('2. Allow microphone and speak in English');
  console.log('3. Check console for events');
  console.log('4. Check DOM for updates');
  console.log('\nTo cleanup: window.cleanupListeners()');

  // Additional diagnostics
  console.log('\n🔍 Quick Diagnostics:');
  console.log('window.electron.on is function?', typeof window.electron?.on === 'function');
  console.log('window.univoice.startListening is function?', typeof window.univoice?.startListening === 'function');
  
})();