/**
 * Audio Infrastructure Exports
 * 
 * This module provides type-safe audio processing capabilities
 * for the UniVoice application.
 */

export { AudioWorkletProcessor, LegacyScriptProcessor } from './AudioWorkletProcessor';
export type { 
  IAudioProcessor,
  AudioProcessorMessage,
  AudioDataMessage,
  AudioProcessorOptions,
  IUniVoiceAudioWorkletNode,
  CreateAudioProcessor
} from '../../types/audio-processor.types';