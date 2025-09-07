/**
 * test-clean-integration.js
 * Test script to verify the clean implementation works
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('========================================');
console.log('Testing Clean UniVoice Implementation');
console.log('========================================\n');

// Check if compiled files exist
const fs = require('fs');
const requiredFiles = [
  'dist-electron/main-clean.js',
  'dist-electron/preload-clean.js',
  'dist-electron/services/AudioPipelineService.js',
  'dist-electron/services/IPCBridge.js'
];

console.log('Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please run the build first.');
  process.exit(1);
}

console.log('\n✅ All required files exist');

// Check environment variables
console.log('\nChecking environment variables...');
require('dotenv').config();

if (!process.env.DEEPGRAM_API_KEY) {
  console.log('❌ DEEPGRAM_API_KEY not set in .env');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.log('❌ OPENAI_API_KEY not set in .env');
  process.exit(1);
}

console.log('✅ API keys configured');

// Test AudioPipelineService directly
console.log('\nTesting AudioPipelineService...');
const { AudioPipelineService } = require('./dist-electron/services/AudioPipelineService.js');

const pipeline = new AudioPipelineService({
  deepgramApiKey: process.env.DEEPGRAM_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
});

// Test pipeline events
pipeline.on('started', () => {
  console.log('✅ Pipeline started event received');
});

pipeline.on('deepgram.connected', () => {
  console.log('✅ Deepgram connected');
  
  // Clean shutdown after connection test
  setTimeout(() => {
    console.log('\nStopping pipeline...');
    pipeline.stop().then(() => {
      console.log('✅ Pipeline stopped successfully');
      console.log('\n========================================');
      console.log('All tests passed! Ready to run the app.');
      console.log('========================================');
      process.exit(0);
    });
  }, 2000);
});

pipeline.on('error', (error) => {
  console.error('❌ Pipeline error:', error);
  process.exit(1);
});

// Start the pipeline
console.log('Starting pipeline...');
pipeline.start().catch(err => {
  console.error('❌ Failed to start pipeline:', err);
  process.exit(1);
});