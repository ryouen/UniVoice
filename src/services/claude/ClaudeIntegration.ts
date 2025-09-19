/**
 * Claude Integration for UniVoice
 * 
 * This module shows how to integrate Claude SDK with the existing
 * UniVoice pipeline for enhanced AI capabilities.
 */

import { ClaudeService } from './ClaudeService';
import { EventEmitter } from 'events';

export interface ClaudeIntegrationConfig {
  apiKey: string;
  enableFallback?: boolean;
  model?: string;
}

export class ClaudeIntegration extends EventEmitter {
  private claudeService: ClaudeService;
  private config: ClaudeIntegrationConfig;

  constructor(config: ClaudeIntegrationConfig) {
    super();
    this.config = config;
    
    this.claudeService = new ClaudeService({
      apiKey: config.apiKey,
      model: config.model || 'claude-3-sonnet-20240229'
    });
  }

  /**
   * Enhanced translation with Claude as fallback or primary
   */
  async enhancedTranslate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    useClaudeAsPrimary: boolean = false
  ): Promise<{
    translation: string;
    provider: 'claude' | 'gpt';
    confidence?: number;
  }> {
    if (useClaudeAsPrimary || this.config.enableFallback) {
      try {
        const translation = await this.claudeService.translate(
          text,
          sourceLanguage,
          targetLanguage
        );
        
        this.emit('translation', {
          original: text,
          translated: translation,
          provider: 'claude'
        });

        return {
          translation,
          provider: 'claude'
        };
      } catch (error) {
        console.error('Claude translation failed:', error);
        if (!this.config.enableFallback) {
          throw error;
        }
      }
    }

    // Fallback to existing GPT implementation
    // This would integrate with your existing UnifiedPipelineService
    return {
      translation: text, // Placeholder
      provider: 'gpt'
    };
  }

  /**
   * Intelligent summary generation with context
   */
  async generateContextualSummary(
    segments: Array<{ text: string; timestamp: number }>,
    context?: string
  ): Promise<{
    summary: string;
    keyPoints: string[];
    duration: number;
  }> {
    const fullText = segments.map(s => s.text).join(' ');
    const duration = segments.length > 0 
      ? segments[segments.length - 1].timestamp - segments[0].timestamp 
      : 0;

    const systemPrompt = context 
      ? `You are summarizing a ${context}. Create a concise summary and extract key points.`
      : 'Create a concise summary and extract key points from the following transcript.';

    const response = await this.claudeService.sendMessage([
      {
        role: 'user',
        content: `Please provide:
1. A summary (100-150 words)
2. 3-5 key points

Text to summarize:
${fullText}`
      }
    ], systemPrompt);

    // Parse response to extract summary and key points
    const lines = response.content.split('\n');
    const summaryStart = lines.findIndex(line => line.toLowerCase().includes('summary'));
    const keyPointsStart = lines.findIndex(line => line.toLowerCase().includes('key points'));

    const summary = lines
      .slice(summaryStart + 1, keyPointsStart > summaryStart ? keyPointsStart : undefined)
      .join(' ')
      .trim();

    const keyPoints = lines
      .slice(keyPointsStart + 1)
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[-•*]\s*/, '').trim());

    this.emit('summary', { summary, keyPoints, duration });

    return { summary, keyPoints, duration };
  }

  /**
   * Real-time quality assessment of translations
   */
  async assessTranslationQuality(
    original: string,
    translation: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    const response = await this.claudeService.sendMessage([
      {
        role: 'user',
        content: `Assess this translation quality:
Original (${sourceLanguage}): ${original}
Translation (${targetLanguage}): ${translation}

Provide JSON: {"score": 0-100, "issues": ["..."], "suggestions": ["..."]}`
      }
    ], 'You are a translation quality assessment expert.');

    try {
      const assessment = JSON.parse(response.content);
      this.emit('qualityAssessment', assessment);
      return assessment;
    } catch {
      return {
        score: 50,
        issues: ['Unable to assess'],
        suggestions: []
      };
    }
  }

  /**
   * Stream translation for real-time applications
   */
  async *streamTranslation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): AsyncIterableIterator<string> {
    const systemPrompt = `Translate from ${sourceLanguage} to ${targetLanguage} naturally and fluently.`;
    
    const messages = [{
      role: 'user' as const,
      content: text
    }];

    let buffer = '';
    for await (const chunk of this.claudeService.streamMessage(messages, systemPrompt)) {
      buffer += chunk;
      this.emit('streamChunk', { chunk, buffer });
      yield chunk;
    }

    this.emit('streamComplete', { translation: buffer });
  }

  /**
   * Intelligent conversation context management
   */
  async enhanceConversationContext(
    recentSegments: Array<{ speaker?: string; text: string }>,
    query: string
  ): Promise<string> {
    const context = recentSegments
      .map(s => `${s.speaker || 'Speaker'}: ${s.text}`)
      .join('\n');

    const response = await this.claudeService.sendMessage([
      {
        role: 'user',
        content: `Given this conversation context:
${context}

Answer this question: ${query}`
      }
    ], 'You are helping to understand and analyze conversation context.');

    return response.content;
  }
}