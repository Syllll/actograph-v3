# @actograph/core

Core business logic for ActoGraph, shared between backend (NestJS) and mobile (Capacitor).

## Overview

This package contains **pure TypeScript logic** without any framework dependencies. It provides:

- **Enums** - Shared type definitions
- **Types** - TypeScript interfaces
- **Statistics** - Observation statistics calculations
- **Import** - File parsers for `.chronic` and `.jchronic` formats
- **Validation** - Data validation utilities

## Installation

```bash
# In the monorepo
yarn workspace @actograph/core build

# Or from the root
yarn build:core
```

## Usage

### Enums

```typescript
import {
  ReadingTypeEnum,
  ProtocolItemTypeEnum,
  ProtocolItemActionEnum,
  ObservationType,
  ObservationModeEnum,
} from '@actograph/core';

// Use in type definitions
const readingType: ReadingTypeEnum = ReadingTypeEnum.START;
```

### Types

```typescript
import {
  IReading,
  IProtocolItem,
  IObservation,
  IGeneralStatistics,
  ICategoryStatistics,
} from '@actograph/core';

// Pure interfaces for data structures
const reading: IReading = {
  type: ReadingTypeEnum.DATA,
  dateTime: new Date(),
  name: 'observable1',
};
```

### Statistics

```typescript
import {
  calculateGeneralStatistics,
  calculateCategoryStatistics,
  calculateConditionalStatistics,
  calculatePausePeriods,
} from '@actograph/core';

// Calculate general statistics
const stats = calculateGeneralStatistics(readings, protocolItems);
console.log(stats.observationDuration);
console.log(stats.pauseCount);

// Calculate category-specific statistics
const categoryStats = calculateCategoryStatistics(
  category,
  readings,
  startDate,
  endDate,
);
console.log(categoryStats.observables);
```

### Import

```typescript
import {
  parseJchronicFile,
  normalizeJchronicData,
  ChronicV1Parser,
  normalizeChronicV1Data,
  ImportError,
} from '@actograph/core';

// Parse .jchronic (JSON format)
try {
  const data = parseJchronicFile(jsonContent);
  const normalized = normalizeJchronicData(data);
  console.log(normalized.observation.name);
} catch (error) {
  if (error instanceof ImportError) {
    console.error('Import failed:', error.message);
  }
}

// Parse .chronic (binary Qt DataStream format)
const parser = new ChronicV1Parser();
const chronicData = parser.parse(binaryBuffer);
const normalized = normalizeChronicV1Data(chronicData);
```

### Validation

```typescript
import {
  validateObservationData,
  validateProtocolStructure,
  validateReadings,
  IValidationResult,
} from '@actograph/core';

// Validate observation data
const result = validateObservationData({
  name: 'My Observation',
  readings: myReadings,
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

// Validate protocol structure
const protocolResult = validateProtocolStructure(protocolItems);
```

## API Reference

### Enums

| Enum | Description |
|------|-------------|
| `ReadingTypeEnum` | Types of readings: START, STOP, PAUSE_START, PAUSE_END, DATA |
| `ProtocolItemTypeEnum` | Category or Observable |
| `ProtocolItemActionEnum` | Continuous or Discrete |
| `ObservationType` | Example or Normal |
| `ObservationModeEnum` | Calendar or Chronometer |
| `BackgroundPatternEnum` | Display patterns for background mode |
| `DisplayModeEnum` | Normal, Background, or Frieze |
| `ConditionOperatorEnum` | AND or OR for conditional statistics |
| `ObservableStateEnum` | ON or OFF |

### Statistics Functions

| Function | Description |
|----------|-------------|
| `calculateGeneralStatistics` | Calculates overall observation statistics |
| `calculateCategoryStatistics` | Calculates statistics for a specific category |
| `calculateConditionalStatistics` | Calculates statistics with filters/conditions |
| `calculatePausePeriods` | Extracts pause periods from readings |
| `calculatePauseOverlap` | Calculates overlap between a period and pauses |
| `intersectPeriods` | AND operation on period arrays |
| `unionPeriods` | OR operation on period arrays |

### Import Functions

| Function/Class | Description |
|----------------|-------------|
| `parseJchronicFile` | Parses JSON .jchronic file content |
| `normalizeJchronicData` | Converts jchronic to normalized format |
| `ChronicV1Parser` | Parses binary .chronic files |
| `normalizeChronicV1Data` | Converts chronic v1 to normalized format |

### Validation Functions

| Function | Description |
|----------|-------------|
| `validateObservationData` | Validates complete observation |
| `validateObservationName` | Validates observation name |
| `validateReadings` | Validates readings array |
| `validateReading` | Validates single reading |
| `validateProtocolStructure` | Validates protocol items |
| `validateProtocolItem` | Validates single protocol item |

### Error Classes

| Class | Description |
|-------|-------------|
| `ImportError` | Base error for import operations |
| `ParseError` | File parsing failed |
| `ValidationError` | Data validation failed |
| `ConversionError` | Data conversion failed |

## Architecture

```
src/
├── index.ts              # Main entry point
├── enums/                # Shared enums
│   ├── reading-type.enum.ts
│   ├── protocol-item.enum.ts
│   ├── observation.enum.ts
│   └── statistics.enum.ts
├── types/                # TypeScript interfaces
│   ├── reading.types.ts
│   ├── protocol.types.ts
│   ├── observation.types.ts
│   └── statistics.types.ts
├── statistics/           # Statistics calculations (PURE)
│   ├── period-calculator.ts
│   ├── general-statistics.ts
│   ├── category-statistics.ts
│   └── conditional-statistics.ts
├── import/               # File parsers
│   ├── errors.ts
│   ├── types.ts
│   ├── jchronic-parser.ts
│   └── chronic-v1/       # Qt DataStream parser
│       ├── parser/
│       ├── converter/
│       └── qtdatastream/
└── validation/           # Data validation
    ├── types.ts
    ├── observation.validation.ts
    └── protocol.validation.ts
```

## Design Principles

1. **Pure Functions** - No side effects, no I/O operations
2. **Framework Agnostic** - No NestJS, TypeORM, or other framework dependencies
3. **Type Safe** - Full TypeScript with strict mode
4. **Testable** - Easy to unit test in isolation
5. **Reusable** - Same code works in backend, frontend, and mobile

## Development

### Do I need to build?

**For development: NO** ✅

The consuming apps (api/, front/, mobile/) use path aliases that point to `src/`.
This means hot-reload works automatically - no need to rebuild after changes.

**For production builds: YES** 🔨

```bash
# From monorepo root
yarn build:packages  # Builds core + graph

# Or individually
yarn build:core
```

### Commands

```bash
# Build
yarn build

# Watch mode
yarn dev

# Run tests
yarn test

# Lint
yarn lint
```

## License

UNLICENSED - Internal use only
