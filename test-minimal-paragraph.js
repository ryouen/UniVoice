/**
 * Minimal test to debug why ParagraphBuilder is not working
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('Starting minimal ParagraphBuilder test...');

// Set environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'electron', 'preload.ts')
    }
  });

  await mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Open DevTools
  mainWindow.webContents.openDevTools();
  
  console.log('Window created and loaded');
}

app.on('ready', async () => {
  console.log('App ready');
  await createWindow();
  
  // Wait for IPCGateway to be initialized
  setTimeout(async () => {
    console.log('Sending test request to start listening...');
    
    // Import the gateway after app is ready
    const { IPCGateway } = require('./electron/services/ipc/gateway');
    const gateway = new IPCGateway();
    
    // Initialize the gateway
    await gateway.initialize();
    
    // Start listening
    try {
      const result = await gateway.startListening('en', 'ja');
      console.log('Start listening result:', result);
      
      // Simulate some transcript segments
      setTimeout(() => {
        console.log('Test complete, check console logs for ParagraphBuilder activity');
        
        // Stop listening
        gateway.stopListening().then(() => {
          console.log('Stopped listening');
          app.quit();
        });
      }, 10000);
      
    } catch (error) {
      console.error('Failed to start listening:', error);
      app.quit();
    }
  }, 2000);
});

app.on('window-all-closed', () => {
  app.quit();
});