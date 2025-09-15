import { AdvancedFeatureService } from '../../src/electron/services/domain/AdvancedFeatureService';
import OpenAI from 'openai';

// OpenAI APIのモック
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    service = new AdvancedFeatureService({
      openaiApiKey: 'test-key',
      summaryInterval: 60000,
      summaryModel: 'gpt-5-mini',
      vocabularyModel: 'gpt-5-mini',
      reportModel: 'gpt-5',
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should initialize with provided config', () => {
    expect(service['config'].summaryModel).toBe('gpt-5-mini');
    expect(service['config'].reportModel).toBe('gpt-5');
  });

  it('should call OpenAI API for summary generation', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: 'Test summary content',
        },
      }],
    });

    service.start('test-correlation-id');
    service.addTranslation({
      id: '1',
      original: 'Hello',
      japanese: 'こんにちは',
      timestamp: Date.now(),
    });

    await jest.advanceTimersByTimeAsync(60000);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-5-mini',
      messages: expect.any(Array),
      temperature: 0.7,
      max_tokens: 500,
    });
  });

  it('should call OpenAI API for vocabulary generation', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify([
            { term: 'test', definition: 'test def' }
          ]),
        },
      }],
    });

    service.start('test-correlation-id');
    service.addTranslation({
      id: '1',
      original: 'Hello',
      japanese: 'こんにちは',
      timestamp: Date.now(),
    });

    const vocabulary = await service.generateVocabulary();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-5-mini',
      messages: expect.any(Array),
      temperature: 0.5,
      max_tokens: 1000,
    });
    expect(vocabulary).toEqual([{ term: 'test', definition: 'test def' }]);
  });

  it('should call OpenAI API for final report generation', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: 'Final report content',
        },
      }],
    });

    service.start('test-correlation-id');
    service.addTranslation({
      id: '1',
      original: 'Hello',
      japanese: 'こんにちは',
      timestamp: Date.now(),
    });

    const report = await service.generateFinalReport();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-5',
      messages: expect.any(Array),
      temperature: 0.7,
      max_tokens: 2000,
    });
    expect(report).toBe('Final report content');
  });
});
