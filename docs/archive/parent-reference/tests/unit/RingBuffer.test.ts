import { RingBuffer, AudioRingBuffer } from '../../electron/utils/RingBuffer';

describe('RingBuffer', () => {
  describe('Basic operations', () => {
    test('should initialize with correct capacity', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.getCapacity()).toBe(5);
      expect(buffer.getSize()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
    });

    test('should push and shift items correctly', () => {
      const buffer = new RingBuffer<number>(3);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      
      expect(buffer.getSize()).toBe(3);
      expect(buffer.isFull()).toBe(true);
      
      expect(buffer.shift()).toBe(1);
      expect(buffer.shift()).toBe(2);
      expect(buffer.shift()).toBe(3);
      expect(buffer.shift()).toBeUndefined();
    });

    test('should overwrite oldest items when full', () => {
      const buffer = new RingBuffer<number>(3);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Should overwrite 1
      
      expect(buffer.getSize()).toBe(3);
      expect(buffer.toArray()).toEqual([2, 3, 4]);
    });

    test('should peek without removing items', () => {
      const buffer = new RingBuffer<string>(3);
      
      buffer.push('a');
      buffer.push('b');
      
      expect(buffer.peek()).toBe('a');
      expect(buffer.peekLast()).toBe('b');
      expect(buffer.getSize()).toBe(2); // Size unchanged
    });

    test('should clear buffer correctly', () => {
      const buffer = new RingBuffer<number>(5);
      
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      
      buffer.clear();
      
      expect(buffer.getSize()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.shift()).toBeUndefined();
    });

    test('should calculate utilization correctly', () => {
      const buffer = new RingBuffer<number>(4);
      
      expect(buffer.getUtilization()).toBe(0);
      
      buffer.push(1);
      buffer.push(2);
      
      expect(buffer.getUtilization()).toBe(50);
      
      buffer.push(3);
      buffer.push(4);
      
      expect(buffer.getUtilization()).toBe(100);
    });

    test('should handle edge case of capacity 1', () => {
      const buffer = new RingBuffer<number>(1);
      
      buffer.push(1);
      expect(buffer.peek()).toBe(1);
      
      buffer.push(2);
      expect(buffer.peek()).toBe(2);
      
      expect(buffer.shift()).toBe(2);
      expect(buffer.isEmpty()).toBe(true);
    });

    test('should throw error for invalid capacity', () => {
      expect(() => new RingBuffer<number>(0)).toThrow('Ring buffer capacity must be positive');
      expect(() => new RingBuffer<number>(-1)).toThrow('Ring buffer capacity must be positive');
    });
  });
});

