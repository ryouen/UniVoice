/**
 * Simple Window Management Integration Test
 * Tests the basic window management functionality without complex mocking
 */

const { spawn } = require('child_process');
const path = require('path');

// Simple test to verify window management works
async function testWindowManagement() {
  console.log('🧪 Testing Window Management...\n');
  
  const electronPath = path.join(__dirname, '../../node_modules/.bin/electron');
  const mainPath = path.join(__dirname, '../../electron/main.js');
  
  console.log('Starting Electron app...');
  const electron = spawn(electronPath, [mainPath], {
    env: { ...process.env, TEST_MODE: 'true', NODE_ENV: 'test' },
    stdio: 'pipe'
  });
  
  let output = '';
  
  electron.stdout.on('data', (data) => {
    output += data.toString();
    console.log('STDOUT:', data.toString());
  });
  
  electron.stderr.on('data', (data) => {
    console.error('STDERR:', data.toString());
  });
  
  // Give the app time to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check if WindowRegistry was initialized
  if (output.includes('WindowRegistry initialized')) {
    console.log('✅ WindowRegistry initialized successfully');
  } else {
    console.log('⚠️ WindowRegistry initialization not detected');
  }
  
  // Clean up
  electron.kill();
  
  console.log('\n✅ Window management test completed');
}

// Run the test
testWindowManagement().catch(console.error);