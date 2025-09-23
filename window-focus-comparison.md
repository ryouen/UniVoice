# Window Focus Issue Comparison: Main vs Summary Window

## Executive Summary
The main window has focus issues (can't click to other apps) while the summary window works correctly. This comparison identifies key differences that may be causing the issue.

## Detailed Comparison Table

| Feature/Setting | Main Window | Summary Window | Potential Issue? |
|-----------------|-------------|----------------|------------------|
| **Electron BrowserWindow Settings** |
| transparent | `true` (setup/history), `false` (main after transition) | `false` (hardcoded in WindowRegistry line 74) | ⚠️ **YES** - Main window transparency may interfere with focus |
| backgroundColor | `#00000000` (transparent) or `#ffffff` (opaque) | `#ffffff` (opaque) | ⚠️ **YES** - Transparent background causes focus issues |
| focusable | `true` | `true` | No |
| frame | `false` | `false` | No |
| type (Windows) | `'normal'` | `'normal'` | No |
| skipTaskbar | `false` | `false` | No |
| hasShadow | `false` (transparent) or `true` (opaque) | `true` | ⚠️ **MAYBE** - Shadow disabled for transparent windows |
| acceptFirstMouse | `true` | `true` | No |
| thickFrame | Based on resizable | Based on resizable | No |

## CSS Analysis

| Feature/Setting | Main Window | Summary Window | Potential Issue? |
|-----------------|-------------|----------------|------------------|
| **WebkitAppRegion** |
| Header drag region | `.dragHandle` with `z-index: -1` | `.headerBar` with `-webkit-app-region: drag` | ⚠️ **MAYBE** - Different drag implementations |
| Drag handle size | Only top 30px of header | Entire header bar | No |
| Button z-index | `z-index: 1` for all buttons | No explicit z-index | No |

| **Background Layers** |
| `.backgroundLayer` | `position: fixed; z-index: -1; pointer-events: none` | Not present | ✅ Good - pointer-events disabled |
| Theme backgrounds | Multiple `::before` and `::after` pseudo-elements | Only `::before` pseudo-elements | ⚠️ **YES** - Main has more layers |
| Window opacity | Various elements with `0.85-0.95` opacity | Similar opacity values | No |

| **Transparent Overlays** |
| Glassmorphism effects | Extensive use with backdrop-filter | Same glassmorphism effects | No |
| Overlay divs | None found blocking clicks | None found | No |
| Fixed/absolute positioning | Multiple layers but all have proper pointer-events | Fewer layers overall | ⚠️ **MAYBE** |

## Critical Differences Found

### 1. **Window Transparency (MOST LIKELY CAUSE)**
- **Main Window**: Created with `transparent: true` initially (setup window), may retain transparency after transition
- **Summary Window**: Explicitly set to `transparent: false` in WindowRegistry.ts line 74
- **Issue**: Windows with transparency enabled have known focus issues on Windows

### 2. **Background Color**
- **Main Window**: Uses `#00000000` (fully transparent) when transparent
- **Summary Window**: Always uses `#ffffff` (opaque white)
- **Issue**: Fully transparent backgrounds prevent proper click-through behavior

### 3. **Window Lifecycle**
- **Main Window**: Reuses setup window which was created transparent
- **Summary Window**: Created fresh with transparency disabled
- **Issue**: Window properties may not fully update during role transition

### 4. **CSS Background Layers**
- **Main Window**: Has `.backgroundLayer` fixed element (though pointer-events disabled)
- **Summary Window**: No such layer
- **Issue**: Multiple stacked layers may interfere despite pointer-events settings

## Recommended Fixes

1. **Force Main Window to be Non-Transparent**:
   ```typescript
   // In WindowRegistry.ts, line 74
   const isTransparent = role !== 'summary' && role !== 'main' && role !== 'setup';
   ```

2. **Ensure Proper Window Transition**:
   ```typescript
   // In reuseSetupAsMain(), force non-transparent background
   setup.setBackgroundColor('#ffffff');
   ```

3. **Remove backgroundLayer from Main Window**:
   - The `.backgroundLayer` div serves no purpose if window is opaque
   - Remove it to reduce complexity

4. **Check Window State During Different Phases**:
   - The issue may only occur when waiting for data vs showing data
   - Add logging to track window transparency state

## Testing Steps

1. Check if main window `isTransparent()` returns true after setup transition
2. Test with hardcoded `transparent: false` for all windows
3. Remove `.backgroundLayer` div and test
4. Log window bounds and transparency during click attempts