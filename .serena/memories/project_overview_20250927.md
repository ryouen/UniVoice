# UniVoice Project Overview (2025-09-27)

## Project Purpose
UniVoice 2.0 is a real-time speech translation system built with Clean Architecture principles. It captures audio from the user's microphone, transcribes it using Deepgram, and translates it using OpenAI GPT-5 models.

## Tech Stack
- **Frontend**: React 18.3.1, TypeScript 5.6.3
- **Backend**: Electron 33.2.0 
- **AI Services**: 
  - Deepgram SDK 4.11.2 (ASR - Nova-3 model)
  - OpenAI API 5.12.1 (Translation - GPT-5 models)
- **Architecture**: Clean Architecture + CQRS + Event-Driven
- **State Management**: React Hooks, Custom Managers
- **IPC**: Type-safe with Zod validation
- **Build Tools**: Vite 5.4.11
- **Testing**: Jest 30.0.5, Playwright

## Key Components
1. **UnifiedPipelineService** (Backend): Main service orchestrating ASR and translation
2. **useUnifiedPipeline** (Frontend): Hook managing UI state and pipeline events
3. **UniVoice.tsx** (Frontend): Main UI component (currently ~1900 lines, needs splitting)
4. **Multiple Managers**: SentenceCombiner, TranslationQueueManager, StreamCoalescer, etc.

## Codebase Structure
```
UniVoice/
├── electron/           # Backend (Electron main process)
│   ├── main.ts         # Entry point
│   └── services/       
│       ├── domain/     # Business logic
│       ├── ipc/        # IPC contracts (Zod)
│       └── adapters/   # External service adapters
├── src/                # Frontend (React)
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utilities
│   └── services/       # Frontend services
└── tests/              # Test files
```

## Language Support
Supports 36 languages via LanguageConfig.ts, including multi-language mode for code-switching scenarios.