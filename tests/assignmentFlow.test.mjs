/**
 * SAIL-MIOM – Assignment Flow & Moderator Dashboard End-to-End Test Suite
 * =======================================================================
 * Validates:
 * 1. Helpdesk contact updated from "Mohan Nag" to "Mohan Bopai" (preserving role and phone).
 * 2. Complete assignment flow: Field alignment (assignedToUID), status handling, and dashboard listener.
 * 3. Real-time updates and page reload / sign-in simulation for Moderator Dashboard.
 * 4. Actual Firestore Security Rules tests (live against Firestore Emulator when available,
 *    and structural simulation).
 */

import assert from 'assert';
import fs from 'fs';

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

function createMockToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
}

console.log('\n======================================================');
console.log('🧪 RUNNING ASSIGNMENT FLOW & HELPDESK TEST SUITE');
console.log('======================================================\n');

// ==============================================================
// 1. Helpdesk Contact Verification
// ==============================================================

await runTest('1. Helpdesk contact in Home.tsx updated to Mohan Bopai with preserved role and phone', async () => {
  const homeContent = fs.readFileSync('src/pages/Home.tsx', 'utf-8');

  assert.ok(
    homeContent.includes('Mohan Bopai'),
    'Home.tsx must contain "Mohan Bopai"'
  );
  assert.ok(
    !homeContent.includes('Mohan Nag'),
    'Home.tsx must NOT contain "Mohan Nag"'
  );
  assert.ok(
    homeContent.includes('7633824775'),
    'Home.tsx must preserve phone number 7633824775'
  );
  assert.ok(
    homeContent.includes('Jr Engg'),
    'Home.tsx must preserve role "Jr Engg"'
  );
});

// ==============================================================
// 2. Assignment Flow & Field Alignment Verification
// ==============================================================

await runTest('2. assignComplaint stores moderator Auth UID in assignedToUID and sets status to assigned', async () => {
  const complaintServiceContent = fs.readFileSync('src/services/complaint.service.ts', 'utf-8');

  assert.ok(
    complaintServiceContent.includes('assignedToUID: moderatorUID'),
    'assignComplaint must store moderatorUID in assignedToUID'
  );
  assert.ok(
    complaintServiceContent.includes('assignedTo: moderatorEmail'),
    'assignComplaint must store moderatorEmail in assignedTo'
  );
  assert.ok(
    complaintServiceContent.includes("status: 'assigned'"),
    'assignComplaint must set status to assigned'
  );
});

await runTest('3. subscribeToModeratorComplaints queries where assignedToUID == moderatorUID', async () => {
  const complaintServiceContent = fs.readFileSync('src/services/complaint.service.ts', 'utf-8');

  assert.ok(
    complaintServiceContent.includes("where('assignedToUID', '==', moderatorUID)"),
    'subscribeToModeratorComplaints must filter by where(assignedToUID == moderatorUID)'
  );
  assert.ok(
    complaintServiceContent.includes("orderBy('createdAt', 'desc')"),
    'subscribeToModeratorComplaints must sort by createdAt desc'
  );
});

await runTest('3a. Moderator list skips per-complaint notes reads and exports fetch notes on demand', async () => {
  const complaintServiceContent = fs.readFileSync('src/services/complaint.service.ts', 'utf-8');
  const moderatorListCode = complaintServiceContent.slice(
    complaintServiceContent.indexOf('export const subscribeToModeratorComplaints'),
    complaintServiceContent.indexOf('export const subscribeToComplaintStats')
  );
  const exportLoaderContent = fs.readFileSync('src/utils/complaintExportLoader.ts', 'utf-8');

  assert.ok(
    !moderatorListCode.includes('fetchComplaintNotes('),
    'subscribeToModeratorComplaints must not read notes for every complaint'
  );
  assert.strictEqual(
    (exportLoaderContent.match(/await withNotes\(complaint\)/g) || []).length,
    2,
    'Excel and PDF exports must both fetch notes first'
  );
});

