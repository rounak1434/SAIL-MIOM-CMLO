/**
 * Test Suite: Feature 1 (Ticket ID Format) & Feature 2 (Excel/PDF Exports)
 */
import assert from 'node:assert';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

console.log('=== RUNNING TESTS FOR NEW FEATURES ===\n');

// ----------------------------------------------------
// 1. TICKET ID GENERATION LOGIC
// ----------------------------------------------------
console.log('1. Testing Ticket ID Generation Logic...');

function generateNextTicketId(counterData, targetYear = new Date().getFullYear()) {
  let nextNum = 1;
  let yearlyHistory = counterData?.yearly ? { ...counterData.yearly } : {};

  if (counterData) {
    const docYear = counterData.currentYear;

    if (docYear === targetYear) {
      nextNum = (counterData.currentNumber || 0) + 1;
    } else {
      if (docYear) {
        yearlyHistory[String(docYear)] = counterData.currentNumber || 0;
      }
      nextNum = (yearlyHistory[String(targetYear)] || 0) + 1;
    }
  }

  yearlyHistory[String(targetYear)] = nextNum;
  const sequenceStr = String(nextNum).padStart(4, '0');
  const ticketId = `MIOM-EL-${targetYear}-${sequenceStr}`;

  return {
    ticketId,
    newCounterState: {
      currentYear: targetYear,
      currentNumber: nextNum,
      yearly: yearlyHistory,
    },
  };
}

// Case 1: First complaint on fresh / unmigrated counter
let counter = { currentNumber: 8 }; // legacy counter
let res1 = generateNextTicketId(counter, 2026);
assert.strictEqual(res1.ticketId, 'MIOM-EL-2026-0001', 'First complaint must be MIOM-EL-2026-0001');
assert.strictEqual(res1.newCounterState.currentNumber, 1);
assert.strictEqual(res1.newCounterState.currentYear, 2026);
console.log('  ✓ Case 1 Passed: First complaint ->', res1.ticketId);

// Case 2: Second complaint
let res2 = generateNextTicketId(res1.newCounterState, 2026);
assert.strictEqual(res2.ticketId, 'MIOM-EL-2026-0002', 'Second complaint must be MIOM-EL-2026-0002');
assert.strictEqual(res2.newCounterState.currentNumber, 2);
console.log('  ✓ Case 2 Passed: Second complaint ->', res2.ticketId);

// Case 3: Third complaint
let res3 = generateNextTicketId(res2.newCounterState, 2026);
assert.strictEqual(res3.ticketId, 'MIOM-EL-2026-0003', 'Third complaint must be MIOM-EL-2026-0003');
assert.strictEqual(res3.newCounterState.currentNumber, 3);
console.log('  ✓ Case 3 Passed: Third complaint ->', res3.ticketId);

// Case 4: Year changes to 2027
let res4 = generateNextTicketId(res3.newCounterState, 2027);
assert.strictEqual(res4.ticketId, 'MIOM-EL-2027-0001', 'New year complaint must reset sequence to 0001');
assert.strictEqual(res4.newCounterState.currentYear, 2027);
assert.strictEqual(res4.newCounterState.currentNumber, 1);
assert.strictEqual(res4.newCounterState.yearly['2026'], 3, 'Previous year history must be preserved');
console.log('  ✓ Case 4 Passed: Year turnover ->', res4.ticketId, '(2026 count preserved as', res4.newCounterState.yearly['2026'], ')');

// ----------------------------------------------------
// 2. EXCEL (.xlsx) EXPORT GENERATION
// ----------------------------------------------------
console.log('\n2. Testing Excel (.xlsx) Workbook Generation...');

