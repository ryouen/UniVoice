/**
 * Microphone Audio Capture Utility
 * ブラウザからマイク音声をキャプチャしてElectronに送信
 */

export class MicrophoneCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: AudioWorkletNode | null = null;
  private isRecording = false;
  
  async startCapture(): Promise<void> {
    try {
      console.log('[MicrophoneCapture] Starting microphone capture...');
      
      // マイクアクセス許可を取得
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // AudioContextを初期化
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      
      // AudioWorkletを読み込み（PCM変換用）
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      
      // MediaStreamSourceを作成
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // AudioWorkletProcessorを作成
      this.processor = new AudioWorkletNode(this.audioContext, 'audio-processor');
      
      // 音声データの受信ハンドラー
      this.processor.port.onmessage = (event) => {
        const audioData = event.data;
        if (audioData && window.electron?.sendAudioChunk) {
          // PCMデータをElectronに送信
          const buffer = new Float32Array(audioData);
          const int16Array = this.convertToInt16(buffer);
          window.electron.sendAudioChunk(int16Array.buffer);
        }
      };
      
      // オーディオグラフを接続
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isRecording = true;
      console.log('[MicrophoneCapture] Microphone capture started');
      
    } catch (error) {
      console.error('[MicrophoneCapture] Failed to start capture:', error);
      throw error;
    }
  }
  
  async stopCapture(): Promise<void> {
    console.log('[MicrophoneCapture] Stopping microphone capture...');
    
    this.isRecording = false;
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    console.log('[MicrophoneCapture] Microphone capture stopped');
  }
  
  isCapturing(): boolean {
    return this.isRecording;
  }
  
  private convertToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Float32 (-1.0 to 1.0) を Int16 (-32768 to 32767) に変換
      const clampedValue = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = Math.round(clampedValue * 32767);
    }
    return int16Array;
  }
}