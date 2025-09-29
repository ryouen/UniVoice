# Deepgram 400 Error Diagnostics and Solutions

## Issue Summary
You're experiencing a 400 Bad Request error when the UniVoice application attempts to connect or send audio to Deepgram's WebSocket API.

## Diagnostic Steps Completed

### 1. API Key Validation ✅
- Created `test-deepgram-connection.js` to verify API key
- Result: API key is valid and connection succeeds
- WebSocket connects successfully with the current parameters

### 2. Audio Streaming Test ✅
- Created `test-deepgram-audio-stream.js` to test audio streaming
- Result: Successfully sent 3 seconds of test audio without errors
- Confirmed that the WebSocket parameters and audio format are correct

### 3. Enhanced Error Logging ✅
Enhanced `UnifiedPipelineService.ts` with:
- Detailed error messages for different error codes
- WebSocket state validation before sending audio
- Close code interpretation
- Audio buffer validation

## Potential Causes of 400 Error

### 1. **Audio Format Issues**
The most common cause of 400 errors is incorrect audio format. Deepgram expects:
- **Encoding**: linear16 (16-bit PCM)
- **Sample Rate**: 16000 Hz
- **Channels**: 1 (mono)

### 2. **Empty or Invalid Audio Buffers**
If the microphone capture is sending empty or malformed buffers.

### 3. **WebSocket State Issues**
Attempting to send data when the WebSocket is not fully open.

### 4. **Timing Issues**
Sending audio too quickly after connection or during state transitions.

## Solutions Implemented

### 1. **Enhanced Error Handling**
```typescript
// Added detailed error logging
ws.on('error', (error: any) => {
  console.error('[UnifiedPipelineService] Deepgram WebSocket error:', error);
  // Specific error interpretations...
});
```

### 2. **Audio Buffer Validation**
```typescript
// Validate buffer before sending
if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
  console.warn('[UnifiedPipelineService] Invalid audio buffer');
  return;
}
```

### 3. **WebSocket State Checking**
```typescript
// Check WebSocket state before sending
if (this.ws.readyState !== WebSocket.OPEN) {
  console.warn('[UnifiedPipelineService] WebSocket not open');
  return;
}
```

## How to Debug When Running the App

### 1. **Use the Diagnostic Launcher**
```bash
# Windows
test-app-with-diagnostics.bat

# Or directly
npm run electron
```

### 2. **What to Look For in Console**
- `[UnifiedPipelineService] Deepgram WebSocket connected successfully` - Connection OK
- `[UnifiedPipelineService] Deepgram error message:` - Specific error from Deepgram
- `[UnifiedPipelineService] WebSocket not open:` - State issues
- `[UnifiedPipelineService] Invalid audio buffer:` - Audio format problems

### 3. **Check Audio Capture**
The issue might be in the audio capture from the microphone. Look for:
- Audio permission errors
- Microphone not providing data
- Incorrect audio format from the browser

## Next Steps if Error Persists

### 1. **Check Microphone Permissions**
Ensure the app has microphone access in Windows settings.

### 2. **Verify Audio Capture Format**
The audio should be captured at 16kHz, 16-bit, mono. Check the audio capture settings in:
- `src/hooks/useUnifiedPipeline.ts`
- Look for `getUserMedia` constraints

### 3. **Test with Different Microphone**
Try a different microphone or audio input device.

### 4. **Check Deepgram Account**
- Log into https://console.deepgram.com
- Verify your account status
- Check usage limits
- Regenerate API key if needed

### 5. **Enable More Logging**
If needed, we can add more detailed logging to the audio capture process to see exactly what's being sent.

## Quick Fix Checklist

1. **Restart the application** - Sometimes WebSocket connections get stuck
2. **Check microphone is working** - Test in another app
3. **Clear browser cache** if using Electron DevTools
4. **Update .env file** with fresh API key if needed
5. **Run the test scripts** to isolate the issue:
   ```bash
   node test-deepgram-connection.js
   node test-deepgram-audio-stream.js
   ```

## Contact Support

If the issue persists after these steps:
1. Save the console output when the error occurs
2. Note the exact steps to reproduce
3. Check Deepgram status page: https://status.deepgram.com/
4. Contact Deepgram support with the error details

## References
- [Deepgram WebSocket API Docs](https://developers.deepgram.com/docs/lower-level-websockets)
- [Deepgram Error Codes](https://developers.deepgram.com/docs/errors)
- [UniVoice Architecture](./ARCHITECTURE.md)