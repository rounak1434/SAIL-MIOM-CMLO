/**
 * SAIL-MIOM – Filtered Complaints Excel Export Test Suite
 * =======================================================
 * Validates:
 * 1. From/To date range filtering (inclusive days, undated complaints, Firestore timestamps).
 * 2. Formula neutralization of exported text.
 * 3. Workbook layout: table columns, header filter dropdowns, column widths, Description wrapping,
 *    export details.
 * 4. Dashboard wiring: export and Print Range use every filter plus the date range; per-complaint export kept.
 */

import assert from 'assert';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { strFromU8, unzipSync } from 'fflate';
import { getDateRangeError, isWithinDateRange } from '../src/utils/complaintFilters.ts';
import { escapeHtml, getComplaintDescription } from '../src/utils/complaintText.ts';
import {
  buildComplaintListWorkbook,
  neutralizeFormula,
  writeComplaintListFile,
  COMPLAINT_LIST_COLUMNS,
  DESCRIPTION_COLUMN_WIDTH,
} from '../src/utils/complaintListExport.ts';

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (error) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${error.message}`);
    throw error;
  }
}

// Unzips the exact .xlsx bytes the download saves and returns each XML part as text
const savedFiles = (rows, appliedFilters = []) =>
  Object.fromEntries(
    Object.entries(unzipSync(writeComplaintListFile(rows, appliedFilters))).map(([name, bytes]) => [name, strFromU8(bytes)])
  );
const savedXml = (rows, appliedFilters) => Object.values(savedFiles(rows, appliedFilters)).join('\n');

const row = (overrides = {}) => ({
  ticketId: 'CMP-001',
  name: 'Test Person',
  description: 'Street light near Qtr B-12 has not worked since Monday evening.',
  category: 'Electrical Complaint',
  status: 'Pending',
  priority: 'HIGH',
  assignedTo: 'Unassigned',
  ...overrides,
});

console.log('\n======================================================');
console.log('🧪 RUNNING FILTERED COMPLAINTS EXPORT TEST SUITE');
console.log('======================================================\n');

await runTest('1. No date range keeps every complaint, including undated ones', () => {
  assert.strictEqual(isWithinDateRange(null, '', ''), true);
  assert.strictEqual(isWithinDateRange(new Date(2026, 10, 3), '', ''), true);
});

await runTest('2. Date range is inclusive of whole From and To days', () => {
  assert.strictEqual(isWithinDateRange(new Date(2026, 10, 1, 0, 0, 0), '2026-11-01', '2026-11-03'), true);
  assert.strictEqual(isWithinDateRange(new Date(2026, 10, 3, 23, 59, 59), '2026-11-01', '2026-11-03'), true);
  assert.strictEqual(isWithinDateRange(new Date(2026, 9, 31, 23, 59, 59), '2026-11-01', '2026-11-03'), false);
  assert.strictEqual(isWithinDateRange(new Date(2026, 10, 4, 0, 0, 0), '2026-11-01', '2026-11-03'), false);
});

await runTest('3. Single-sided ranges, undated complaints and Firestore timestamp shapes', () => {
  assert.strictEqual(isWithinDateRange(new Date(2026, 10, 5), '2026-11-02', ''), true);
  assert.strictEqual(isWithinDateRange(new Date(2026, 10, 1), '2026-11-02', ''), false);
  assert.strictEqual(isWithinDateRange(new Date(2026, 9, 1), '', '2026-11-02'), true);
  assert.strictEqual(isWithinDateRange(undefined, '2026-11-01', ''), false, 'Undated complaint is excluded once a range is set');

  const at = new Date(2026, 10, 2, 12, 0, 0);
  assert.strictEqual(isWithinDateRange({ toDate: () => at }, '2026-11-02', '2026-11-02'), true);
  assert.strictEqual(isWithinDateRange({ seconds: Math.floor(at.getTime() / 1000) }, '2026-11-02', '2026-11-02'), true);
});

await runTest('4. Text that could run as a formula is prefixed with an apostrophe', () => {
  for (const risky of ['=HYPERLINK("x")', '+1+1', '-2+3', '@SUM(A1)', '\tcmd', '\rcmd', '  =1+1']) {
    assert.strictEqual(neutralizeFormula(risky), `'${risky}`, `Expected ${JSON.stringify(risky)} to be neutralized`);
  }
  assert.strictEqual(neutralizeFormula('Street light 3-phase'), 'Street light 3-phase');
  assert.strictEqual(neutralizeFormula(null), '');
  assert.strictEqual(neutralizeFormula(undefined), '');
});

