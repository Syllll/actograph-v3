/**
 * @actograph/core
 * 
 * Core business logic shared between backend and mobile.
 * This package contains pure TypeScript logic without framework dependencies.
 * 
 * @packageDocumentation
 */

// Export enums
export * from './enums/index';

// Export types
export * from './types/index';

// Export statistics
export * from './statistics/index';

// Export import (parsers and converters)
export * from './import/index';

// Export validation
export * from './validation/index';

// Export utils
export * from './utils/index';

// Export convertMobileObservation explicitly for better tree-shaking and Vite compatibility
export { convertMobileObservation } from './utils/mobile-compat';

