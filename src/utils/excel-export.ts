// PT AOMA Prima Medika - Excel Export Utility
// Export data to Excel using XLSX library

import { utils, writeFile } from 'xlsx';

interface ExportOptions {
  filename?: string;
  sheetName?: string;
  headers?: string[];
}

/**
 * Export data to Excel file
 * @param data Array of objects to export
 * @param options Export options (filename, sheetName, headers)
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const {
    filename = `export_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName = 'Sheet1',
    headers,
  } = options;

  try {
    // Create worksheet from data
    const worksheet = utils.json_to_sheet(data);

    // If custom headers provided, update them
    if (headers && headers.length > 0) {
      utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
    }

    // Auto-size columns
    const columnWidths = Object.keys(data[0] || {}).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...data.map((row) => String(row[key] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) }; // Max width 50
    });
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, sheetName);

    // Write file
    writeFile(workbook, filename);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Gagal export data ke Excel');
  }
}

/**
 * Export multiple sheets to one Excel file
 */
export function exportMultipleSheetsToExcel(
  sheets: Array<{ data: any[]; sheetName: string; headers?: string[] }>,
  filename?: string
): void {
  const file = filename || `export_multi_${new Date().toISOString().split('T')[0]}.xlsx`;

  try {
    const workbook = utils.book_new();

    sheets.forEach(({ data, sheetName, headers }) => {
      const worksheet = utils.json_to_sheet(data);

      if (headers && headers.length > 0) {
        utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
      }

      // Auto-size columns
      const columnWidths = Object.keys(data[0] || {}).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...data.map((row) => String(row[key] || '').length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet['!cols'] = columnWidths;

      utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    writeFile(workbook, file);
  } catch (error) {
    console.error('Error exporting multiple sheets to Excel:', error);
    throw new Error('Gagal export data ke Excel');
  }
}

/**
 * Format data for Excel export (convert dates, numbers, etc.)
 */
export function formatDataForExport<T extends Record<string, any>>(
  data: T[],
  formatters?: Record<string, (value: any) => any>
): any[] {
  if (!formatters) return data;

  return data.map((row) => {
    const formattedRow: Record<string, any> = {};
    Object.keys(row).forEach((key) => {
      if (formatters[key]) {
        formattedRow[key] = formatters[key](row[key]);
      } else {
        formattedRow[key] = row[key];
      }
    });
    return formattedRow;
  });
}
