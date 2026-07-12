const EXCEL_INVALID_SHEET_NAME_CHARS = /[\\/*?:\[\]]/g;
const EXCEL_SHEET_NAME_MAX_LENGTH = 31;

export const sanitizeWorksheetName = (name: string): string => {
  const sanitized = name
    .replace(EXCEL_INVALID_SHEET_NAME_CHARS, '-')
    .replace(/^'+|'+$/g, '')
    .trim();
  return (sanitized || 'Sheet').slice(0, EXCEL_SHEET_NAME_MAX_LENGTH);
};
