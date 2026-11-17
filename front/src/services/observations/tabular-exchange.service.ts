import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import ExcelJS from 'exceljs';
import { exchangeDocumentToTable, parseExchangeTable, parseDelimitedText, serializeDelimitedText, isLegacyReadingsText, parseLegacyReadingsText, ObservationModeEnum } from '@actograph/core';
import type { TabularExchangeDocument, ExchangeDiagnostic } from '@actograph/core';

type Kind = 'readings' | 'protocol';
type Mode = 'add' | 'replace';
export interface ExchangePreview {
  revision: string;
  counts: { existing: number; incoming: number; added: number; removed: number };
  diagnostics: (ExchangeDiagnostic & { severity: 'error' | 'warning' })[];
  canApply: boolean;
}
const url = (id: number) => `${httpUtils.apiUrl()}/observations/${id}/exchange`;
const decode = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const encode = (value: Uint8Array) => {
  let output = '';
  for (let i = 0; i < value.length; i += 32768) output += String.fromCharCode(...value.subarray(i, i + 32768));
  return btoa(output);
};
export const tabularExchangeService = {
  async read(id: number, kind: Kind, mode: ObservationModeEnum, chooseTimeZone: () => Promise<string | null>, chooseSheet: (names: string[]) => Promise<string | null>): Promise<{ document: TabularExchangeDocument; legacy: boolean } | null> {
    if (!window.api) throw new Error('Electron required');
    const dialog = await window.api.showOpenDialog({ filters: [{ name: kind === 'protocol' ? 'CSV / Excel / ActoGraph 1' : 'CSV / Excel / ActoGraph 1', extensions: kind === 'protocol' ? ['csv', 'xlsx', 'chronic'] : ['csv', 'xlsx', 'txt'] }] });
    const path = dialog.filePaths?.[0];
    if (dialog.canceled || !path) return null;
    const xlsx = path.toLowerCase().endsWith('.xlsx');
    const chronic = kind === 'protocol' && path.toLowerCase().endsWith('.chronic');
    const result = xlsx || chronic ? await window.api.readFileBinary(path) : await window.api.readFile(path);
    if (!result.success || result.data == null) throw new Error(result.error || 'Cannot read file');
    if (chronic) {
      const data = new FormData();
      data.append('file', new Blob([decode(result.data) as BlobPart], { type: 'application/octet-stream' }), 'protocol.chronic');
      const response = await api().post(`${url(id)}/legacy-protocol`, data);
      return { document: response.data, legacy: true };
    }
    if (!xlsx && kind === 'readings' && isLegacyReadingsText(result.data)) {
      const timeZone = mode === ObservationModeEnum.Calendar ? await chooseTimeZone() : undefined;
      if (timeZone === null) return null;
      return { document: parseLegacyReadingsText(result.data, { mode, timeZone }), legacy: true };
    }
    let table: string[][];
    if (xlsx) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(decode(result.data) as any);
      const sheetName = workbook.worksheets.length > 1 ? await chooseSheet(workbook.worksheets.map((sheet) => sheet.name)) : workbook.worksheets[0]?.name;
      if (sheetName === null) return null;
      const sheet = sheetName ? workbook.getWorksheet(sheetName) : undefined;
      if (!sheet) throw new Error('Empty workbook');
      table = [];
      sheet.eachRow({ includeEmpty: true }, (row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell, index) => {
          const value = cell.value;
          if (value !== null && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') throw new Error('Unsupported Excel cell or formula');
          cells[index - 1] = value == null ? '' : String(value);
        });
        table.push(cells);
      });
    } else table = parseDelimitedText(result.data);
    return { document: parseExchangeTable(table, kind, mode), legacy: false };
  },
  async save(id: number, kind: Kind, format: 'csv' | 'xlsx'): Promise<boolean> {
    if (!window.api) throw new Error('Electron required');
    const snapshot = (await api().get(url(id))).data;
    const table = exchangeDocumentToTable(snapshot[kind]);
    const dialog = await window.api.showSaveDialog({ defaultPath: `${kind}.${format}`, filters: [{ name: format.toUpperCase(), extensions: [format] }] });
    if (dialog.canceled || !dialog.filePath) return false;
    let data: string;
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(kind);
      table.forEach((row) => sheet.addRow(row));
      sheet.views = [{ state: 'frozen', ySplit: 2 }];
      sheet.columns.forEach((column) => { column.width = 24; });
      const buffer = await workbook.xlsx.writeBuffer();
      data = encode(new Uint8Array(buffer));
    } else data = serializeDelimitedText(table);
    const result = await window.api.writeFile(dialog.filePath, data, { encoding: format === 'xlsx' ? 'base64' : 'utf8' });
    if (!result.success) throw new Error(result.error || 'Cannot write file');
    return true;
  },
  async preview(id: number, kind: Kind, mode: Mode, document: TabularExchangeDocument): Promise<ExchangePreview> {
    return (await api().post(`${url(id)}/preview`, { kind, mode, document })).data;
  },
  async apply(id: number, kind: Kind, mode: Mode, document: TabularExchangeDocument, revision: string) {
    return (await api().post(`${url(id)}/apply`, { kind, mode, document, revision, confirmReplace: mode === 'replace' })).data;
  },
};
