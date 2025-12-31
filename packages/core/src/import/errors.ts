/**
 * Custom error class for import-related errors
 * 
 * This error is thrown by parsers and converters when they encounter
 * invalid data. The backend should catch these errors and convert them
 * to appropriate HTTP exceptions (e.g., BadRequestException).
 */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when parsing a file fails
 */
export class ParseError extends ImportError {
  constructor(message: string, public readonly format: 'jchronic' | 'chronic') {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Error thrown when converting data fails
 */
export class ConversionError extends ImportError {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionError';
  }
}

/**
 * Error thrown when validating data fails
 */
export class ValidationError extends ImportError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

