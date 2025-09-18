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
    if (service['intervalId']) { 
      service.stop();
    }
    await jest.runOnlyPendingTimersAsync();
    jest.useRealTimers();
  });

  it('should call OpenAI API for summary generation after interval', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Test summary' } }] });

    service.start('test-correlation-id', 'en', 'ja');
    service.addTranslation({ id: '1', original: 'one two three four five six seven eight nine ten eleven', translated: '', timestamp: Date.now() });

    await jest.advanceTimersByTimeAsync(60000);
    await new Promise(process.nextTick);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5-mini' }));
  });

  it('should call OpenAI API for vocabulary generation', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify([{ term: 'test', definition: 'test def' }]) } }] });

    service.start('test-correlation-id', 'en', 'ja');
    service.addTranslation({ id: '1', original: 'Some text for vocabulary.', translated: '', timestamp: Date.now() });

    const result = await service.generateVocabulary();
    await new Promise(process.nextTick);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5-mini' }));
    expect(result.data.items).toEqual([{ term: 'test', definition: 'test def' }]);
  });

  it('should call OpenAI API for final report generation', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Final report content' } }] });

    service.start('test-correlation-id', 'en', 'ja');
    service.addTranslation({ id: '1', original: 'Text for the final report.', translated: '', timestamp: Date.now() });

    const result = await service.generateFinalReport();
    await new Promise(process.nextTick);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5' }));
    expect(result.data.report).toBe('Final report content');
  });
});