/**
 * Cloud login accepts any non-empty identifier (email or legacy username).
 * No email-format validation.
 */
export function isCloudLoginIdentifierFilled(
  value: string | null | undefined,
): boolean {
  return Boolean(value?.trim());
}
