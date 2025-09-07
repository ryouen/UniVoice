// @ts-nocheck
import { AdvancedFeatureService } from '../../electron/services/domain/AdvancedFeatureService';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Test summary content'
            }
          }]
        })
      }
    }
  }))
}));

// Mock logger
vi.mock('../../electron/utils/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    })
  }
}));

describe('AdvancedFeatureService', () => {
  let service: AdvancedFeatureService;
  let mockTimers: any;

  beforeEach(() => {
    vi.useFakeTimers();
    
    service = new AdvancedFeatureService({
      openaiApiKey: 'test-key',
      summaryInterval: 60000, // 1 minute for testing
      summaryModel: 'gpt-5-mini',
      vocabularyModel: 'gpt-5-mini',
      reportModel: 'gpt-5'
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('start()', () => {
    it('should start the service and set up periodic summary', () => {
      const correlationId = 'test-correlation-id';
      
      service.start(correlationId);
      
      expect(service['isActive']).toBe(true);
      expect(service['currentCorrelationId']).toBe(correlationId);
      expect(service['summaryTimer']).not.toBeNull();
    });

    it('should not start if already active', () => {
      const logSpy = vi.spyOn(service['componentLogger'], 'warn');
      
      service.start('id1');
      service.start('id2');
      
      expect(logSpy).toHaveBeenCalledWith('AdvancedFeatureService already active');
    });
  });

  describe('addTranslation()', () => {
    it('should add translation to the buffer', () => {
      service.start('test-id');
      
      const translation = {
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      };
      
      service.addTranslation(translation);
      
      expect(service['translations']).toHaveLength(1);
      expect(service['translations'][0]).toEqual(translation);
    });

    it('should not add translation if service is not active', () => {
      const translation = {
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      };
      
      service.addTranslation(translation);
      
      expect(service['translations']).toHaveLength(0);
    });
  });

  describe('generateSummary()', () => {
    it('should generate summary from translations', async () => {
      const summaryEventSpy = vi.fn();
      service.on('summaryGenerated', summaryEventSpy);
      
      service.start('test-id');
      
      // Add some translations
      service.addTranslation({
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      });
      
      service.addTranslation({
        id: 'trans-2',
        original: 'How are you?',
        japanese: '元気ですか？',
        timestamp: Date.now()
      });
      
      await service['generateSummary'](false);
      
      expect(summaryEventSpy).toHaveBeenCalled();
      expect(service['summaries']).toHaveLength(1);
    });

    it('should clear translations after periodic summary', async () => {
      service.start('test-id');
      
      service.addTranslation({
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      });
      
      await service['generateSummary'](false);
      
      expect(service['translations']).toHaveLength(0);
    });

    it('should keep translations after final summary', async () => {
      service.start('test-id');
      
      service.addTranslation({
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      });
      
      await service['generateSummary'](true);
      
      expect(service['translations']).toHaveLength(1);
    });
  });

  describe('periodic summary generation', () => {
    it('should trigger summary after interval', async () => {
      const summaryEventSpy = vi.fn();
      service.on('summaryGenerated', summaryEventSpy);
      
      service.start('test-id');
      
      service.addTranslation({
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      });
      
      // Fast forward 1 minute
      await vi.advanceTimersByTimeAsync(60000);
      
      expect(summaryEventSpy).toHaveBeenCalled();
    });

    it('should not trigger summary if no translations', async () => {
      const summaryEventSpy = vi.fn();
      service.on('summaryGenerated', summaryEventSpy);
      
      service.start('test-id');
      
      // Fast forward 1 minute without adding translations
      await vi.advanceTimersByTimeAsync(60000);
      
      expect(summaryEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should stop the service and clear timer', async () => {
      service.start('test-id');
      
      await service.stop();
      
      expect(service['isActive']).toBe(false);
      expect(service['summaryTimer']).toBeNull();
    });

    it('should generate final summary if translations exist', async () => {
      const summaryEventSpy = vi.fn();
      service.on('summaryGenerated', summaryEventSpy);
      
      service.start('test-id');
      
      service.addTranslation({
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      });
      
      await service.stop();
      
      expect(summaryEventSpy).toHaveBeenCalled();
    });
  });

  describe('generateVocabulary()', () => {
    it('should extract vocabulary from translations', async () => {
      service.start('test-id');
      
      service.addTranslation({
        id: 'trans-1',
        original: 'Machine learning is a subset of artificial intelligence',
        japanese: '機械学習は人工知能のサブセットです',
        timestamp: Date.now()
      });
      
      // Mock OpenAI response for vocabulary
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              { term: 'Machine learning', definition: 'A type of AI', context: 'ML is...' },
              { term: 'Artificial intelligence', definition: 'Computer intelligence', context: 'AI is...' }
            ])
          }
        }]
      });
      
      service['openai'].chat.completions.create = mockCreate;
      
      const vocabulary = await service.generateVocabulary();
      
      expect(vocabulary).toHaveLength(2);
      expect(vocabulary[0]).toHaveProperty('term');
      expect(vocabulary[0]).toHaveProperty('definition');
    });
  });

  describe('generateFinalReport()', () => {
    it('should generate comprehensive report', async () => {
      service.start('test-id');
      
      // Add translations
      service.addTranslation({
        id: 'trans-1',
        original: 'Introduction to the topic',
        japanese: 'トピックの紹介',
        timestamp: Date.now()
      });
      
      // Add summary
      service['summaries'].push({
        id: 'sum-1',
        timestamp: Date.now(),
        english: 'Summary of the lecture',
        japanese: '講義の要約',
        wordCount: 100,
        startTime: Date.now() - 60000,
        endTime: Date.now()
      });
      
      const report = await service.generateFinalReport();
      
      expect(report).toBeTruthy();
      expect(report).toContain('Test summary content');
    });
  });
});