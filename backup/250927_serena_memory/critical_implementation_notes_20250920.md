# Critical Implementation Notes for UniVoice (2025-09-20)

## API Patterns (DO NOT CHANGE)
- **OpenAI Responses API**: Uses `responses.create` (NOT chat.completions)
- **Parameter**: `input` (NOT messages)
- **Models**: GPT-5 series (gpt-5, gpt-5-mini, gpt-5-nano) are REAL
- **Temperature**: 1.0 fixed for GPT-5 (cannot be changed)
- **Max tokens param**: `max_output_tokens` (NOT max_completion_tokens)

## IPC Channel Names (IMMUTABLE)
These channel names must NEVER be changed:
- `streaming:start`
- `streaming:stop`
- `streaming:data`
- `transcription:update`
- `translation:update`
- `summary:update`
- `vocabulary:update`
- `report:generate`

## Window Management
- **Setup window issue**: 374px height saved in BoundsStore
- **Solution**: WindowRegistry ignores saved bounds for setup window
- **Main window**: Transparent background, frameless
- **Resize**: Only from bottom edge (custom implementation)

## Known Issues & Solutions

### 1. SentenceCombiner
- **Status**: Already integrated and working (UnifiedPipelineService.ts:203)
- **Config**: minSegments: 1 (to include short sentences)
- **Output**: combinedSentence events properly handled

### 2. SessionStorageService
- **Status**: Implemented but UNUSED (no imports anywhere)
- **Impact**: Settings lost on restart
- **TODO**: Integrate with SetupSection

### 3. Large Component (UniVoice.tsx)
- **Size**: 2890 lines (needs splitting)
- **Refactoring**: Started 2025-09-19
- **Completed**: Type definitions, constants, utils extracted
- **TODO**: Component splitting, directory restructure

### 4. Progressive Summary UI
- **Backend**: Working correctly
- **Frontend**: Not displaying due to binding issues
- **Location**: ProgressiveSummarySection component

## Performance Gotchas
- **StreamCoalescer**: 160ms debounce, 1100ms force commit
- **UI Updates**: Must be reduced by 50%+ 
- **ResizeObserver**: Disabled due to infinite loop with autoResize

## Testing Important Files
- UnifiedPipelineService.ts: Main orchestrator
- AdvancedFeatureService.ts: Summary/vocab logic
- UniVoice.tsx: UI integration point
- contracts.ts: IPC type definitions