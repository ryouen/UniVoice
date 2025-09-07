/**
 * Test script for 3-line display debugging
 * This script will monitor the console output and save it to a file
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Output file
const outputFile = path.join(__dirname, 'debug-3line-display.log');

// Clear the output file
fs.writeFileSync(outputFile, '=== 3-Line Display Debug Log ===\n\n');

console.log('Starting UniVoice with debug logging...');
console.log(`Debug logs will be saved to: ${outputFile}`);
console.log('\nPlease perform the following in the app:');
console.log('1. Start a recording session');
console.log('2. Speak a few sentences');
console.log('3. Watch the console output');
console.log('4. Press Ctrl+C to stop and view the log file\n');

// Start electron with console output capture
const electron = spawn('npm', ['run', 'electron'], {
  shell: true,
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
});

// Capture stdout
electron.stdout.on('data', (data) => {
  const text = data.toString();
  
  // Filter for relevant debug logs
  if (text.includes('[ASR]') || 
      text.includes('[DisplayFlow]') || 
      text.includes('[ThreeLineDebug]') ||
      text.includes('[SyncedDisplayManager]') ||
      text.includes('[ThreeLineDisplay]') ||
      text.includes('3段階表示') ||
      text.includes('displayPairs') ||
      text.includes('threeLineDisplay')) {
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${text}`;
    
    console.log(text);
    fs.appendFileSync(outputFile, logEntry);
  }
});

// Capture stderr
electron.stderr.on('data', (data) => {
  const text = data.toString();
  if (text.includes('ERROR') || text.includes('WARN')) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ERROR: ${text}`;
    
    console.error(text);
    fs.appendFileSync(outputFile, logEntry);
  }
});

// Handle exit
electron.on('close', (code) => {
  console.log(`\nElectron process exited with code ${code}`);
  console.log(`Debug log saved to: ${outputFile}`);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nStopping debug session...');
  electron.kill();
});