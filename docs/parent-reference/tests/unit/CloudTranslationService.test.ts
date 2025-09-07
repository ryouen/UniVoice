import { CloudTranslationService } from '../../electron/services/CloudTranslationService';
import { TranslationServiceClient } from '@google-cloud/translate';
import PQueue from 'p-queue';

// Mock Google Cloud Translate
jest.mock('@google-cloud/translate');
jest.mock('p-queue');

describe('CloudTranslationService', () => {
  let service: CloudTranslationService;
  let mockTranslateClient: any;
  let mockQueue: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock translation client
    mockTranslateClient = {
      translateText: jest.fn(),
      locationPath: jest.fn((project: string, location: string) => 
        `projects/${project}/locations/${location}`
      ),
    };
    
    (TranslationServiceClient as jest.Mock).mockImplementation(() => mockTranslateClient);
    
    // Setup mock queue
    mockQueue = {
      add: jest.fn((fn) => fn()),
      clear: jest.fn(),
      onEmpty: jest.fn(),
      size: 0,
      pending: 0,
    };
    
    (PQueue as jest.Mock).mockImplementation(() => mockQueue);
    
    service = new CloudTranslationService({
      projectId: 'test-project',
      location: 'global',
      credentials: {
        client_email: 'test@example.com',
        private_key: 'test-key'
      }
    });
  });
  
  afterEach(() => {
    service.destroy();
  });
  
  describe('Translation Operations', () => {
    test('should translate single text successfully', async () => {
      const mockResponse = [{
        translations: [{
          translatedText: 'こんにちは世界',
          detectedLanguageCode: 'en'
        }]
      }];
      
      mockTranslateClient.translateText.mockResolvedValue(mockResponse);
      
      const result = await service.translate('Hello world');
      
      expect(result).toEqual({
        translatedText: 'こんにちは世界',
        sourceText: 'Hello world',
        detectedLanguage: 'en',
        confidence: 1
      });
      
      expect(mockTranslateClient.translateText).toHaveBeenCalledWith({
        parent: 'projects/test-project/locations/global',
        contents: ['Hello world'],
        targetLanguageCode: 'ja',
        mimeType: 'text/plain'
      });
    });
    
    test('should handle empty text gracefully', async () => {
      const result = await service.translate('');
      
      expect(result).toEqual({
        translatedText: '',
        sourceText: '',
        detectedLanguage: 'unknown',
        confidence: 0
      });
      
      expect(mockTranslateClient.translateText).not.toHaveBeenCalled();
    });
    
    test('should trim and handle whitespace-only text', async () => {
      const result = await service.translate('   ');
      
      expect(result).toEqual({
        translatedText: '',
        sourceText: '   ',
        detectedLanguage: 'unknown',
        confidence: 0
      });
    });
    
    test('should emit translation event on success', async () => {
      const translationSpy = jest.fn();
      service.on('translation', translationSpy);
      
      mockTranslateClient.translateText.mockResolvedValue([{
        translations: [{
          translatedText: 'テスト',
          detectedLanguageCode: 'en'
        }]
      }]);
      
      await service.translate('test');
      
      expect(translationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          translatedText: 'テスト',
          sourceText: 'test'
        })
      );
    });
    
    test('should handle translation errors', async () => {
      const errorSpy = jest.fn();
      service.on('error', errorSpy);
      
      const testError = new Error('Translation API error');
      mockTranslateClient.translateText.mockRejectedValue(testError);
      
      await expect(service.translate('test')).rejects.toThrow('Translation API error');
      expect(errorSpy).toHaveBeenCalledWith(testError);
    });
  });
  
  describe('Batch Translation', () => {
    test('should batch translate multiple texts', async () => {
      const texts = ['Hello', 'World', 'Test'];
      
      mockTranslateClient.translateText.mockResolvedValue([{
        translations: [
          { translatedText: 'こんにちは', detectedLanguageCode: 'en' },
          { translatedText: '世界', detectedLanguageCode: 'en' },
          { translatedText: 'テスト', detectedLanguageCode: 'en' }
        ]
      }]);
      
      const results = await service.translateBatch(texts);
      
      expect(results).toHaveLength(3);
      expect(results[0].translatedText).toBe('こんにちは');
      expect(results[1].translatedText).toBe('世界');
      expect(results[2].translatedText).toBe('テスト');
      
      expect(mockTranslateClient.translateText).toHaveBeenCalledWith({
        parent: 'projects/test-project/locations/global',
        contents: texts,
        targetLanguageCode: 'ja',
        mimeType: 'text/plain'
      });
    });
    
    test('should split large batches respecting limits', async () => {
      // Create 200 texts to exceed 128 element limit
      const texts = Array(200).fill(null).map((_, i) => `Text ${i}`);
      
      mockTranslateClient.translateText.mockResolvedValue([{
        translations: texts.slice(0, 128).map(t => ({
          translatedText: `翻訳: ${t}`,
          detectedLanguageCode: 'en'
        }))
      }]);
      
      // Second batch response
      mockTranslateClient.translateText.mockResolvedValueOnce([{
        translations: texts.slice(0, 128).map(t => ({
          translatedText: `翻訳: ${t}`,
          detectedLanguageCode: 'en'
        }))
      }]).mockResolvedValueOnce([{
        translations: texts.slice(128).map(t => ({
          translatedText: `翻訳: ${t}`,
          detectedLanguageCode: 'en'
        }))
      }]);
      
      const results = await service.translateBatch(texts);
      
      expect(results).toHaveLength(200);
      expect(mockTranslateClient.translateText).toHaveBeenCalledTimes(2);
    });
    
    test('should respect character limit in batches', async () => {
      // Create texts that exceed 30k character limit
      const longText = 'a'.repeat(20000); // 20k chars
      const texts = [longText, longText]; // 40k total
      
      mockTranslateClient.translateText
        .mockResolvedValueOnce([{
          translations: [{ 
            translatedText: '長いテキスト1',
            detectedLanguageCode: 'en'
          }]
        }])
        .mockResolvedValueOnce([{
          translations: [{ 
            translatedText: '長いテキスト2',
            detectedLanguageCode: 'en'
          }]
        }]);
      
      const results = await service.translateBatch(texts);
      
      expect(results).toHaveLength(2);
      expect(mockTranslateClient.translateText).toHaveBeenCalledTimes(2);
    });
    
    test('should filter empty texts from batch', async () => {
      const texts = ['Hello', '', '  ', 'World'];
      
      mockTranslateClient.translateText.mockResolvedValue([{
        translations: [
          { translatedText: 'こんにちは', detectedLanguageCode: 'en' },
          { translatedText: '世界', detectedLanguageCode: 'en' }
        ]
      }]);
      
      const results = await service.translateBatch(texts);
      
      expect(results).toHaveLength(4);
      expect(results[1].translatedText).toBe(''); // Empty preserved
      expect(results[2].translatedText).toBe(''); // Whitespace preserved
      
      // Only non-empty texts sent to API
      expect(mockTranslateClient.translateText).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: ['Hello', 'World']
        })
      );
    });
  });
  
  describe('Rate Limiting', () => {
    test('should respect rate limit of 600 req/min', async () => {
      const startTime = Date.now();
      
      // Simulate multiple rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(service.translate(`Text ${i}`));
      }
      
      await Promise.all(promises);
      
      const elapsed = Date.now() - startTime;
      
      // Should process within rate limit timing
      expect(mockQueue.add).toHaveBeenCalledTimes(10);
    });
    
    test('should emit rate-limited event when queue is full', () => {
      const rateLimitSpy = jest.fn();
      service.on('rate-limited', rateLimitSpy);
      
      // Simulate queue being full
      mockQueue.size = 100;
      mockQueue.pending = 10;
      
      service['handleRateLimit']();
      
      expect(rateLimitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queueSize: 100,
          pending: 10
        })
      );
    });
  });
  
  describe('Statistics and Cost Calculation', () => {
    test('should track translation statistics', async () => {
      mockTranslateClient.translateText.mockResolvedValue([{
        translations: [{
          translatedText: 'こんにちは',
          detectedLanguageCode: 'en'
        }]
      }]);
      
      await service.translate('Hello');
      await service.translate('World');
      
      const stats = service.getStatistics();
      
      expect(stats).toEqual(expect.objectContaining({
        totalCharactersTranslated: 10, // 'Hello' + 'World'
        totalRequests: 2,
        estimatedCost: expect.any(Number),
        averageLatency: expect.any(Number)
      }));
    });
    
    test('should calculate cost correctly', () => {
      // $20 per million characters
      const cost = service.calculateCost(1000000);
      expect(cost).toBeCloseTo(20, 2);
      
      const smallCost = service.calculateCost(1000);
      expect(smallCost).toBeCloseTo(0.02, 4);
    });
    
    test('should track error statistics', async () => {
      mockTranslateClient.translateText
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce([{
          translations: [{
            translatedText: 'テスト',
            detectedLanguageCode: 'en'
          }]
        }]);
      
      try {
        await service.translate('Test 1');
      } catch {}
      
      await service.translate('Test 2');
      
      const stats = service.getStatistics();
      expect(stats.totalErrors).toBe(1);
      expect(stats.totalRequests).toBe(2);
    });
  });
  
  describe('Cache Management', () => {
    test('should cache translations', async () => {
      mockTranslateClient.translateText.mockResolvedValue([{
        translations: [{
          translatedText: 'こんにちは',
          detectedLanguageCode: 'en'
        }]
      }]);
      
      // First call - should hit API
      await service.translate('Hello');
      expect(mockTranslateClient.translateText).toHaveBeenCalledTimes(1);
      
      // Second call - should use cache
      await service.translate('Hello');
      expect(mockTranslateClient.translateText).toHaveBeenCalledTimes(1);
    });
    
    test('should respect cache TTL', async () => {
      jest.useFakeTimers();
      
      mockTranslateClient.translateText.mockResolvedValue([{
        translations: [{
          translatedText: 'こんにちは',
          detectedLanguageCode: 'en'
        }]
      }]);
      
      await service.translate('Hello');
      
      // Advance time beyond cache TTL (5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);
      
      await service.translate('Hello');
      
      // Should call API again after cache expiry
      expect(mockTranslateClient.translateText).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });
    
    test('should clear cache on demand', async () => {
      mockTranslateClient.translateText.mockResolvedValue([{
        translations: [{
          translatedText: 'こんにちは',
          detectedLanguageCode: 'en'
        }]
      }]);
      
      await service.translate('Hello');
      service.clearCache();
      await service.translate('Hello');
      
      expect(mockTranslateClient.translateText).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Language Detection', () => {
    test('should detect source language', async () => {
      mockTranslateClient.translateText.mockResolvedValue([{
        translations: [{
          translatedText: 'こんにちは',
          detectedLanguageCode: 'en'
        }]
      }]);
      
      const result = await service.translate('Hello', { detectLanguage: true });
      
      expect(result.detectedLanguage).toBe('en');
    });
    
    test('should handle multiple detected languages in batch', async () => {
      mockTranslateClient.translateText.mockResolvedValue([{
        translations: [
          { translatedText: 'こんにちは', detectedLanguageCode: 'en' },
          { translatedText: 'Hello', detectedLanguageCode: 'ja' },
          { translatedText: '你好', detectedLanguageCode: 'zh' }
        ]
      }]);
      
      const results = await service.translateBatch(['Hello', 'こんにちは', '你好']);
      
      expect(results[0].detectedLanguage).toBe('en');
      expect(results[1].detectedLanguage).toBe('ja');
      expect(results[2].detectedLanguage).toBe('zh');
    });
  });
  
  describe('Error Recovery', () => {
    test('should retry on transient errors', async () => {
      mockTranslateClient.translateText
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([{
          translations: [{
            translatedText: 'テスト',
            detectedLanguageCode: 'en'
          }]
        }]);
      
      const result = await service.translate('Test');
      
      expect(result.translatedText).toBe('テスト');
      expect(mockTranslateClient.translateText).toHaveBeenCalledTimes(2);
    });
    
    test('should handle quota exceeded errors', async () => {
      const quotaSpy = jest.fn();
      service.on('quota-exceeded', quotaSpy);
      
      const quotaError = new Error('Quota exceeded');
      (quotaError as any).code = 8; // RESOURCE_EXHAUSTED
      
      mockTranslateClient.translateText.mockRejectedValue(quotaError);
      
      await expect(service.translate('Test')).rejects.toThrow('Quota exceeded');
      expect(quotaSpy).toHaveBeenCalled();
    });
    
    test('should handle authentication errors', async () => {
      const authError = new Error('Unauthenticated');
      (authError as any).code = 16; // UNAUTHENTICATED
      
      mockTranslateClient.translateText.mockRejectedValue(authError);
      
      await expect(service.translate('Test')).rejects.toThrow('Unauthenticated');
    });
  });
  
  describe('Cleanup', () => {
    test('should clean up resources on destroy', () => {
      const removeListenersSpy = jest.spyOn(service, 'removeAllListeners');
      
      service.destroy();
      
      expect(removeListenersSpy).toHaveBeenCalled();
      expect(mockQueue.clear).toHaveBeenCalled();
    });
    
    test('should clear cache on destroy', () => {
      const clearCacheSpy = jest.spyOn(service, 'clearCache');
      
      service.destroy();
      
      expect(clearCacheSpy).toHaveBeenCalled();
    });
  });
});