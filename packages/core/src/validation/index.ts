/**
 * Validation module
 * 
 * Provides pure validation functions for observations, protocols, and readings.
 * These functions return ValidationResult objects containing any errors found.
 */

// Types
export type {
  IValidationError,
  IValidationResult,
} from './types';

export {
  validResult,
  invalidResult,
  validationError,
  mergeValidationResults,
} from './types';

// Observation validation
export {
  validateObservationName,
  validateReading,
  validateReadings,
  validateObservationData,
} from './observation.validation';

// Protocol validation
export {
  validateProtocolItem,
  validateProtocolStructure,
  validateCategoryHasObservables,
} from './protocol.validation';

