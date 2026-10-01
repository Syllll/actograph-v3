import { desktopTokenGuard, desktopDevCorsOrigin } from './desktop-http';
import type { Request, Response } from 'express';

test.each(['', 'wrong', 'x'.repeat(64)])(
  'rejects an absent or wrong session token (%s)',
  (token) => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const next = jest.fn();
    desktopTokenGuard('secret')(
      { get: () => token } as unknown as Request,
      { status } as unknown as Response,
      next,
    );
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  },
);
test('allows the current desktop session', () => {
  const next = jest.fn();
  desktopTokenGuard('secret')(
    { get: () => 'secret' } as unknown as Request,
    {} as Response,
    next,
  );
  expect(next).toHaveBeenCalled();
});

test.each([
  'http://localhost:8481',
  'http://127.0.0.1:8482',
  'http://[::1]:8080',
])('allows loopback Quasar dev origins: %s', (origin) => {
  const callback = jest.fn();
  desktopDevCorsOrigin(origin, callback);
  expect(callback).toHaveBeenCalledWith(null, true);
});
test.each([
  'null',
  'https://evil.test',
  'file:///tmp/a',
  'http://localhost.evil.test',
])('rejects unrelated dev origins: %s', (origin) => {
  const callback = jest.fn();
  desktopDevCorsOrigin(origin, callback);
  expect(callback).toHaveBeenCalledWith(null, false);
});
