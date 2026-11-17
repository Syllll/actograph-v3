import ExcelJS from 'exceljs';
import { exchangeDocumentToTable, parseExchangeTable, ObservationModeEnum, ReadingTypeEnum, type ReadingExchangeDocument } from '@actograph/core';

test('XLSX preserves formula-like text, multiline text and long millisecond durations', async () => {
  const input: ReadingExchangeDocument = {
    format: 'actograph-tabular', version: 1, kind: 'readings', mode: ObservationModeEnum.Chronometer,
    readings: [{ order: 0, type: ReadingTypeEnum.DATA, name: '=1+1', description: 'é\n"texte"', time: 90061001 }],
  };
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('readings');
  exchangeDocumentToTable(input).forEach((row) => sheet.addRow(row));
  const bytes = await workbook.xlsx.writeBuffer();
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(bytes);
  const table: string[][] = [];
  reopened.worksheets[0].eachRow({ includeEmpty: true }, (row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, index) => { values[index - 1] = cell.value == null ? '' : String(cell.value); });
    table.push(values);
  });
  expect(reopened.worksheets[0].getCell('C3').type).toBe(ExcelJS.ValueType.String);
  expect(parseExchangeTable(table, 'readings', ObservationModeEnum.Chronometer)).toEqual(input);
});
