# Main Window Display Fix - 2025-09-18

## Problem
After implementing React Router, the main window was not displaying properly because the Electron app was loading `http://localhost:${port}#/setup` which didn't exist in the React Router configuration.

## Root Cause
- The main.ts was trying to load a non-existent route "#/setup"
- React Router was configured with HashRouter with routes:
  - "/" → UniVoice component (main UI)
  - "/history" → HistoryView component
  - "/summary" → SummaryView component
- There was no "/setup" route defined

## Solution
1. **Removed "#/setup" from URL loading in main.ts**
   - Changed `await mainWindow.loadURL(\`http://localhost:${port}#/setup\`);` 
   - To: `await mainWindow.loadURL(\`http://localhost:${port}/\`);`
   - Applied to both development and production paths

2. **Updated WindowRegistry.resolveUrl() method**
   - Fixed URL resolution for HashRouter compatibility
   - Properly handles hash fragments for history/summary windows

## Files Modified
- `electron/main.ts`: Lines 160, 176, 183 - Removed "#/setup" from URL loading
- `electron/main/WindowRegistry.ts`: Lines 32-46 - Fixed resolveUrl() for HashRouter

## Result
The main window now correctly loads the UniVoice component at the root path "/" when the app starts.