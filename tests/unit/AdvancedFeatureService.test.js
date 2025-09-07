// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
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
jest.mock('../../electron/utils/logger', () => ({
  logger: {
    child: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    })
  }
}));

const { AdvancedFeatureService } = require('../../electron/services/domain/AdvancedFeatureService');

describe('AdvancedFeatureService', () => {
  let service;

  beforeEach(() => {
    jest.useFakeTimers();
    
    service = new AdvancedFeatureService({
      openaiApiKey: 'test-key',
      summaryInterval: 60000, // 1 minute for testing
      summaryModel: 'gpt-5-mini',
      vocabularyModel: 'gpt-5-mini',
      reportModel: 'gpt-5'
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('start()', () => {
    it('should start the service and set up periodic summary', () => {
      const correlationId = 'test-correlation-id';
      
      service.start(correlationId);
      
      expect(service.isActive).toBe(true);
      expect(service.currentCorrelationId).toBe(correlationId);
      expect(service.summaryTimer).not.toBeNull();
    });

    it('should not start if already active', () => {
      const logSpy = jest.spyOn(service.componentLogger, 'warn');
      
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
      
      expect(service.translations).toHaveLength(1);
      expect(service.translations[0]).toEqual(translation);
    });

    it('should not add translation if service is not active', () => {
      const translation = {
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      };
      
      service.addTranslation(translation);
      
      expect(service.translations).toHaveLength(0);
    });
  });

  describe('generateSummary()', () => {
    it('should generate summary from translations', async () => {
      const summaryEventSpy = jest.fn();
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
      
      await service.generateSummary(false);
      
      expect(summaryEventSpy).toHaveBeenCalled();
      expect(service.summaries).toHaveLength(1);
    });

    it('should clear translations after periodic summary', async () => {
      service.start('test-id');
      
      service.addTranslation({
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      });
      
      await service.generateSummary(false);
      
      expect(service.translations).toHaveLength(0);
    });

    it('should keep translations after final summary', async () => {
      service.start('test-id');
      
      service.addTranslation({
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      });
      
      await service.generateSummary(true);
      
      expect(service.translations).toHaveLength(1);
    });
  });

  describe('periodic summary generation', () => {
    it('should trigger summary after interval', async () => {
      const summaryEventSpy = jest.fn();
      service.on('summaryGenerated', summaryEventSpy);
      
      service.start('test-id');
      
      service.addTranslation({
        id: 'trans-1',
        original: 'Hello world',
        japanese: 'こんにちは世界',
        timestamp: Date.now()
      });
      
      // Fast forward 1 minute
      jest.advanceTimersByTime(60000);
      
      // Allow async operations to complete
      await Promise.resolve();
      
      expect(summaryEventSpy).toHaveBeenCalled();
    });

    it('should not trigger summary if no translations', async () => {
      const summaryEventSpy = jest.fn();
      service.on('summaryGenerated', summaryEventSpy);
      
      service.start('test-id');
      
      // Fast forward 1 minute without adding translations
      jest.advanceTimersByTime(60000);
      
      // Allow async operations to complete
      await Promise.resolve();
      
      expect(summaryEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should stop the service and clear timer', async () => {
      service.start('test-id');
      
      await service.stop();
      
      expect(service.isActive).toBe(false);
      expect(service.summaryTimer).toBeNull();
    });

    it('should generate final summary if translations exist', async () => {
      const summaryEventSpy = jest.fn();
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
});