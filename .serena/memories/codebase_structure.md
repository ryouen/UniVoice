# UniVoice Codebase Structure

## Project Root Structure
```
realtime_transtrator/
├── UniVoice/              # NEW: Clean Architecture implementation
├── electron/              # Electron main process
├── src/                   # React frontend
├── tests/                 # Test files
├── docs/                  # Documentation
├── archive/               # Old/archived code
├── backup/                # Backup files (reference only)
├── sample_voice/          # Test audio files
└── test-results/          # Test execution results
```

## Key Directories

### /UniVoice (Subproject - Clean Architecture)
```
UniVoice/
├── electron/
│   ├── services/
│   │   ├── domain/        # Domain services
│   │   ├── ipc/           # IPC contracts
│   │   └── monitoring/    # Logging/metrics
│   └── utils/
├── src/
│   ├── components/
│   ├── hooks/
│   └── utils/
└── tests/
```

### /electron (Main Project)
```
electron/
├── main.ts                # Electron main entry
├── preload.ts            # Preload script
├── services/
│   └── UnifiedPipelineService.ts  # Core pipeline
└── tsconfig.json
```

### /src (Frontend)
```
src/
├── App.tsx               # Main app component
├── components/
│   ├── UniVoicePerfect.tsx        # 8-block UI
│   └── UniVoicePerfectIntegration.tsx
├── hooks/
│   └── useUnifiedPipeline.ts      # Pipeline hook
├── types/                # TypeScript types
└── utils/                # Utilities
```

### /tests
```
tests/
├── core/                 # Core functionality tests
│   ├── test-20min-production-detailed.js
│   ├── test-3min-complete.js
│   └── test-metrics.js
├── integration/          # Integration tests
├── unit/                # Unit tests
└── helpers/             # Test utilities
```

### /docs
```
docs/
├── ACTIVE/              # Current working docs
│   ├── STATE.json       # Project state
│   ├── TASKS.json       # Task tracking
│   └── SESSION-HANDOVER.md
├── archive/             # Old documentation
└── technical-research/  # Research notes
```

## Important Files

### Configuration
- `.env` - API keys and environment config
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript config
- `vite.config.ts` - Vite bundler config

### Core Implementation
- `electron/services/UnifiedPipelineService.ts` - Main pipeline
- `src/hooks/useUnifiedPipeline.ts` - React integration
- `src/components/UniVoicePerfect.tsx` - UI component

### Test Files
- `tests/core/test-20min-production-detailed.js` - Full test
- `tests/core/test-3min-complete.js` - Quick test
- `sample_voice/Hayes.wav` - Test audio file

## File Naming Patterns
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Services: `ServiceName.ts`
- Tests: `test-kebab-case.js` or `Component.test.ts`
- Types: `types.d.ts` or `interface.ts`

## Build Output
- `dist/` - Vite build output
- `dist-electron/` - Electron build output
- `release/` - Final packaged app

## Ignore Patterns
- `node_modules/` - Dependencies
- `*.log` - Log files
- `.vite/` - Vite cache
- `nul` - Windows null device (artifact)