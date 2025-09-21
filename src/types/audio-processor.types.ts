/**
 * Audio Processor Type Definitions
 * 
 * Domain layer interface for audio processing capabilities.
 * This abstracts away the implementation details of ScriptProcessorNode vs AudioWorkletNode.
 */

/**
 * Domain interface for audio processing
 * Defines the contract that any audio processor implementation must fulfill
 */
export interface IAudioProcessor {
  /** Connect to an audio node */
  connect(destination: AudioNode): AudioNode;
  
  /** Disconnect from all destinations */
  disconnect(): void;
  
  /** Send a message to the processor (if supported) */
  postMessage?(message: any): void;
  
  /** Clean up resources */
  destroy(): void;
}

/**
 * Message types for AudioWorklet communication
 */
export interface AudioProcessorMessage {
  type: 'initialized' | 'audio' | 'error' | 'stop';
  data?: any;
}

/**
 * Audio data message structure
 */
export interface AudioDataMessage extends AudioProcessorMessage {
  type: 'audio';
  data: {
    pcm16: ArrayBuffer;
    sampleRate: number;
    timestamp: number;
  };
}

/**
 * Configuration for AudioWorklet processor
 */
export interface AudioProcessorOptions {
  targetSampleRate: number;
  bufferSize: number;
  debug?: boolean;
}

/**
 * Extended AudioWorkletNode type with proper typing for our use case
 */
export interface IUniVoiceAudioWorkletNode extends AudioWorkletNode {
  port: MessagePort;
}

/**
 * Factory function type for creating audio processors
 */
export type CreateAudioProcessor = (
  context: AudioContext,
  source: MediaStreamAudioSourceNode,
  onMessage: (event: MessageEvent<AudioProcessorMessage>) => void
) => Promise<IAudioProcessor>;