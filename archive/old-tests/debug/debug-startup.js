const { spawn } = require('child_process');
const path = require('path');

console.log('UniVoice Debug Startup');
console.log('======================');

// First, kill any existing processes
console.log('Killing existing processes...');
const killCmd = process.platform === 'win32' 
  ? 'taskkill /F /IM node.exe /T 2>nul & taskkill /F /IM electron.exe /T 2>nul'
  : 'pkill -f node ; pkill -f electron';

require('child_process').execSync(killCmd, { stdio: 'ignore' });

// Wait a bit
setTimeout(() => {
  console.log('\nStarting Vite in background...');
  
  // Start Vite in background
  const vite = spawn('npm', ['run', 'dev'], {
    shell: true,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let viteReady = false;
  let vitePort = null;

  vite.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('ready in')) {
      viteReady = true;
      const match = output.match(/localhost:(\d+)/);
      if (match) vitePort = match[1];
      console.log(`✓ Vite ready on port ${vitePort || '5173'}`);
    }
  });

  vite.stderr.on('data', (data) => {
    console.error('[Vite Error]', data.toString());
  });

  // Wait for Vite then start Electron with debugging
  setTimeout(() => {
    if (!viteReady) {
      console.error('❌ Vite failed to start');
      process.exit(1);
    }

    console.log('\nStarting Electron with debugging...');
    
    // Set environment variables for debugging
    const env = {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: '1',
      NODE_ENV: 'development',
      DEBUG: '*',
      VITE_DEV_SERVER_URL: `http://localhost:${vitePort || 5173}`
    };

    const electron = spawn('npx', ['electron', '.', '--inspect=9229'], {
      shell: true,
      stdio: 'inherit',
      env: env,
      cwd: process.cwd()
    });

    electron.on('error', (err) => {
      console.error('❌ Failed to start Electron:', err);
    });

    electron.on('close', (code) => {
      console.log(`Electron exited with code ${code}`);
      process.exit(code);
    });

  }, 8000);

}, 2000);

// Handle exit
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (process.platform === 'win32') {
    require('child_process').execSync('taskkill /F /IM node.exe /T & taskkill /F /IM electron.exe /T', { stdio: 'ignore' });
  }
  process.exit(0);
});