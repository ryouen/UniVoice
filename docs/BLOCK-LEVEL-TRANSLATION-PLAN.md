# Block-Level Translation Plan

## Background
- Current translation pipeline combines ASR segments incrementally and only sends aggregated history content at irregular intervals.
- Result: translations arrive in large bursts, making review difficult and delaying UI updates.
- Goal: translate at block/paragraph granularity so each narrative chunk is available promptly in the target language.

## Proposed Architecture Adjustments
1. **Segmentation Strategy**
   - Establish paragraph boundaries based on:
     - SentenceCombiner output (final ASR segments marked `isFinal`).
     - Time gaps exceeding threshold (e.g., 3 seconds) or speaker changes (if metadata available).
     - Explicit meta markers from future features (e.g., manual “section break”).
   - Extend `FlexibleHistoryGrouper` to emit structured `HistoryBlock` with metadata: block id, sentences, timestamps.

2. **Translation Queue Granularity**
   - Modify `TranslationQueueManager` to accept block-level jobs:
     - Introduce `QueuedTranslation` variant `kind: 'block'` containing ordered sentences and aggregate metadata.
     - Maintain sentence-level support for legacy components but prioritize blocks for UI/state persistence.
   - Once a block is closed, enqueue translation immediately; maintain concurrency limits (currently 3) but track block dependencies to avoid partial translations.

3. **Renderer Data Model**
   - Update `HistorySection` and export utilities (`renderHistoryToHTML`) to consume `HistoryBlock` records instead of flattening per sentence.
   - Provide block-aware selectors in `useSessionMemory` so memoization layers can differentiate between block and raw sentence translations.

4. **IPC & Persistence**
   - Adjust events emitted through `window.electron.send('history-block-created', block)` to include target translation once available.
   - Persist block-level objects in `DataPersistenceService` for consistent exports and session resume.

5. **UI Feedback**
   - Display translation progress per block (e.g., badge or inline status) using `TranslationQueueManager` events.
   - Ensure `ProgressiveSummarySection` treats blocks as atomic units when calculating thresholds.

## Implementation Phases
1. **Refactor Domain Layer**
   - Introduce `HistoryBlock` factory in `FlexibleHistoryGrouper`.
   - Update `TranslationQueueManager` interfaces and unit tests to handle block jobs.
2. **Renderer Synchronization**
   - Adapt `useUnifiedPipeline` to surface block-level translations and deprecate sentence-only arrays where possible.
   - Update `HistorySection` and export utilities to handle new structure.
3. **Persistence & Resume**
   - Update `SessionMemoryService` and persistence modules to store/replay blocks with translations.
4. **UI Enhancements**
   - Add visual indicators for block completion and ensure `FloatingPanel`/external windows render per-block translations.
5. **Cleanup**
   - Remove legacy code paths once block workflow is validated.

## Risks & Mitigations
- **Large refactor scope**: tackle in phases with unit/integration tests at each layer.
- **Backward compatibility**: maintain sentence-level arrays temporarily; provide adapters until UI fully migrated.
- **Performance**: monitor queue throughput; adjust block size heuristics to avoid overloading translation provider.

## Next Steps
- Prototype block emission in `FlexibleHistoryGrouper` with controlled test data.
- Draft interface changes for `TranslationQueueManager` and align renderer hooks.
- Schedule incremental PRs per phase above.
