# SAFE RESTORE PROCEDURE (2025-09-29 Baseline)

## Purpose
- Provide a repeatable checklist to recover the 29 Sep 2025 stable build (`7b5802e`).
- Minimise accidental regressions when branches diverge or local backups overwrite `main`.

## Prerequisites
- Git 2.40+ installed and configured.
- Remote `origin` accessible.
- Working tree **clean** (stash or commit local edits first).

## Checklist
1. **Snapshot current state**
   ```bash
   git status
   git branch backup/<date>-pre-restore
   git stash push -m "pre-restore-snapshot"
   ```
2. **Restore stable tree**
   ```bash
   git fetch origin
   git checkout main
   git reset --hard 7b5802edadd913f60c9a2eb130068057f9b789ee
   ```
3. **Verify assets**
   - `src/components/UniVoice.tsx` shows history window sync logic.
   - `src/windows/HistoryWindow.tsx` exists.
   - `docs/IDEAL-TRANSCRIPT-ARCHITECTURE.md` present.
4. **Reorganise misplaced files** (if needed)
   - Move docs to `docs/`.
   - Move logs to `logs/`.
5. **Commit & Push**
   ```bash
   git commit -am "chore: restore 2025-09-29 state"
   git push --force-with-lease origin main
   ```
6. **Clean backups**
   ```bash
   git branch -d backup/<date>-pre-restore
   git stash drop
   ```

## Notes
- Never merge local archives back into `main` without review.
- Keep `docs/operations/SAFE-RESTORE-*.md` updated when baseline changes.
- Use `git tag 2025-09-29-stable 7b5802e` (once) for easy reference.