await runTest('5. Complaints sheet uses the table columns in order and only those fields', () => {
  assert.deepStrictEqual(
    COMPLAINT_LIST_COLUMNS.map((c) => c.header),
    ['Ticket ID', 'Name', 'Description', 'Category', 'Status', 'Priority', 'Assigned To']
  );
  assert.ok(!COMPLAINT_LIST_COLUMNS.some((c) => c.header === 'Title'), 'Title column must be removed');

  const workbook = buildComplaintListWorkbook([row(), row({ ticketId: 'CMP-002' })], []);
  assert.deepStrictEqual(workbook.SheetNames, ['Complaints', 'Export Details']);

  const data = XLSX.utils.sheet_to_json(workbook.Sheets.Complaints, { header: 1 });
  assert.deepStrictEqual(data[0], COMPLAINT_LIST_COLUMNS.map((c) => c.header));
  assert.deepStrictEqual(data[1], Object.values(row()));
  assert.strictEqual(data[2][0], 'CMP-002');
  assert.strictEqual(data.length, 3);
});

await runTest('6. Header row carries filter dropdowns covering every exported row', () => {
  const rows = [row(), row(), row()];
  const workbook = buildComplaintListWorkbook(rows, []);
  assert.strictEqual(workbook.Sheets.Complaints['!autofilter'].ref, 'A1:G4');
  const xml = savedXml(rows);
  assert.ok(xml.includes('<autoFilter ref="A1:G4"'), 'Saved file must contain the autoFilter range');
  assert.ok(xml.includes('&apos;Complaints&apos;!A1:G4'), "Saved file must define Excel's filter range name");
});

await runTest('7. Column widths are readable and capped; Description gets a wide fixed column', () => {
  const workbook = buildComplaintListWorkbook([row({ name: 'x'.repeat(200), description: 'y'.repeat(500) })], []);
  const widths = workbook.Sheets.Complaints['!cols'].map((c) => c.wch);
  assert.strictEqual(widths.length, 7);
  assert.strictEqual(widths[2], DESCRIPTION_COLUMN_WIDTH, 'Description column uses its fixed wide width');
  assert.ok(DESCRIPTION_COLUMN_WIDTH >= 50, 'Description column must be wide enough to read');
  const others = widths.filter((_, i) => i !== 2);
  assert.ok(others.every((w) => w >= 10 && w <= 50), `Widths out of range: ${others}`);
  assert.strictEqual(widths[1], 50, 'Long names are capped at 50 characters wide');
  assert.strictEqual(widths[6], 'Assigned To'.length + 2);
});

