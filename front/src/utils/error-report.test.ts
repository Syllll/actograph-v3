import {
  buildErrorReport,
  formatRouteLabel,
  getErrorFingerprint,
  getStackFingerprintLines,
  normalizeError,
  normalizeErrorMessage,
  truncateStack,
} from './error-report';

describe('error-report', () => {
  it('buildErrorReport produit le format attendu', () => {
    const report = buildErrorReport({
      type: 'VueError',
      message: 'Test error',
      stack: 'Error: Test error\n    at foo.ts:1:1',
      chronicle: 'Ma chronique',
      date: '2026-07-19T10:00:00.000Z',
      version: '3.0.0',
      platform: 'Linux x86_64',
      route: '#/userspace',
      vueInfo: 'render',
    });

    expect(report).toContain('--- Rapport ActoGraph ---');
    expect(report).toContain('Date: 2026-07-19T10:00:00.000Z');
    expect(report).toContain('Version: 3.0.0');
    expect(report).toContain('Plateforme: Linux x86_64');
    expect(report).toContain('Route: #/userspace');
    expect(report).toContain('Chronique: Ma chronique');
    expect(report).toContain('Type: VueError');
    expect(report).toContain('Message: Test error (render)');
    expect(report).toContain('Stack:');
    expect(report).toContain('    at foo.ts:1:1');
    expect(report).toContain('-------------------------');
  });

  it('truncateStack limite le nombre de lignes', () => {
    const lines = Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n');
    const truncated = truncateStack(lines, 30);
    expect(truncated.split('\n')).toHaveLength(30);
  });

  it('truncateStack retourne une chaîne vide pour une stack vide', () => {
    expect(truncateStack('')).toBe('');
  });

  it('normalizeErrorMessage retire Uncaught et le préfixe TypeError', () => {
    expect(normalizeErrorMessage('Uncaught TypeError: foo is not a function')).toBe(
      'foo is not a function',
    );
    expect(normalizeErrorMessage('TypeError: bar')).toBe('bar');
    expect(normalizeErrorMessage('  plain message  ')).toBe('plain message');
  });

  it('getStackFingerprintLines ne garde que les N premières lignes non vides', () => {
    const stack = [
      'TypeError: boom',
      '    at a.ts:1:1',
      '    at b.ts:2:2',
      '    at c.ts:3:3',
      '    at d.ts:4:4',
    ].join('\n');
    expect(getStackFingerprintLines(stack, 3)).toBe(
      'TypeError: boom\nat a.ts:1:1\nat b.ts:2:2',
    );
  });

  it('getErrorFingerprint est stable entre VueError et window.onerror', () => {
    const stack = 'TypeError: Cannot read\n    at Component.vue:10:5\n    at render.ts:2:1';
    const vueFp = getErrorFingerprint('Cannot read', stack);
    const onerrorFp = getErrorFingerprint(
      'Uncaught TypeError: Cannot read',
      stack,
    );
    expect(vueFp).toBe(onerrorFp);
  });

  it('getErrorFingerprint diffère pour des messages distincts', () => {
    const fp1 = getErrorFingerprint('msg', 'stack');
    const fp2 = getErrorFingerprint('msg', 'stack');
    const fp3 = getErrorFingerprint('other', 'stack');
    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });

  it('normalizeError gère Error, string et valeurs inconnues', () => {
    const err = new Error('boom');
    err.stack = 'Error: boom\n    at x.ts:1:1';
    expect(normalizeError(err)).toEqual({
      message: 'boom',
      stack: 'Error: boom\n    at x.ts:1:1',
    });
    expect(normalizeError('plain')).toEqual({ message: 'plain', stack: '' });
    expect(normalizeError({ foo: 1 })).toEqual({
      message: '[object Object]',
      stack: '',
    });
  });

  it('formatRouteLabel retourne le hash en mode hash routing', () => {
    expect(formatRouteLabel('/app', '?foo=1', '#/userspace')).toBe('#/userspace');
  });

  it('formatRouteLabel inclut pathname et search sans hash', () => {
    expect(formatRouteLabel('/app', '?foo=1', '')).toBe('/app?foo=1');
  });
});
