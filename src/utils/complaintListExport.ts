import * as XLSX from 'xlsx';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

// One exported row, holding the values the All Complaints table displays.
export interface ComplaintListRow {
  ticketId: string;
  name: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  assignedTo: string;
}

export const COMPLAINT_LIST_COLUMNS: { key: keyof ComplaintListRow; header: string }[] = [
  { key: 'ticketId', header: 'Ticket ID' },
  { key: 'name', header: 'Name' },
  { key: 'description', header: 'Description' },
  { key: 'category', header: 'Category' },
  { key: 'status', header: 'Status' },
  { key: 'priority', header: 'Priority' },
  { key: 'assignedTo', header: 'Assigned To' },
];

const MIN_COLUMN_WIDTH = 10;
const MAX_COLUMN_WIDTH = 50;
export const DESCRIPTION_COLUMN_WIDTH = 60;
const MAX_CELL_LENGTH = 32767; // Excel's per-cell text limit

const DESCRIPTION_COLUMN = XLSX.utils.encode_col(COMPLAINT_LIST_COLUMNS.findIndex((c) => c.key === 'description'));
const LIST_SHEET_PATH = 'xl/worksheets/sheet1.xml';
const STYLES_PATH = 'xl/styles.xml';

/**
 * Prefixes text that a spreadsheet could read as a formula (=, +, -, @, tab or carriage return)
 * with an apostrophe, so it stays plain text even if the file is re-saved as CSV.
 */
export const neutralizeFormula = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  return /^[\t\r]|^\s*[=+\-@]/.test(text) ? `'${text}` : text;
};

const toCellText = (value: unknown) => neutralizeFormula(value).slice(0, MAX_CELL_LENGTH);

const columnWidths = (sheetRows: string[][]) =>
  sheetRows[0].map((_, col) => ({
    wch: Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(MIN_COLUMN_WIDTH, ...sheetRows.map((row) => (row[col] || '').length + 2))
    ),
  }));

/**
 * Builds a workbook with the complaint list (header row carrying filter dropdowns)
 * and a second sheet recording which dashboard filters produced it.
 */
export const buildComplaintListWorkbook = (
  rows: ComplaintListRow[],
  appliedFilters: [label: string, value: string][]
): XLSX.WorkBook => {
  const header = COMPLAINT_LIST_COLUMNS.map((c) => c.header);
  const body = rows.map((row) => COMPLAINT_LIST_COLUMNS.map((c) => toCellText(row[c.key])));
  const sheetRows = [header, ...body];

  const listSheet = XLSX.utils.aoa_to_sheet(sheetRows);
  listSheet['!cols'] = columnWidths(sheetRows).map((width, col) =>
    COMPLAINT_LIST_COLUMNS[col].key === 'description' ? { wch: DESCRIPTION_COLUMN_WIDTH } : width
  );
  listSheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: body.length, c: header.length - 1 } }),
  };

  const detailRows = [
    ['Filter', 'Value'],
    ...appliedFilters.map(([label, value]) => [toCellText(label), toCellText(value)]),
    ['Complaints exported', String(rows.length)],
  ];
  const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
  detailSheet['!cols'] = columnWidths(detailRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, listSheet, 'Complaints');
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Export Details');
  return workbook;
};

/**
 * SheetJS Community Edition does not write cell styles, so this adds them to the saved file:
 * data rows align to the top, and Description cells also wrap their text.
 */
const applyListCellStyles = (xlsxBytes: Uint8Array): Uint8Array => {
  const files = unzipSync(xlsxBytes);
  const styles = strFromU8(files[STYLES_PATH]);
  const cellXfs = /<cellXfs count="(\d+)">/.exec(styles);
  const sheetXml = files[LIST_SHEET_PATH] ? strFromU8(files[LIST_SHEET_PATH]) : '';
  if (!cellXfs || !styles.includes('</cellXfs>') || !sheetXml) {
    throw new Error('Unexpected workbook layout; cell styles could not be applied');
  }

  const topIndex = Number(cellXfs[1]);
  const wrapIndex = topIndex + 1;
  files[STYLES_PATH] = strToU8(
    styles
      .replace(cellXfs[0], `<cellXfs count="${topIndex + 2}">`)
      .replace(
        '</cellXfs>',
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>' +
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
          '</cellXfs>'
      )
  );

  files[LIST_SHEET_PATH] = strToU8(
    sheetXml.replace(/<c r="([A-Z]+)(\d+)"([^>]*?)(\/?)>/g, (tag, col: string, row: string, attrs: string, selfClose: string) => {
      if (row === '1') return tag;
      const style = col === DESCRIPTION_COLUMN ? wrapIndex : topIndex;
      return `<c r="${col}${row}"${attrs.replace(/\s+s="\d+"/, '')} s="${style}"${selfClose}>`;
    })
  );

  return zipSync(files);
};

// Saves the complaint list workbook as .xlsx bytes, including the Description wrap styling.
export const writeComplaintListFile = (
  rows: ComplaintListRow[],
  appliedFilters: [label: string, value: string][]
): Uint8Array => {
  const bytes = XLSX.write(buildComplaintListWorkbook(rows, appliedFilters), { type: 'array', bookType: 'xlsx' });
  return applyListCellStyles(new Uint8Array(bytes));
};

export const downloadComplaintListExcel = (
  rows: ComplaintListRow[],
  appliedFilters: [label: string, value: string][],
  filename: string
) => {
  const bytes = writeComplaintListFile(rows, appliedFilters);
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
