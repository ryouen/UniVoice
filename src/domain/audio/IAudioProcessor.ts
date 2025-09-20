/**
 * Audio Processor Domain Interface
 * Clean Architecture: Domain Layer - Core Business Logic
 */

export interface IAudioProcessor {
  /**
   * Start audio processing
   * @param stream - MediaStream from getUserMedia
   * @returns Promise that resolves when processing starts
   */
  startProcessing(stream: MediaStream): Promise<void>;

  /**
   * Stop audio processing and cleanup resources
   */
  stopProcessing(): void;

  /**
   * Set callback for processed audio data
   * @param callback - Function to receive PCM audio data
   */
  onAudioData(callback: (pcmData: Int16Array) => void): void;

  /**
   * Check if processor is currently running
   */
  isProcessing(): boolean;

  /**
   * Get current sample rate
   */
  getSampleRate(): number;
}

/**
 * Audio processing configuration
 */
export interface AudioProcessorConfig {
  targetSampleRate: number;
  bufferSize: number;
  channelCount: number;
}

/**
 * Audio processing result
 */
export interface AudioProcessingResult {
  pcmData: Int16Array;
  timestamp: number;
  sampleRate: number;
}