/**
 * Claude SDK Example
 * 
 * This example demonstrates how to use the Claude SDK in the UniVoice project
 * Run with: npx ts-node examples/claude-sdk-example.ts
 */

import { ClaudeService } from '../src/services/claude/ClaudeService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Initialize Claude Service
  const claudeService = new ClaudeService({
    apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-5-sonnet-20241022', // Latest Claude 3.5 Sonnet model
    maxTokens: 1024,
    temperature: 0.7
  });

  console.log('🤖 Claude SDK Example for UniVoice\n');

  try {
    // Example 1: Simple conversation
    console.log('1️⃣ Simple Conversation Example:');
    const chatResponse = await claudeService.sendMessage([
      {
        role: 'user',
        content: 'What are the key features of a real-time transcription application?'
      }
    ]);
    console.log('Response:', chatResponse.content);
    console.log('Token usage:', chatResponse.usage);
    console.log('\n---\n');

    // Example 2: Translation
    console.log('2️⃣ Translation Example:');
    const translatedText = await claudeService.translate(
      'This is a test of the real-time translation feature.',
      'English',
      'Japanese'
    );
    console.log('Original: This is a test of the real-time translation feature.');
    console.log('Translated:', translatedText);
    console.log('\n---\n');

    // Example 3: Summary Generation
    console.log('3️⃣ Summary Generation Example:');
    const longText = `
      UniVoice is an advanced real-time transcription and translation application 
      designed for educational environments. It captures audio from lectures or 
      presentations, transcribes it in real-time using Deepgram's speech recognition 
      technology, and then translates the content into multiple languages using 
      GPT-5 models. The application also provides features like automatic summarization, 
      vocabulary extraction, and report generation. It uses a Clean Architecture 
      pattern with CQRS and Event-Driven design for maintainability and scalability.
    `;
    const summary = await claudeService.generateSummary(longText, 50);
    console.log('Summary:', summary);
    console.log('\n---\n');

    // Example 4: Vocabulary Extraction
    console.log('4️⃣ Vocabulary Extraction Example:');
    const vocabulary = await claudeService.extractVocabulary(longText, 5);
    console.log('Key terms:', vocabulary);
    console.log('\n---\n');

    // Example 5: Streaming Response
    console.log('5️⃣ Streaming Response Example:');
    console.log('Streaming response: ');
    const streamMessages = [{
      role: 'user' as const,
      content: 'Write a haiku about real-time transcription.'
    }];
    
    for await (const chunk of claudeService.streamMessage(streamMessages)) {
      process.stdout.write(chunk);
    }
    console.log('\n\n---\n');

    // Example 6: Sentiment Analysis
    console.log('6️⃣ Sentiment Analysis Example:');
    const sentimentText = 'The UniVoice application works wonderfully! It makes lectures so much easier to follow.';
    const sentiment = await claudeService.analyzeSentiment(sentimentText);
    console.log('Text:', sentimentText);
    console.log('Sentiment Analysis:', sentiment);

    // Example 7: Multi-turn Conversation
    console.log('\n7️⃣ Multi-turn Conversation Example:');
    const conversation = [
      {
        role: 'user' as const,
        content: 'What is UniVoice?'
      },
      {
        role: 'assistant' as const,
        content: 'UniVoice is a real-time transcription and translation application designed for educational environments.'
      },
      {
        role: 'user' as const,
        content: 'What technologies does it use?'
      }
    ];
    
    const contextualResponse = await claudeService.sendMessage(
      conversation,
      'You are a helpful assistant answering questions about the UniVoice application.'
    );
    console.log('Contextual Response:', contextualResponse.content);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}