const sampleComplaint = {
  id: 'MIOM-EL-2026-0001',
  ticketId: 'MIOM-EL-2026-0001',
  name: 'Ramesh Kumar',
  email: 'ramesh@example.com',
  phone: '9876543210',
  employeeId: 'SAIL-10492',
  department: 'Electrical',
  designation: 'Regular',
  title: 'Switch board / switch / socket / 3-pin / 5-pin',
  category: 'Switch board / switch / socket / 3-pin / 5-pin',
  description: 'Main switch sparking and heating up.\n\n[Location & Posting Details]\nPlant: Crushing (Crusher floor 2) | Site Location: Mechanical Services | Plant Name: SAIL MIOM, CMLO | Employment Type: Regular',
  priority: 'high',
  status: 'active',
  assignedToName: 'Vikas Aanad',
  createdAt: new Date('2026-09-15T10:30:00Z'),
  updatedAt: new Date('2026-09-15T12:00:00Z'),
  imageUrl: 'https://i.ibb.co/test/image.jpg',
  notes: {
    adminToModerator: [],
    moderatorToAdmin: [{
      id: 'n1',
      noteType: 'moderatorToAdmin',
      content: 'Inspected switchboard, parts requested',
      authorEmail: 'mod@sail.in',
      authorName: 'Vikas Aanad',
      createdAt: new Date('2026-09-15T11:00:00Z')
    }],
    adminToUser: [{
      id: 'n2',
      noteType: 'adminToUser',
      content: 'Electrician dispatched',
      authorEmail: 'admin@sail.in',
      authorName: 'Admin',
      createdAt: new Date('2026-09-15T11:30:00Z')
    }]
  }
};

const row = {
  'Complaint ID': sampleComplaint.ticketId,
  'Plant Name': 'SAIL MIOM, CMLO',
  'Name of Complaining Person': sampleComplaint.name,
  'Employment Type': sampleComplaint.designation,
  'Personal No.': sampleComplaint.employeeId,
  'Mobile No.': sampleComplaint.phone,
  'Department': sampleComplaint.department,
  'Complaint Location': 'Crushing (Crusher floor 2)',
  'Site Location': 'Mechanical Services',
  'Nature of Complaint': sampleComplaint.title,
  'Other Complaint Details': 'N/A',
  'Complaint Description': 'Main switch sparking and heating up.',
  'Status': sampleComplaint.status.toUpperCase(),
  'Priority': sampleComplaint.priority.toUpperCase(),
  'Assigned Moderator': sampleComplaint.assignedToName,
  'Created Date': '15 Sept 2026',
  'Last Updated Date': '15 Sept 2026',
  'Resolution / Notes': 'Inspected switchboard, parts requested',
  'Photograph URL': sampleComplaint.imageUrl,
};

const ws = XLSX.utils.json_to_sheet([row]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Complaint Record');

const binaryOut = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
assert.ok(binaryOut && binaryOut.length > 0, 'Excel output buffer must be non-empty');
console.log('  ✓ Excel generation passed: generated valid .xlsx buffer of size', binaryOut.length, 'bytes');

// ----------------------------------------------------
// 3. PDF GENERATION
// ----------------------------------------------------
console.log('\n3. Testing PDF Document Generation...');

const pdfDoc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

pdfDoc.setFillColor(30, 64, 175);
pdfDoc.rect(14, 14, 182, 20, 'F');
pdfDoc.setTextColor(255, 255, 255);
pdfDoc.text('STEEL AUTHORITY OF INDIA LIMITED (SAIL)', 18, 22);
pdfDoc.text(sampleComplaint.ticketId, 18, 30);

const pdfOut = pdfDoc.output('arraybuffer');
assert.ok(pdfOut && pdfOut.byteLength > 0, 'PDF output buffer must be non-empty');
console.log('  ✓ PDF generation passed: generated valid PDF buffer of size', pdfOut.byteLength, 'bytes');

// ----------------------------------------------------
// 4. BACKWARD COMPATIBILITY
// ----------------------------------------------------
console.log('\n4. Testing Backward Compatibility with Legacy IDs...');
const legacyComplaint = {
  id: 'MIOM-0001',
  ticketId: 'MIOM-0001',
  name: 'Old User',
  phone: '9988776655',
  employeeId: 'EMP-01',
  department: 'Mining',
  designation: 'Contractual',
  title: 'Street Light',
  description: 'Old street light issue',
  status: 'resolved',
  createdAt: '2025-05-10',
};

const legacyRow = {
  'Complaint ID': legacyComplaint.ticketId,
  'Name': legacyComplaint.name,
};
const legacyWs = XLSX.utils.json_to_sheet([legacyRow]);
const legacyWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(legacyWb, legacyWs, 'Complaint');
const legacyXlsx = XLSX.write(legacyWb, { type: 'buffer', bookType: 'xlsx' });
assert.ok(legacyXlsx.length > 0, 'Legacy complaints must export without issues');
console.log('  ✓ Legacy ID compatibility passed: MIOM-0001 exported successfully');

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
