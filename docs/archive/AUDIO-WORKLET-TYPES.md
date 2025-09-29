# AudioWorklet Type System Documentation

## Overview

This document explains the type-safe implementation of AudioWorklet in UniVoice, following Clean Architecture principles.

## Problem Statement

The original implementation used `as any` to bypass TypeScript's type checking:
```typescript
processorRef.current = workletNode as any;
```

This was necessary because:
1. `processorRef` was typed as `ScriptProcessorNode | null`
2. `workletNode` is actually an `AudioWorkletNode`
3. These are different types with different APIs

## Solution Architecture

### 1. Domain Layer (Abstract Interface)

We define an abstract interface `IAudioProcessor` that represents the domain concept of an audio processor:

```typescript
export interface IAudioProcessor {
  connect(destination: AudioNode): AudioNode;
  disconnect(): void;
  postMessage?(message: any): void;
  destroy(): void;
}
```

This interface abstracts away the implementation details of whether we're using ScriptProcessorNode (deprecated) or AudioWorkletNode (modern).

### 2. Infrastructure Layer (Concrete Implementation)

The `AudioWorkletProcessor` class implements the `IAudioProcessor` interface:

```typescript
export class AudioWorkletProcessor implements IAudioProcessor {
  private workletNode: IUniVoiceAudioWorkletNode;
  
  static async create(...): Promise<AudioWorkletProcessor> {
    // Factory method for async initialization
  }
  
  // Implement interface methods...
}
```

### 3. Application Layer (Hook)

The hook now uses the abstract interface:
```typescript
const processorRef = useRef<IAudioProcessor | null>(null);
```

## Web Audio API Standards

### AudioWorkletNode

Part of the Web Audio API Level 2 specification:
- Runs on a separate thread (doesn't block UI)
- Uses MessagePort for communication
- Requires async module loading

### ScriptProcessorNode (Deprecated)

- Runs on main thread (blocks UI)
- Direct callback-based processing
- No messaging system

## Type Safety Benefits

1. **No `as any`**: All types are properly defined
2. **Clear contracts**: Interface defines expected behavior
3. **Future-proof**: Easy to add new implementations
4. **Better IntelliSense**: IDE can provide accurate suggestions
5. **Compile-time safety**: TypeScript catches type mismatches

## Browser Compatibility

AudioWorklet is supported in:
- Chrome/Edge 66+
- Firefox 76+
- Safari 14.1+

For older browsers, a fallback to ScriptProcessorNode could be implemented using the same interface.

## References

- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [AudioWorkletNode MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode)
- [TypeScript DOM lib.d.ts](https://github.com/microsoft/TypeScript/blob/main/lib/lib.dom.d.ts)