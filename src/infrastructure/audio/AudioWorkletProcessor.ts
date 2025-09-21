/**
 * AudioWorkletProcessor - Infrastructure implementation
 * 
 * Concrete implementation of IAudioProcessor using AudioWorkletNode.
 * Provides type-safe wrapper around the Web Audio API.
 */

import type { 
  IAudioProcessor, 
  IUniVoiceAudioWorkletNode,
  AudioProcessorMessage,
  AudioProcessorOptions 
} from '../../types/audio-processor.types';

export class AudioWorkletProcessor implements IAudioProcessor {
  private workletNode: IUniVoiceAudioWorkletNode;
  private cleanupHandlers: (() => void)[] = [];

  private constructor(workletNode: IUniVoiceAudioWorkletNode) {
    this.workletNode = workletNode;
  }

  /**
   * Factory method to create and initialize AudioWorkletProcessor
   */
  static async create(
    context: AudioContext,
    source: MediaStreamAudioSourceNode,
    onMessage: (event: MessageEvent<AudioProcessorMessage>) => void,
    options: AudioProcessorOptions = {
      targetSampleRate: 16000,
      bufferSize: 512,
      debug: false
    }
  ): Promise<AudioWorkletProcessor> {
    // Validate AudioWorklet support
    if (!context.audioWorklet) {
      throw new Error('AudioWorklet is not supported in this browser');
    }

    // Load the AudioWorklet module
    try {
      await context.audioWorklet.addModule('/audio-processor.js');
    } catch (error) {
      throw new Error(`Failed to load audio processor module: ${error}`);
    }

    // Create AudioWorkletNode with proper typing
    const workletNode = new AudioWorkletNode(
      context, 
      'audio-processor',
      {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: options
      }
    ) as IUniVoiceAudioWorkletNode;

    // Set up message handling
    workletNode.port.onmessage = onMessage;

    // Connect audio graph
    source.connect(workletNode);

    // Create and return processor instance
    const processor = new AudioWorkletProcessor(workletNode);
    
    // Store cleanup handler
    processor.cleanupHandlers.push(() => {
      workletNode.port.onmessage = null;
    });

    return processor;
  }

  connect(destination: AudioNode): AudioNode {
    return this.workletNode.connect(destination);
  }

  disconnect(): void {
    this.workletNode.disconnect();
  }

  postMessage(message: any): void {
    this.workletNode.port.postMessage(message);
  }

  destroy(): void {
    // Send stop message
    this.postMessage({ type: 'stop' });
    
    // Disconnect audio graph
    this.disconnect();
    
    // Run cleanup handlers
    this.cleanupHandlers.forEach(handler => handler());
    this.cleanupHandlers = [];
  }
}

/**
 * Legacy ScriptProcessorNode wrapper for fallback
 * (Not recommended due to deprecated status and UI blocking)
 */
export class LegacyScriptProcessor implements IAudioProcessor {
  private processor: ScriptProcessorNode;

  constructor(processor: ScriptProcessorNode) {
    this.processor = processor;
    console.warn('[LegacyScriptProcessor] Using deprecated ScriptProcessorNode. Consider updating your browser.');
  }

  connect(destination: AudioNode): AudioNode {
    return this.processor.connect(destination);
  }

  disconnect(): void {
    this.processor.disconnect();
  }

  postMessage?(message: any): void {
    // ScriptProcessorNode doesn't support messaging
    console.warn('[LegacyScriptProcessor] postMessage not supported on ScriptProcessorNode');
  }

  destroy(): void {
    this.disconnect();
    // ScriptProcessorNode doesn't have explicit cleanup
  }
}