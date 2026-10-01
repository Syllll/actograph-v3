export function activationErrorKey(error: unknown): string {
  const response = (
    error as { response?: { status?: number; data?: { message?: unknown } } }
  )?.response;
  if (!response) return 'gateway.localServerUnavailable';
  const message = response.data?.message;
  if (message === 'Invalid key' || message === 'Invalid key checksum')
    return 'gateway.invalidLicenseKey';
  if (message === 'Server not available')
    return 'gateway.licenseServerUnavailable';
  if (message === 'Invalid license server response')
    return 'gateway.licenseResponseInvalid';
  if (message === 'Page not accessible') return 'gateway.licenseServiceError';
  return 'gateway.activationError';
}
