import { activationErrorKey } from './activation-error';

test.each([
  ['Invalid key', 'invalidLicenseKey'],
  ['Invalid key checksum', 'invalidLicenseKey'],
  ['Server not available', 'licenseServerUnavailable'],
  ['Invalid license server response', 'licenseResponseInvalid'],
  ['Page not accessible', 'licenseServiceError'],
  ['Internal server error', 'activationError'],
])('maps %s without blaming the license key', (message, expected) => {
  expect(activationErrorKey({ response: { data: { message } } })).toBe(
    `gateway.${expected}`
  );
});
test('separates a local connection failure from license rejection', () => {
  expect(activationErrorKey(new Error('ECONNREFUSED'))).toBe(
    'gateway.localServerUnavailable'
  );
});
