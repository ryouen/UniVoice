const { app, BrowserWindow } = require('electron');

console.log('Test: Simple Electron startup');
console.log('Electron version:', process.versions.electron);
console.log('Node version:', process.versions.node);

app.on('ready', () => {
  console.log('App is ready!');
  
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  win.loadURL('data:text/html,<h1>Electron Started Successfully!</h1>');
  
  win.on('ready-to-show', () => {
    console.log('Window ready to show');
  });
  
  setTimeout(() => {
    console.log('Test passed - Electron can start');
    app.quit();
  }, 3000);
});

app.on('window-all-closed', () => {
  app.quit();
});