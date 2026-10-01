import { getLicenseOwnerLabel } from './license-owner-label';

describe('getLicenseOwnerLabel', () => {
  it('displays the name from a stored license profile instead of its JSON', () => {
    const owner = JSON.stringify({
      id: 3,
      firstName: ' Valérie ',
      lastName: ' Dupont ',
      gender: 'F',
      username: 'valerie',
      email: 'valerie@example.com',
    });

    expect(getLicenseOwnerLabel(owner)).toBe('Valérie Dupont');
  });

  it.each([
    [{ firstName: 'Valérie' }, 'Valérie'],
    [{ lastName: 'Dupont' }, 'Dupont'],
    [
      {
        firstName: ' ',
        lastName: null,
        username: ' valerie ',
        email: 'v@example.com',
      },
      'valerie',
    ],
    [{ username: '', email: ' v@example.com ' }, 'v@example.com'],
    [
      { firstName: { unexpected: true }, username: 3, email: 'v@example.com' },
      'v@example.com',
    ],
  ])('uses available identity fields from %p', (profile, label) => {
    expect(getLicenseOwnerLabel(JSON.stringify(profile))).toBe(label);
  });

  it.each([' Valérie Dupont ', '"Valérie Dupont"'])(
    'preserves a legacy name stored as %s',
    (owner) => {
      expect(getLicenseOwnerLabel(owner)).toBe('Valérie Dupont');
    }
  );

  it.each([
    undefined,
    null,
    '',
    ' ',
    'null',
    '{}',
    '[]',
    '3',
    'true',
    '{"id":3',
    '[broken',
    '"broken',
  ])(
    'returns an empty label for unusable owner %p so the caller can use its local account label',
    (owner) => {
      expect(getLicenseOwnerLabel(owner)).toBe('');
    }
  );
});
