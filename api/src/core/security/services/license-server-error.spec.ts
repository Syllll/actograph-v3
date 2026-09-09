import { BadRequestException } from '@nestjs/common';
import {
  LICENSE_INVALID_KEY,
  LICENSE_PAGE_NOT_ACCESSIBLE,
  LICENSE_SERVER_UNAVAILABLE,
  LICENSE_UNKNOWN_ERROR,
  httpStatusFromUnknownError,
  isExplicitLicenseRejection,
  isLicenseServerUnreachable,
  licenseServerErrorToException,
} from './license-server-error';

describe('license-server-error', () => {
  it('treats a missing axios response as unreachable, not invalid', () => {
    const timeout = new Error('timeout');
    expect(httpStatusFromUnknownError(timeout)).toBeUndefined();
    expect(isExplicitLicenseRejection(timeout)).toBe(false);
    expect(licenseServerErrorToException(timeout).message).toBe(
      LICENSE_SERVER_UNAVAILABLE,
    );
  });

  it('maps HTTP 502 / 503 to server unavailable', () => {
    expect(
      licenseServerErrorToException({ response: { status: 502 } }).message,
    ).toBe(LICENSE_SERVER_UNAVAILABLE);
    expect(
      licenseServerErrorToException({ response: { status: 503 } }).message,
    ).toBe(LICENSE_SERVER_UNAVAILABLE);
  });

  it('maps HTTP 401 to an explicit invalid key', () => {
    const error = { response: { status: 401 } };
    expect(isExplicitLicenseRejection(error)).toBe(true);
    expect(licenseServerErrorToException(error).message).toBe(LICENSE_INVALID_KEY);
  });

  it('maps HTTP 404 to page not accessible', () => {
    expect(
      licenseServerErrorToException({ response: { status: 404 } }).message,
    ).toBe(LICENSE_PAGE_NOT_ACCESSIBLE);
    expect(isExplicitLicenseRejection({ response: { status: 404 } })).toBe(
      false,
    );
  });

  it('maps other 4xx to unknown licence error', () => {
    expect(
      licenseServerErrorToException({ response: { status: 400 } }).message,
    ).toBe(LICENSE_UNKNOWN_ERROR);
  });

  it('keeps a 4xx business message from the licence host', () => {
    expect(
      licenseServerErrorToException({
        response: { status: 400, data: { message: 'License expired' } },
      }).message,
    ).toBe('License expired');
    expect(
      isLicenseServerUnreachable({
        response: { status: 400, data: { message: 'License expired' } },
      }),
    ).toBe(false);
  });

  it('recognises a Nest BadRequestException for an invalid key', () => {
    const error = new BadRequestException(LICENSE_INVALID_KEY);
    expect(isExplicitLicenseRejection(error)).toBe(true);
  });

  it('does not treat server unavailable as an explicit rejection', () => {
    const error = new BadRequestException(LICENSE_SERVER_UNAVAILABLE);
    expect(isExplicitLicenseRejection(error)).toBe(false);
  });

  it('only treats mapped unavailability as a reachable fallback', () => {
    expect(
      isLicenseServerUnreachable(new BadRequestException(LICENSE_SERVER_UNAVAILABLE)),
    ).toBe(true);
    expect(
      isLicenseServerUnreachable(new BadRequestException(LICENSE_INVALID_KEY)),
    ).toBe(false);
    expect(
      isLicenseServerUnreachable(new BadRequestException('License expired')),
    ).toBe(false);
    expect(isLicenseServerUnreachable({ response: { status: 502 } })).toBe(true);
    expect(isLicenseServerUnreachable(new Error('toLowerCase'))).toBe(false);
  });
});
