import { SummaryService } from '../../electron/services/SummaryService';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

describe('SummaryService', () => {
  let service: SummaryService;
  let mockOpenAI: any;
  let mockCompletions: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock OpenAI
    mockCompletions = {
      create: jest.fn()
    };
    
    mockOpenAI = {
      chat: {
        completions: mockCompletions
      }
    };
    
    (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);
    
    service = new SummaryService({
      apiKey: 'test-api-key',
      model: 'gpt-4.1-mini' // CRITICAL: User was emphatic about this name
    });
  });
  
  afterEach(() => {
    service.destroy();
  });
  
  describe('Summary Generation', () => {
    test('should generate summary from transcripts', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Summary: The lecture covered machine learning basics including supervised and unsupervised learning.'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      };
      
      mockCompletions.create.mockResolvedValue(mockResponse);
      
      const transcripts = [
        { text: 'Today we will discuss machine learning.', timestamp: Date.now() },
        { text: 'There are two main types: supervised and unsupervised.', timestamp: Date.now() + 1000 }
      ];
      
      const result = await service.generateSummary(transcripts);
      
      expect(result).toEqual({
        summary: 'Summary: The lecture covered machine learning basics including supervised and unsupervised learning.',
        keyPoints: expect.any(Array),
        timestamp: expect.any(Number),
        tokenUsage: {
          prompt: 100,
          completion: 50,
          total: 150
        }
      });
      
      expect(mockCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4.1-mini', // Verify exact model name
          messages: expect.any(Array),
          temperature: 0.3,
          max_tokens: 500
        })
      );
    });
    
    test('should use correct model name (gpt-4.1-mini)', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'Summary' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });
      
      await service.generateSummary([{ text: 'Test', timestamp: Date.now() }]);
      
      // CRITICAL: Verify the exact model name user insisted on
      expect(mockCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4.1-mini'
        })
      );
    });
    
    test('should handle empty transcript list', async () => {
      const result = await service.generateSummary([]);
      
      expect(result).toEqual({
        summary: '',
        keyPoints: [],
        timestamp: expect.any(Number),
        tokenUsage: { prompt: 0, completion: 0, total: 0 }
      });
      
      expect(mockCompletions.create).not.toHaveBeenCalled();
    });
    
    test('should extract key points from summary', async () => {
      const summaryWithPoints = `
Summary: The lecture covered databases.

Key Points:
- Introduction to relational databases
- SQL query basics
- Database normalization
- ACID properties
`;
      
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: summaryWithPoints }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      });
      
      const result = await service.generateSummary([
        { text: 'Database lecture content', timestamp: Date.now() }
      ]);
      
      expect(result.keyPoints).toEqual([
        'Introduction to relational databases',
        'SQL query basics',
        'Database normalization',
        'ACID properties'
      ]);
    });
    
    test('should emit summary event on success', async () => {
      const summarySpy = jest.fn();
      service.on('summary-generated', summarySpy);
      
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'Test summary' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });
      
      await service.generateSummary([{ text: 'Test', timestamp: Date.now() }]);
      
      expect(summarySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: 'Test summary'
        })
      );
    });
  });
  
  describe('Partial Summary Generation', () => {
    test('should generate partial summary every 15 minutes', async () => {
      jest.useFakeTimers();
      
      const partialSpy = jest.fn();
      service.on('partial-summary', partialSpy);
      
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'Partial summary' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
      });
      
      service.startPartialSummaries();
      
      // Add some transcripts
      service.addTranscript('First part of lecture');
      service.addTranscript('Second part of lecture');
      
      // Fast-forward 15 minutes
      jest.advanceTimersByTime(15 * 60 * 1000);
      
      // Wait for async operations
      await Promise.resolve();
      
      expect(partialSpy).toHaveBeenCalled();
      expect(mockCompletions.create).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
    
    test('should not generate partial summary with no new transcripts', async () => {
      jest.useFakeTimers();
      
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'Summary' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
      });
      
      service.startPartialSummaries();
      
      // No transcripts added
      jest.advanceTimersByTime(15 * 60 * 1000);
      
      await Promise.resolve();
      
      expect(mockCompletions.create).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
    
    test('should stop partial summaries on command', () => {
      jest.useFakeTimers();
      
      service.startPartialSummaries();
      
      // Verify timer is set
      expect(jest.getTimerCount()).toBe(1);
      
      service.stopPartialSummaries();
      
      // Verify timer is cleared
      expect(jest.getTimerCount()).toBe(0);
      
      jest.useRealTimers();
    });
  });
  
  describe('Final Summary Generation', () => {
    test('should generate comprehensive final summary', async () => {
      const mockFinalResponse = {
        choices: [{
          message: {
            content: `
Final Summary: Complete lecture on machine learning fundamentals.

Key Topics Covered:
1. Introduction to ML
2. Supervised Learning
3. Unsupervised Learning
4. Neural Networks

Important Concepts:
- Training vs Testing
- Overfitting
- Cross-validation

Action Items:
- Review Chapter 5
- Complete Assignment 3
- Prepare for quiz
`
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 200,
          total_tokens: 700
        }
      };
      
      mockCompletions.create.mockResolvedValue(mockFinalResponse);
      
      // Add transcripts and partial summaries
      service.addTranscript('Introduction to machine learning');
      service.addTranscript('Supervised learning algorithms');
      service['partialSummaries'] = [
        { summary: 'First 15 minutes summary', keyPoints: [], timestamp: Date.now(), tokenUsage: { prompt: 0, completion: 0, total: 0 } },
        { summary: 'Second 15 minutes summary', keyPoints: [], timestamp: Date.now(), tokenUsage: { prompt: 0, completion: 0, total: 0 } }
      ];
      
      const result = await service.generateFinalSummary();
      
      expect(result).toEqual(expect.objectContaining({
        summary: expect.stringContaining('Complete lecture on machine learning'),
        keyPoints: expect.arrayContaining([
          expect.stringContaining('Introduction to ML')
        ]),
        actionItems: expect.arrayContaining([
          'Review Chapter 5',
          'Complete Assignment 3',
          'Prepare for quiz'
        ]),
        timestamp: expect.any(Number)
      }));
    });
    
    test('should include all partial summaries in final', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'Final comprehensive summary' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 300, completion_tokens: 100, total_tokens: 400 }
      });
      
      // Add multiple partial summaries
      service['partialSummaries'] = [
        { summary: 'Part 1', keyPoints: ['Point 1'], timestamp: Date.now(), tokenUsage: { prompt: 0, completion: 0, total: 0 } },
        { summary: 'Part 2', keyPoints: ['Point 2'], timestamp: Date.now(), tokenUsage: { prompt: 0, completion: 0, total: 0 } },
        { summary: 'Part 3', keyPoints: ['Point 3'], timestamp: Date.now(), tokenUsage: { prompt: 0, completion: 0, total: 0 } }
      ];
      
      await service.generateFinalSummary();
      
      const messages = mockCompletions.create.mock.calls[0][0].messages;
      const systemMessage = messages.find((m: any) => m.role === 'system');
      
      expect(systemMessage.content).toContain('Part 1');
      expect(systemMessage.content).toContain('Part 2');
      expect(systemMessage.content).toContain('Part 3');
    });
  });
  
  describe('Transcript Management', () => {
    test('should add transcripts with timestamps', () => {
      const now = Date.now();
      
      service.addTranscript('First transcript');
      service.addTranscript('Second transcript');
      
      const transcripts = service.getTranscripts();
      
      expect(transcripts).toHaveLength(2);
      expect(transcripts[0]).toEqual({
        text: 'First transcript',
        timestamp: expect.any(Number)
      });
      expect(transcripts[0].timestamp).toBeGreaterThanOrEqual(now);
    });
    
    test('should clear transcripts', () => {
      service.addTranscript('Test 1');
      service.addTranscript('Test 2');
      
      expect(service.getTranscripts()).toHaveLength(2);
      
      service.clearTranscripts();
      
      expect(service.getTranscripts()).toHaveLength(0);
    });
    
    test('should get transcripts for time range', () => {
      const now = Date.now();
      
      service['transcripts'] = [
        { text: 'Old', timestamp: now - 20 * 60 * 1000 }, // 20 min ago
        { text: 'Recent 1', timestamp: now - 5 * 60 * 1000 }, // 5 min ago
        { text: 'Recent 2', timestamp: now - 2 * 60 * 1000 }, // 2 min ago
        { text: 'Current', timestamp: now }
      ];
      
      const recent = service.getTranscriptsForTimeRange(now - 10 * 60 * 1000, now);
      
      expect(recent).toHaveLength(3);
      expect(recent[0].text).toBe('Recent 1');
    });
  });
  
  describe('Cost Calculation', () => {
    test('should calculate cost with correct pricing', () => {
      // GPT-4.1-mini pricing: $0.40/$1.60 per million tokens
      const promptCost = service.calculateCost(1000000, 0); // 1M prompt tokens
      expect(promptCost).toBeCloseTo(0.40, 2);
      
      const completionCost = service.calculateCost(0, 1000000); // 1M completion tokens
      expect(completionCost).toBeCloseTo(1.60, 2);
      
      const mixedCost = service.calculateCost(500000, 250000);
      expect(mixedCost).toBeCloseTo(0.20 + 0.40, 2); // $0.60 total
    });
    
    test('should track cumulative costs', async () => {
      mockCompletions.create
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Summary 1' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 }
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Summary 2' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 2000, completion_tokens: 1000, total_tokens: 3000 }
        });
      
      await service.generateSummary([{ text: 'Test 1', timestamp: Date.now() }]);
      await service.generateSummary([{ text: 'Test 2', timestamp: Date.now() }]);
      
      const stats = service.getStatistics();
      
      expect(stats.totalTokensUsed).toBe(4500); // 1500 + 3000
      expect(stats.totalPromptTokens).toBe(3000); // 1000 + 2000
      expect(stats.totalCompletionTokens).toBe(1500); // 500 + 1000
      expect(stats.estimatedCost).toBeCloseTo(
        (3000 * 0.40 + 1500 * 1.60) / 1000000,
        4
      );
    });
  });
  
  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      const errorSpy = jest.fn();
      service.on('error', errorSpy);
      
      const apiError = new Error('API request failed');
      mockCompletions.create.mockRejectedValue(apiError);
      
      await expect(
        service.generateSummary([{ text: 'Test', timestamp: Date.now() }])
      ).rejects.toThrow('API request failed');
      
      expect(errorSpy).toHaveBeenCalledWith(apiError);
    });
    
    test('should handle rate limit errors', async () => {
      const rateLimitSpy = jest.fn();
      service.on('rate-limited', rateLimitSpy);
      
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      
      mockCompletions.create.mockRejectedValue(rateLimitError);
      
      await expect(
        service.generateSummary([{ text: 'Test', timestamp: Date.now() }])
      ).rejects.toThrow('Rate limit exceeded');
      
      expect(rateLimitSpy).toHaveBeenCalled();
    });
    
    test('should retry on transient errors', async () => {
      mockCompletions.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Success' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        });
      
      const result = await service.generateSummary([{ text: 'Test', timestamp: Date.now() }]);
      
      expect(result.summary).toBe('Success');
      expect(mockCompletions.create).toHaveBeenCalledTimes(2);
    });
    
    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      
      mockCompletions.create.mockRejectedValue(timeoutError);
      
      await expect(
        service.generateSummary([{ text: 'Test', timestamp: Date.now() }])
      ).rejects.toThrow('Request timeout');
    });
  });
  
  describe('Statistics', () => {
    test('should provide comprehensive statistics', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'Summary' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 }
      });
      
      await service.generateSummary([{ text: 'Test', timestamp: Date.now() }]);
      
      const stats = service.getStatistics();
      
      expect(stats).toEqual({
        totalSummariesGenerated: 1,
        totalPartialSummaries: 0,
        totalTokensUsed: 1500,
        totalPromptTokens: 1000,
        totalCompletionTokens: 500,
        estimatedCost: expect.any(Number),
        averageTokensPerSummary: 1500,
        totalTranscriptsProcessed: 1
      });
    });
    
    test('should reset statistics', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'Summary' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 }
      });
      
      await service.generateSummary([{ text: 'Test', timestamp: Date.now() }]);
      
      service.resetStatistics();
      
      const stats = service.getStatistics();
      
      expect(stats.totalSummariesGenerated).toBe(0);
      expect(stats.totalTokensUsed).toBe(0);
    });
  });
  
  describe('Cleanup', () => {
    test('should clean up resources on destroy', () => {
      jest.useFakeTimers();
      
      service.startPartialSummaries();
      
      const removeListenersSpy = jest.spyOn(service, 'removeAllListeners');
      
      service.destroy();
      
      expect(removeListenersSpy).toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
      
      jest.useRealTimers();
    });
    
    test('should clear all data on destroy', () => {
      service.addTranscript('Test');
      service['partialSummaries'] = [
        { summary: 'Partial', keyPoints: [], timestamp: Date.now(), tokenUsage: { prompt: 0, completion: 0, total: 0 } }
      ];
      
      service.destroy();
      
      expect(service.getTranscripts()).toHaveLength(0);
      expect(service['partialSummaries']).toHaveLength(0);
    });
  });
});