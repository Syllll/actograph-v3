import { timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

/** A per-launch secret protects the local API even before local JWT login. */
export function desktopTokenGuard(token: string) {
  const expected = Buffer.from(token);
  return (request: Request, response: Response, next: NextFunction): void => {
    const supplied = Buffer.from(request.get('X-Actograph-Token') || '');
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      response.status(403).json({ message: 'Invalid desktop session' });
      return;
    }
    next();
  };
}

/** Quasar dev ports vary; only loopback origins may access the desktop dev API. */
export function desktopDevCorsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow: boolean) => void,
): void {
  if (!origin) {
    callback(null, true);
    return;
  }
  try {
    const url = new URL(origin);
    callback(
      null,
      (url.protocol === 'http:' || url.protocol === 'https:') &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
    );
  } catch {
    callback(null, false);
  }
}
