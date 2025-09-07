// UniVoice Simple Event Check
// Run in DevTools Console

console.log('=== UniVoice Simple Event Check ===');

// 1. Check if APIs exist
if (!window.electron) {
  console.error('❌ window.electron not found!');
  return;
}

console.log('✅ window.electron exists');

// 2. Set up event listeners
let receivedEvents = { original: 0, translation: 0 };

const removeOriginal = window.electron.on('currentOriginalUpdate', (event, data) => {
  receivedEvents.original++;
  console.log(`📝 Original #${receivedEvents.original}:`, data);
});

const removeTranslation = window.electron.on('currentTranslationUpdate', (event, text) => {
  receivedEvents.translation++;
  console.log(`💬 Translation #${receivedEvents.translation}:`, text);
});

console.log('✅ Event listeners set up');

// 3. Check DOM after 1 second
setTimeout(() => {
  const originalDiv = document.getElementById('currentOriginal');
  const translationDiv = document.getElementById('currentTranslation');
  
  console.log('\n=== DOM Check ===');
  console.log('Original div exists:', !!originalDiv);
  if (originalDiv) {
    console.log('Original content:', originalDiv.textContent);
  }
  
  console.log('Translation div exists:', !!translationDiv);
  if (translationDiv) {
    console.log('Translation content:', translationDiv.textContent);
  }
  
  console.log('\n=== Event Summary ===');
  console.log('Received events:', receivedEvents);
  
  // 4. Test manual event dispatch
  console.log('\n=== Testing Manual Event Dispatch ===');
  const testData = { text: 'Test text from console', isFinal: true };
  console.log('Dispatching test event with data:', testData);
  
  // Try to manually trigger the event handler
  if (window.electron && window.electron.on) {
    // Simulate receiving an event
    const mockEvent = new Event('currentOriginalUpdate');
    window.dispatchEvent(new CustomEvent('currentOriginalUpdate', { detail: testData }));
  }
  
  setTimeout(() => {
    console.log('\n=== Final Check ===');
    console.log('Final Original content:', originalDiv?.textContent);
    console.log('Event counts:', receivedEvents);
    
    // Cleanup
    removeOriginal?.();
    removeTranslation?.();
    console.log('✅ Cleanup complete');
  }, 1000);
  
}, 1000);

// Helper to check React component state
window.checkReactState = () => {
  console.log('To check React state:');
  console.log('1. Open React DevTools');
  console.log('2. Find UniVoicePerfect component');
  console.log('3. Check these values:');
  console.log('   - currentDisplay');
  console.log('   - currentOriginal');
  console.log('   - currentTranslation');
  console.log('   - pipeline');
};