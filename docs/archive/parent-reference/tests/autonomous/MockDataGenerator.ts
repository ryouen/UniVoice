import { EventEmitter } from 'events';

// Types for realistic mock data
interface MockAudioChunk {
  data: Buffer;
  timestamp: number;
  duration: number;
  segmentId: string;
}

interface MockTranscriptEvent {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
  duration: number;
  words?: MockWord[];
}

interface MockWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface MockTranslationResult {
  originalText: string;
  translatedText: string;
  confidence: number;
  cost: number;
}

interface TimingProfile {
  totalDuration: number; // in seconds
  chunkSize: number; // 640ms chunks
  overlapSize: number; // 320ms overlap
  processingDelay: number; // realistic API response time
}

interface NetworkProfile {
  stable: { latency: number; jitter: number; };
  unstable: { latency: number; jitter: number; };
  rateLimited: { errors: string[]; };
}

interface ErrorScenario {
  type: 'network' | 'api' | 'timeout' | 'ratelimit';
  description: string;
  trigger: () => boolean;
  recovery: () => void;
}

export interface RealisticMockDataset {
  segments: {
    introduction: { texts: string[]; duration: number; complexity: 'low' | 'medium' | 'high' };
    concepts: { texts: string[]; duration: number; complexity: 'low' | 'medium' | 'high' };
    examples: { texts: string[]; duration: number; complexity: 'low' | 'medium' | 'high' };
    discussion: { texts: string[]; duration: number; complexity: 'low' | 'medium' | 'high' };
    summary: { texts: string[]; duration: number; complexity: 'low' | 'medium' | 'high' };
    qa: { texts: string[]; duration: number; complexity: 'low' | 'medium' | 'high' };
  };
  networkProfiles: NetworkProfile;
  expectedCosts: {
    deepgram: number;
    translation: number;
    summary: number;
    total: number;
  };
  audioChunks: MockAudioChunk[];
  transcriptEvents: MockTranscriptEvent[];
  translationResults: MockTranslationResult[];
}

/**
 * Generates realistic mock data for 180-minute lecture simulation
 * Based on O3-pro analysis of university lecture patterns
 */
export class MockDataGenerator extends EventEmitter {
  private readonly CHUNK_SIZE_MS = 640;
  private readonly OVERLAP_SIZE_MS = 320;
  private readonly SAMPLE_RATE = 16000;
  private readonly BYTES_PER_SAMPLE = 2; // 16-bit
  
  /**
   * Generate complete 180-minute realistic dataset
   */
  generate180MinuteDataset(): RealisticMockDataset {
    console.log('[MockDataGenerator] Generating 180-minute realistic dataset...');
    
    const dataset: RealisticMockDataset = {
      segments: this.generateLectureSegments(),
      networkProfiles: this.generateNetworkProfiles(),
      expectedCosts: this.calculateExpectedCosts(),
      audioChunks: [],
      transcriptEvents: [],
      translationResults: []
    };
    
    // Generate detailed data for each segment
    let currentTime = 0;
    
    Object.entries(dataset.segments).forEach(([segmentName, segment]) => {
      console.log(`[MockDataGenerator] Generating data for ${segmentName} (${segment.duration}min)...`);
      
      // Generate audio chunks for this segment
      const segmentChunks = this.generateAudioChunksForSegment(
        segment,
        currentTime,
        segment.duration * 60 // convert to seconds
      );
      dataset.audioChunks.push(...segmentChunks);
      
      // Generate transcript events for this segment
      const segmentTranscripts = this.generateTranscriptEventsForSegment(
        segment,
        currentTime,
        segment.duration * 60
      );
      dataset.transcriptEvents.push(...segmentTranscripts);
      
      // Generate translation results for this segment
      const segmentTranslations = this.generateTranslationResultsForSegment(
        segmentTranscripts
      );
      dataset.translationResults.push(...segmentTranslations);
      
      currentTime += segment.duration * 60;
    });
    
    console.log(`[MockDataGenerator] Generated complete dataset:`);
    console.log(`  - Audio chunks: ${dataset.audioChunks.length}`);
    console.log(`  - Transcript events: ${dataset.transcriptEvents.length}`);
    console.log(`  - Translation results: ${dataset.translationResults.length}`);
    console.log(`  - Expected total cost: $${dataset.expectedCosts.total.toFixed(4)}`);
    
    return dataset;
  }
  
