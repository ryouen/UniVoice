/**
 * Claude AI Service
 * 
 * This service provides integration with Claude AI using the Anthropic SDK
 * for various AI-powered features in the UniVoice application.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../../electron/utils/logger';

export interface ClaudeConfig {
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class ClaudeService {
  private client: Anthropic;
  private config: ClaudeConfig;
  private componentLogger = logger.child('ClaudeService');

  constructor(config: ClaudeConfig) {
    this.config = {
      maxTokens: 1024,
      temperature: 0.7,
      model: 'claude-3-5-sonnet-20241022',
      ...config
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });

    this.componentLogger.info('Claude Service initialized', {
      model: this.config.model
    });
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(
    messages: ClaudeMessage[], 
    systemPrompt?: string
  ): Promise<ClaudeResponse> {
    try {
      const startTime = Date.now();

      const response = await this.client.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
        temperature: this.config.temperature!,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });

      const latency = Date.now() - startTime;

      this.componentLogger.info('Claude response received', {
        latency,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      });

      return {
        content: response.content[0].type === 'text' 
          ? response.content[0].text 
          : '',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error) {
      this.componentLogger.error('Claude API error', { error });
      throw error;
    }
  }

  /**
   * Generate a summary of the provided text
   */
  async generateSummary(
    text: string, 
    maxWords: number = 100
  ): Promise<string> {
    const systemPrompt = `You are a professional summarizer. Create a concise summary in about ${maxWords} words.`;
    
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Please summarize the following text:\n\n${text}`
      }
    ];

    const response = await this.sendMessage(messages, systemPrompt);
    return response.content;
  }

  /**
   * Translate text from source language to target language
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    const systemPrompt = `You are a professional translator. Translate from ${sourceLanguage} to ${targetLanguage}. Provide only the translation without any explanations.`;
    
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: text
      }
    ];

    const response = await this.sendMessage(messages, systemPrompt);
    return response.content;
  }

  /**
   * Extract key vocabulary/terms from text
   */
  async extractVocabulary(
    text: string,
    count: number = 10
  ): Promise<string[]> {
    const systemPrompt = `You are a vocabulary extraction expert. Extract the ${count} most important technical terms or key vocabulary from the text. Return them as a simple list, one term per line.`;
    
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: text
      }
    ];

    const response = await this.sendMessage(messages, systemPrompt);
    return response.content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.trim());
  }

  /**
   * Stream a response from Claude (for real-time applications)
   */
  async *streamMessage(
    messages: ClaudeMessage[],
    systemPrompt?: string
  ): AsyncIterableIterator<string> {
    try {
      const stream = await this.client.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
        temperature: this.config.temperature!,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      this.componentLogger.error('Claude streaming error', { error });
      throw error;
    }
  }

  /**
   * Analyze sentiment of the provided text
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    explanation: string;
  }> {
    const systemPrompt = 'You are a sentiment analysis expert. Analyze the sentiment and provide a JSON response.';
    
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Analyze the sentiment of this text and respond with JSON format {sentiment: "positive"|"negative"|"neutral", confidence: 0-1, explanation: "brief explanation"}:\n\n${text}`
      }
    ];

    const response = await this.sendMessage(messages, systemPrompt);
    
    try {
      return JSON.parse(response.content);
    } catch {
      // Fallback if JSON parsing fails
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        explanation: 'Unable to parse sentiment analysis'
      };
    }
  }
}