import { AdvancedFeatureService } from '../../electron/services/domain/AdvancedFeatureService';
import OpenAI from 'openai';

// Mock OpenAI API
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  });
});

describe('AdvancedFeatureService', () => {
  let service: AdvancedFeatureService;
  jest.setTimeout(30000); // Increase timeout for async tests

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    service = new AdvancedFeatureService({
      openaiApiKey: 'test-key',
      summaryInterval: 60000,
      summaryModel: 'gpt-5-mini',
      vocabularyModel: 'gpt-5-mini',
      reportModel: 'gpt-5',
      summaryThresholds: [10, 20, 30],
    });
  });

  afterEach(async () => {
    // Stop the service if it was started to avoid unhandled errors
    const internalService = service as unknown as { intervalId?: NodeJS.Timeout };`r`n    if (internalService.intervalId) { 
      service.stop();
    }
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should call OpenAI API for summary generation after interval', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Test summary' } }] });

    service.start('test-correlation-id', 'en', 'ja');
    service.addTranslation({ id: '1', sourceText: 'one two three four five six seven eight nine ten eleven', targetText: '', timestamp: Date.now() });

    jest.advanceTimersByTime(60000);`r`n    await Promise.resolve();
    await new Promise(process.nextTick);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5-mini' }));
  });

  it('should call OpenAI API for vocabulary generation', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify([{ term: 'test', definition: 'test def' }]) } }] });

    service.start('test-correlation-id', 'en', 'ja');
    service.addTranslation({ id: '1', sourceText: 'Some text for vocabulary.', targetText: '', timestamp: Date.now() });

    const result = await service.generateVocabulary();
    await new Promise(process.nextTick);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5-mini' }));
    expect(result.data.items).toEqual([{ term: 'test', definition: 'test def' }]);
  });

  it('should call OpenAI API for final report generation', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Final report content' } }] });

    service.start('test-correlation-id', 'en', 'ja');
    service.addTranslation({ id: '1', sourceText: 'Text for the final report.', targetText: '', timestamp: Date.now() });

    const result = await service.generateFinalReport();
    await new Promise(process.nextTick);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5' }));
    expect(result.data.report).toBe('Final report content');
  });
});