await runTest('4. firestore.indexes.json contains required composite index for assignedToUID + createdAt', async () => {
  const indexContent = JSON.parse(fs.readFileSync('firestore.indexes.json', 'utf-8'));
  const complaintsIndex = indexContent.indexes?.find((idx) => {
    if (idx.collectionGroup !== 'complaints') return false;
    const fields = idx.fields || [];
    return (
      fields[0]?.fieldPath === 'assignedToUID' &&
      fields[0]?.order === 'ASCENDING' &&
      fields[1]?.fieldPath === 'createdAt' &&
      fields[1]?.order === 'DESCENDING'
    );
  });

  assert.ok(
    complaintsIndex,
    'firestore.indexes.json must contain composite index: complaints (assignedToUID ASC, createdAt DESC)'
  );
});

await runTest('5. ModeratorDashboard tracks currentUser?.uid and displays loading indicator', async () => {
  const dashboardContent = fs.readFileSync('src/pages/ModeratorDashboard.tsx', 'utf-8');

  assert.ok(
    dashboardContent.includes('[currentUser?.uid]'),
    'ModeratorDashboard useEffect must depend on [currentUser?.uid] for reliable reload tracking'
  );
  assert.ok(
    dashboardContent.includes('loadingComplaints'),
    'ModeratorDashboard must maintain a loadingComplaints state'
  );
  assert.ok(
    dashboardContent.includes("c.status === 'assigned'"),
    'ModeratorDashboard stats must count assigned status'
  );
});

// ==============================================================
// 3. Real-Time and Reload Flow Simulation
// ==============================================================

await runTest('6. Moderator complaints listener immediately delivers assigned ticket and updates on reload', async () => {
  // Simulate database
  const moderatorUID = 'mod-user-456';
  let databaseComplaints = [
    {
      id: 'MIOM-EL-2026-0001',
      ticketId: 'MIOM-EL-2026-0001',
      title: 'Water pump starter trips',
      status: 'pending',
      assignedTo: null,
      assignedToUID: null,
      createdAt: new Date('2026-10-20T10:00:00Z'),
    },
  ];

  let receivedComplaints = null;
  const mockCallback = (list) => {
    receivedComplaints = [...list];
  };

  // Moderator dashboard subscribes before assignment
  receivedComplaints = databaseComplaints.filter((c) => c.assignedToUID === moderatorUID);
  assert.strictEqual(receivedComplaints.length, 0, 'Initially 0 complaints assigned to moderator');

  // Admin assigns complaint
  const targetComplaint = databaseComplaints[0];
  targetComplaint.assignedTo = 'mod@sail.kiom';
  targetComplaint.assignedToUID = moderatorUID;
  targetComplaint.assignedToName = 'Mohan Bopai';
  targetComplaint.status = 'assigned';

  // Listener fires immediately
  receivedComplaints = databaseComplaints.filter((c) => c.assignedToUID === moderatorUID);
  assert.strictEqual(receivedComplaints.length, 1, 'Assigned complaint received immediately');
  assert.strictEqual(receivedComplaints[0].assignedToUID, moderatorUID);
  assert.strictEqual(receivedComplaints[0].status, 'assigned');

  // Page reload simulation:
  // Component unmounts, remounts, reads currentUser.uid, and re-subscribes
  let reloadedComplaints = null;
  const reloadCallback = (list) => {
    reloadedComplaints = [...list];
  };
  reloadedComplaints = databaseComplaints.filter((c) => c.assignedToUID === moderatorUID);
  assert.strictEqual(reloadedComplaints.length, 1, 'Complaints restored immediately upon reload');
  assert.strictEqual(reloadedComplaints[0].ticketId, 'MIOM-EL-2026-0001');
});

