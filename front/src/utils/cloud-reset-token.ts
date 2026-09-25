const UNSAFE_SCHEME = /^(javascript|data):/i;

/**
 * Extracts a password-reset token from pasted input (HTTPS URL with ?token= or raw token).
 * Rejects javascript: and data: schemes.
 */
export function extractCloudResetToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (UNSAFE_SCHEME.test(trimmed)) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }
      const token = url.searchParams.get('token');
      return token && token.length > 0 ? token : null;
    } catch {
      return null;
    }
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}
