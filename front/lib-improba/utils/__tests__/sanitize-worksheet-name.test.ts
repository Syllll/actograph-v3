import { sanitizeWorksheetName } from '../sanitize-worksheet-name';

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
