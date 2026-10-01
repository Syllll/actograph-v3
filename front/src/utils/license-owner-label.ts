/** License owners are stored as JSON; older licenses may contain a plain name. */
export function getLicenseOwnerLabel(owner: string | null | undefined): string {
  const storedOwner = owner?.trim();
  if (!storedOwner) return '';

  let parsedOwner: unknown;
  try {
    parsedOwner = JSON.parse(storedOwner);
  } catch {
    // Do not expose broken serialized profiles in the account label or tooltip.
    return /^[{[\"]/.test(storedOwner) ? '' : storedOwner;
  }

  if (typeof parsedOwner === 'string') return parsedOwner.trim();
  if (
    !parsedOwner ||
    typeof parsedOwner !== 'object' ||
    Array.isArray(parsedOwner)
  ) {
    return '';
  }

  const profile = parsedOwner as Record<string, unknown>;
  const text = (value: unknown): string =>
    typeof value === 'string' ? value.trim() : '';
  const name = [text(profile.firstName), text(profile.lastName)]
    .filter(Boolean)
    .join(' ');

  return name || text(profile.username) || text(profile.email);
}
