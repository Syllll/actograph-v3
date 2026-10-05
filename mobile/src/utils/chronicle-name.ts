/**
 * Compute the next duplicate name: "Ma chronique" → "Ma chronique (1)", etc.
 */
export function computeNextDuplicateName(
  sourceName: string,
  existingNames: string[]
): string {
  const suffixMatch = sourceName.match(/^(.+) \((\d+)\)$/);
  const stem = (suffixMatch ? suffixMatch[1] : sourceName).trim() || sourceName.trim() || 'Chronique';

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

/**
 * Category names must be unique (case and spaces ignored) for the protocol to be
 * editable: duplicates become "Posture", "Posture (2)", ... Readings only
 * reference observables, so renaming categories loses nothing.
 */
export function toUniqueCategoryNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((rawName) => {
    const base = rawName.trim() || 'Catégorie';
    let name = base;
    for (let index = 2; used.has(name.toLowerCase()); index++) {
      name = `${base} (${index})`;
    }
    used.add(name.toLowerCase());
    return name;
  });
}

/**
 * ASCII file name stem: "Séance été" → "Seance_ete". Kept ASCII because the
 * name also travels in multipart headers when uploading to the cloud.
 */
export function toSafeFileStem(name: string): string {
  const stem = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_');
  return stem.replace(/_/g, '') ? stem : 'chronique';
}

/** Ensures a cloud file name is safe to write and keeps a chronicle extension. */
export function toChronicleFileName(name: string, isJchronic: boolean): string {
  const match = name.match(/^(.*?)(\.j?chronic)?$/i);
  const extension = isJchronic ? '.jchronic' : '.chronic';
  return `${toSafeFileStem(match?.[1] || name)}${extension}`;
}
