# UniVoice Development Commands (2025-09-20)

## Environment Setup
```bash
# Copy environment template
cp .env.example .env
# Edit .env and add API keys (OPENAI_API_KEY, DEEPGRAM_API_KEY)
```

## Development
```bash
# Start development server (Vite)
npm run dev

# Start Electron app (in separate terminal)
npm run electron

# Start both concurrently
npm start
```

## Building
```bash
# Type checking
npm run typecheck

# Clean build
npm run clean && npm run build

# Build for production
npm run build

# Package Electron app
npm run package
```

## Testing
```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Performance tests
npm run test:performance

# E2E tests with UI
npm run test:e2e:ui
```

## Code Quality
```bash
# Sync IPC contracts (automatic on build)
npm run sync-contracts

# Type check without emitting
npm run typecheck
```

## Debugging
```bash
# View logs (Windows)
Get-Content logs\univoice-$(Get-Date -Format yyyy-MM-dd).jsonl -Tail 100 -Wait

# Check for errors in logs
Select-String '"level":"error"' logs\univoice-*.jsonl

# Open app with debug mode
# Add ?debug=true to URL
```

## Git Commands (Windows)
```bash
# Status
git status

# Stage changes
git add .

# Commit (use Git Bash for heredoc)
git commit -m "feat: your message

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Current branch
git branch --show-current
```

## Window Management
```bash
# Delete window bounds (fixes 374px issue)
del %APPDATA%\univoice\window-bounds.json

# Clear all app data
rmdir /s /q %APPDATA%\univoice
```

## System Utils (Windows)
```bash
# List directory
dir
ls  # PowerShell alias

# Find files
dir /s *.ts

# Search in files (PowerShell)
Select-String "pattern" *.ts

# Current directory
cd
pwd  # PowerShell alias
```