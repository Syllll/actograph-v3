/**
 * Validation result types
 */

export interface IValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface IValidationResult {
  valid: boolean;
  errors: IValidationError[];
}

/**
 * Creates a successful validation result
 */
export function validResult(): IValidationResult {
  return { valid: true, errors: [] };
}

/**
 * Creates a failed validation result with errors
 */
export function invalidResult(errors: IValidationError[]): IValidationResult {
  return { valid: false, errors };
}

/**
 * Creates a single validation error
 */
export function validationError(
  field: string,
  message: string,
  code?: string,
): IValidationError {
  return { field, message, code };
}

/**
 * Merges multiple validation results
 */
export function mergeValidationResults(
  results: IValidationResult[],
): IValidationResult {
  const allErrors = results.flatMap((r) => r.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

