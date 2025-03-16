'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.exportData = void 0;
const exceljs_1 = require('exceljs');
const exportData = async (options) => {
  const workbook = new exceljs_1.Workbook();
  for (const worksheet of options.worksheets) {
    const ws = workbook.addWorksheet(worksheet.name);
    ws.columns = worksheet.columns;
    for (const row of worksheet.rows) {
      const rowToBeInserter = [];
      for (const col of ws.columns) {
        let valueToBeInserted;
        if (typeof col.key === 'string') {
          const keyStrArray = col.key.split('.');
          let val = row;
          for (const k of keyStrArray) {
            val = val[k];
          }
          valueToBeInserted = val;
        } else if (typeof col.key === 'function') {
          valueToBeInserted = col.key(row);
        }
        rowToBeInserter.push(JSON.parse(JSON.stringify(valueToBeInserted)));
      }
      ws.addRow(rowToBeInserter);
    }
  }
  let filePath = options.filePath;
  if (options.type === 'excel') {
    if (!filePath.endsWith('.xlsx')) filePath += '.xlsx';
    await workbook.xlsx.writeFile(filePath);
  } else {
    if (!filePath.endsWith('.csv')) filePath += '.csv';
    await workbook.csv.writeFile(filePath);
  }
};
exports.exportData = exportData;
//# sourceMappingURL=export.util.js.map
