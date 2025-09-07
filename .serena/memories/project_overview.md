# UniVoice Project Overview

## Project Purpose
UniVoice is a real-time translation tool designed for university students attending lectures in foreign languages. It helps students overcome language barriers and focus on learning content rather than struggling with language comprehension.

**Concept**: "Contribute to class with your abilities, not your language skills!"

## Key Features
1. **Real-time Speech Recognition (ASR)** - Using Deepgram WebSocket API
2. **Real-time Translation** - Streaming translations with GPT-5 models
3. **Periodic Summaries** - 10-minute interval summaries
4. **Vocabulary Extraction** - Key terms from lectures
5. **Final Report Generation** - Comprehensive lecture report
6. **180-minute Support** - Designed for long university lectures

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Electron (for desktop app)
- **Speech Recognition**: Deepgram WebSocket API
- **Translation/AI**: OpenAI GPT-5 series (nano/mini/full)
- **UI Framework**: Tailwind CSS
- **Build Tools**: Vite, TypeScript, ESBuild
- **Testing**: Jest
- **Package Manager**: npm (not yarn)

## Architecture
- 8-block UI design (①-⑧)
- Event-driven architecture
- Streaming pipeline for low latency
- Clean separation between Electron main/renderer processes

## Current Status (2025-08-17)
- Core pipeline working (ASR + Translation)
- UI integration in progress (mock data removal phase)
- Targeting < 1000ms first paint for translations
- Branch: test20/run-1