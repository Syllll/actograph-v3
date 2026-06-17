/**
 * Compute the next duplicate name: "Ma chronique" → "Ma chronique (1)", etc.
 */
export function computeNextDuplicateName(
  sourceName: string,
  existingNames: string[]
): string {
  const suffixMatch = sourceName.match(/^(.+) \((\d+)\)$/);
  const stem = (suffixMatch ? suffixMatch[1] : sourceName).trim();

  let maxSuffix = 0;
  const escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escapedStem}(?: \\((\\d+)\\))?$`);

  for (const name of existingNames) {
    const match = name.trim().match(re);
    if (match) {
      const suffix = match[1] ? parseInt(match[1], 10) : 0;
      maxSuffix = Math.max(maxSuffix, suffix);
    }
  }

  return `${stem} (${maxSuffix + 1})`;
}
