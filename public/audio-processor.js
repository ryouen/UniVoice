/**
 * AudioWorkletProcessor for real-time audio processing
 * Runs in a separate thread, doesn't block the main thread
 */
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 512;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  /**
   * Process audio in real-time
   * @param {Float32Array[][]} inputs - Input audio data
   * @param {Float32Array[][]} outputs - Output audio data (passthrough)
   * @param {Object} parameters - AudioParam values
   * @returns {boolean} - true to keep processor alive
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input && input[0]) {
      const inputChannel = input[0];
      
      // Buffer audio samples
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex++] = inputChannel[i];
        
        // When buffer is full, send it to main thread
        if (this.bufferIndex >= this.bufferSize) {
          this.port.postMessage({
            type: 'audio',
            data: this.buffer.slice() // Copy the buffer
          });
          this.bufferIndex = 0;
        }
      }
    }
    
    // Passthrough audio
    if (outputs[0] && outputs[0][0] && inputs[0] && inputs[0][0]) {
      outputs[0][0].set(inputs[0][0]);
    }
    
    return true; // Keep processor alive
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);