describe('AudioRingBuffer', () => {
  describe('Audio-specific operations', () => {
    test('should initialize with correct capacity in seconds', () => {
      const buffer = new AudioRingBuffer(10, 16000); // 10 seconds at 16kHz
      const stats = buffer.getStats();
      
      expect(stats.capacity).toBe(160000); // 10 * 16000
      expect(stats.availableSamples).toBe(0);
      expect(stats.memoryUsageBytes).toBe(320000); // 160000 * 2 bytes
    });

    test('should write and read PCM data', () => {
      const buffer = new AudioRingBuffer(1, 16000); // 1 second buffer
      
      const testData = new Int16Array([1, 2, 3, 4, 5]);
      buffer.write(testData);
      
      const stats = buffer.getStats();
      expect(stats.availableSamples).toBe(5);
      expect(stats.totalWritten).toBe(5);
      
      const readData = buffer.read(3);
      expect(readData).toEqual(new Int16Array([1, 2, 3]));
      
      expect(buffer.getAvailableSamples()).toBe(2);
    });

    test('should handle buffer overflow by dropping oldest samples', () => {
      const buffer = new AudioRingBuffer(0.001, 16000); // 16 samples capacity
      
      const data1 = new Int16Array(10).fill(1);
      const data2 = new Int16Array(10).fill(2); // Total 20 samples (exceeds 16)
      
      buffer.write(data1);
      buffer.write(data2);
      
      const stats = buffer.getStats();
      expect(stats.availableSamples).toBe(16); // Capped at capacity
      expect(stats.dropped).toBe(4); // 20 written - 16 available = 4 dropped
      
      const readData = buffer.read(16);
      // Should contain mix of 1s and 2s, with oldest 1s dropped
      expect(readData![0]).toBe(1); // Some 1s remain
      expect(readData![15]).toBe(2); // Newest samples are 2s
    });

    test('should read with overlap for windowing', () => {
      const buffer = new AudioRingBuffer(1, 16000);
      
      const testData = new Int16Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      buffer.write(testData);
      
      // Read 6 samples with 2 sample overlap
      const chunk1 = buffer.readWithOverlap(4, 2);
      expect(chunk1).toEqual(new Int16Array([1, 2, 3, 4, 5, 6]));
      expect(buffer.getAvailableSamples()).toBe(6); // Only advanced by 4
      
      // Next read should start from sample 5 (with overlap)
      const chunk2 = buffer.readWithOverlap(4, 2);
      expect(chunk2).toEqual(new Int16Array([5, 6, 7, 8, 9, 10]));
      expect(buffer.getAvailableSamples()).toBe(2); // Only 2 samples left
    });

    test('should return null when not enough samples available', () => {
      const buffer = new AudioRingBuffer(1, 16000);
      
      const testData = new Int16Array([1, 2, 3]);
      buffer.write(testData);
      
      const result = buffer.read(5); // Request more than available
      expect(result).toBeNull();
      
      // Original data should remain
      expect(buffer.getAvailableSamples()).toBe(3);
    });

    test('should trim old data correctly', () => {
      const buffer = new AudioRingBuffer(1, 16000);
      
      const testData = new Int16Array(1000);
      buffer.write(testData);
      
      expect(buffer.getAvailableSamples()).toBe(1000);
      
      // Trim to keep only last 100 samples
      buffer.trimOldData(100);
      
      expect(buffer.getAvailableSamples()).toBe(100);
      const stats = buffer.getStats();
      expect(stats.totalRead).toBe(900); // 900 samples were trimmed
    });

    test('should calculate statistics correctly', () => {
      const buffer = new AudioRingBuffer(1, 16000);
      
      const data1 = new Int16Array(100);
      const data2 = new Int16Array(50);
      
      buffer.write(data1);
      buffer.write(data2);
      buffer.read(30);
      
      const stats = buffer.getStats();
      
      expect(stats.totalWritten).toBe(150);
      expect(stats.totalRead).toBe(30);
      expect(stats.availableSamples).toBe(120);
      expect(stats.utilization).toBeCloseTo(0.75, 2); // 120/16000 * 100
      expect(stats.dropped).toBe(0);
    });

    test('should clear buffer completely', () => {
      const buffer = new AudioRingBuffer(1, 16000);
      
      const testData = new Int16Array(100).fill(42);
      buffer.write(testData);
      
      buffer.clear();
      
      expect(buffer.getAvailableSamples()).toBe(0);
      const stats = buffer.getStats();
      expect(stats.availableSamples).toBe(0);
      expect(stats.utilization).toBe(0);
    });

    test('should handle wrap-around correctly', () => {
      const buffer = new AudioRingBuffer(0.001, 16000); // 16 samples
      
      // Fill buffer completely
      const data1 = new Int16Array(16);
      for (let i = 0; i < 16; i++) {
        data1[i] = i;
      }
      buffer.write(data1);
      
      // Read half
      const read1 = buffer.read(8);
      expect(read1).toEqual(new Int16Array([0, 1, 2, 3, 4, 5, 6, 7]));
      
      // Write more (will wrap around)
      const data2 = new Int16Array(8);
      for (let i = 0; i < 8; i++) {
        data2[i] = 100 + i;
      }
      buffer.write(data2);
      
      // Read all remaining
      const read2 = buffer.read(16);
      expect(read2).toEqual(new Int16Array([
        8, 9, 10, 11, 12, 13, 14, 15, // Original data
        100, 101, 102, 103, 104, 105, 106, 107 // New data
      ]));
    });
  });

  describe('Performance characteristics', () => {
    test('should handle large buffers efficiently', () => {
      const buffer = new AudioRingBuffer(60, 16000); // 60 second buffer
      
      const startTime = Date.now();
      
      // Write 60 seconds of audio in chunks
      for (let i = 0; i < 60; i++) {
        const chunk = new Int16Array(16000); // 1 second chunks
        buffer.write(chunk);
      }
      
      const writeTime = Date.now() - startTime;
      expect(writeTime).toBeLessThan(100); // Should complete quickly
      
      const stats = buffer.getStats();
      expect(stats.totalWritten).toBe(960000);
      expect(stats.memoryUsageBytes).toBe(1920000); // ~1.9MB
    });

    test('should maintain constant memory usage with overflow', () => {
      const buffer = new AudioRingBuffer(10, 16000); // 10 second buffer
      
      // Write 180 seconds of audio (18x capacity)
      for (let i = 0; i < 180; i++) {
        const chunk = new Int16Array(16000);
        buffer.write(chunk);
      }
      
      const stats = buffer.getStats();
      expect(stats.capacity).toBe(160000); // Still 10 seconds
      expect(stats.availableSamples).toBe(160000); // Full but not exceeded
      expect(stats.dropped).toBe(2720000); // 180*16000 - 160000
      expect(stats.memoryUsageBytes).toBe(320000); // Constant memory
    });
  });
});