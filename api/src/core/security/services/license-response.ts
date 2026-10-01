import { BadRequestException } from '@nestjs/common';
import {
  DateModeEnum,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';
import type { LicenseResponse } from './security/index.service';

export const LICENSE_RESPONSE_INVALID = 'Invalid license server response';

/** Validate remote data before writing access files or replacing a stored license. */
export function parseLicenseResponse(data: unknown): LicenseResponse {
  const invalid = () => {
    throw new BadRequestException(LICENSE_RESPONSE_INVALID);
  };
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return invalid();
  const value = data as Record<string, unknown>;
  if (typeof value.message === 'string' && value.message)
    throw new BadRequestException(value.message);
  const type =
    typeof value.type === 'string'
      ? Object.values(LicenseTypeEnum).find(
          (item) => item.toLowerCase() === (value.type as string).toLowerCase(),
        )
      : undefined;
  const dateMode =
    typeof value.dateMode === 'string'
      ? Object.values(DateModeEnum).find(
          (item) =>
            item.toLowerCase() === (value.dateMode as string).toLowerCase(),
        )
      : undefined;
  const isDate = (date: unknown) =>
    typeof date === 'string' &&
    date.length > 0 &&
    Number.isFinite(Date.parse(date));
  if (
    !type ||
    !dateMode ||
    !Number.isInteger(value.id) ||
    Number(value.id) <= 0 ||
    typeof value.hasTimeLimit !== 'boolean' ||
    typeof value.renewable !== 'boolean' ||
    !isDate(value.startDate) ||
    (value.endDate != null && !isDate(value.endDate)) ||
    (value.duration != null &&
      (typeof value.duration !== 'number' ||
        !Number.isFinite(value.duration) ||
        value.duration < 0)) ||
    (value.owner != null &&
      (typeof value.owner !== 'object' || Array.isArray(value.owner)))
  )
    return invalid();
  if (
    value.hasTimeLimit &&
    (dateMode === DateModeEnum.Duration
      ? value.duration == null
      : value.endDate == null)
  )
    return invalid();
  return { ...value, type, dateMode } as unknown as LicenseResponse;
}
