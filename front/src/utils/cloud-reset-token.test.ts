import { extractCloudResetToken } from './cloud-reset-token';

describe('extractCloudResetToken', () => {
  it('extracts token from an https reset-password URL', () => {
    const url =
      'https://web.actograph.io/fr/auth/reset-password?token=abc-123-def';
    expect(extractCloudResetToken(url)).toBe('abc-123-def');
  });

  it('accepts a raw token pasted without URL', () => {
    expect(extractCloudResetToken('  raw-token-uuid  ')).toBe('raw-token-uuid');
  });

  it('rejects javascript: URLs', () => {
    expect(extractCloudResetToken('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: URLs', () => {
    expect(
      extractCloudResetToken('data:text/html,<script>alert(1)</script>'),
    ).toBeNull();
  });

  it('returns null when an https URL has no token query param', () => {
    expect(
      extractCloudResetToken('https://web.actograph.io/fr/auth/reset-password'),
    ).toBeNull();
  });
});
