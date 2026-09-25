import { readFileSync } from 'fs';
import { join } from 'path';

import { isCloudLoginIdentifierFilled } from './cloud-login-identifier';

describe('isCloudLoginIdentifierFilled', () => {
  it('accepts a legacy username without @ (e.g. mlemoal)', () => {
    expect(isCloudLoginIdentifierFilled('mlemoal')).toBe(true);
  });

  it('accepts an email-shaped identifier', () => {
    expect(isCloudLoginIdentifierFilled('user@actograph.io')).toBe(true);
  });

  it('rejects whitespace-only input', () => {
    expect(isCloudLoginIdentifierFilled(' ')).toBe(false);
    expect(isCloudLoginIdentifierFilled('   ')).toBe(false);
  });

  it('rejects empty, null, and undefined', () => {
    expect(isCloudLoginIdentifierFilled('')).toBe(false);
    expect(isCloudLoginIdentifierFilled(null)).toBe(false);
    expect(isCloudLoginIdentifierFilled(undefined)).toBe(false);
  });
});

describe('CloudLoginDialog identifier rules', () => {
  it('does not use validateEmailFormat', () => {
    const source = readFileSync(
      join(
        __dirname,
        '../pages/userspace/home/_components/cloud/CloudLoginDialog.vue',
      ),
      'utf8',
    );
    expect(source).not.toMatch(/validateEmailFormat/);
    expect(source).not.toMatch(/rules\.email/);
  });
});