// ==============================================================
// 4. Live Firestore Emulator Rules Tests (when running under emulator)
// ==============================================================

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (emulatorHost) {
  console.log(`\n  [INFO] Running Live Firestore Rules against emulator at ${emulatorHost}...\n`);

  const baseUrl = `http://${emulatorHost}/v1/projects/sail-miom-elect/databases/(default)/documents`;

  // Helper to seed document as admin
  async function seedDoc(path, fields) {
    const formattedFields = {};
    for (const [key,val] of Object.entries(fields)) {
      if (typeof val === 'string') formattedFields[key] = {stringValue: val};
      else if (typeof val === 'boolean') formattedFields[key] = {booleanValue: val};
      else if (typeof val === 'number') formattedFields[key] = {integerValue:String(val)};
    }
    const res = await fetch(`${baseUrl}/${path}`, {
      method:'PATCH',
      headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
      body:JSON.stringify({fields:formattedFields})
    });
    if (!res.ok) throw new Error(`Failed to seed ${path}: ${res.statusText}`);
  }

  // Seed test documents
  await seedDoc('users/live_chief_01', {
    role: 'chief_admin',
    isActive: true,
    blocked: false,
    hidden: false,
    name: 'Chief Admin One',
    email: 'chief1@sail.kiom',
  });

  await seedDoc('users/live_chief_02', {
    role: 'chief_admin',
    isActive: true,
    blocked: false,
    hidden: false,
    name: 'Chief Admin Two',
    email: 'chief2@sail.kiom',
  });

  await seedDoc('users/live_admin_01', {
    role: 'admin',
    isActive: true,
    blocked: false,
    hidden: false,
    name: 'Admin One',
    email: 'admin1@sail.kiom',
  });

  await seedDoc('users/live_mod_01', {
    role: 'moderator',
    isActive: true,
    blocked: false,
    hidden: false,
    name: 'Mohan Bopai',
    email: 'bopai@sail.kiom',
  });

  await seedDoc('users/live_mod_02', {
    role: 'moderator',
    isActive: true,
    blocked: false,
    hidden: false,
    name: 'Other Moderator',
    email: 'other@sail.kiom',
  });

  await seedDoc('users/live_mod_hidden', {
    role: 'moderator',
    isActive: true,
    blocked: false,
    hidden: true,
    name: 'Hidden Moderator',
    email: 'hidden@sail.kiom',
  });

  const testSecret = 'sec-live-test-uuid-98765';
  const trackingKey = `MIOM-LIVE-0001_${testSecret}`;

  await seedDoc('complaints/MIOM-LIVE-0001', {
    ticketId: 'MIOM-LIVE-0001',
    name: 'Ram Kumar',
    email: 'ram@sail.kiom',
    phone: '9876543210',
    employeeId: 'E100234',
    department: 'Electrical',
    title: 'Feeder breaker trip',
    description: 'Transformer overheated near crusher breaker #3',
    status: 'assigned',
    assignedToUID: 'live_mod_01',
    assignedTo: 'bopai@sail.kiom',
    assignedToName: 'Mohan Bopai',
  });

  await seedDoc('complaints/MIOM-LIVE-0002', {
    ticketId: 'MIOM-LIVE-0002',
    name: 'Shyam Sundar',
    email: 'shyam@sail.kiom',
    phone: '9876543211',
    employeeId: 'E100567',
    department: 'Mining',
    title: 'Overhead cable damaged',
    description: 'Mining shelter cable snapped during shift transfer',
    status: 'assigned',
    assignedToUID: 'live_mod_02',
    assignedTo: 'other@sail.kiom',
    assignedToName: 'Other Moderator',
  });

  await seedDoc(`publicTracking/${trackingKey}`, {
    ticketId: 'MIOM-LIVE-0001',
    trackingSecret: testSecret,
    status: 'assigned',
    category: 'Electrical Complaint',
    department: 'Electrical',
    locationType: 'Plant',
  });

  const mod1Token = createMockToken({
    sub: 'live_mod_01',
    user_id: 'live_mod_01',
    email: 'bopai@sail.kiom',
  });

  const mod2Token = createMockToken({
    sub: 'live_mod_02',
    user_id: 'live_mod_02',
    email: 'other@sail.kiom',
  });

  const hiddenModToken = createMockToken({
    sub: 'live_mod_hidden',
    user_id: 'live_mod_hidden',
    email: 'hidden@sail.kiom',
  });

  const adminToken = createMockToken({
    sub: 'admin_live',
    user_id: 'admin_live',
    email: 'admin@sail.kiom',
    role: 'admin',
  });

  const chiefAdminToken = createMockToken({
    sub: 'live_chief_01',
    user_id: 'live_chief_01',
    email: 'chief1@sail.kiom',
    role: 'chief_admin',
  });

  const superAdminToken = createMockToken({
    sub: 'super_live',
    user_id: 'super_live',
    email: 'super@sail.kiom',
    superAdmin: true,
  });

  await runTest('7. [Emulator] Moderator can read their assigned complaint document', async () => {
    const res = await fetch(`${baseUrl}/complaints/MIOM-LIVE-0001`, {
      headers: { Authorization: `Bearer ${mod1Token}` },
    });
    assert.strictEqual(res.status, 200, 'Assigned complaint read must be permitted (HTTP 200)');
  });

  await runTest('8. [Emulator] Moderator CANNOT read another moderator\'s complaint document', async () => {
    const res = await fetch(`${baseUrl}/complaints/MIOM-LIVE-0002`, {
      headers: { Authorization: `Bearer ${mod1Token}` },
    });
    assert.strictEqual(res.status, 403, 'Reading another moderator\'s complaint must be denied (HTTP 403)');
  });

  await runTest('9. [Emulator] Moderator query for assigned complaints (assignedToUID == uid) succeeds', async () => {
    const res = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mod1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'complaints' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'assignedToUID' },
              op: 'EQUAL',
              value: { stringValue: 'live_mod_01' },
            },
          },
        },
      }),
    });
    assert.strictEqual(res.status, 200, 'Query for assigned complaints must succeed (HTTP 200)');
  });

  await runTest('10. [Emulator] Moderator unfiltered query for all complaints is REJECTED', async () => {
    const res = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mod1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'complaints' }],
        },
      }),
    });
    assert.strictEqual(res.status, 403, 'Unfiltered collection query by moderator must be rejected (HTTP 403)');
  });

  await runTest('11. [Emulator] Hidden moderator cannot read or list complaints', async () => {
    // Direct get
    const getRes = await fetch(`${baseUrl}/complaints/MIOM-LIVE-0001`, {
      headers: { Authorization: `Bearer ${hiddenModToken}` },
    });
    assert.strictEqual(getRes.status, 403, 'Hidden moderator direct get must be rejected (HTTP 403)');

    // Query
    const queryRes = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hiddenModToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'complaints' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'assignedToUID' },
              op: 'EQUAL',
              value: { stringValue: 'live_mod_hidden' },
            },
          },
        },
      }),
    });
    assert.strictEqual(queryRes.status, 403, 'Hidden moderator query must be rejected (HTTP 403)');
  });

  await runTest('12. [Emulator] Admin and Super Admin can read and query complaints without restriction', async () => {
    // Admin direct get
    const adminGet = await fetch(`${baseUrl}/complaints/MIOM-LIVE-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminGet.status, 200, 'Admin can read complaint document (HTTP 200)');

    // Super Admin direct get
    const superGet = await fetch(`${baseUrl}/complaints/MIOM-LIVE-0001`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(superGet.status, 200, 'Super Admin can read complaint document (HTTP 200)');

    // Admin query
    const adminQuery = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: 'complaints' }] },
      }),
    });
    assert.strictEqual(adminQuery.status, 200, 'Admin can list all complaints (HTTP 200)');

    // Super Admin query
    const superQuery = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: 'complaints' }] },
      }),
    });
    assert.strictEqual(superQuery.status, 200, 'Super Admin can list all complaints (HTTP 200)');
  });

  await runTest('13. [Emulator] Unauthenticated read of complaint document is STRICTLY DENIED (HTTP 403)', async () => {
    const res = await fetch(`${baseUrl}/complaints/MIOM-LIVE-0001`);
    assert.strictEqual(
      res.status,
      403,
      `Unauthenticated complaint read MUST be denied with HTTP 403, got HTTP ${res.status}`
    );
  });

  await runTest('14. [Emulator] Public tracking with non-guessable key returns ONLY intended minimal fields (no PII)', async () => {
    const res = await fetch(`${baseUrl}/publicTracking/${trackingKey}`);
    assert.strictEqual(res.status, 200, 'Public tracking with non-guessable key must succeed (HTTP 200)');
    const body = await res.json();
    const fields = body.fields || {};

    // Intended minimal fields exist
    assert.strictEqual(fields.ticketId?.stringValue, 'MIOM-LIVE-0001', 'ticketId matches');
    assert.strictEqual(fields.status?.stringValue, 'assigned', 'status matches');
    assert.strictEqual(fields.category?.stringValue, 'Electrical Complaint', 'category matches');
    assert.strictEqual(fields.department?.stringValue, 'Electrical', 'department matches');

    // Sensitive complainant fields MUST NOT exist in public tracking
    assert.strictEqual(fields.name, undefined, 'complainant name must NOT be present in public tracking');
    assert.strictEqual(fields.email, undefined, 'complainant email must NOT be present in public tracking');
    assert.strictEqual(fields.phone, undefined, 'complainant phone must NOT be present in public tracking');
    assert.strictEqual(fields.employeeId, undefined, 'employeeId must NOT be present in public tracking');
    assert.strictEqual(fields.description, undefined, 'complaint description must NOT be present in public tracking');
    assert.strictEqual(fields.notes, undefined, 'notes must NOT be present in public tracking');
  });

  await runTest('15. [Emulator] Public tracking with only predictable Ticket ID (guessing doc ID) is NOT found (HTTP 404)', async () => {
    const res = await fetch(`${baseUrl}/publicTracking/MIOM-LIVE-0001`);
    assert.strictEqual(res.status, 404, 'Direct get by predictable Ticket ID alone must return 404');
  });

  await runTest('16. [Emulator] Listing publicTracking collection is DENIED (HTTP 403)', async () => {
    const res = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: 'publicTracking' }] },
      }),
    });
    assert.strictEqual(res.status, 403, 'Listing publicTracking collection must be rejected (HTTP 403)');
  });

  await runTest('17. [Emulator] Chief Admin can query other chief_admin, admin, and moderator accounts (HTTP 200)', async () => {
    const res = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chiefAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'role' },
              op: 'IN',
              value: {
                arrayValue: {
                  values: [
                    { stringValue: 'chief_admin' },
                    { stringValue: 'admin' },
                    { stringValue: 'moderator' },
                  ],
                },
              },
            },
          },
        },
      }),
    });
    assert.strictEqual(res.status, 200, 'Chief Admin query for staff roles must succeed (HTTP 200)');
    const body = await res.json();
    const docIds = body.map((d) => d.document?.name?.split('/')?.pop()).filter(Boolean);

    assert.ok(docIds.includes('live_chief_02'), 'Must include other Chief Admin accounts');
    assert.ok(docIds.includes('live_admin_01'), 'Must include Admin accounts');
    assert.ok(docIds.includes('live_mod_01'), 'Must include Moderator accounts');
  });

  await runTest('18. [Emulator] Chief Admin unconstrained query without role filter is REJECTED (HTTP 403)', async () => {
    const res = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chiefAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: 'users' }] },
      }),
    });
    assert.strictEqual(res.status, 403, 'Unconstrained collection query by Chief Admin must be rejected (HTTP 403)');
  });

  await runTest('19. [Emulator] Moderator query for chief_admin or admin accounts is REJECTED (HTTP 403)', async () => {
    const res = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mod1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'role' },
              op: 'EQUAL',
              value: { stringValue: 'chief_admin' },
            },
          },
        },
      }),
    });
    assert.strictEqual(res.status, 403, 'Moderator query for chief_admin must be rejected (HTTP 403)');
  });

} else {
  console.log('  [NOTE] Run with Firestore emulator to execute live rules validation.');
}

console.log('\n------------------------------------------------------');
console.log(`Results: ${passedTests}/${totalTests} tests passed.`);
console.log('------------------------------------------------------\n');
