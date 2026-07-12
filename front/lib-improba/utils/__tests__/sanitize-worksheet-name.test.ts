import { sanitizeWorksheetName, ensureUniqueWorksheetNames } from '../sanitize-worksheet-name';

describe('sanitizeWorksheetName', () => {
  it('replaces Excel-forbidden characters with hyphens', () => {
    expect(sanitizeWorksheetName('Cat/foo:bar*test?')).toBe('Cat-foo-bar-test-');
    expect(sanitizeWorksheetName('bad[sheet]name')).toBe('bad-sheet-name');
    expect(sanitizeWorksheetName('back\\slash')).toBe('back-slash');
  });

  it('strips leading and trailing apostrophes', () => {
    expect(sanitizeWorksheetName("'quoted'")).toBe('quoted');
    expect(sanitizeWorksheetName("''name''")).toBe('name');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeWorksheetName('  General  ')).toBe('General');
  });

  it('falls back to Sheet when the result is empty', () => {
    expect(sanitizeWorksheetName('')).toBe('Sheet');
    expect(sanitizeWorksheetName('   ')).toBe('Sheet');
    expect(sanitizeWorksheetName('???')).toBe('---');
    expect(sanitizeWorksheetName("'''")).toBe('Sheet');
  });

  it('truncates names to 31 characters', () => {
    const longName = 'a'.repeat(50);
    expect(sanitizeWorksheetName(longName)).toBe('a'.repeat(31));
    expect(sanitizeWorksheetName('Catégorie - ' + 'x'.repeat(40))).toHaveLength(31);
  });

  it('sanitizes then truncates in the correct order', () => {
    expect(sanitizeWorksheetName('foo/bar/baz/and/more/segments/here')).toHaveLength(31);
    expect(sanitizeWorksheetName('foo/bar/baz/and/more/segments/here')).toBe(
      'foo-bar-baz-and-more-segments-h',
    );
  });

  it('preserves valid category labels', () => {
    expect(sanitizeWorksheetName('Général')).toBe('Général');
    expect(sanitizeWorksheetName('Par catégorie')).toBe('Par catégorie');
    expect(sanitizeWorksheetName('Statistiques conditionnelles')).toBe(
      'Statistiques conditionnelles',
    );
  });
});

describe('ensureUniqueWorksheetNames', () => {
  it('returns sanitized names when there is no collision', () => {
    expect(ensureUniqueWorksheetNames(['Général', 'Par catégorie'])).toEqual([
      'Général',
      'Par catégorie',
    ]);
  });

  it('suffixes colliding names after sanitization', () => {
    expect(ensureUniqueWorksheetNames(['Cat?1', 'Cat*1'])).toEqual(['Cat-1', 'Cat-1-2']);
    expect(ensureUniqueWorksheetNames(['Cat?1', 'Cat*1', 'Cat/1'])).toEqual([
      'Cat-1',
      'Cat-1-2',
      'Cat-1-3',
    ]);
  });

  it('suffixes repeated empty names', () => {
    expect(ensureUniqueWorksheetNames(['', '   '])).toEqual(['Sheet', 'Sheet-2']);
  });

  it('keeps suffixes within the 31-character Excel limit', () => {
    const longBase = 'a'.repeat(31);
    const [first, second] = ensureUniqueWorksheetNames([longBase, longBase]);

    expect(first).toHaveLength(31);
    expect(second).toHaveLength(31);
    expect(second.endsWith('-2')).toBe(true);
    expect(new Set([first, second]).size).toBe(2);
  });

  it('handles collisions between a base name and an existing suffix', () => {
    expect(ensureUniqueWorksheetNames(['Cat-1', 'Cat?1'])).toEqual(['Cat-1', 'Cat-1-2']);
  });
});
