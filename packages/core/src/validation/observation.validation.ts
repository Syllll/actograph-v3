import { ReadingTypeEnum } from '../enums';
import { IReading } from '../types';
import {
  IValidationResult,
  IValidationError,
  validResult,
  invalidResult,
  validationError,
  mergeValidationResults,
} from './types';

/**
 * Validates observation name
 */
export function validateObservationName(name: string | undefined): IValidationResult {
  if (!name || name.trim().length === 0) {
    return invalidResult([
      validationError('name', 'Le nom de l\'observation est requis', 'REQUIRED'),
    ]);
  }

  if (name.length > 255) {
    return invalidResult([
      validationError('name', 'Le nom ne peut pas dépasser 255 caractères', 'MAX_LENGTH'),
    ]);
  }

  return validResult();
}

/**
 * Validates a single reading
 */
export function validateReading(
  reading: Partial<IReading>,
  index: number,
): IValidationResult {
  const errors: IValidationError[] = [];

  if (!reading.type) {
    errors.push(
      validationError(
        `readings[${index}].type`,
        'Le type du reading est requis',
        'REQUIRED',
      ),
    );
  } else if (!Object.values(ReadingTypeEnum).includes(reading.type)) {
    errors.push(
      validationError(
        `readings[${index}].type`,
        `Type de reading invalide: ${reading.type}`,
        'INVALID_ENUM',
      ),
    );
  }

  if (!reading.dateTime) {
    errors.push(
      validationError(
        `readings[${index}].dateTime`,
        'La date du reading est requise',
        'REQUIRED',
      ),
    );
  } else if (!(reading.dateTime instanceof Date) || isNaN(reading.dateTime.getTime())) {
    errors.push(
      validationError(
        `readings[${index}].dateTime`,
        'La date du reading est invalide',
        'INVALID_DATE',
      ),
    );
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

/**
 * Validates readings array for an observation
 */
export function validateReadings(readings: IReading[]): IValidationResult {
  if (!readings || !Array.isArray(readings)) {
    return invalidResult([
      validationError('readings', 'Les readings doivent être un tableau', 'INVALID_TYPE'),
    ]);
  }

  // Validate individual readings
  const individualResults = readings.map((r, i) => validateReading(r, i));
  const merged = mergeValidationResults(individualResults);

  if (!merged.valid) {
    return merged;
  }

  // Validate observation structure
  const hasStart = readings.some((r) => r.type === ReadingTypeEnum.START);
  const hasStop = readings.some((r) => r.type === ReadingTypeEnum.STOP);

  const errors: IValidationError[] = [];

  if (!hasStart) {
    errors.push(
      validationError(
        'readings',
        'L\'observation doit contenir un reading de type START',
        'MISSING_START',
      ),
    );
  }

  if (!hasStop) {
    errors.push(
      validationError(
        'readings',
        'L\'observation doit contenir un reading de type STOP',
        'MISSING_STOP',
      ),
    );
  }

  // Validate chronological order
  if (hasStart && hasStop) {
    const startReading = readings.find((r) => r.type === ReadingTypeEnum.START);
    const stopReading = readings.find((r) => r.type === ReadingTypeEnum.STOP);

    if (startReading && stopReading && startReading.dateTime >= stopReading.dateTime) {
      errors.push(
        validationError(
          'readings',
          'Le reading START doit être avant le reading STOP',
          'INVALID_ORDER',
        ),
      );
    }
  }

  // Validate pause pairs
  const pauseStarts = readings.filter((r) => r.type === ReadingTypeEnum.PAUSE_START);
  const pauseEnds = readings.filter((r) => r.type === ReadingTypeEnum.PAUSE_END);

  if (pauseStarts.length !== pauseEnds.length) {
    errors.push(
      validationError(
        'readings',
        'Le nombre de PAUSE_START doit être égal au nombre de PAUSE_END',
        'UNBALANCED_PAUSES',
      ),
    );
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

/**
 * Validates complete observation data
 */
export function validateObservationData(data: {
  name?: string;
  readings?: IReading[];
}): IValidationResult {
  const results = [
    validateObservationName(data.name),
    data.readings ? validateReadings(data.readings) : validResult(),
  ];

  return mergeValidationResults(results);
}

