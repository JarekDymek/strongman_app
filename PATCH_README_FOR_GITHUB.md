PATCH NOTES and PR INSTRUCTIONS — Strongman App (patch v1.3)
==========================================================

This patch prepares the app for more robust offline/mobile operation and provides
utilities to inspect storage and perform safe pruning. Designed to keep the user-visible
logic unchanged while improving resource behavior on iPad/Android devices.

Files changed (summary):
- js/stopwatch.js    (v1.1) : switch to requestAnimationFrame, throttle UI, cleanup handlers, limit lapTimes
- sw.js              (v1.1) : runtime cache with size limit
- js/database.js     (v1.1) : added pruneStoreIfNeeded utility
- js/main.js         (v1.1) : pagehide handler, auto-prune at startup
- js/persistence.js  (v1.2) : added saveNow with fallback to localStorage; now uses database.saveCurrentState where available
- js/diagnostics.js  (v1.2) : new lightweight diagnostics overlay
- index.html         (v1.2) : diagnostics script included
- PATCH_README_FOR_GITHUB.md (this file)

Quick test checklist (manual)
-----------------------------
1. Install/unpack on device or run via simple static server (e.g. `npx http-server` or `python -m http.server`).
2. Load app in browser on iPad/Android. Open console or use diagnostics overlay (menu) to check DB counts and cache sizes.
3. Start stopwatch and verify UI responsiveness; ensure exit/stop cleans resources.
4. Create many checkpoints/events and verify that `pruneStoreIfNeeded` prunes to limits on startup (check diagnostics or use IndexedDB inspector).
5. Test offline: load app, then switch device to airplane mode and verify cached resources and offline flow.
6. Test page hide: switch app to background or close tab and ensure `persistence.saveNow()` is called (check IndexedDB 'appState' for id 'lastState').

How to create a PR (suggested commit messages)
-----------------------------------------------
- Commit logically: small commits per file change.
- Suggested branch name: `fix/offline-memory-and-diagnostics-v1.3`
- Suggested commit messages:
  - "feat: requestAnimationFrame stopwatch + throttle (reduce CPU on mobile)"
  - "fix: add runtime cache with size limiting in service worker"
  - "feat: add pruneStoreIfNeeded() utility to database module"
  - "feat: add persistence.saveNow() using saveCurrentState fallback"
  - "feat: diagnostics overlay for storage and cache inspection"
  - "chore: include diagnostics script in index.html"

Rollback / backups
------------------
Backups of modified files are saved in the same directories with suffixes: .bak, .bak2, .bak3
E.g. js/persistence.js.bak3

Generated artifacts
-------------------
- /strongman_app_patched_v1.3.zip  (this ZIP contains the patched source)