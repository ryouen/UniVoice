/**
 * Quick Smoke Test (1-2 minutes)
 * Basic functionality verification before 180-minute test
 */

import { DeepgramService } from '../../electron/services/DeepgramService';
import { CloudTranslationService } from '../../electron/services/CloudTranslationService';
import { SummaryService } from '../../electron/services/SummaryService';
import { AudioRingBuffer } from '../../electron/utils/RingBuffer';

describe('Quick Smoke Test (1-2 min)', () => {
  let deepgram: DeepgramService;
  let translator: CloudTranslationService;
  let summarizer: SummaryService;
  let audioBuffer: AudioRingBuffer;
  
  beforeAll(() => {
    // Mock credentials for test
    process.env.NODE_ENV = 'test';
    
    try {
      deepgram = new DeepgramService({
        apiKey: 'test-key',
        endpointing: 800
      });
    } catch (e) {
      console.log('DeepgramService init error (expected in test):', e);
    }
    
    try {
      translator = new CloudTranslationService({
        projectId: 'test-project',
        location: 'global',
        credentials: { client_email: 'test', private_key: 'test' }
      });
    } catch (e) {
      console.log('CloudTranslationService init error (expected in test):', e);
    }
    
    summarizer = new SummaryService({
      apiKey: 'test-key',
      model: 'gpt-4.1-mini'
    });
    
    audioBuffer = new AudioRingBuffer(2 * 60, 16000); // 2 minutes buffer
  });
  
  afterAll(() => {
    if (deepgram) deepgram.destroy();
    if (translator) translator.destroy();
    if (summarizer) summarizer.destroy();
  });
  
  test('should handle 1 minute of audio without errors', () => {
    const SAMPLE_RATE = 16000;
    const DURATION_SECONDS = 60; // 1 minute
    
    // Generate 1 minute of mock audio
    const audioData = new Int16Array(SAMPLE_RATE * DURATION_SECONDS);
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = Math.floor(Math.random() * 32767);
    }
    
    // Write to buffer
    const writeResult = audioBuffer.write(audioData);
    expect(writeResult).toBe(true);
    
    // Check buffer state
    const stats = audioBuffer.getStats();
    expect(stats.availableSamples).toBe(SAMPLE_RATE * DURATION_SECONDS);
    expect(stats.dropped).toBe(0); // No drops in 1 minute
    expect(stats.utilization).toBeGreaterThan(0);
    expect(stats.utilization).toBeLessThanOrEqual(50); // 1 min in 2 min buffer = 50%
    
    console.log('1-minute audio test stats:', stats);
  });
  
  test('should process 2 minutes with buffer overflow', () => {
    const SAMPLE_RATE = 16000;
    const audioBuffer2Min = new AudioRingBuffer(1, 16000); // Only 1 second buffer
    
    // Write 2 seconds of audio to 1 second buffer
    const firstSecond = new Int16Array(SAMPLE_RATE);
    const secondSecond = new Int16Array(SAMPLE_RATE);
    
    audioBuffer2Min.write(firstSecond);
    let stats = audioBuffer2Min.getStats();
    expect(stats.dropped).toBe(0);
    
    audioBuffer2Min.write(secondSecond);
    stats = audioBuffer2Min.getStats();
    expect(stats.dropped).toBe(SAMPLE_RATE); // First second should be dropped
    expect(stats.availableSamples).toBe(SAMPLE_RATE); // Only second second remains
    
    console.log('2-minute overflow test stats:', stats);
  });
  
  test('should handle rapid read/write cycles', () => {
    // Create a fresh buffer for this test
    const testBuffer = new AudioRingBuffer(2 * 60, 16000);
    const CHUNK_SIZE = 16000; // 1 second chunks
    const NUM_CYCLES = 60; // 60 cycles = 1 minute
    
    for (let i = 0; i < NUM_CYCLES; i++) {
      // Write chunk
      const writeData = new Int16Array(CHUNK_SIZE);
      testBuffer.write(writeData);
      
      // Read half
      const readData = testBuffer.read(CHUNK_SIZE / 2);
      expect(readData).not.toBeNull();
      expect(readData!.length).toBe(CHUNK_SIZE / 2);
    }
    
    const finalStats = testBuffer.getStats();
    console.log('Rapid cycle test final stats:', finalStats);
    expect(finalStats.totalWritten).toBe(CHUNK_SIZE * NUM_CYCLES);
    expect(finalStats.totalRead).toBe((CHUNK_SIZE / 2) * NUM_CYCLES);
  });
  
  test('should calculate costs for 2-minute session', () => {
    const DURATION_MINUTES = 2;
    
    // Deepgram cost
    const deepgramCost = DURATION_MINUTES * 0.0077;
    expect(deepgramCost).toBeCloseTo(0.0154, 4);
    
    // Translation cost (assume 100 chars/min)
    const translationChars = DURATION_MINUTES * 100;
    const translationCost = (translationChars / 1000000) * 20;
    expect(translationCost).toBeLessThan(0.01);
    
    // Summary cost (assume 200 tokens/min)
    const summaryTokens = DURATION_MINUTES * 200;
    const summaryCost = (summaryTokens / 1000000) * 0.40;
    expect(summaryCost).toBeLessThan(0.01);
    
    const totalCost = deepgramCost + translationCost + summaryCost;
    expect(totalCost).toBeLessThan(0.03); // Less than 3 cents for 2 minutes
    
    console.log(`2-minute session cost estimate: $${totalCost.toFixed(4)}`);
  });
  
  test('should add and retrieve transcripts correctly', () => {
    // Add transcripts
    for (let i = 0; i < 10; i++) {
      summarizer.addTranscript(`Test transcript ${i}`);
    }
    
    // Retrieve transcripts
    const transcripts = summarizer.getTranscripts();
    expect(transcripts).toHaveLength(10);
    expect(transcripts[0].text).toBe('Test transcript 0');
    expect(transcripts[9].text).toBe('Test transcript 9');
    
    // Clear and verify
    summarizer.clearTranscripts();
    expect(summarizer.getTranscripts()).toHaveLength(0);
  });
  
  test('should handle memory efficiently for 2 minutes', () => {
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    
    // Simulate 2 minutes of processing
    const SAMPLE_RATE = 16000;
    const DURATION_SECONDS = 120;
    const CHUNK_SECONDS = 1;
    
    for (let second = 0; second < DURATION_SECONDS; second++) {
      const chunk = new Int16Array(SAMPLE_RATE * CHUNK_SECONDS);
      audioBuffer.write(chunk);
      
      // Every 10 seconds, read some data
      if (second % 10 === 0) {
        audioBuffer.read(SAMPLE_RATE * 5); // Read 5 seconds
      }
      
      // Every 30 seconds, add a transcript
      if (second % 30 === 0) {
        summarizer.addTranscript(`Transcript at ${second} seconds`);
      }
    }
    
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    const memoryIncrease = endMemory - startMemory;
    
    console.log(`Memory usage: Start=${startMemory.toFixed(2)}MB, End=${endMemory.toFixed(2)}MB, Increase=${memoryIncrease.toFixed(2)}MB`);
    
    // Should not increase by more than 50MB for 2 minutes
    expect(memoryIncrease).toBeLessThan(50);
  });
});

// Helper function
function generateMockAudio(sampleRate: number, durationSeconds: number): Int16Array {
  const samples = sampleRate * durationSeconds;
  const audio = new Int16Array(samples);
  
  // Generate simple sine wave
  const frequency = 440; // A4
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    audio[i] = Math.floor(Math.sin(2 * Math.PI * frequency * t) * 32767);
  }
  
  return audio;
}