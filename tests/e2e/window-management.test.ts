/**
 * E2E Test for Window Management Architecture
 * 
 * Tests:
 * - Window position restoration after app restart
 * - Setup window sizing to .background element
 * - Main window restoration to user's previous size
 * - History/Summary panels as independent windows
 * - Window lifecycle management
 */

import { test, expect } from '@playwright/test';
import { ElectronApplication, _electron as electron } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

let electronApp: ElectronApplication;

// Path to the window bounds storage file
const BOUNDS_FILE = path.join(
  process.env.APPDATA || 
  (process.platform === 'darwin' ? 
    path.join(os.homedir(), 'Library/Application Support') : 
    path.join(os.homedir(), '.config')
  ),
  'univoice-2.0',
  'window-bounds.json'
);

test.describe('Window Management E2E Tests', () => {
  test.beforeEach(async () => {
    // Clean up bounds file before each test
    if (fs.existsSync(BOUNDS_FILE)) {
      fs.unlinkSync(BOUNDS_FILE);
    }

    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_MODE: 'true'
      }
    });
  });

  test.afterEach(async () => {
    // Close the app
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('Setup window should size to .background element', async () => {
    // Get the main window
    const window = await electronApp.firstWindow();
    
    // Wait for .background element to be rendered
    await window.waitForSelector('.background', { timeout: 5000 });
    
    // Get the .background element dimensions
    const backgroundDimensions = await window.evaluate(() => {
      const el = document.querySelector('.background');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height)
      };
    });
    
    expect(backgroundDimensions).toBeTruthy();
    
    // Wait a bit for ResizeObserver to trigger
    await window.waitForTimeout(500);
    
    // Get window bounds
    const bounds = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.getBounds();
    });
    
    // Verify window was resized to match .background
    expect(bounds.width).toBe(backgroundDimensions!.width);
    expect(bounds.height).toBe(backgroundDimensions!.height);
  });

  test('Window bounds should persist across app restarts', async () => {
    const window = await electronApp.firstWindow();
    
    // Move and resize the window
    const newBounds = { x: 100, y: 100, width: 1200, height: 800 };
    await electronApp.evaluate(async ({ BrowserWindow }, bounds) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.setBounds(bounds);
    }, newBounds);
    
    // Wait for bounds to be saved
    await window.waitForTimeout(1000);
    
    // Close the app
    await electronApp.close();
    
    // Verify bounds file was created
    expect(fs.existsSync(BOUNDS_FILE)).toBe(true);
    
    // Read saved bounds
    const savedData = JSON.parse(fs.readFileSync(BOUNDS_FILE, 'utf-8'));
    expect(savedData.main).toMatchObject(newBounds);
    
    // Relaunch the app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_MODE: 'true'
      }
    });
    
    // Get restored window bounds
    const restoredBounds = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.getBounds();
    });
    
    // Verify window was restored to saved position
    expect(restoredBounds).toMatchObject(newBounds);
  });

  test('Setup window should transition to Main window', async () => {
    const window = await electronApp.firstWindow();
    
    // Wait for setup screen
    await window.waitForSelector('.setup-screen', { timeout: 5000 });
    
    // Get initial window title
    const initialTitle = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.getTitle();
    });
    
    expect(initialTitle).toContain('Setup');
    
    // Click start session button
    await window.click('[data-testid="start-session-button"]');
    
    // Wait for main screen
    await window.waitForSelector('.main-content', { timeout: 5000 });
    
    // Verify window role changed
    const mainTitle = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.getTitle();
    });
    
    expect(mainTitle).toContain('UniVoice');
    expect(mainTitle).not.toContain('Setup');
    
    // Verify bounds were preserved during transition
    const boundsData = JSON.parse(fs.readFileSync(BOUNDS_FILE, 'utf-8'));
    expect(boundsData.main).toBeDefined();
    expect(boundsData.setup).toBeUndefined(); // Setup bounds should be cleared
  });

  test('History panel should open as independent window', async () => {
    const mainWindow = await electronApp.firstWindow();
    
    // Navigate to main screen
    await mainWindow.waitForSelector('.setup-screen');
    await mainWindow.click('[data-testid="start-session-button"]');
    await mainWindow.waitForSelector('.main-content');
    
    // Click history button
    await mainWindow.click('[data-testid="history-button"]');
    
    // Wait for new window
    await mainWindow.waitForTimeout(500);
    
    // Verify two windows exist
    const windowCount = await electronApp.evaluate(async ({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows().length;
    });
    
    expect(windowCount).toBe(2);
    
    // Get history window
    const windows = await electronApp.windows();
    const historyWindow = windows.find(w => w !== mainWindow);
    
    expect(historyWindow).toBeTruthy();
    
    // Verify history window properties
    const historyProps = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const wins = BrowserWindow.getAllWindows();
      const historyWin = wins.find(w => w.getTitle().includes('History'));
      return {
        title: historyWin?.getTitle(),
        isVisible: historyWin?.isVisible(),
        bounds: historyWin?.getBounds()
      };
    });
    
    expect(historyProps.title).toContain('History');
    expect(historyProps.isVisible).toBe(true);
    expect(historyProps.bounds.width).toBeGreaterThan(0);
    expect(historyProps.bounds.height).toBeGreaterThan(0);
  });

  test('Summary panel should open as independent window', async () => {
    const mainWindow = await electronApp.firstWindow();
    
    // Navigate to main screen
    await mainWindow.waitForSelector('.setup-screen');
    await mainWindow.click('[data-testid="start-session-button"]');
    await mainWindow.waitForSelector('.main-content');
    
    // Click summary button
    await mainWindow.click('[data-testid="summary-button"]');
    
    // Wait for new window
    await mainWindow.waitForTimeout(500);
    
    // Verify two windows exist
    const windowCount = await electronApp.evaluate(async ({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows().length;
    });
    
    expect(windowCount).toBe(2);
    
    // Verify summary window properties
    const summaryProps = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const wins = BrowserWindow.getAllWindows();
      const summaryWin = wins.find(w => w.getTitle().includes('Summary'));
      return {
        title: summaryWin?.getTitle(),
        isVisible: summaryWin?.isVisible(),
        bounds: summaryWin?.getBounds()
      };
    });
    
    expect(summaryProps.title).toContain('Summary');
    expect(summaryProps.isVisible).toBe(true);
  });

  test('Panel windows should hide on close and show on toggle', async () => {
    const mainWindow = await electronApp.firstWindow();
    
    // Navigate to main screen
    await mainWindow.waitForSelector('.setup-screen');
    await mainWindow.click('[data-testid="start-session-button"]');
    await mainWindow.waitForSelector('.main-content');
    
    // Open history panel
    await mainWindow.click('[data-testid="history-button"]');
    await mainWindow.waitForTimeout(500);
    
    // Close history window
    await electronApp.evaluate(async ({ BrowserWindow }) => {
      const wins = BrowserWindow.getAllWindows();
      const historyWin = wins.find(w => w.getTitle().includes('History'));
      historyWin?.close();
    });
    
    await mainWindow.waitForTimeout(500);
    
    // Verify window is hidden, not destroyed
    const historyState = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const wins = BrowserWindow.getAllWindows();
      const historyWin = wins.find(w => w.getTitle().includes('History'));
      return {
        exists: !!historyWin,
        isVisible: historyWin?.isVisible(),
        isDestroyed: historyWin?.isDestroyed()
      };
    });
    
    expect(historyState.exists).toBe(true);
    expect(historyState.isVisible).toBe(false);
    expect(historyState.isDestroyed).toBe(false);
    
    // Toggle history panel again
    await mainWindow.click('[data-testid="history-button"]');
    await mainWindow.waitForTimeout(500);
    
    // Verify window is shown again
    const historyStateAfterToggle = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const wins = BrowserWindow.getAllWindows();
      const historyWin = wins.find(w => w.getTitle().includes('History'));
      return {
        isVisible: historyWin?.isVisible()
      };
    });
    
    expect(historyStateAfterToggle.isVisible).toBe(true);
  });

  test('Window bounds should handle multi-display environments', async () => {
    // This test verifies the ensureOnScreen logic
    const window = await electronApp.firstWindow();
    
    // Try to set window to off-screen position
    await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.setBounds({ x: 10000, y: 10000, width: 800, height: 600 });
    });
    
    await window.waitForTimeout(1000);
    
    // Close and reopen
    await electronApp.close();
    
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_MODE: 'true'
      }
    });
    
    // Get restored bounds
    const restoredBounds = await electronApp.evaluate(async ({ BrowserWindow, screen }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const display = screen.getPrimaryDisplay();
      return {
        window: win.getBounds(),
        display: display.workAreaSize
      };
    });
    
    // Verify window is within visible area
    expect(restoredBounds.window.x).toBeGreaterThanOrEqual(0);
    expect(restoredBounds.window.y).toBeGreaterThanOrEqual(0);
    expect(restoredBounds.window.x).toBeLessThan(restoredBounds.display.width);
    expect(restoredBounds.window.y).toBeLessThan(restoredBounds.display.height);
  });

  test('Main window should restore user-adjusted size after Setup transition', async () => {
    const window = await electronApp.firstWindow();
    
    // Wait for setup screen
    await window.waitForSelector('.setup-screen');
    
    // Start session to enter main mode
    await window.click('[data-testid="start-session-button"]');
    await window.waitForSelector('.main-content');
    
    // Resize main window to custom size
    const customBounds = { x: 150, y: 150, width: 1400, height: 900 };
    await electronApp.evaluate(async ({ BrowserWindow }, bounds) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.setBounds(bounds);
    }, customBounds);
    
    await window.waitForTimeout(1000);
    
    // Close app
    await electronApp.close();
    
    // Relaunch
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_MODE: 'true',
        SKIP_SETUP: 'true' // Skip setup screen for this test
      }
    });
    
    // Verify main window restored to custom size
    const restoredBounds = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.getBounds();
    });
    
    expect(restoredBounds).toMatchObject(customBounds);
  });
});