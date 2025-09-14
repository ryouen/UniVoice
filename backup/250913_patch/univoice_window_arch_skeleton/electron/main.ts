import { app, BrowserWindow, ipcMain } from 'electron';
import { windows } from './window-registry';

function createSetup() {
  const win = windows.createOrShow('setup', {
    width: 600, height: 400,
    title: 'UniVoice Setup',
  });
  win.loadURL(windows.resolveUrl('#/setup'));
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  createSetup();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createSetup();
  });
});

// IPC: Setup -> fit to background size
ipcMain.handle('setup:setDesiredBounds', (_e, width: number, height: number) => {
  windows.fitSetupTo(width, height);
});

// IPC: Setup -> enter main (reuse window & restore last main bounds)
ipcMain.handle('setup:enterMain', async () => {
  windows.reuseSetupAsMain();
});

// IPC: History / Summary windows
ipcMain.handle('windows:openHistory', () => {
  const w = windows.createOrShow('history', { width: 420, height: 600, title: 'History' });
  w.loadURL(windows.resolveUrl('#/history'));
  w.show();
});
ipcMain.handle('windows:openSummary', () => {
  const w = windows.createOrShow('summary', { width: 420, height: 600, title: 'Summary' });
  w.loadURL(windows.resolveUrl('#/summary'));
  w.show();
});
ipcMain.handle('windows:toggleHistory', () => {
  const w = windows.get('history');
  if (w) (w.isVisible() ? w.hide() : w.show());
  else ipcMain.emit('windows:openHistory');
});
ipcMain.handle('windows:toggleSummary', () => {
  const w = windows.get('summary');
  if (w) (w.isVisible() ? w.hide() : w.show());
  else ipcMain.emit('windows:openSummary');
});
