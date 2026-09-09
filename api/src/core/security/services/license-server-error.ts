import { BadRequestException, HttpException } from '@nestjs/common';

export const LICENSE_SERVER_UNAVAILABLE = 'Server not available';
export const LICENSE_INVALID_KEY = 'Invalid key';
export const LICENSE_PAGE_NOT_ACCESSIBLE = 'Page not accessible';
export const LICENSE_UNKNOWN_ERROR = 'Unknown error when checking licence.';

export function httpStatusFromUnknownError(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const status = (error as { response?: { status?: unknown } }).response?.status;
  return typeof status === 'number' ? status : undefined;
}

export function httpExceptionMessage(error: unknown): string | undefined {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message) && typeof message[0] === 'string') {
        return message[0];
      }
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return undefined;
}

/**
 * True when the licence server explicitly rejected the key.
 * Network / 5xx / missing response must not be treated as an invalid key.
 */
export function isExplicitLicenseRejection(error: unknown): boolean {
  const status = httpStatusFromUnknownError(error);
  if (status === 401) {
    return true;
  }
  const message = httpExceptionMessage(error);
  return message === LICENSE_INVALID_KEY;
}

/**
 * True when we could not reach the licence host (timeout, DNS, 5xx).
 * Only this case may fall back to a locally stored licence.
 */
export function isLicenseServerUnreachable(error: unknown): boolean {
  if (httpExceptionMessage(error) === LICENSE_SERVER_UNAVAILABLE) {
    return true;
  }
  const status = httpStatusFromUnknownError(error);
  return status === undefined ? false : status >= 500;
}

function axiosResponseMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof data === 'string' && data.trim().length > 0) {
    return data;
  }
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return undefined;
}

export function licenseServerErrorToException(error: unknown): BadRequestException {
  const status = httpStatusFromUnknownError(error);
  if (status === 401) {
    return new BadRequestException(LICENSE_INVALID_KEY);
  }
  if (status === 404) {
    return new BadRequestException(LICENSE_PAGE_NOT_ACCESSIBLE);
  }
  if (status === undefined || status >= 500) {
    return new BadRequestException(LICENSE_SERVER_UNAVAILABLE);
  }
  return new BadRequestException(
    axiosResponseMessage(error) ?? LICENSE_UNKNOWN_ERROR,
  );
}
