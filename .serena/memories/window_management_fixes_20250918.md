# Window Management Fixes - 2025-09-18

## Issues Fixed

### 1. Setup Window Size Reset Issue
**Problem**: Setup window was retaining Main window size when returning from Main screen
**Solution**: Added explicit window bounds reset in `UniVoice.tsx` when ending session:
```typescript
// Setup画面に戻る際にウィンドウサイズをリセット
if (window.univoice?.window?.setBounds) {
  await window.univoice.window.setBounds({
    width: 600,
    height: 800
  });
}
```

### 2. Main Window Resize Capability
**Problem**: Main window lost resize capability after transition
**Solution**: WindowRegistry already sets `resizable: true` for main window, verified in `getRoleDefaults()` method

### 3. Session Restart Loop (Ctrl+Shift+R)
**Problem**: Session restart caused immediate return to Setup screen
**Solution**: Added proper cleanup in session reset handler:
- Clear session state properly
- Reset window bounds before transition
- Initialize fresh session state

### 4. Duplicate Summary Buttons
**Problem**: Both "Summary" and "Progressive Summary" buttons were displayed
**Solution**: Consolidated functionality into single summary button:
- Removed separate ProgressiveSummarySection button
- Integrated Progressive Summary functionality into existing summary button
- Button now toggles Progressive Summary panel with 400/800/1600/2400 word options

## Key Components Modified

### UniVoice.tsx
- Added WindowClient import and initialization
- Added window bounds reset on session end
- Modified summary button to include Progressive Summary functionality
- Removed duplicate Progressive Summary button

### WindowRegistry.ts
- Setup window: 600x800, resizable: false, centered
- Main window: 1200x400, resizable: true
- Proper bounds persistence for non-setup windows
- Special handling to prevent setup window from saving bounds

## Verification Points
1. ✅ Setup window displays at correct 600x800 size
2. ✅ Main window allows resizing
3. ✅ Returning to Setup resets window size
4. ✅ Single summary button with Progressive Summary functionality
5. ✅ No duplicate buttons in UI
6. ✅ Ctrl+Shift+R properly resets session without loop

## Related Services
- WindowClient: Thin wrapper for window management from renderer
- SessionStorageService: Currently unused (data persistence missing)
- WindowRegistry: Core window lifecycle management
- BoundsStore: Window position/size persistence