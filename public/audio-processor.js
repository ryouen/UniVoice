/**
 * AudioWorkletProcessor for real-time audio processing
 * Runs in a separate thread, doesn't block the main thread
 * Clean Architecture: Infrastructure Layer
 */

/**
 * Linear interpolation for resampling
 */
function linearInterpolate(a, b, t) {
  return a * (1 - t) + b * t;
}

/**
 * Simple resampling using linear interpolation
 * Good enough quality for voice applications
 */
function resampleBuffer(inputBuffer, inputRate, outputRate) {
  if (inputRate === outputRate) {
    return inputBuffer;
  }
  
  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(inputBuffer.length / ratio);
  const outputBuffer = new Float32Array(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    const inputIndex = i * ratio;
    const inputIndexFloor = Math.floor(inputIndex);
    const inputIndexCeil = Math.min(inputIndexFloor + 1, inputBuffer.length - 1);
    const fraction = inputIndex - inputIndexFloor;
    
    outputBuffer[i] = linearInterpolate(
      inputBuffer[inputIndexFloor],
      inputBuffer[inputIndexCeil],
      fraction
    );
  }
  
  return outputBuffer;
}

/**
 * Convert Float32Array to Int16Array (PCM16)
 */
function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const clampedValue = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = Math.round(clampedValue * 32767);
  }
  return int16Array;
}

/**
 * AudioWorklet processor for real-time audio capture and resampling
 */
class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Configuration from options
    const processorOptions = options.processorOptions || {};
    this.targetSampleRate = processorOptions.targetSampleRate || 16000;
    this.bufferSize = processorOptions.bufferSize || 512;
    this.debug = processorOptions.debug || false;
    
    // Processing state
    this.inputSampleRate = sampleRate; // Global AudioWorklet sample rate
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.frameCount = 0;
    this.isActive = true;
    
    // Statistics
    this.stats = {
      framesProcessed: 0,
      samplesProcessed: 0,
      buffersSent: 0
    };
    
    // Handle control messages
    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'stop':
          this.isActive = false;
          break;
          
        case 'getStats':
          this.port.postMessage({
            type: 'stats',
            data: this.stats
          });
          break;
          
        case 'updateConfig':
          if (data.bufferSize) {
            this.bufferSize = data.bufferSize;
            this.buffer = new Float32Array(this.bufferSize);
            this.bufferIndex = 0;
          }
          break;
      }
    };
    
    // Send initialization confirmation
    this.port.postMessage({
      type: 'initialized',
      data: {
        inputSampleRate: this.inputSampleRate,
        targetSampleRate: this.targetSampleRate,
        bufferSize: this.bufferSize
      }
    });
  }

  /**
   * Process audio in real-time
   * Called for each render quantum (128 samples)
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Check if we have valid input
    if (!input || !input[0] || input[0].length === 0) {
      return this.isActive;
    }
    
    const inputChannel = input[0];
    
    // Buffer the input samples
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];
      
      // When buffer is full, process and send
      if (this.bufferIndex >= this.bufferSize) {
        this.processAndSendBuffer();
      }
    }
    
    // Update statistics
    this.stats.framesProcessed++;
    this.stats.samplesProcessed += inputChannel.length;
    
    // Passthrough audio (for monitoring)
    const output = outputs[0];
    if (output && output[0]) {
      output[0].set(inputChannel);
    }
    
    // Return true to keep processor active
    return this.isActive;
  }
  
  /**
   * Process buffered audio and send to main thread
   */
  processAndSendBuffer() {
    try {
      // Resample if necessary
      let processedBuffer = this.buffer.slice(0, this.bufferIndex);
      
      if (this.inputSampleRate !== this.targetSampleRate) {
        processedBuffer = resampleBuffer(
          processedBuffer,
          this.inputSampleRate,
          this.targetSampleRate
        );
      }
      
      // Convert to PCM16
      const pcm16Data = float32ToInt16(processedBuffer);
      
      // Send to main thread
      this.port.postMessage({
        type: 'audio',
        data: {
          pcm16: pcm16Data.buffer,
          sampleRate: this.targetSampleRate,
          timestamp: currentTime, // AudioWorklet time
          frameIndex: this.frameCount++
        }
      }, [pcm16Data.buffer]); // Transfer ownership for efficiency
      
      this.stats.buffersSent++;
      
      if (this.debug && this.stats.buffersSent % 100 === 0) {
        console.log('[AudioProcessor] Buffers sent:', this.stats.buffersSent);
      }
    } catch (error) {
      this.port.postMessage({
        type: 'error',
        data: {
          message: error.message,
          stack: error.stack
        }
      });
    }
    
    // Reset buffer
    this.bufferIndex = 0;
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);