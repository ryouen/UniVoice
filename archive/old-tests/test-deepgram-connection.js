/**
 * Test Deepgram WebSocket Connection
 * 
 * This test verifies:
 * 1. API key is valid
 * 2. WebSocket can connect successfully
 * 3. Error messages are properly caught and displayed
 */

const WebSocket = require('ws');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

console.log('\n========================================');
console.log('Deepgram WebSocket Connection Test');
console.log('========================================\n');

// Check if API key exists
if (!DEEPGRAM_API_KEY) {
  console.error('❌ ERROR: DEEPGRAM_API_KEY not found in .env file');
  console.error('Please ensure your .env file contains: DEEPGRAM_API_KEY=your-api-key-here');
  process.exit(1);
}

console.log('✅ API Key found:', DEEPGRAM_API_KEY.substring(0, 10) + '...' + DEEPGRAM_API_KEY.slice(-4));

// Build WebSocket URL (matching UnifiedPipelineService.ts)
const wsUrl = `wss://api.deepgram.com/v1/listen?` +
  `model=nova-3&` +
  `interim_results=true&` +
  `endpointing=800&` +
  `utterance_end_ms=1000&` +
  `language=en&` +
  `sample_rate=16000&` +
  `channels=1&` +
  `encoding=linear16`;

console.log('\n📡 Connecting to Deepgram WebSocket...');
console.log('URL:', wsUrl);

// Create WebSocket connection
const ws = new WebSocket(wsUrl, {
  headers: {
    'Authorization': `Token ${DEEPGRAM_API_KEY}`,
  },
});

// Connection timeout
const connectionTimeout = setTimeout(() => {
  console.error('\n❌ Connection timeout after 10 seconds');
  ws.close();
  process.exit(1);
}, 10000);

// Handle connection open
ws.on('open', () => {
  clearTimeout(connectionTimeout);
  console.log('\n✅ Successfully connected to Deepgram WebSocket!');
  console.log('Connection is ready to receive audio data.');
  
  // Send a test ping
  console.log('\n📤 Sending keep-alive message...');
  ws.send(JSON.stringify({ type: 'KeepAlive' }));
  
  // Close after successful test
  setTimeout(() => {
    console.log('\n✅ Test completed successfully!');
    ws.close();
    process.exit(0);
  }, 2000);
});

// Handle messages
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('\n📥 Received message:', JSON.stringify(message, null, 2));
  } catch (error) {
    console.log('\n📥 Received non-JSON message:', data.toString());
  }
});

// Handle errors
ws.on('error', (error) => {
  clearTimeout(connectionTimeout);
  console.error('\n❌ WebSocket Error:', error.message);
  
  // Check for common error codes
  if (error.message.includes('400')) {
    console.error('\n⚠️  400 Bad Request - Possible causes:');
    console.error('  - Invalid or expired API key');
    console.error('  - Invalid parameters in the URL');
    console.error('  - Account issues (check your Deepgram dashboard)');
    console.error('\n💡 To fix:');
    console.error('  1. Log into https://console.deepgram.com');
    console.error('  2. Go to API Keys section');
    console.error('  3. Create a new API key');
    console.error('  4. Update the DEEPGRAM_API_KEY in your .env file');
  } else if (error.message.includes('401')) {
    console.error('\n⚠️  401 Unauthorized - Your API key is invalid or missing');
    console.error('Please check your DEEPGRAM_API_KEY in the .env file');
  } else if (error.message.includes('403')) {
    console.error('\n⚠️  403 Forbidden - Your account may not have access to this feature');
    console.error('Check your Deepgram account permissions');
  }
  
  process.exit(1);
});

// Handle close
ws.on('close', (code, reason) => {
  clearTimeout(connectionTimeout);
  console.log('\n🔌 WebSocket closed');
  console.log('Close code:', code);
  if (reason) {
    console.log('Close reason:', reason.toString());
  }
  
  // Interpret close codes
  switch (code) {
    case 1000:
      console.log('✅ Normal closure');
      break;
    case 1006:
      console.log('❌ Abnormal closure - connection lost');
      break;
    case 1008:
      console.log('❌ Policy violation');
      break;
    case 1009:
      console.log('❌ Message too large');
      break;
    case 1011:
      console.log('❌ Server error');
      break;
    default:
      if (code >= 4000 && code < 5000) {
        console.log('❌ Deepgram-specific error code');
      }
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  ws.close();
  process.exit(0);
});