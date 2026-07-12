const EXCEL_INVALID_SHEET_NAME_CHARS = /[\\/*?:\[\]]/g;
const EXCEL_SHEET_NAME_MAX_LENGTH = 31;

export const sanitizeWorksheetName = (name: string): string => {
  const sanitized = name
    .replace(EXCEL_INVALID_SHEET_NAME_CHARS, '-')
    .replace(/^'+|'+$/g, '')
    .trim();
  return (sanitized || 'Sheet').slice(0, EXCEL_SHEET_NAME_MAX_LENGTH);
};

const withSuffix = (base: string, counter: number): string => {
  const suffix = `-${counter}`;
  const maxBaseLength = Math.max(1, EXCEL_SHEET_NAME_MAX_LENGTH - suffix.length);
  return `${base.slice(0, maxBaseLength)}${suffix}`;
};

export const ensureUniqueWorksheetNames = (names: string[]): string[] => {
  const used = new Set<string>();

  return names.map((name) => {
    const base = sanitizeWorksheetName(name);
    let candidate = base;
    let counter = 2;

    while (used.has(candidate)) {
      candidate = withSuffix(base, counter);
      counter += 1;
    }

    used.add(candidate);
    return candidate;
  });
};
