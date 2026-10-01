import {
  parseLicenseResponse,
  LICENSE_RESPONSE_INVALID,
} from './license-response';

const valid = {
  id: 1,
  type: 'ultimate',
  dateMode: 'duration',
  startDate: '2026-09-01',
  endDate: null,
  duration: 365,
  hasTimeLimit: true,
  renewable: false,
  owner: null,
};
test('normalizes valid legacy license types and preserves nullable data', () => {
  expect(parseLicenseResponse(valid)).toMatchObject({
    type: 'Ultimate',
    dateMode: 'Duration',
    owner: null,
    endDate: null,
  });
});
test.each([
  null,
  '',
  {},
  { ...valid, type: undefined },
  { ...valid, type: 42 },
  { ...valid, type: 'Unknown' },
  { ...valid, startDate: 'invalid' },
  { ...valid, duration: null },
  { ...valid, dateMode: 'Date', endDate: null },
  { ...valid, hasTimeLimit: 'false' },
  { ...valid, id: undefined },
  { ...valid, owner: [] },
])('rejects malformed responses before activation: %p', (data) => {
  expect(() => parseLicenseResponse(data)).toThrow(LICENSE_RESPONSE_INVALID);
});
test('keeps explicit server rejection messages', () => {
  expect(() => parseLicenseResponse({ message: 'Invalid key' })).toThrow(
    'Invalid key',
  );
});
