Project: Snake Escape — Copilot instructions

Overview
- This is a client-side single-page puzzle game served statically (no build step).
- Key files: `index.html` mounts the app and loads scripts; main logic lives in `js/`.

Big-picture architecture
- Single-page browser app using plain global JS (no ES modules). Scripts are loaded in HTML and rely on shared globals.
- Game state & rendering: `js/game.js` coordinates levels, game loop, and uses classes from `js/logic.js`.
- Game logic & generation: `js/logic.js` contains globals (e.g. `currentGridW`, `cellSize`), classes (`Snake`, `Particle`) and `generateSolvableLevel()` used by both the main thread and worker.
- Worker-based level generation: `js/levelWorker.js` uses `importScripts('logic.js')` to reuse generation code, then serializes plain objects; the main thread rehydrates them via `new Snake(...)` (see `game.js:initLevel`).
- UI & input: `js/ui.js` handles canvas sizing (`resize()`), input handling (`handleInput()`), and overlays (`showEndScreen()`).
- Economy/persistence: `js/economy.js` exposes a global `Economy` object with storage keys and methods (unlock/select boards/skins). Use these methods instead of touching localStorage directly.
- Integration points: `audioManager`, `Ads`, and `levelWorker` are globals expected across files (defined in `js/audio.js`, `js/ads.js` or similar). Avoid renaming these globals without updating all references.

Important conventions & patterns
- Globals-first design: many modules rely on shared global variables (e.g. `snakes`, `obstacles`, `particles`, `renderOffsetX/Y`). When changing a variable name or moving code into modules, update all files that reference it (including `levelWorker.js`).
- Worker serialization: Worker sends plain JSON for snakes/obstacles; main thread expects `snakes` to be rehydrated into `Snake` instances. Keep serialization stable: send `{id, cells, dirIndex, color}`.
- UI sizing: `cellSize` and `snakeWidth` are computed in `js/ui.js:resize()` and used by `js/logic.js`/`js/game.js` for rendering. Do layout changes here first.
- Skin/board selection: `Economy.getSelectedBoard()` and `Economy.getSelectedSkin()` drive rendering choices. Board themes are defined in `js/game.js` (`BOARD_CONFIGS`).
- No automated tests or build: editing files requires a simple static HTTP server to run the worker. Prefer `Live Server` or `python -m http.server` when testing locally.

Debugging & developer workflow
- Run locally via an HTTP server to avoid worker CORS/file:// restrictions. Example commands:

```powershell
# From repo root
# Start a simple HTTP server for testing
python -m http.server 8000
```
- Open browser DevTools, set breakpoints in `js/logic.js` and `js/game.js` for level generation and frame loop (`drawLoop`).
- When changing `Snake` structure, ensure the worker serialization and `initLevel` rehydration remain compatible.

Quick editing notes (concrete examples)
- To modify level generation: edit `js/logic.js` (look for `generateSolvableLevel` and difficulty profiler) and `js/levelWorker.js` (serialization). Keep the returned shape `{snakes, obstacles, config}`.
- To change rendering/layout: edit `js/ui.js` `resize()` and `js/game.js` `drawLoop()`; `cellSize` drives most visuals.
- To add a new board/skin: add theme entries to `js/game.js:BOARD_CONFIGS` and use `Economy.unlockBoard('yourBoard', price)` to unlock during testing.
- To change persistence keys or migration: update `js/economy.js` `KEYS` and add migration logic in `Economy.init()`.

What to avoid
- Converting to ES modules or bundlers without a coordinated pass — the codebase relies on global script load order and `importScripts` for workers.
- Modifying worker communication shape without updating `game.js:initLevel` rehydration.

Where to look first
- Boot & layout: `index.html`, `js/ui.js` (`resize`, `handleInput`, `showEndScreen`)
- Core rules & generation: `js/logic.js` (`Snake`, `Particle`, `generateSolvableLevel`, `getDifficultyProfile`)
- Game coordination: `js/game.js` (`initLevel`, `drawLoop`, `preloadLevels`, `levelBuffer`)
- Persistence/economy: `js/economy.js`
- Worker integration: `js/levelWorker.js`

If anything is unclear or you'd like stricter rules (naming, refactor strategy, or a migration plan to modules), tell me which area and I will update this file.
