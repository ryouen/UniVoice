# Task Completion Checklist for UniVoice (2025-09-20)

## When Completing Any Task

### 1. Code Changes
- [ ] Run type checking: `npm run typecheck`
- [ ] Verify no TypeScript errors
- [ ] Check for any console errors in browser/Electron

### 2. Testing
- [ ] Test the specific feature manually
- [ ] Run related unit tests if they exist
- [ ] Check that existing functionality still works

### 3. Clean Architecture Compliance
- [ ] No direct infrastructure access from UI components
- [ ] Dependencies flow inward only (UI → App → Domain)
- [ ] New code follows single responsibility principle
- [ ] File size < 300 lines (refactor if larger)

### 4. Code Quality
- [ ] No `any` types used
- [ ] Proper error handling with Result pattern
- [ ] IPC events have Zod validation
- [ ] Imports organized correctly

### 5. Performance Check
- [ ] First paint still ≤ 1000ms
- [ ] No unnecessary re-renders
- [ ] Console has no performance warnings

### 6. Documentation
- [ ] Update relevant documentation if needed
- [ ] Add inline comments ONLY if explicitly requested
- [ ] Update memory files if significant changes

### 7. Git Commit
- [ ] Stage only necessary files
- [ ] Write clear commit message focusing on "why"
- [ ] Include Claude Code attribution

## Special Considerations

### For UI Changes
- [ ] Test with all 3 themes (light/dark/terminal)
- [ ] Verify responsive behavior
- [ ] Check window resize behavior

### For IPC Changes
- [ ] Run `npm run sync-contracts`
- [ ] Update both electron and src contract files
- [ ] Test both directions of communication

### For Service Changes
- [ ] Verify error handling
- [ ] Check memory leaks (long-running operations)
- [ ] Test with API failures/timeouts