  /**
   * Generate lecture segments with realistic content
   */
  private generateLectureSegments() {
    return {
      introduction: {
        texts: [
          "Good morning everyone. Welcome to today's lecture on machine learning fundamentals.",
          "Before we begin, please make sure you have your notebooks ready.",
          "Today we'll cover three main topics: supervised learning, unsupervised learning, and reinforcement learning."
        ],
        duration: 5,
        complexity: 'low' as const
      },
      concepts: {
        texts: [
          "Let's start with supervised learning. This is a type of machine learning where we have labeled training data.",
          "The algorithm learns to map input variables to output variables based on example input-output pairs.",
          "Common supervised learning algorithms include linear regression, decision trees, and support vector machines.",
          "Each of these algorithms has different strengths and is suitable for different types of problems.",
          "For instance, linear regression is excellent for predicting continuous values, while decision trees are great for classification tasks."
        ],
        duration: 60,
        complexity: 'high' as const
      },
      examples: {
        texts: [
          "Let me give you a concrete example of supervised learning in action.",
          "Imagine we want to predict house prices based on features like size, location, and age.",
          "We would train our model on historical data where we know both the features and the actual sale prices.",
          "The model learns the relationship between these features and prices, then can predict prices for new houses."
        ],
        duration: 45,
        complexity: 'medium' as const
      },
      discussion: {
        texts: [
          "Now let's discuss the challenges we face in machine learning.",
          "One major challenge is overfitting, where the model performs well on training data but poorly on new data.",
          "Another challenge is feature selection - choosing which input variables are most relevant.",
          "We also need to consider bias in our data and how it affects model fairness."
        ],
        duration: 30,
        complexity: 'high' as const
      },
      summary: {
        texts: [
          "To summarize today's lecture, we covered the fundamentals of machine learning.",
          "We discussed supervised learning and its main algorithms.",
          "Remember that choosing the right algorithm depends on your specific problem and data.",
          "Next week we'll dive deeper into unsupervised learning techniques."
        ],
        duration: 15,
        complexity: 'low' as const
      },
      qa: {
        texts: [
          "Are there any questions about today's material?",
          "Yes, the student in the front row?",
          "That's an excellent question about cross-validation. Let me explain that concept.",
          "Cross-validation is a technique we use to evaluate model performance more reliably.",
          "Any other questions before we wrap up?"
        ],
        duration: 25,
        complexity: 'medium' as const
      }
    };
  }
  
  /**
   * Generate audio chunks for a specific segment
   */
  private generateAudioChunksForSegment(
    segment: any,
    startTime: number,
    durationSeconds: number
  ): MockAudioChunk[] {
    const chunks: MockAudioChunk[] = [];
    const totalChunks = Math.ceil((durationSeconds * 1000) / this.CHUNK_SIZE_MS);
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkStartTime = startTime + (i * this.CHUNK_SIZE_MS / 1000);
      const chunkData = this.generateAudioData(this.CHUNK_SIZE_MS / 1000);
      
      chunks.push({
        data: chunkData,
        timestamp: chunkStartTime * 1000, // Convert to ms
        duration: this.CHUNK_SIZE_MS,
        segmentId: `chunk_${startTime}_${i}`
      });
    }
    
