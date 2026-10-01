/** file: origins are all "null"; compare the actual entry file instead. */
export function isTrustedAppUrl(raw: string, appUrl: string): boolean {
  try {
    const target = new URL(raw);
    const entry = new URL(appUrl);
    if (entry.protocol === 'file:') {
      return (
        target.protocol === 'file:' &&
        target.host === entry.host &&
        target.pathname === entry.pathname
      );
    }
    return (
      (entry.protocol === 'http:' || entry.protocol === 'https:') &&
      target.origin === entry.origin
    );
  } catch {
    return false;
  }
}

export function isSafeExternalUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Cloud forwarding never accepts arbitrary hosts or redirects. */
export function isTrustedCloudUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.origin === 'https://actograph.io' &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith('/api/')
    );
  } catch {
    return false;
  }
}
