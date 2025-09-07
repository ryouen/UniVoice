# Critical Implementation Notes

## Current State (2025-08-17)
The project is at a critical junction where the UniVoice subproject (Clean Architecture) is being integrated back into the main project. There are two parallel implementations that need to be reconciled.

## Key Technical Decisions

### 1. API Choice: Responses API (NOT chat.completions)
- **Critical**: OpenAI's Responses API is the primary API (as of 2025)
- Use `openai.responses.stream()` for GPT-5 models
- Stream handling: `response.output_text.delta` events
- Never use deprecated `chat.completions` API

### 2. Model Selection (Fixed)
- Translation: `gpt-5-nano` (speed priority)
- Summary: `gpt-5-mini` (balanced)
- Report: `gpt-5` with `reasoning.effort: "high"`
- Vocabulary: `gpt-5-mini`

### 3. Performance Targets
- **First Paint**: < 1000ms (critical KPI)
- Achieved through streaming and debouncing
- StreamCoalescer: 160ms debounce, 1100ms force commit

### 4. Architecture Patterns
- Event-driven communication
- Type-safe IPC with Zod validation
- Clean separation of concerns
- No direct UI updates from services

## Common Pitfalls to Avoid

### 1. Mock Data Problem
- UniVoicePerfect.tsx has 18 hardcoded mock data points
- These prevent real-time data from displaying
- Must be systematically removed and replaced

### 2. Duplicate Implementations
- Two parallel codebases (main and UniVoice/)
- Risk of confusion and conflicts
- Follow START-HERE.md for which to use

### 3. IPC Channel Issues
- Duplicate handler registration causes crashes
- Always check for existing handlers before registering
- Use consistent channel names

### 4. TypeScript Strictness
- `exactOptionalPropertyTypes` causes issues
- Error constructor 'cause' property not supported
- Use type assertions sparingly and document why

## Working Files (Priority Order)

### Must Read First
1. `START-HERE.md` - Current situation
2. `docs/ACTIVE/SESSION-HANDOVER.md` - Detailed status
3. `docs/ACTIVE/IMPLEMENTATION-GUIDE.md` - Step-by-step guide

### Core Implementation
1. `electron/services/UnifiedPipelineService.ts` - Reference implementation
2. `tests/core/test-20min-production-detailed.js` - Working example
3. `src/components/UniVoicePerfect.tsx` - UI (needs mock removal)

### Ignore These
- Everything in `/archive`
- Old docs in `/docs` (except `/docs/ACTIVE`)
- Backup files (reference only, no copy-paste)

## Integration Status

### Completed ✅
- Core pipeline (ASR + Translation)
- Streaming implementation
- Basic Electron setup
- Summary feature (10-min intervals)

### In Progress 🚧
- Mock data removal from UI
- Real-time data binding
- History grouping (3 sentences)
- Error handling improvements

### Not Started ❌
- Final report generation UI
- Vocabulary extraction UI
- Export functionality
- Memo feature completion

## Debug Commands
```bash
# Quick health check
node tests/core/test-3min-complete.js

# Check TypeScript
npm run typecheck

# View real-time logs
npm run electron
# Then open DevTools (F12) for console
```

## Environment Requirements
- Node.js 18+ (critical for ES2022 features)
- Windows OS (primary development)
- Git branch: test20/run-1
- Valid API keys in .env file

## Session Handover Protocol
Always update before ending session:
1. `docs/ACTIVE/SESSION-HANDOVER.md` - What you did
2. `docs/ACTIVE/STATE.json` - Update next_actions
3. Commit changes (but don't push)
4. Leave clear notes about any blocking issues