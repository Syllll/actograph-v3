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
test.each(['Ultimate Education', 'ultimate education', 'Ultimate Éducation'])(
  'accepts historical permanent education licenses: %s',
  (type) => {
    const historical = {
      ...valid,
      id: 4695,
      type,
      startDate: '2024-01-21T00:00:00.000Z',
      endDate: '2024-01-21T00:00:00.000Z',
      duration: 0,
      hasTimeLimit: false,
    };
    expect(parseLicenseResponse(historical)).toEqual({
      ...historical,
      type: 'Ultimate',
      dateMode: 'Duration',
    });
  },
);
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
