/**
 * Test Deepgram Audio Streaming
 * 
 * This test verifies the complete audio streaming pipeline:
 * 1. Connect to Deepgram WebSocket
 * 2. Send valid audio data
 * 3. Monitor for any errors including 400 Bad Request
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

console.log('\n========================================');
console.log('Deepgram Audio Streaming Test');
console.log('========================================\n');

// Check if API key exists
if (!DEEPGRAM_API_KEY) {
  console.error('❌ ERROR: DEEPGRAM_API_KEY not found in .env file');
  process.exit(1);
}

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

console.log('📡 Connecting to Deepgram WebSocket...');

// Create WebSocket connection
const ws = new WebSocket(wsUrl, {
  headers: {
    'Authorization': `Token ${DEEPGRAM_API_KEY}`,
  },
});

let messageCount = 0;
let errorCount = 0;
let audioChunksSent = 0;

// Handle connection open
ws.on('open', () => {
  console.log('✅ Connected to Deepgram WebSocket!');
  console.log('\n📤 Sending test audio...\n');
  
  // Create a simple test audio buffer (silence)
  // 16-bit PCM, 16kHz, mono = 32,000 bytes per second
  const secondsOfAudio = 3;
  const sampleRate = 16000;
  const bytesPerSample = 2; // 16-bit
  const totalSamples = sampleRate * secondsOfAudio;
  const audioBuffer = Buffer.alloc(totalSamples * bytesPerSample);
  
  // Generate a simple sine wave tone (440Hz - A4 note)
  const frequency = 440;
  for (let i = 0; i < totalSamples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * 32767;
    audioBuffer.writeInt16LE(Math.floor(sample), i * bytesPerSample);
  }
  
  // Send audio in chunks (simulating real-time streaming)
  const chunkSize = 3200; // 100ms of audio at 16kHz
  let offset = 0;
  
  const sendInterval = setInterval(() => {
    if (offset >= audioBuffer.length) {
      clearInterval(sendInterval);
      console.log(`\n✅ Finished sending ${audioChunksSent} audio chunks`);
      
      // Wait for final responses then close
      setTimeout(() => {
        console.log('\n📊 Test Summary:');
        console.log(`  - Audio chunks sent: ${audioChunksSent}`);
        console.log(`  - Messages received: ${messageCount}`);
        console.log(`  - Errors: ${errorCount}`);
        
        if (errorCount === 0 && messageCount > 0) {
          console.log('\n✅ Test PASSED - No errors detected!');
        } else if (errorCount > 0) {
          console.log('\n❌ Test FAILED - Errors were detected');
        } else {
          console.log('\n⚠️  Test WARNING - No messages received');
        }
        
        ws.close();
        process.exit(errorCount > 0 ? 1 : 0);
      }, 2000);
      return;
    }
    
    const chunk = audioBuffer.slice(offset, offset + chunkSize);
    try {
      ws.send(chunk);
      audioChunksSent++;
      if (audioChunksSent % 10 === 0) {
        process.stdout.write('.');
      }
    } catch (error) {
      console.error('\n❌ Error sending audio chunk:', error.message);
      errorCount++;
    }
    offset += chunkSize;
  }, 100); // Send every 100ms
});

// Handle messages
ws.on('message', (data) => {
  messageCount++;
  try {
    const message = JSON.parse(data.toString());
    
    // Check for errors
    if (message.type === 'Error' || message.error) {
      errorCount++;
      console.error('\n❌ Deepgram Error:', message);
      return;
    }
    
    // Check for transcripts
    if (message.channel?.alternatives?.[0]?.transcript) {
      const transcript = message.channel.alternatives[0].transcript;
      const isFinal = message.is_final;
      if (transcript) {
        console.log(`\n📝 ${isFinal ? 'Final' : 'Interim'} transcript: "${transcript}"`);
      }
    } else if (message.type === 'Metadata') {
      console.log('\n📊 Metadata received:', JSON.stringify(message, null, 2));
    }
  } catch (error) {
    console.log('\n⚠️  Non-JSON message:', data.toString().substring(0, 100));
  }
});

// Handle errors
ws.on('error', (error) => {
  errorCount++;
  console.error('\n❌ WebSocket Error:', error.message);
  
  if (error.message.includes('400')) {
    console.error('\n🔍 400 Bad Request Analysis:');
    console.error('  - Check audio format: must be 16-bit PCM, 16kHz, mono');
    console.error('  - Verify API key permissions');
    console.error('  - Ensure audio chunks are valid Buffer objects');
  }
});

// Handle close
ws.on('close', (code, reason) => {
  console.log('\n\n🔌 WebSocket closed');
  console.log('Close code:', code);
  if (reason) {
    console.log('Close reason:', reason.toString());
  }
  
  if (code === 4000) {
    errorCount++;
    console.error('\n❌ Error 4000: Bad request - Audio format or parameters issue');
  } else if (code === 4001) {
    errorCount++;
    console.error('\n❌ Error 4001: Unauthorized - API key issue');
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  ws.close();
  process.exit(0);
});