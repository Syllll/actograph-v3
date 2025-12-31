# @actograph/graph

Activity graph component using PixiJS, shared between the web frontend and mobile app.

## Overview

This package provides the **PixiJS-based graph visualization** for ActoGraph observations. It renders:

- **Timeline axis** (X-axis) with time markers
- **Protocol items axis** (Y-axis) with observables and categories
- **Data area** with reading events displayed as colored bars
- **Interactive features** like zoom and pan

## Architecture

```
src/
├── index.ts              # Main entry point - exports public API
├── pixi-app/             # Main PixiJS application
│   ├── index.ts          # PixiApp class - main entry point
│   ├── axis/
│   │   ├── x-axis.ts     # Time axis rendering
│   │   └── y-axis.ts     # Protocol items axis rendering
│   └── data-area/
│       └── index.ts      # Reading data visualization
├── lib/                  # Shared utilities
│   ├── base-graphic.ts   # Base class for PixiJS graphics
│   ├── base-group.ts     # Base class for grouped elements
│   └── pattern-textures.ts # Background patterns (hatching, dots, etc.)
└── utils/
    ├── chronometer.constants.ts # Chronometer mode constants
    ├── duration.utils.ts        # Duration formatting utilities
    └── protocol.utils.ts        # Protocol parsing utilities
```

## Dependencies

### Runtime Dependencies
- `pixi.js` ^8.12.0 - 2D rendering engine

### Peer Dependencies
- `vue` ^3.4.0 - For Vue.js integration
- `@actograph/core` ^0.0.80 - Core types and enums

## Installation

This package is included in the monorepo. It's automatically linked via `file:` references in:
- `front/package.json`
- `mobile/package.json`

## Usage

### Basic Usage

```typescript
import { PixiApp } from '@actograph/graph';

// Create the graph instance
const graph = new PixiApp({
  container: document.getElementById('graph-container'),
  observation: myObservation,
  protocolItems: myProtocolItems,
  readings: myReadings,
});

// Update data
graph.setReadings(newReadings);

// Cleanup
graph.destroy();
```

### Utilities

```typescript
import {
  formatCompact,
  formatFromDate,
  millisecondsToParts,
  getObservableGraphPreferences,
  parseProtocolItems,
  CHRONOMETER_T0,
} from '@actograph/graph';

// Format duration compactly: "2h 15m 30s"
const formatted = formatCompact(8130000);

// Parse protocol items for graph display
const parsed = parseProtocolItems(protocolItems);
```

### Re-exported Types

For convenience, this package re-exports types from `@actograph/core`:

```typescript
import type {
  IObservation,
  IProtocol,
  IProtocolItem,
  IReading,
  IGraphPreferences,
} from '@actograph/graph';

import {
  ObservationModeEnum,
  ReadingTypeEnum,
  BackgroundPatternEnum,
  DisplayModeEnum,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '@actograph/graph';
```

## Development

### Do I need to build?

**For development: NO** ✅

The consuming apps (front/, mobile/) use path aliases that point to `src/`.
This means hot-reload works automatically - no need to rebuild after changes.

**For production builds: YES** 🔨

```bash
# From monorepo root - builds both core and graph
yarn build:packages

# Or individually
yarn build:core   # Must be first
yarn build:graph
```

> **Note**: Always build `@actograph/core` first, as `@actograph/graph` depends on it.

### Watch Mode

```bash
yarn dev
```

### TypeScript Configuration

The package uses two tsconfig files:

- `tsconfig.json` - For IDE/development with path aliases to `@actograph/core/src`
- `tsconfig.build.json` - For compilation, uses `dist/` from `@actograph/core`

This allows hot-reload during development while producing clean builds.

## Integration Notes

### With Vite (front/mobile)

The consuming apps resolve this package differently in dev vs prod:

**Development**: Via `tsconfig.json` paths and `quasar.config.js` aliases → `src/`
**Production**: Via `package.json` main/types fields → `dist/`

This is configured in:
- `front/tsconfig.json` and `front/quasar.config.js`
- `mobile/tsconfig.json` and `mobile/quasar.config.js`

### Canvas Container

The PixiJS canvas must be mounted in a container with explicit dimensions:

```vue
<template>
  <div ref="containerRef" class="graph-container" />
</template>

<style>
.graph-container {
  width: 100%;
  height: 400px; /* Must have explicit height */
}
</style>
```

## License

UNLICENSED - Internal use only

