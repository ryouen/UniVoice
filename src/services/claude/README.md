# Claude SDK Integration for UniVoice

This module provides integration with Claude AI using the Anthropic SDK, offering enhanced AI capabilities for the UniVoice application.

## Installation

The Anthropic SDK has been installed:
```bash
npm install @anthropic-ai/sdk
```

## Configuration

Add your Claude API key to your `.env` file:
```env
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# or
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Basic Usage

### 1. Simple Service Usage

```typescript
import { ClaudeService } from './src/services/claude';

const claude = new ClaudeService({
  apiKey: process.env.CLAUDE_API_KEY,
  model: 'claude-3-sonnet-20240229',
  maxTokens: 1024,
  temperature: 0.7
});

// Simple message
const response = await claude.sendMessage([
  { role: 'user', content: 'Hello, Claude!' }
]);
console.log(response.content);

// Translation
const translated = await claude.translate(
  'Hello, world!',
  'English',
  'Japanese'
);

// Summary
const summary = await claude.generateSummary(longText, 100);

// Vocabulary extraction
const terms = await claude.extractVocabulary(text, 10);
```

### 2. Streaming Responses

```typescript
// Stream responses for real-time applications
for await (const chunk of claude.streamMessage(messages)) {
  process.stdout.write(chunk);
}
```

### 3. Integration with UniVoice Pipeline

```typescript
import { ClaudeIntegration } from './src/services/claude/ClaudeIntegration';

const integration = new ClaudeIntegration({
  apiKey: process.env.CLAUDE_API_KEY,
  enableFallback: true
});

// Enhanced translation with fallback
const result = await integration.enhancedTranslate(
  text,
  'en',
  'ja',
  true // Use Claude as primary
);

// Contextual summary
const summary = await integration.generateContextualSummary(
  segments,
  'lecture on computer science'
);

// Translation quality assessment
const quality = await integration.assessTranslationQuality(
  original,
  translation,
  'en',
  'ja'
);
```

## Available Models

- `claude-3-opus-20240229` - Most powerful model
- `claude-3-sonnet-20240229` - Balanced performance (recommended)
- `claude-3-haiku-20240307` - Fastest, most cost-effective

## Features

### Core Features
- ✅ Message generation
- ✅ Translation
- ✅ Summarization
- ✅ Vocabulary extraction
- ✅ Sentiment analysis
- ✅ Streaming responses

### Integration Features
- ✅ Enhanced translation with fallback
- ✅ Contextual summary generation
- ✅ Translation quality assessment
- ✅ Real-time streaming translation
- ✅ Conversation context management

## Examples

Run the example to see all features in action:
```bash
npx ts-node examples/claude-sdk-example.ts
```

## Error Handling

The service includes comprehensive error handling and logging:

```typescript
try {
  const response = await claude.sendMessage(messages);
} catch (error) {
  if (error.status === 429) {
    console.log('Rate limited, please retry later');
  } else if (error.status === 401) {
    console.log('Invalid API key');
  } else {
    console.log('Unexpected error:', error);
  }
}
```

## Performance Considerations

1. **Token Limits**: Claude has different token limits per model
   - Opus: 200k context window
   - Sonnet: 200k context window
   - Haiku: 200k context window

2. **Rate Limits**: Be aware of API rate limits
   - Implement exponential backoff for retries
   - Consider caching responses when appropriate

3. **Streaming**: Use streaming for real-time applications to improve perceived latency

## Integration Points with UniVoice

1. **Translation Enhancement**: Use Claude as a fallback or alternative to GPT-5 models
2. **Summary Generation**: Leverage Claude's superior context understanding
3. **Quality Assurance**: Use Claude to assess translation quality
4. **Vocabulary Extraction**: More nuanced term extraction

## Future Enhancements

- [ ] Implement caching layer for repeated requests
- [ ] Add retry logic with exponential backoff
- [ ] Create unified interface for switching between Claude and GPT
- [ ] Add support for vision capabilities (image analysis)
- [ ] Implement cost tracking and optimization

## Troubleshooting

### API Key Issues
Ensure your API key is properly set in the `.env` file and starts with `sk-ant-`.

### Rate Limiting
If you encounter rate limits, implement delays between requests or upgrade your API plan.

### Token Limits
For large documents, consider chunking the input and processing in segments.

## Support

For issues or questions about the Claude SDK integration:
1. Check the [Anthropic documentation](https://docs.anthropic.com/)
2. Review the example code in `examples/claude-sdk-example.ts`
3. Check logs for detailed error information