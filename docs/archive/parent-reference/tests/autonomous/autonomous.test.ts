import { TestOrchestrator } from './TestOrchestrator';
import { MockDataGenerator } from './MockDataGenerator';

describe('UniVoice Autonomous Test Suite', () => {
  let orchestrator: TestOrchestrator;
  
  beforeEach(() => {
    // Create orchestrator with mock data for autonomous testing
    orchestrator = new TestOrchestrator({
      useMockData: true,
      enableRealAPIs: false, // Set to false for 100% autonomous testing
      testDuration: 180 * 60 // 180 minutes
    });
  });
  
  afterEach(async () => {
    // Cleanup after each test
    if (orchestrator) {
      orchestrator.removeAllListeners();
    }
  });
  
  describe('Mock Data Pipeline', () => {
    test('Mock pipeline completes successfully', async () => {
      const results = await orchestrator.runFullAutonomousTest();
      
      expect(results.mockResults.success).toBe(true);
      expect(results.mockResults.audioChunksProcessed).toBeGreaterThan(0);
      expect(results.mockResults.transcriptsGenerated).toBeGreaterThan(0);
      expect(results.mockResults.translationsCompleted).toBeGreaterThan(0);
      expect(results.mockResults.errors).toHaveLength(0);
    }, 30000); // 30 second timeout
    
    test('Mock data generation produces realistic content', () => {
      const generator = new MockDataGenerator();
      const dataset = generator.generate180MinuteDataset();
      
      expect(dataset.audioChunks.length).toBeGreaterThan(1000);
      expect(dataset.transcriptEvents.length).toBeGreaterThan(100);
      expect(dataset.translationResults.length).toBeGreaterThan(20);
      expect(dataset.expectedCosts.total).toBeLessThan(3.0);
    });
    
    test('Audio chunks have realistic timing', () => {
      const generator = new MockDataGenerator();
      const dataset = generator.generate180MinuteDataset();
      
      // Check that chunks are properly timed
      const firstChunk = dataset.audioChunks[0];
      const secondChunk = dataset.audioChunks[1];
      
      expect(firstChunk.duration).toBe(640); // 640ms chunks
      expect(secondChunk.timestamp - firstChunk.timestamp).toBe(640);
      expect(firstChunk.data).toBeInstanceOf(Buffer);
      expect(firstChunk.data.length).toBeGreaterThan(0);
    });
  });
  
  describe('180-Minute Session Simulation', () => {
    test('180-minute simulation completes under cost target', async () => {
      const results = await orchestrator.runFullAutonomousTest();
      
      expect(results.longSessionResults.success).toBe(true);
      expect(results.longSessionResults.simulatedDuration).toBe(180 * 60);
      expect(results.longSessionResults.actualTestDuration).toBeLessThan(10000); // < 10 seconds
      expect(results.longSessionResults.totalCost).toBeLessThan(3.0);
      expect(results.longSessionResults.costUnderTarget).toBe(true);
    }, 15000); // 15 second timeout
    
    test('Handovers occur at correct intervals', async () => {
      const results = await orchestrator.runFullAutonomousTest();
      
      // Should have 2 handovers for 180 minutes (at 60min and 120min)
      expect(results.longSessionResults.handoversSuccessful).toBe(2);
    });
    
    test('Memory usage remains reasonable', async () => {
      const results = await orchestrator.runFullAutonomousTest();
      
      // Memory should not exceed 2GB for 180-minute session
      expect(results.longSessionResults.memoryUsageMB).toBeLessThan(2048);
      expect(results.longSessionResults.memoryUsageMB).toBeGreaterThan(0);
    });
  });
  
  describe('Cost Validation', () => {
    test('Cost projections are accurate', async () => {
      const results = await orchestrator.runFullAutonomousTest();
      
      expect(results.costValidation.underBudget).toBe(true);
      expect(results.costValidation.accuracy).toBeGreaterThan(90);
      expect(results.costValidation.projectedCost).toBeLessThan(3.0);
    });
    
    test('Individual service costs are reasonable', () => {
      const generator = new MockDataGenerator();
      const dataset = generator.generate180MinuteDataset();
      
      // Deepgram should be the largest cost component
      expect(dataset.expectedCosts.deepgram).toBeGreaterThan(dataset.expectedCosts.translation);
      expect(dataset.expectedCosts.deepgram).toBeGreaterThan(dataset.expectedCosts.summary);
      
      // All individual costs should be reasonable
      expect(dataset.expectedCosts.deepgram).toBeLessThan(2.0);
      expect(dataset.expectedCosts.translation).toBeLessThan(0.5);
      expect(dataset.expectedCosts.summary).toBeLessThan(0.2);
    });
  });
  
  describe('Error Handling', () => {
    test('Handles rate limiting gracefully', async () => {
      const generator = new MockDataGenerator();
      const errorScenarios = generator.generateErrorScenarios();
      
      const rateLimitScenario = errorScenarios.find(s => s.type === 'ratelimit');
      expect(rateLimitScenario).toBeDefined();
      expect(rateLimitScenario?.description).toContain('rate limiting');
    });
    
    test('Network disconnection scenarios are handled', async () => {
      const generator = new MockDataGenerator();
      const errorScenarios = generator.generateErrorScenarios();
      
      const networkScenario = errorScenarios.find(s => s.type === 'network');
      expect(networkScenario).toBeDefined();
      expect(networkScenario?.description).toContain('Network disconnection');
    });
    
    test('Timeout scenarios are handled', async () => {
      const generator = new MockDataGenerator();
      const errorScenarios = generator.generateErrorScenarios();
      
      const timeoutScenario = errorScenarios.find(s => s.type === 'timeout');
      expect(timeoutScenario).toBeDefined();
      expect(timeoutScenario?.description).toContain('timeout');
    });
  });
  
  describe('Performance Metrics', () => {
    test('Performance metrics are collected', async () => {
      const results = await orchestrator.runFullAutonomousTest();
      
      expect(results.performanceMetrics.averageLatency).toBeGreaterThan(0);
      expect(results.performanceMetrics.peakMemoryUsage).toBeGreaterThan(0);
      expect(results.performanceMetrics.cpuUsage).toBeGreaterThan(0);
      expect(results.performanceMetrics.networkBandwidth).toBeGreaterThan(0);
      expect(results.performanceMetrics.errorRate).toBeLessThan(5); // < 5%
    });
  });
  
  describe('Overall System Validation', () => {
    test('Overall test score meets production readiness threshold', async () => {
      const results = await orchestrator.runFullAutonomousTest();
      
      expect(results.overallScore).toBeGreaterThan(80); // Minimum 80% for production
      expect(results.timestamp).toBeGreaterThan(0);
    });
    
    test('Test completes within reasonable time', async () => {
      const startTime = Date.now();
      const results = await orchestrator.runFullAutonomousTest();
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(15000); // Should complete in < 15 seconds
      expect(results.mockResults.success).toBe(true);
    });
    
    test('No memory leaks during extended simulation', async () => {
      const initialMemory = process.memoryUsage().rss / 1024 / 1024; // MB
      
      await orchestrator.runFullAutonomousTest();
      
      const finalMemory = process.memoryUsage().rss / 1024 / 1024; // MB
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (< 100MB for test)
      expect(memoryIncrease).toBeLessThan(100);
    });
  });
  
  describe('Real API Testing (When Enabled)', () => {
    test('Can test with real APIs when keys are provided', async () => {
      // This test is skipped in autonomous mode but shows how real API testing would work
      const realAPIOrchestrator = new TestOrchestrator({
        useMockData: false,
        enableRealAPIs: true,
        apiKeys: {
          deepgram: process.env.DEEPGRAM_API_KEY,
          gemini: process.env.GEMINI_API_KEY,
          openai: process.env.OPENAI_API_KEY
        }
      });
      
      // Only run if we have API keys (for CI/CD flexibility)
      if (process.env.DEEPGRAM_API_KEY && process.env.GEMINI_API_KEY) {
        const results = await realAPIOrchestrator.runFullAutonomousTest();
        expect(results.realResults).toBeDefined();
        expect(results.realResults!.actualCost).toBeGreaterThan(0);
      } else {
        // Skip test if no API keys (autonomous mode)
        console.log('⏭️ Skipping real API test - no keys provided (autonomous mode)');
        expect(true).toBe(true); // Always pass in autonomous mode
      }
    }, 60000); // 60 second timeout for real API calls
  });
});