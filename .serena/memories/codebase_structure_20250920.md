# UniVoice Codebase Structure (2025-09-20)

## Directory Layout

```
UniVoice/
├── electron/                      # Backend (Infrastructure + Application layers)
│   ├── main.ts                   # Entry point, window creation
│   ├── preload.ts               # Preload script for IPC
│   ├── main/                    # Window management
│   │   ├── WindowRegistry.ts    # Multi-window management
│   │   └── BoundsStore.ts       # Window bounds persistence
│   └── services/                # Core services
│       ├── ipc/                 # IPC layer
│       │   ├── contracts.ts     # Zod schemas for events
│       │   └── gateway.ts       # IPC handler registration
│       ├── domain/              # Business logic
│       │   ├── UnifiedPipelineService.ts    # Main orchestrator
│       │   ├── AdvancedFeatureService.ts    # Summary/vocab/report
│       │   ├── StreamCoalescer.ts           # UI optimization
│       │   ├── SentenceCombiner.ts          # Sentence grouping
│       │   ├── TranslationQueueManager.ts   # Priority queues
│       │   └── SegmentManager.ts            # Segment deduplication
│       └── adapters/            # External integrations
│           ├── DeepgramAdapter.ts
│           └── OpenAIAdapter.ts
│
├── src/                         # Frontend (Presentation layer)
│   ├── App.tsx                 # Router setup
│   ├── components/             
│   │   ├── UniVoice.tsx        # Main component (2890 lines - needs refactoring)
│   │   ├── HistoryView.tsx     # History window
│   │   └── SummaryView.tsx     # Summary window
│   ├── hooks/                  # Custom React hooks
│   │   ├── useUnifiedPipeline.ts
│   │   ├── useSessionManagement.ts
│   │   └── useWindowResize.ts
│   ├── services/               # Frontend services
│   │   ├── WindowClient.ts     # Window API client
│   │   └── SessionStorageService.ts  # (unused - needs integration)
│   ├── types/                  # TypeScript definitions
│   └── constants/              # Layout and theme constants
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # Clean Architecture guide
│   ├── API-CONTRACTS.md        # IPC contract specs
│   └── ACTIVE/                 # Current work state
│
└── tests/                      # Test suites
    ├── unit/
    ├── integration/
    └── e2e/
```

## Key Files
- **CLAUDE.md**: Project rules and guidelines
- **CRITICAL-FACTS-FOR-NEW-SESSION.md**: Important facts for new sessions
- **START-HERE.md**: Current state and priorities
- **package.json**: Dependencies and scripts
- **tsconfig.json**: TypeScript configuration