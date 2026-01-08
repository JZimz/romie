# ROMie Development Guide

> This project uses AI-assisted development. This document serves as an architectural reference for both contributors and AI coding assistants.

## Project Overview

ROMie is a ROM Manager app built using Electron with Vue.js and TypeScript. Its main purpose is to let users import and organize their ROM libraries easily. The key value proposition is the ability to create and sync playlists (tags) of ROMs to an SD card, which can then be plugged into a portable retro handheld device.

**Core Features:**

- Import and organize ROM libraries with automatic metadata detection
- User-defined tagging system (playlists)
- Device profiles for multiple retro handhelds
- Seamless SD card syncing
- RetroAchievements integration for game identification and metadata

**Supported Devices:**

- MiyooMini+ (primary target)
- Generic profiles for other devices

## Tech Stack

- **Runtime:** Electron 37.x
- **Frontend:** Vue 3 with Composition API (`<script setup lang="ts">`)
- **Language:** TypeScript
- **UI Components:** PrimeVue 4.x
- **State Management:** Pinia
- **Storage:** LowDB (JSON-based local database)
- **Build Tool:** Vite

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run package

# Type checking
npm run lint

# Run tests
npm test

# Build RetroAchievements game database
npm run build:game-db
```

## Project Structure

```
src/
├── main/                   # Electron main process
│   ├── ipc/                # IPC handlers (rom, device, settings, sync, etc.)
│   ├── roms/               # ROM import, database, scanning, lookup
│   ├── retroachievements/  # RetroAchievements API integration
│   ├── devices/            # Device detection and management
│   ├── analytics/          # Sentry integration
│   ├── themes/             # Theme management
│   └── updater/            # Auto-update logic
├── components/             # Vue components
├── views/                  # Page-level Vue components
├── layouts/                # Layout components
├── stores/                 # Pinia stores
├── composables/            # Vue composables
├── router/                 # Vue Router configuration
├── utils/                  # Utility functions
├── types/                  # TypeScript type definitions
├── styles/                 # Global styles and style guide
├── data/                   # Static data
│   └── ra/                 # RetroAchievements game database (JSON files)
├── packages/               # Internal packages (workspace packages)
│   └── device-profiles/    # Device profile definitions (Onion, muOS, Knulli)
├── assets/                 # Static assets (fonts, app icons)
└── errors/                 # Error definitions
```

## Code Style

### General Principles

- Use TypeScript for all code - prioritize type safety
- Use Vue 3 Composition API with `<script setup lang="ts">`
- Use `defineProps` and `defineEmits` for component props and events
- Prefer PrimeVue components over custom UI implementations

### Styling

- **Preprocessor:** LESS
- **Class naming:** BEM (Block Element Modifier) - `.block__element--modifier`
- **Units:** Use REM values (root font size is 14px)
- **Design tokens:** Use PrimeVue CSS variables (e.g., `--p-primary-color`, `--p-surface-0`)

### Component Structure

```vue
<template>
  <div class="component-name">
    <div class="component-name__element">
      <!-- content -->
    </div>
  </div>
</template>

<script setup lang="ts">
// Imports
import { ref } from 'vue';

// Props/Emits
const props = defineProps<{
  value: string;
}>();

// Component logic
</script>

<style lang="less" scoped>
.component-name {
  padding: 1rem;

  &__element {
    margin-top: 0.5rem;
  }
}
</style>
```

## Architecture Decisions

### Device Profiles

Device profiles map system codes to target directories on SD cards. Located in `src/data/device-profiles/`. Profiles define:

- System folder mappings
- File organization structure
- Supported file extensions per system

### Security

- RetroAchievements API keys are encrypted using Electron's `safeStorage`
- User credentials never leave the local machine
- All ROM operations happen locally (no cloud upload)

## PrimeVue Design System

This project uses PrimeVue's Aura theme. Common design tokens:

**Colors:**

- `--p-primary-color` - Primary brand color
- `--p-surface-0` through `--p-surface-950` - Surface/background colors
- `--p-text-color`, `--p-text-muted-color` - Text colors
- `--p-content-background`, `--p-content-border-color` - Content containers

**Spacing:**

- Use `--p-button-padding-x`, `--p-form-field-padding-y`, etc. for consistency
- Border radius: `--p-border-radius-sm`, `--p-border-radius-md`, etc.

For full PrimeVue component documentation: https://primevue.org

## Development Workflow

### Issue Writing Style

Write GitHub issues conversationally:

- One-liner summary of what needs to be done
- Why it matters in 1-2 sentences
- Steps or hints if it's not obvious
- Acceptance criteria: "done when…"
- Avoid corporate buzzwords - keep it human and actionable

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Common Patterns

### IPC Communication

```typescript
// Main process (src/main/ipc/)
ipcMain.handle('channel-name', async (event, arg) => {
  // Handle request
  return result;
});

// Renderer process
const result = await window.electron.ipcRenderer.invoke('channel-name', arg);
```

### Store Usage

```typescript
import { useRomsStore } from '@/stores/roms';

const romsStore = useRomsStore();
await romsStore.loadRoms();
```

### Error Handling

- Main process errors should be logged via `electron-log`
- User-facing errors should use PrimeVue Toast for notifications
- Always validate file operations (disk space, permissions, etc.)

## Quirks & Known Issues

- Device detection is manual (user selects SD card path)
- ROM verification against RA database happens during import
- Large ROM collections (>1000 files) may slow down initial load
- RetroAchievements hashing for Nintendo DS is currently disabled (see TODO in code)

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Vue 3 Documentation](https://vuejs.org)
- [PrimeVue Components](https://primevue.org)
- [RetroAchievements API](https://api-docs.retroachievements.org)
