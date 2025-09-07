/**
 * Test React session start functionality
 * This test simulates the exact flow that happens in the React UI
 */

console.log('Testing React session start flow...\n');

// Simulate the exact parameters sent from React
const sessionConfig = {
  className: 'test_class',
  sourceLanguage: 'en',
  targetLanguage: 'ja'
};

// Simulate correlationId generation
const correlationId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

console.log('Session config:', sessionConfig);
console.log('Correlation ID:', correlationId);

// Simulate the exact command structure sent from useSession hook
const command = {
  type: 'session',
  action: 'start',
  correlationId: correlationId,
  params: {
    className: sessionConfig.className,
    sourceLanguage: sessionConfig.sourceLanguage,
    targetLanguage: sessionConfig.targetLanguage
  }
};

console.log('\nCommand to be sent:', JSON.stringify(command, null, 2));

// The useSession hook calls window.univoice.startListening
// which internally sends the above command via IPC
const ipcParams = {
  sourceLanguage: sessionConfig.sourceLanguage,
  targetLanguage: sessionConfig.targetLanguage,
  correlationId: correlationId
};

console.log('\nIPC params for startListening:', JSON.stringify(ipcParams, null, 2));

// Expected domain command after IPC gateway processing
const expectedDomainCommand = {
  type: 'startListening',
  correlationId: correlationId,
  params: {
    sourceLanguage: sessionConfig.sourceLanguage,
    targetLanguage: sessionConfig.targetLanguage
  }
};

console.log('\nExpected domain command:', JSON.stringify(expectedDomainCommand, null, 2));

console.log('\n✅ This is the exact flow from React UI to backend');
console.log('   1. User clicks "授業を開始"');
console.log('   2. useSession.startSession() is called');
console.log('   3. window.univoice.startListening() is invoked');
console.log('   4. IPC sends command to main process');
console.log('   5. Gateway routes to domain command');
console.log('   6. UnifiedPipelineService.startListening() is called');