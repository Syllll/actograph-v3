# @actograph/graph

Activity graph component using PixiJS, shared between the desktop/web frontend and mobile app.

## Overview

This package provides the **PixiJS-based graph visualization** for ActoGraph observations. It renders:

- **Timeline axis** (X-axis) with time markers
- **Protocol items axis** (Y-axis) with observables and categories
- **Data area** with reading events displayed as colored bars
- **Interactive features** like zoom and pan

## Architecture

`PixiApp` is the public facade. The v2 engine in `src/engine/` prepares world layers; axis labels and hover use screen-space overlays in `src/layers/`. See the [graph guide](../../docs/graph.md) and [engine v2 reference](../../docs/graph-engine-v2.md) for rendering, resize, export and scheduling contracts.

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

// Provide an HTML canvas mounted in a container with explicit dimensions.
const graph = new PixiApp();
await graph.init({ view: canvasElement });

// The observation includes its protocol and readings.
graph.setData(myObservation);
await graph.draw();

// Update the observation snapshot, then redraw.
graph.setData(updatedObservation);
await graph.draw();

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

The consuming Vite apps resolve this package to `src/` through their aliases in both development and production builds. A consumer without these aliases uses the package `main`/`types` fields pointing to `dist/`. The desktop build pipeline still compiles core then graph before packaging.

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

