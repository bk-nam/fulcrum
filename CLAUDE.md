# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fulcrum is a Personal Developer Platform (PDP) built with Electron for managing multiple side projects. It provides instant context switching, AI-integrated WBS management, and lifecycle tracking for makers who juggle many projects simultaneously.

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Electron Process Model

This is a standard Electron app with three main processes:

- **Main Process** (`src/main/main.ts`): Node.js backend handling file I/O, project scanning, and system commands
- **Renderer Process** (`src/renderer/`): React frontend running in the browser context
- **Preload Script** (`src/preload/preload.ts`): Secure bridge between main and renderer via `contextBridge`

### Data Flow Pattern

All communication between renderer and main happens via IPC handlers:

1. Renderer calls `window.electron.{method}()` (type-safe API defined in preload)
2. Preload forwards to main via `ipcRenderer.invoke()`
3. Main process handles request in `setupIpcHandlers()` (src/main/main.ts:304)
4. Returns promise-based response to renderer

### Project Detection Logic

Projects are identified by marker files (`src/main/main.ts:49`):
- Node.js: `package.json`
- Python: `requirements.txt`, `pyproject.toml`, or `venv/`
- Rust: `Cargo.toml`
- Fallback: `.git` directory

### WBS (Work Breakdown Structure) System

Core feature that enables AI collaboration:

- **Template**: Default YAML structure in `src/shared/constants.ts:5`
- **Parser**: Metadata extraction from `wbs.yaml` in `src/main/main.ts:83`
- **GUI Editor**: React components in `src/renderer/components/GuiEditor.tsx` and related phase/task components
- **AI Bridge**: "Copy Context for AI" feature generates a formatted prompt with project context

### State Management

- **Persistent Config**: Uses `electron-store` for root directory and settings
- **React State**: Local state in `App.tsx` for UI concerns (modals, toasts, project list)
- No Redux/Zustand - keep it simple for now

## Key Implementation Patterns

### File Watchers

The app does NOT use live file watching (chokidar is installed but not actively used). Projects are scanned on-demand when:
- App launches
- User clicks "Refresh"
- User changes workspace folder

### Project Launching

`launchProject()` in `src/main/main.ts:189`:
1. Spawns editor command (default: `antigravity`, configurable in Settings)
2. Opens native terminal for the platform (macOS: Terminal.app, Windows: cmd, Linux: gnome-terminal)
3. Both processes are detached and unmonitored

### Tech Stack Badge Extraction

The `parseWbsMetadata()` function (`src/main/main.ts:83`) handles three formats:
- Array: `["React", "Node"]`
- String: `"React, Node"`
- Object: `{ frontend: ["React"], backend: ["Node"] }`

Always returns a flat string array for consistency in the UI.

## Component Structure

```
src/renderer/
├── App.tsx                    # Main app shell, state orchestration
├── components/
│   ├── Layout.tsx            # Header/footer (currently minimal)
│   ├── ProjectCard.tsx       # Grid item showing project summary
│   ├── ProjectDetailModal.tsx # Full-screen modal for WBS editing
│   ├── GuiEditor.tsx         # Visual WBS editor (phases/tasks UI)
│   ├── PhaseSection.tsx      # Accordion section for a phase
│   ├── TaskItem.tsx          # Individual task card
│   └── SettingsModal.tsx     # Editor/terminal command configuration
```

## Common Development Patterns

### Adding New IPC Handlers

1. Define the handler in `src/main/main.ts` inside `setupIpcHandlers()`
2. Expose it in `src/preload/preload.ts` via `contextBridge`
3. Add TypeScript type to `ElectronAPI` interface in preload
4. Call from renderer using `window.electron.{method}()`

### Extending Project Metadata

To add new fields to `wbs.yaml`:
1. Update `WBS_TEMPLATE` in `src/shared/constants.ts`
2. Modify `parseWbsMetadata()` parser in main process
3. Update `Project['meta']` type in `src/shared/types.ts`
4. Reflect changes in UI components (ProjectCard, ProjectDetailModal)

### Styling with Tailwind

- Uses Tailwind CSS for all styling (no CSS modules/styled-components)
- shadcn/ui component patterns are followed (see `tailwind.config.js`)
- Color palette: Gray for structure, Blue for primary actions, Green/Red for success/error

## Project Context Files

- **wbs.yaml**: Lives in each project's root directory (not in Fulcrum repo itself)
- **electron-store config**: `~/Library/Application Support/fulcrum-config/` (macOS)
- **Build output**: `dist-electron/` for main/preload, `dist/` for renderer

## Zombie Project Detection

A project is marked "zombie" if `lastModified` (directory mtime) is older than 30 days. See `parseWbsMetadata()` at line 134.

## Current Roadmap Context

As of 2025-11-20:
- **Phase 1-3**: Complete (Scanner, Launcher, WBS Editor)
- **Phase 4**: Metadata parsing and badges implemented
- **Phase 5**: Search/filter system is next priority (see wbs.yaml:LIFE-002)
- **Phase 6+**: Scaffolding, context micro-logs, and monitoring features planned

When implementing new features, check the project's own `wbs.yaml` for detailed specs.