await runTest('8. Saved file wraps Description cells, top-aligns data rows, and stays readable', () => {
  const rows = [row({ description: 'Line one\nLine two '.repeat(30) }), row({ ticketId: 'CMP-002' })];
  const files = savedFiles(rows);

  const cellXfs = files['xl/styles.xml'].match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/);
  const xfs = cellXfs[2].match(/<xf [\s\S]*?(?:\/>|<\/xf>)/g);
  assert.strictEqual(Number(cellXfs[1]), xfs.length, 'cellXfs count must match its entries');
  const wrapIndex = xfs.findIndex((xf) => xf.includes('wrapText="1"'));
  const topIndex = xfs.findIndex((xf) => xf.includes('vertical="top"') && !xf.includes('wrapText'));
  assert.ok(wrapIndex > 0 && topIndex > 0, 'Styles must define a wrap style and a top-align style');

  const sheet = files['xl/worksheets/sheet1.xml'];
  for (const r of [2, 3]) {
    assert.ok(new RegExp(`<c r="C${r}"[^>]* s="${wrapIndex}">`).test(sheet), `Description cell C${r} must wrap`);
    for (const col of ['A', 'B', 'D', 'E', 'F', 'G']) {
      assert.ok(new RegExp(`<c r="${col}${r}"[^>]* s="${topIndex}">`).test(sheet), `Data cell ${col}${r} must align to top`);
    }
  }
  assert.ok(!/<c r="[A-G]1"[^>]* s="/.test(sheet), 'Header row keeps the default style');
  assert.ok(!/<c [^>]*s="\d+"[^>]* s="/.test(sheet), 'No cell may carry two style attributes');

  const reread = XLSX.read(writeComplaintListFile(rows, []));
  const data = XLSX.utils.sheet_to_json(reread.Sheets.Complaints, { header: 1 });
  assert.strictEqual(data.length, 3, 'Styled file must re-open with every row');
  assert.strictEqual(data[1][2], rows[0].description, 'Description text, including line breaks, is preserved');
  assert.strictEqual(reread.Sheets.Complaints['!autofilter'].ref, 'A1:G3', 'Filter dropdowns survive styling');
});

await runTest('8a. Risky values are saved as plain text, never as formulas', () => {
  const rows = [row({ description: '=HYPERLINK("http://example.test")', name: '@cmd' })];
  const workbook = buildComplaintListWorkbook(rows, [['Search', '=1+1']]);
  const descriptionCell = workbook.Sheets.Complaints.C2;
  assert.strictEqual(descriptionCell.t, 's');
  assert.strictEqual(descriptionCell.v, '\'=HYPERLINK("http://example.test")');
  assert.strictEqual(workbook.Sheets.Complaints.B2.v, "'@cmd");
  assert.strictEqual(workbook.Sheets['Export Details'].B2.v, "'=1+1");
  const xml = savedXml(rows, [['Search', '=1+1']]);
  assert.ok(xml.includes('<sheetData>'), 'Saved file must contain the sheet XML');
  assert.ok(!xml.includes('<f>'), 'Saved file must contain no formulas');
});

await runTest('8b. Over-long cell text is cut to Excel’s 32,767-character limit', () => {
  const workbook = buildComplaintListWorkbook([row({ description: 'z'.repeat(40000) })], []);
  assert.strictEqual(workbook.Sheets.Complaints.C2.v.length, 32767);
});

await runTest('9. Export Details sheet records the applied filters and the count', () => {
  const workbook = buildComplaintListWorkbook([row(), row()], [
    ['Status', 'Pending'],
    ['From Date', '1/11/2026'],
  ]);
  const details = XLSX.utils.sheet_to_json(workbook.Sheets['Export Details'], { header: 1 });
  assert.deepStrictEqual(details, [
    ['Filter', 'Value'],
    ['Status', 'Pending'],
    ['From Date', '1/11/2026'],
    ['Complaints exported', '2'],
  ]);
});

await runTest('10. Table and export share all filters plus the date range; per-complaint Excel kept', () => {
  const dashboard = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
  assert.ok(
    dashboard.includes('const displayedComplaints = filteredComplaints.filter((c) => isWithinDateRange(c.createdAt, dateFrom, dateTo))'),
    'Displayed list must apply the date range on top of the other filters'
  );
  assert.ok(dashboard.includes('{displayedComplaints.map((complaint) => {'), 'Table must render the date-filtered list');
  assert.ok(!dashboard.includes('{filteredComplaints.map('), 'Table must not bypass the date range');
  assert.ok(dashboard.includes('const rows = displayedComplaints.map('), 'Export must use the same list as the table');
  assert.ok(dashboard.includes('No complaints match the current filters.'), 'Empty table must say no complaints match');
  assert.ok(dashboard.includes('Export Filtered Complaints'), 'Dashboard must show the Export Filtered Complaints button');
  assert.ok(dashboard.includes('displayedComplaints.length === 0'), 'Empty results must be handled before exporting');
  assert.ok(dashboard.includes('onClick={() => downloadComplaintExcel(complaint)}'), 'Per-complaint Excel export must remain');
  assert.ok(dashboard.includes('onClick={() => downloadComplaintExcel(selectedComplaint)}'), 'Modal Excel export must remain');
});

await runTest('11. To Date earlier than From Date is reported; valid or one-sided ranges are not', () => {
  assert.strictEqual(getDateRangeError('2026-11-05', '2026-11-04'), 'To Date cannot be earlier than From Date.');
  assert.strictEqual(getDateRangeError('2026-11-05', '2026-11-05'), '', 'Same-day range is valid');
  assert.strictEqual(getDateRangeError('2026-11-01', '2026-11-05'), '');
  assert.strictEqual(getDateRangeError('2026-11-05', ''), '', 'From Date alone is valid');
  assert.strictEqual(getDateRangeError('', '2026-11-05'), '', 'To Date alone is valid');
  assert.strictEqual(getDateRangeError('', ''), '');
});

await runTest('12. Date pickers drive the list; invalid range blocks export and print; Clear resets dates', () => {
  const dashboard = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
  const dateInputs = dashboard.match(/type="date"/g) || [];
  assert.strictEqual(dateInputs.length, 2, 'Exactly one From Date and one To Date picker');
  assert.ok(dashboard.includes('value={dateFrom}') && dashboard.includes('onChange={(e) => setDateFrom(e.target.value)}'));
  assert.ok(dashboard.includes('value={dateTo}') && dashboard.includes('onChange={(e) => setDateTo(e.target.value)}'));

  assert.ok(dashboard.includes('const dateRangeError = getDateRangeError(dateFrom, dateTo)'));
  assert.ok(dashboard.includes('role="alert"') && dashboard.includes('{dateRangeError}'), 'Validation message must be shown');

  const exportHandler = dashboard.slice(dashboard.indexOf('const handleExportFiltered'), dashboard.indexOf('const rows = displayedComplaints.map('));
  assert.ok(exportHandler.includes('if (dateRangeError)'), 'Export must stop on an invalid range');
  assert.ok(dashboard.includes('disabled={!!dateRangeError}'), 'Export button must be disabled on an invalid range');
  assert.ok(dashboard.includes('Export Filtered Complaints ({dateRangeError ? 0 : displayedComplaints.length})'));

  const printHandler = dashboard.slice(dashboard.indexOf('const handlePrintByDate'), dashboard.indexOf('const rangeLabel'));
  assert.ok(printHandler.includes('if (dateRangeError)'), 'Print Range must stop on an invalid range');
  assert.ok(printHandler.includes('const toPrint = displayedComplaints;'), 'Print Range must print the shown list');
  assert.ok(!dashboard.includes('getDateFilteredComplaints'), 'Print must not use separate date logic');

  const clearButton = dashboard.slice(dashboard.indexOf('setFilters({'), dashboard.indexOf('Clear Filters'));
  assert.ok(clearButton.includes("setDateFrom('')") && clearButton.includes("setDateTo('')"), 'Clear Filters must reset both dates');
  for (const field of ['search', 'status', 'category', 'priority', 'assigned']) {
    assert.ok(dashboard.includes(`value={filters.${field}}`), `${field} control must show the current filter so Clear resets it`);
  }
});

await runTest('13. Description text drops the location footer; printed text is HTML-escaped', () => {
  assert.strictEqual(
    getComplaintDescription('Fan not working in hall.\n\n[Location & Posting Details]\nLocation Type: Township | Qtr No.: B-12'),
    'Fan not working in hall.'
  );
  assert.strictEqual(getComplaintDescription('  Plain description  '), 'Plain description');
  assert.strictEqual(getComplaintDescription(undefined), '');
  assert.strictEqual(
    getComplaintDescription('[Location & Posting Details]\nLocation Type: Plant'),
    '[Location & Posting Details]\nLocation Type: Plant',
    'Falls back to the full text when only the footer exists, like the per-complaint export'
  );

  assert.strictEqual(
    escapeHtml('<img src=x onerror="alert(1)"> & \'q\''),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;q&#39;'
  );
  assert.strictEqual(escapeHtml(undefined), '');
});

await runTest('14. Excel export and Print Range show Description in place of Title, with a legible print layout', () => {
  const dashboard = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
  const exportHandler = dashboard.slice(dashboard.indexOf('const rows = displayedComplaints.map('), dashboard.indexOf('const appliedFilters'));
  assert.ok(exportHandler.includes('description: getComplaintDescription(c.description)'), 'Export rows must carry the description');
  assert.ok(!exportHandler.includes('title:'), 'Export rows must not carry the title');

  const printHandler = dashboard.slice(dashboard.indexOf('const handlePrintByDate'), dashboard.indexOf('// Print a single complaint'));
  assert.ok(
    printHandler.includes(
      '<th>Ticket ID</th><th>Name</th><th>Description</th><th>Category</th><th>Status</th><th>Priority</th><th>Assigned To</th><th>Date</th>'
    ),
    'Print Range headers must replace Title with Description'
  );
  assert.ok(!printHandler.includes('<th>Title</th>') && !printHandler.includes('c.title'), 'Print Range must not show the title');
  assert.ok(printHandler.includes('<h1>Complaints Report</h1>'), 'Report heading stays');
  assert.ok(printHandler.includes('<td class="description">${escapeHtml(getComplaintDescription(c.description))}</td>'));
  assert.ok(printHandler.includes('@page { size: A4 landscape'), 'Report prints landscape for the extra width');
  assert.ok(printHandler.includes('table-layout: fixed') && printHandler.includes('white-space: pre-wrap'), 'Description wraps in fixed columns');
  assert.strictEqual((printHandler.match(/<col style="width:\d+%">/g) || []).length, 8, 'Every printed column has a set width');
  const totalWidth = [...printHandler.matchAll(/<col style="width:(\d+)%">/g)].reduce((sum, m) => sum + Number(m[1]), 0);
  assert.strictEqual(totalWidth, 100, 'Printed column widths add up to the page width');
});

console.log('\n======================================================');
console.log(`Results: ${passedTests}/${totalTests} tests passed.`);
console.log('======================================================\n');
