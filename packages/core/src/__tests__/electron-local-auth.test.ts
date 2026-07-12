import { deriveElectronLocalPassword, ELECTRON_LOCAL_USER_PREFIX } from '../utils/electron-local-auth';

describe('deriveElectronLocalPassword', () => {
  it('extracts OS username from standard Electron local username', () => {
    expect(deriveElectronLocalPassword(`${ELECTRON_LOCAL_USER_PREFIX}sylvain`)).toBe('sylvain');
  });

  it('preserves dashes in the OS username suffix', () => {
    expect(deriveElectronLocalPassword(`${ELECTRON_LOCAL_USER_PREFIX}john-doe`)).toBe('john-doe');
  });

  it('falls back to the suffix after the first dash for legacy usernames', () => {
    expect(deriveElectronLocalPassword('legacy-user')).toBe('user');
  });
});