    return chunks;
  }
  
  /**
   * Generate realistic audio data (silence with some variation)
   */
  private generateAudioData(durationSeconds: number): Buffer {
    const numSamples = Math.floor(this.SAMPLE_RATE * durationSeconds);
    const buffer = Buffer.alloc(numSamples * this.BYTES_PER_SAMPLE);
    
    // Generate audio data with realistic speech patterns
    for (let i = 0; i < numSamples; i++) {
      const t = i / this.SAMPLE_RATE;
      
      // Simulate speech patterns with varying amplitude
      const speechPattern = Math.sin(t * 2 * Math.PI * 100) * 0.1; // 100Hz base
      const variation = Math.sin(t * 2 * Math.PI * 300) * 0.05; // 300Hz variation
      const noise = (Math.random() - 0.5) * 0.02; // Small amount of noise
      
      const amplitude = speechPattern + variation + noise;
      const value = Math.floor(amplitude * 16383); // 16-bit range
      
      buffer.writeInt16LE(value, i * this.BYTES_PER_SAMPLE);
    }
    
    return buffer;
  }
  
  /**
   * Generate transcript events for a specific segment
   */
  private generateTranscriptEventsForSegment(
    segment: any,
    startTime: number,
    durationSeconds: number
  ): MockTranscriptEvent[] {
    const events: MockTranscriptEvent[] = [];
    const textsPerSegment = segment.texts || [];
    const timePerText = durationSeconds / textsPerSegment.length;
    
    textsPerSegment.forEach((text: string, index: number) => {
      const textStartTime = startTime + (index * timePerText);
      const words = text.split(' ');
      const timePerWord = timePerText / words.length;
      
      // Generate interim results (showing gradual build-up)
      let partialText = '';
      words.forEach((word, wordIndex) => {
        partialText += (wordIndex > 0 ? ' ' : '') + word;
        const wordTimestamp = textStartTime + (wordIndex * timePerWord);
        
        // Add interim result
        if (wordIndex < words.length - 1) {
          events.push({
            transcript: partialText,
            confidence: Math.min(0.7 + (wordIndex / words.length) * 0.2, 0.9),
            isFinal: false,
            timestamp: wordTimestamp * 1000,
            duration: timePerWord * 1000
          });
        } else {
          // Add final result
          events.push({
            transcript: text,
            confidence: 0.92 + Math.random() * 0.06, // 0.92-0.98
            isFinal: true,
            timestamp: textStartTime * 1000,
            duration: timePerText * 1000,
            words: this.generateWordTimings(words, textStartTime, timePerWord)
          });
        }
      });
    });
    
    return events;
  }
  
  /**
   * Generate word-level timing information
   */
  private generateWordTimings(words: string[], startTime: number, timePerWord: number): MockWord[] {
    return words.map((word, index) => ({
      word: word.replace(/[.,!?]/, ''), // Remove punctuation
      start: startTime + (index * timePerWord),
      end: startTime + ((index + 1) * timePerWord),
      confidence: 0.85 + Math.random() * 0.13 // 0.85-0.98
    }));
  }
  
  /**
   * Generate translation results for transcript events
   */
  private generateTranslationResultsForSegment(transcriptEvents: MockTranscriptEvent[]): MockTranslationResult[] {
    // Mock Japanese translations (realistic academic content)
    const translations: { [key: string]: string } = {
      "Good morning everyone. Welcome to today's lecture on machine learning fundamentals.": 
        "皆さん、おはようございます。機械学習の基礎に関する今日の講義へようこそ。",
      "Before we begin, please make sure you have your notebooks ready.": 
        "始める前に、ノートブックの準備ができていることを確認してください。",
      "Today we'll cover three main topics: supervised learning, unsupervised learning, and reinforcement learning.": 
        "今日は3つの主要なトピックを扱います：教師あり学習、教師なし学習、強化学習です。",
      // Add more translations as needed...
    };
    
    return transcriptEvents
      .filter(event => event.isFinal)
      .map(event => {
        const translatedText = translations[event.transcript] || 
          `翻訳：${event.transcript}（モック翻訳）`;
        
        return {
          originalText: event.transcript,
          translatedText,
          confidence: 0.91 + Math.random() * 0.07, // 0.91-0.98
          cost: this.calculateTranslationCost(event.transcript)
        };
      });
  }
  
  /**
   * Calculate expected costs for 180-minute session
   */
  private calculateExpectedCosts() {
    return {
      deepgram: 180 * 0.0077, // $0.0077 per minute
      translation: 0.15, // Gemini Flash with batch discount
      summary: 0.05, // GPT-4.1-mini for summarization
      total: 1.59 // Well under $3 target
    };
  }
  
  /**
   * Generate network condition profiles
   */
  private generateNetworkProfiles(): NetworkProfile {
    return {
      stable: { latency: 50, jitter: 5 },
      unstable: { latency: 200, jitter: 100 },
      rateLimited: { errors: ['429', 'timeout', 'network'] }
    };
  }
  
  /**
   * Calculate cost for a single translation
   */
  private calculateTranslationCost(text: string): number {
    const tokens = Math.ceil(text.length / 4); // Rough token estimate
    const inputCost = (tokens / 1000000) * 0.075;
    const outputCost = (tokens / 1000000) * 0.30;
    return (inputCost + outputCost) * 0.5; // 50% batch discount
  }
  
  /**
   * Generate error scenarios for testing
   */
  generateErrorScenarios(): ErrorScenario[] {
    return [
      {
        type: 'network',
        description: 'Network disconnection during stream',
        trigger: () => Math.random() < 0.1, // 10% chance
        recovery: () => console.log('[Mock] Network recovered')
      },
      {
        type: 'ratelimit',
        description: 'API rate limiting hit',
        trigger: () => Math.random() < 0.05, // 5% chance
        recovery: () => console.log('[Mock] Rate limit cleared after backoff')
      },
      {
        type: 'timeout',
        description: 'API response timeout',
        trigger: () => Math.random() < 0.02, // 2% chance
        recovery: () => console.log('[Mock] Timeout recovered with retry')
      }
    ];
  }
  
  /**
   * Simulate realistic network conditions
   */
  simulateNetworkConditions(): NetworkProfile {
    return this.generateNetworkProfiles();
  }
}