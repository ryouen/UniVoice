# UniVoice 2.0 Project Overview (2025-09-20)

## Project Purpose
UniVoice 2.0 is a real-time speech recognition, translation, and summarization system designed for educational settings. It provides:
- Real-time transcription in 10 languages using Deepgram Nova-3
- Two-stage translation system (real-time with GPT-5-nano, high-quality with GPT-5-mini)
- Progressive summarization (400/800/1600/2400 words)
- Vocabulary extraction (5-10 technical terms)
- Final report generation in Markdown

## Tech Stack
- **Frontend**: React 18.3 + TypeScript 5.6 + Vite 5.4
- **Backend**: Electron 33.2 with Node.js
- **UI Framework**: CSS Modules + Custom theming system
- **State Management**: React hooks + Event-driven architecture
- **APIs**: OpenAI (GPT-5 series), Deepgram (Nova-3)
- **Type Safety**: Zod for IPC validation
- **Testing**: Jest + Playwright

## Architecture
- **Clean Architecture**: Strict layer separation (Domain → Application → Infrastructure → Presentation)
- **CQRS**: Command/Query separation
- **Event-Driven**: IPC communication via typed events
- **Hexagonal Architecture**: Ports and adapters for external dependencies

## Current Implementation Status
- ✅ Real-time features: 100% complete
- 🟨 Advanced features: 70% complete (backend done, UI integration issues)
- 🔴 Data persistence: 10% complete (SessionMemoryService integrated, SessionStorageService unused)