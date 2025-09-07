/**
 * TranslationTimeoutManager Unit Tests
 */

import { TranslationTimeoutManager } from '../../src/utils/TranslationTimeoutManager';

// Mock timers
jest.useFakeTimers();

describe('TranslationTimeoutManager', () => {
  let manager: TranslationTimeoutManager;
  let timeoutCallback: jest.Mock;
  
  beforeEach(() => {
    manager = new TranslationTimeoutManager({
      defaultTimeout: 7000,
      enableDynamicTimeout: true,
      maxTimeout: 10000
    });
    timeoutCallback = jest.fn();
    jest.clearAllTimers();
  });
  
  afterEach(() => {
    manager.destroy();
  });
  
  describe('startTimeout', () => {
    it('should start a timeout with default duration', () => {
      const duration = manager.startTimeout('seg1', 'Hello world', timeoutCallback);
      
      expect(duration).toBe(7000);
      expect(manager.getActiveTimeoutCount()).toBe(1);
      
      // タイムアウトが発火していないことを確認
      expect(timeoutCallback).not.toHaveBeenCalled();
      
      // 7秒後にタイムアウト
      jest.advanceTimersByTime(7000);
      expect(timeoutCallback).toHaveBeenCalledWith('seg1');
      expect(manager.getActiveTimeoutCount()).toBe(0);
    });
    
    it('should calculate dynamic timeout based on text length', () => {
      const shortText = 'Hello'; // 5文字
      const mediumText = 'A'.repeat(150); // 150文字
      const longText = 'B'.repeat(500); // 500文字
      
      const shortDuration = manager.startTimeout('seg1', shortText, timeoutCallback);
      manager.clearTimeout('seg1');
      
      const mediumDuration = manager.startTimeout('seg2', mediumText, timeoutCallback);
      manager.clearTimeout('seg2');
      
      const longDuration = manager.startTimeout('seg3', longText, timeoutCallback);
      
      expect(shortDuration).toBe(7000); // デフォルト
      expect(mediumDuration).toBe(7500); // 7000 + 500ms
      expect(longDuration).toBe(9500); // 7000 + 2500ms
    });
    
    it('should not exceed maxTimeout', () => {
      const veryLongText = 'C'.repeat(1000); // 1000文字
      
      const duration = manager.startTimeout('seg1', veryLongText, timeoutCallback);
      
      expect(duration).toBe(10000); // maxTimeoutでクリップ
    });
    
    it('should replace existing timeout for same segmentId', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      manager.startTimeout('seg1', 'First', callback1);
      manager.startTimeout('seg1', 'Second', callback2);
      
      jest.advanceTimersByTime(7000);
      
      // 最初のコールバックは呼ばれない
      expect(callback1).not.toHaveBeenCalled();
      // 2番目のコールバックが呼ばれる
      expect(callback2).toHaveBeenCalledWith('seg1');
    });
  });
  
  describe('clearTimeout', () => {
    it('should clear active timeout', () => {
      manager.startTimeout('seg1', 'Hello', timeoutCallback);
      
      const cleared = manager.clearTimeout('seg1');
      
      expect(cleared).toBe(true);
      expect(manager.getActiveTimeoutCount()).toBe(0);
      
      // タイムアウトが発火しないことを確認
      jest.advanceTimersByTime(7000);
      expect(timeoutCallback).not.toHaveBeenCalled();
    });
    
    it('should return false for non-existent timeout', () => {
      const cleared = manager.clearTimeout('non-existent');
      
      expect(cleared).toBe(false);
    });
  });
  
  describe('shouldAcceptLateTranslation', () => {
    it('should accept translation with active timeout', () => {
      manager.startTimeout('seg1', 'Hello', timeoutCallback);
      
      const shouldAccept = manager.shouldAcceptLateTranslation('seg1');
      
      expect(shouldAccept).toBe(true);
    });
    
    it('should not accept translation after timeout', () => {
      manager.startTimeout('seg1', 'Hello', timeoutCallback);
      
      jest.advanceTimersByTime(7000);
      
      const shouldAccept = manager.shouldAcceptLateTranslation('seg1');
      
      expect(shouldAccept).toBe(false);
    });
  });
  
  describe('getActiveTimeouts', () => {
    it('should return active timeout information', () => {
      manager.startTimeout('seg1', 'Hello world', timeoutCallback);
      manager.startTimeout('seg2', 'This is a longer text', timeoutCallback);
      
      jest.advanceTimersByTime(2000);
      
      const activeTimeouts = manager.getActiveTimeouts();
      
      expect(activeTimeouts).toHaveLength(2);
      expect(activeTimeouts[0]).toMatchObject({
        segmentId: 'seg1',
        elapsedMs: 2000,
        remainingMs: 5000,
        originalText: 'Hello world...'
      });
    });
  });
  
  describe('clearAll', () => {
    it('should clear all active timeouts', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      manager.startTimeout('seg1', 'Text 1', callback1);
      manager.startTimeout('seg2', 'Text 2', callback2);
      manager.startTimeout('seg3', 'Text 3', callback3);
      
      expect(manager.getActiveTimeoutCount()).toBe(3);
      
      manager.clearAll();
      
      expect(manager.getActiveTimeoutCount()).toBe(0);
      
      // タイムアウトが発火しないことを確認
      jest.advanceTimersByTime(10000);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
    });
  });
  
  describe('config options', () => {
    it('should use fixed timeout when dynamic timeout is disabled', () => {
      const fixedManager = new TranslationTimeoutManager({
        defaultTimeout: 5000,
        enableDynamicTimeout: false
      });
      
      const shortDuration = fixedManager.startTimeout('seg1', 'Short', timeoutCallback);
      fixedManager.clearTimeout('seg1');
      
      const longDuration = fixedManager.startTimeout('seg2', 'A'.repeat(500), timeoutCallback);
      
      expect(shortDuration).toBe(5000);
      expect(longDuration).toBe(5000); // 文字数に関わらず固定
      
      fixedManager.destroy();
    });
  });
});

// Real timer test
describe('TranslationTimeoutManager with real timers', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });
  
  afterEach(() => {
    jest.useFakeTimers();
  });
  
  it('should work with real timers', (done) => {
    const manager = new TranslationTimeoutManager({
      defaultTimeout: 100 // 100msで高速テスト
    });
    
    const callback = jest.fn(() => {
      expect(callback).toHaveBeenCalledWith('seg1');
      manager.destroy();
      done();
    });
    
    manager.startTimeout('seg1', 'Test', callback);
  }, 200);
});