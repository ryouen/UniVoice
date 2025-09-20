# UniVoice Coding Conventions (2025-09-20)

## TypeScript Configuration
- **Strict mode**: Enabled with all strict checks
- **No implicit any**: true
- **Exact optional properties**: true
- **Module resolution**: bundler
- **Target**: ES2020

## Naming Conventions
- **Components**: PascalCase (e.g., UniVoice.tsx)
- **Hooks**: camelCase with 'use' prefix (e.g., useUnifiedPipeline.ts)
- **Type files**: kebab-case with .types.ts (e.g., advanced-features.types.ts)
- **CSS Modules**: kebab-case with .module.css

## Code Style Rules
1. **No any type**: Use proper types or unknown
2. **Result pattern for errors**: No throwing exceptions
   ```typescript
   type Result<T, E = Error> = 
     | { success: true; data: T }
     | { success: false; error: E };
   ```
3. **Discriminated unions**: For event types
4. **Zod validation**: All IPC communication
5. **No comments**: Unless explicitly requested

## Architecture Rules
1. **Dependency direction**: Always inward (UI → App → Domain)
2. **No direct infrastructure access from UI**: Use dependency injection
3. **Event-driven communication**: Via typed IPC events
4. **Single responsibility**: Components should be < 300 lines

## Import Organization
1. React/external libraries
2. Internal components
3. Hooks
4. Services/utilities
5. Types
6. Styles

## Performance Standards
- First paint ≤ 1000ms
- Translation complete ≤ 2000ms
- UI update frequency reduction ≥ 50%

## Git Commit Messages
- Concise 1-2 sentence summary
- Focus on "why" not "what"
- End with: 🤖 Generated with Claude Code