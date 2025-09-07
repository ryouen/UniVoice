# Code Style and Conventions

## TypeScript Configuration
- **Strict Mode**: Enabled (`"strict": true`)
- **No Implicit Any**: Enforced
- **Exact Optional Properties**: Enabled
- **Module**: ESNext
- **Target**: ES2022

## Naming Conventions

### Files
- **Components**: PascalCase (e.g., `UniVoicePerfect.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useUnifiedPipeline.ts`)
- **Services**: PascalCase with 'Service' suffix (e.g., `UnifiedPipelineService.ts`)
- **Types**: PascalCase for interfaces/types (e.g., `TranscriptSegment`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_TOKENS`)

### Variables and Functions
- **Variables**: camelCase (e.g., `currentTranslation`)
- **Functions**: camelCase (e.g., `handleTranslation`)
- **Private methods**: camelCase with underscore prefix (e.g., `_processSegment`)
- **Event handlers**: 'handle' prefix (e.g., `handleStartSession`)

## Code Organization

### Import Order
1. React imports
2. Third-party libraries
3. Electron/Node imports
4. Local components
5. Local hooks
6. Local utilities
7. Types
8. Styles

### Component Structure
```typescript
// 1. Imports
// 2. Type definitions
// 3. Constants
// 4. Component definition
// 5. Hooks
// 6. Event handlers
// 7. Helper functions
// 8. Render methods
// 9. Export
```

## Documentation

### Comments
- Use JSDoc for functions and classes
- Inline comments for complex logic
- TODO comments with author and date
- Japanese comments allowed for domain-specific terms

### File Headers
```typescript
/**
 * ComponentName - Brief description
 * 
 * Responsibilities:
 * - Point 1
 * - Point 2
 * 
 * Key Changes from Original:
 * - Change 1
 * - Change 2
 */
```

## React Best Practices
- Functional components only (no class components)
- Use hooks for state management
- Avoid inline styles (use Tailwind CSS)
- Memoize expensive computations
- Handle loading and error states

## Electron Conventions
- Clear separation between main/renderer processes
- Type-safe IPC communication
- No Node.js APIs in renderer process
- Use contextBridge for secure communication

## Error Handling
- Never use `any` type without strong justification
- Always handle Promise rejections
- Use try-catch for async operations
- Log errors with context

## Testing
- Test files alongside source files
- Use `.test.ts` or `.test.tsx` suffix
- Mock external dependencies
- Test both success and failure cases

## Performance Guidelines
- Debounce UI updates (160ms default)
- Use streaming for real-time data
- Implement proper cleanup in useEffect
- Avoid unnecessary re-renders

## Git Commit Messages
- Use conventional commits format
- feat: new feature
- fix: bug fix
- docs: documentation
- test: testing
- refactor: code refactoring
- chore: maintenance

## Important Rules
1. **No console.log in production** - Use logger utility
2. **No hardcoded values** - Use environment variables
3. **No direct DOM manipulation** - Use React
4. **No synchronous file operations** - Use async
5. **Type everything** - Avoid `any` type