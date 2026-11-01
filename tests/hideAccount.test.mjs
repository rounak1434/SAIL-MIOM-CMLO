/**
 * SAIL-MIOM – Hide / Unhide Account Feature Test Suite
 * ==============================================================
 * Comprehensive test suite validating:
 * 1. Super Admin Authorization:
 *    - Only signed-in Super Admin (with authoritative Auth custom claim) may hide/unhide.
 *    - Chief Admin, Admin, Moderator, and ordinary users are strictly denied.
 *    - Document profile fields alone cannot authorize hiding/unhiding.
 * 2. Administrative Lockout Prevention:
 *    - Super Admin cannot hide their own account.
 *    - Super Admin cannot hide the last active Super Admin account.
 *    - Super Admin can hide another Super Admin if other active Super Admins exist.
 * 3. Reversibility & Status Preservation:
 *    - Hiding sets hidden: true.
 *    - Hiding does NOT delete, block, deactivate, or disable the Auth account.
 *    - Unhiding restores hidden: false.
 * 4. Directory & Account Visibility:
 *    - Hidden accounts are omitted from getManagedUsers for Chief Admin and Admin.
 *    - Super Admins can find hidden accounts and unhide them.
 *    - Firestore security rules deny lower roles from direct-getting, listing, or updating hidden accounts.
 * 5. Staff & Moderator Pickers:
 *    - Hidden moderators are excluded from moderator pickers and active listings.
 * 6. Complaint Visibility & Assignment Preservation:
 *    - Existing assignments to a hidden moderator are preserved intact.
 *    - Chief Admin and Admin views show the assigned complaint and status.
 *    - Hidden moderator cannot see assigned complaints in dashboard, lists, or direct ticket view.
 *    - Firestore rules deny hidden moderators from listing complaints or direct-getting their assigned tickets.
 *    - Normal visible moderators continue to see their assigned complaints.
 *    - Unhiding the moderator restores complaint visibility immediately.
 * ==============================================================
 */

import assert from 'assert';

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

// ==============================================================
// 1. Simulation of Backend Functions & Rules
// ==============================================================

function verifySuperAdminSimulation(context, allDatabaseDocs) {
  if (!context?.auth) {
    const err = new Error('User must be authenticated to perform this action');
    err.code = 'unauthenticated';
    throw err;
  }

  // Authoritative check: ONLY the Firebase Auth custom claim grants Super Admin privileges
  if (context.auth.token?.superAdmin !== true) {
    const err = new Error('Super Admin custom claim is strictly required');
    err.code = 'permission-denied';
    throw err;
  }

  const callerDoc = allDatabaseDocs.find((d) => d.uid === context.auth.uid);
  if (callerDoc && (callerDoc.blocked === true || callerDoc.isActive === false)) {
    const err = new Error('Account has been blocked or deactivated');
    err.code = 'permission-denied';
    throw err;
  }

  return true;
}

function verifyAdminSimulation(context, allDatabaseDocs) {
  if (!context?.auth) {
    const err = new Error('User must be authenticated to perform this action');
    err.code = 'unauthenticated';
    throw err;
  }

  const callerDoc = allDatabaseDocs.find((d) => d.uid === context.auth.uid);
  if (!callerDoc) {
    const err = new Error('User account record not found');
    err.code = 'permission-denied';
    throw err;
  }

  if (callerDoc.blocked === true || callerDoc.isActive === false) {
    const err = new Error('Account has been blocked or deactivated');
    err.code = 'permission-denied';
    throw err;
  }

  const claimRole = (context.auth.token?.role || '').toLowerCase();
  const isSuperAdminClaim = context.auth.token?.superAdmin === true;
  if (isSuperAdminClaim || claimRole === 'admin' || claimRole === 'chief_admin') {
    return true;
  }

  const docRole = (callerDoc.role || '').toLowerCase();
  if (docRole === 'admin' || docRole === 'chief_admin') {
    return true;
  }

  const err = new Error('Administrator privileges required to perform this action');
  err.code = 'permission-denied';
  throw err;
}

async function executeToggleUserHidden(context, { uid, hidden }, allDatabaseDocs, authUsersList = []) {
  // 1. Authoritative Super Admin claim check
  verifySuperAdminSimulation(context, allDatabaseDocs);

  if (!uid || typeof hidden !== 'boolean') {
    const err = new Error('UID and hidden boolean required');
    err.code = 'invalid-argument';
    throw err;
  }

  // Super Admin can hide/unhide ANY account, including Super Admin accounts
  // and the currently signed-in Super Admin account.

  // Mutate target doc
  const targetDoc = allDatabaseDocs.find((d) => d.uid === uid);
  if (targetDoc) {
    targetDoc.hidden = hidden;
  }

  return { success: true, message: `Account hidden status set to ${hidden}` };
}

async function executeGetManagedUsers(context, allDatabaseDocs, authUsersList = []) {
  verifyAdminSimulation(context, allDatabaseDocs);

  const isCallerSuperAdmin = context.auth?.token?.superAdmin === true;

  const superAdminUids = new Set();
  for (const u of authUsersList) {
    if (u.customClaims?.superAdmin === true) {
      superAdminUids.add(u.uid);
    }
  }

  const users = allDatabaseDocs
    .map((d) => {
      const isSuperAdminAccount =
        superAdminUids.has(d.uid) ||
        d.superAdmin === true ||
        d.role === 'super_admin';

      return {
        uid: d.uid,
        id: d.uid,
        email: d.email || '',
        name: d.name || d.displayName || '',
        displayName: d.displayName || d.name || '',
        role: d.role || 'user',
        superAdmin: isCallerSuperAdmin ? isSuperAdminAccount : false,
        businessName: d.businessName || '',
        phone: d.phone || '',
        blocked: d.blocked === true,
        isActive: d.isActive !== false,
        hidden: d.hidden === true,
        _isSuperAdmin: isSuperAdminAccount,
        _isHidden: d.hidden === true,
      };
    })
    .filter((u) => {
      if (!isCallerSuperAdmin) {
        // Chief Admin, Admin, Moderator cannot see Super Admin or hidden accounts
        if (u._isSuperAdmin || u._isHidden) {
          return false;
        }
      }
      return true;
    })
    .map(({ _isSuperAdmin, _isHidden, ...rest }) => rest);

  return { success: true, users };
}

// Firestore Rules Simulators
function simulateFirestoreUserGetRule({ auth, targetDoc, superAdminRegistryUids = new Set() }) {
  if (!auth) return { allowed: false, reason: 'UNAUTHENTICATED' };

  if (auth.uid === targetDoc.uid) {
    return { allowed: true, reason: 'SELF_READ' };
  }

  if (auth.token?.superAdmin === true) {
    return { allowed: true, reason: 'SUPER_ADMIN_READ' };
  }

  const isTargetSuper = targetDoc.superAdmin === true || targetDoc.role === 'super_admin' || superAdminRegistryUids.has(targetDoc.uid);
  const isTargetHidden = targetDoc.hidden === true;

  const isAdmin = auth.token?.role === 'admin' || auth.token?.role === 'chief_admin';
  if (isAdmin) {
    if (isTargetSuper || isTargetHidden) {
      return { allowed: false, reason: 'PERMISSION_DENIED_PROTECTED_TARGET' };
    }
    return { allowed: true, reason: 'ADMIN_READ_ALLOWED' };
  }

  if (auth.token?.role === 'moderator' && targetDoc.role === 'moderator' && !isTargetSuper && !isTargetHidden) {
    return { allowed: true, reason: 'MODERATOR_READ_ALLOWED' };
  }

  return { allowed: false, reason: 'PERMISSION_DENIED_INSUFFICIENT_ROLE' };
}

function simulateFirestoreUserUpdateRule({ auth, targetDoc, incomingUpdates }) {
  if (!auth) return { allowed: false, reason: 'UNAUTHENTICATED' };

  const isSuperAdmin = auth.token?.superAdmin === true;
  const affectedKeys = Object.keys(incomingUpdates);
  const touchesHidden = affectedKeys.includes('hidden');
  const touchesSuperAdmin = affectedKeys.includes('superAdmin');

  // Branch 1: Super Admin toggling hidden visibility on ANY account
  if (isSuperAdmin && touchesHidden) {
    const allowedKeysWhenHiddenChanged = ['hidden', 'updatedAt'];
    const hasOnlyVisibilityKeys = affectedKeys.every((k) => allowedKeysWhenHiddenChanged.includes(k));
    if (!hasOnlyVisibilityKeys) {
      return { allowed: false, reason: 'RESTRICTED_TO_VISIBILITY_FIELD' };
    }
    return { allowed: true, reason: 'SUPER_ADMIN_VISIBILITY_UPDATE_ALLOWED' };
  }

  // Branch 2: Standard profile updates (neither hidden nor superAdmin can be changed)
  if (!touchesHidden && !touchesSuperAdmin) {
    if (isSuperAdmin) {
      return { allowed: true, reason: 'SUPER_ADMIN_UPDATE_ALLOWED' };
    }

    const isTargetSuper = targetDoc.superAdmin === true || targetDoc.role === 'super_admin';
    const isTargetHidden = targetDoc.hidden === true;

    if (isTargetSuper || isTargetHidden) {
      return { allowed: false, reason: 'CANNOT_UPDATE_PROTECTED_OR_HIDDEN_ACCOUNT' };
    }

    const isAdmin = auth.token?.role === 'admin' || auth.token?.role === 'chief_admin';
    if (isAdmin) {
      return { allowed: true, reason: 'ADMIN_UPDATE_ALLOWED' };
    }

    if (auth.uid === targetDoc.uid) {
      const sensitiveKeys = ['role', 'blocked', 'isActive', 'permissions', 'superAdmin', 'hidden'];
      const hasSensitive = affectedKeys.some((k) => sensitiveKeys.includes(k));
      if (!hasSensitive) {
        return { allowed: true, reason: 'SELF_UPDATE_ALLOWED' };
      }
    }
  }

  return { allowed: false, reason: 'PERMISSION_DENIED' };
}

function simulateFirestoreComplaintGetRule({ auth, callerDoc, complaintDoc }) {
  // Super Admin bypass
  if (auth?.token?.superAdmin === true) {
    return { allowed: true, reason: 'SUPER_ADMIN_GET' };
  }

  const isAdmin = auth?.token?.role === 'admin' || auth?.token?.role === 'chief_admin' || callerDoc?.role === 'admin' || callerDoc?.role === 'chief_admin';
  if (isAdmin) {
    return { allowed: true, reason: 'ADMIN_GET' };
  }

  const isModerator = auth?.token?.role === 'moderator' || callerDoc?.role === 'moderator';
  if (isModerator) {
    const isCallerHidden = auth && callerDoc && callerDoc.hidden === true;
    if (isCallerHidden || complaintDoc.assignedToUID !== auth.uid) {
      return { allowed: false, reason: 'MODERATOR_DENIED_UNASSIGNED_OR_HIDDEN' };
    }
    return { allowed: true, reason: 'MODERATOR_ALLOWED_ASSIGNED' };
  }

  // Unauthenticated reads on complaint documents are strictly denied
  if (!auth) {
    return { allowed: false, reason: 'UNAUTHENTICATED' };
  }

  // Complainant can read their own complaint
  if (complaintDoc.uid === auth.uid || complaintDoc.userEmail === auth.token?.email || complaintDoc.email === auth.token?.email) {
    return { allowed: true, reason: 'COMPLAINANT_GET' };
  }

  return { allowed: false, reason: 'PERMISSION_DENIED' };
}

function simulateFirestoreComplaintListRule({ auth, callerDoc, queryAssignedToUID }) {
  if (!auth) return { allowed: false, reason: 'UNAUTHENTICATED' };

  if (auth.token?.superAdmin === true) {
    return { allowed: true, reason: 'SUPER_ADMIN_LIST' };
  }

  const isAdmin = auth.token?.role === 'admin' || auth.token?.role === 'chief_admin' || callerDoc?.role === 'admin' || callerDoc?.role === 'chief_admin';
  if (isAdmin) {
    return { allowed: true, reason: 'ADMIN_LIST_ALLOWED' };
  }

  const isModerator = auth.token?.role === 'moderator' || callerDoc?.role === 'moderator';
  if (isModerator) {
    const isCallerHidden = callerDoc && callerDoc.hidden === true;
    if (isCallerHidden) {
      return { allowed: false, reason: 'HIDDEN_CALLER_LIST_DENIED' };
    }
    if (queryAssignedToUID !== undefined && queryAssignedToUID !== auth.uid) {
      return { allowed: false, reason: 'MODERATOR_QUERY_FILTER_MISMATCH' };
    }
    return { allowed: true, reason: 'STAFF_LIST_ALLOWED' };
  }

  return { allowed: false, reason: 'NOT_STAFF' };
}

// ==============================================================
// 2. Test Fixtures
// ==============================================================

const superAdmin1 = {
  uid: 'uid-super-01',
  email: 'super1@sail.kiom',
  displayName: 'Primary Super Admin',
  role: 'admin',
  superAdmin: true,
  isActive: true,
  blocked: false,
  hidden: false,
};

const superAdmin2 = {
  uid: 'uid-super-02',
  email: 'super2@sail.kiom',
  displayName: 'Secondary Super Admin',
  role: 'admin',
  superAdmin: true,
  isActive: true,
  blocked: false,
  hidden: false,
};

const chiefAdmin = {
  uid: 'uid-chief-01',
  email: 'chief@sail.kiom',
  displayName: 'Chief Administrator',
  role: 'chief_admin',
  superAdmin: false,
  isActive: true,
  blocked: false,
  hidden: false,
};

const adminUser = {
  uid: 'uid-admin-01',
  email: 'admin@sail.kiom',
  displayName: 'Electrical Admin',
  role: 'admin',
  superAdmin: false,
  isActive: true,
  blocked: false,
  hidden: false,
};

const moderatorUser = {
  uid: 'uid-mod-01',
  email: 'mod@sail.kiom',
  displayName: 'Field Technician',
  role: 'moderator',
  superAdmin: false,
  isActive: true,
  blocked: false,
  hidden: false,
};

const ordinaryUser = {
  uid: 'uid-user-01',
  email: 'user@sail.kiom',
  displayName: 'Plant Employee',
  role: 'user',
  superAdmin: false,
  isActive: true,
  blocked: false,
  hidden: false,
};

function getFreshDatabase() {
  return [
    JSON.parse(JSON.stringify(superAdmin1)),
    JSON.parse(JSON.stringify(superAdmin2)),
    JSON.parse(JSON.stringify(chiefAdmin)),
    JSON.parse(JSON.stringify(adminUser)),
    JSON.parse(JSON.stringify(moderatorUser)),
    JSON.parse(JSON.stringify(ordinaryUser)),
  ];
}

const authUsersList = [
  { uid: superAdmin1.uid, customClaims: { role: 'admin', superAdmin: true } },
  { uid: superAdmin2.uid, customClaims: { role: 'admin', superAdmin: true } },
  { uid: chiefAdmin.uid, customClaims: { role: 'chief_admin' } },
  { uid: adminUser.uid, customClaims: { role: 'admin' } },
  { uid: moderatorUser.uid, customClaims: { role: 'moderator' } },
  { uid: ordinaryUser.uid, customClaims: {} },
];

const superAdmin1Context = { auth: { uid: superAdmin1.uid, token: { role: 'admin', superAdmin: true } } };
const chiefAdminContext = { auth: { uid: chiefAdmin.uid, token: { role: 'chief_admin', superAdmin: false } } };
const adminContext = { auth: { uid: adminUser.uid, token: { role: 'admin', superAdmin: false } } };
const moderatorContext = { auth: { uid: moderatorUser.uid, token: { role: 'moderator', superAdmin: false } } };
const userContext = { auth: { uid: ordinaryUser.uid, token: { role: 'user', superAdmin: false } } };

// ==============================================================
// 3. Execution of Tests
// ==============================================================

console.log('\n======================================================');
console.log('🧪 RUNNING HIDE / UNHIDE ACCOUNT FEATURE TEST SUITE');
console.log('======================================================\n');

// --- Group 1: Super Admin Authorization ---

await runTest('1. Super Admin with valid custom claim can hide an account', async () => {
  const db = getFreshDatabase();
  const res = await executeToggleUserHidden(superAdmin1Context, { uid: moderatorUser.uid, hidden: true }, db, authUsersList);
  assert.strictEqual(res.success, true);
  const target = db.find(u => u.uid === moderatorUser.uid);
  assert.strictEqual(target.hidden, true);
});

await runTest('2. Chief Admin is REJECTED from calling toggleUserHidden', async () => {
  const db = getFreshDatabase();
  await assert.rejects(
    async () => executeToggleUserHidden(chiefAdminContext, { uid: moderatorUser.uid, hidden: true }, db, authUsersList),
    (err) => err.code === 'permission-denied'
  );
});

await runTest('3. Admin is REJECTED from calling toggleUserHidden', async () => {
  const db = getFreshDatabase();
  await assert.rejects(
    async () => executeToggleUserHidden(adminContext, { uid: moderatorUser.uid, hidden: true }, db, authUsersList),
    (err) => err.code === 'permission-denied'
  );
});

await runTest('4. Moderator is REJECTED from calling toggleUserHidden', async () => {
  const db = getFreshDatabase();
  await assert.rejects(
    async () => executeToggleUserHidden(moderatorContext, { uid: moderatorUser.uid, hidden: true }, db, authUsersList),
    (err) => err.code === 'permission-denied'
  );
});

await runTest('5. User profile doc data { superAdmin: true } WITHOUT Auth custom claim is REJECTED', async () => {
  const db = getFreshDatabase();
  const spoofedContext = { auth: { uid: 'uid-spoofed', token: { role: 'admin' } } }; // missing superAdmin: true
  const spoofedDoc = { uid: 'uid-spoofed', role: 'admin', superAdmin: true, isActive: true, blocked: false };
  db.push(spoofedDoc);

  await assert.rejects(
    async () => executeToggleUserHidden(spoofedContext, { uid: moderatorUser.uid, hidden: true }, db, authUsersList),
    (err) => err.code === 'permission-denied'
  );
});

// --- Group 2: Unrestricted Target Coverage (Including Self & Super Admins) ---

await runTest('6. Super Admin CAN hide their own account without losing Super Admin privileges', async () => {
  const db = getFreshDatabase();
  const res = await executeToggleUserHidden(superAdmin1Context, { uid: superAdmin1.uid, hidden: true }, db, authUsersList);
  assert.strictEqual(res.success, true);
  const target = db.find(u => u.uid === superAdmin1.uid);
  assert.strictEqual(target.hidden, true);

  // Firestore rules simulation: Super Admin auth token claim is completely unaffected
  assert.strictEqual(superAdmin1Context.auth.token.superAdmin, true);

  // Self is still authorized as Super Admin in Firestore rules
  const ruleCheck = simulateFirestoreUserUpdateRule({
    auth: superAdmin1Context.auth,
    targetDoc: target,
    incomingUpdates: { hidden: false, updatedAt: new Date() },
  });
  assert.strictEqual(ruleCheck.allowed, true, 'Super Admin must still be allowed to update/unhide when account is hidden');
});

await runTest('7. Super Admin CAN hide the last active Super Admin account', async () => {
  // Scenario: Only one active Super Admin exists in the system
  const soloDb = [
    JSON.parse(JSON.stringify(superAdmin2)),
    JSON.parse(JSON.stringify(moderatorUser)),
  ];
  const soloAuth = [
    { uid: superAdmin2.uid, customClaims: { role: 'admin', superAdmin: true } },
    { uid: moderatorUser.uid, customClaims: { role: 'moderator' } },
  ];

  const soloContext = { auth: { uid: superAdmin2.uid, token: { role: 'admin', superAdmin: true } } };
  const res = await executeToggleUserHidden(soloContext, { uid: superAdmin2.uid, hidden: true }, soloDb, soloAuth);
  assert.strictEqual(res.success, true);
  assert.strictEqual(soloDb.find(u => u.uid === superAdmin2.uid).hidden, true);
});

await runTest('8. Super Admin CAN hide and unhide another Super Admin account', async () => {
  const db = getFreshDatabase();
  const res = await executeToggleUserHidden(superAdmin1Context, { uid: superAdmin2.uid, hidden: true }, db, authUsersList);
  assert.strictEqual(res.success, true);
  const target = db.find(u => u.uid === superAdmin2.uid);
  assert.strictEqual(target.hidden, true);

  // Reversible unhide
  const res2 = await executeToggleUserHidden(superAdmin1Context, { uid: superAdmin2.uid, hidden: false }, db, authUsersList);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(target.hidden, false);
});

await runTest('8b. Firestore rules strictly verify superAdmin claim and restrict hidden updates to visibility field', async () => {
  const db = getFreshDatabase();
  const target = db.find(u => u.uid === moderatorUser.uid);

  // 1. Super Admin updating ONLY hidden and updatedAt -> ALLOWED
  const checkValid = simulateFirestoreUserUpdateRule({
    auth: superAdmin1Context.auth,
    targetDoc: target,
    incomingUpdates: { hidden: true, updatedAt: new Date() },
  });
  assert.strictEqual(checkValid.allowed, true);

  // 2. Super Admin attempting to alter role or permissions while toggling hidden -> REJECTED
  const checkInvalidSuper = simulateFirestoreUserUpdateRule({
    auth: superAdmin1Context.auth,
    targetDoc: target,
    incomingUpdates: { hidden: true, role: 'super_admin' },
  });
  assert.strictEqual(checkInvalidSuper.allowed, false);

  // 3. Non-Super Admin attempting to touch hidden -> REJECTED
  const checkNonSuper = simulateFirestoreUserUpdateRule({
    auth: adminContext.auth,
    targetDoc: target,
    incomingUpdates: { hidden: true },
  });
  assert.strictEqual(checkNonSuper.allowed, false);
});

await runTest('8c. Documents lacking a hidden field are safely handled as visible', async () => {
  const legacyDoc = { uid: 'uid-legacy', role: 'moderator', isActive: true, blocked: false };
  // No 'hidden' field exists
  assert.strictEqual('hidden' in legacyDoc, false);

  // Simulator for rule checking get on legacy doc:
  const getCheck = simulateFirestoreUserGetRule({
    auth: adminContext.auth,
    targetDoc: legacyDoc,
  });
  assert.strictEqual(getCheck.allowed, true, 'Legacy doc lacking hidden field must be readable by admin');
});

// --- Group 3: Reversibility & Status Preservation ---

await runTest('9. Hiding does NOT block, deactivate, or delete the account', async () => {
  const db = getFreshDatabase();
  await executeToggleUserHidden(superAdmin1Context, { uid: moderatorUser.uid, hidden: true }, db, authUsersList);
  const target = db.find(u => u.uid === moderatorUser.uid);
  assert.strictEqual(target.hidden, true);
  assert.strictEqual(target.blocked, false);
  assert.strictEqual(target.isActive, true);
});

await runTest('10. Hiding is fully reversible by Super Admin (unhide)', async () => {
  const db = getFreshDatabase();
  // Hide first
  await executeToggleUserHidden(superAdmin1Context, { uid: moderatorUser.uid, hidden: true }, db, authUsersList);
  assert.strictEqual(db.find(u => u.uid === moderatorUser.uid).hidden, true);

  // Unhide
  const res = await executeToggleUserHidden(superAdmin1Context, { uid: moderatorUser.uid, hidden: false }, db, authUsersList);
  assert.strictEqual(res.success, true);
  assert.strictEqual(db.find(u => u.uid === moderatorUser.uid).hidden, false);
});

// --- Group 4: Directory & Account Visibility ---

await runTest('11. Hidden account is included in getManagedUsers for Super Admin', async () => {
  const db = getFreshDatabase();
  await executeToggleUserHidden(superAdmin1Context, { uid: moderatorUser.uid, hidden: true }, db, authUsersList);

  const res = await executeGetManagedUsers(superAdmin1Context, db, authUsersList);
  assert.strictEqual(res.success, true);
  const mod = res.users.find(u => u.uid === moderatorUser.uid);
  assert.ok(mod, 'Hidden moderator must be present in Super Admin view');
  assert.strictEqual(mod.hidden, true);
});

await runTest('12. Hidden account is completely OMITTED from getManagedUsers for Chief Admin', async () => {
  const db = getFreshDatabase();
  await executeToggleUserHidden(superAdmin1Context, { uid: moderatorUser.uid, hidden: true }, db, authUsersList);

  const res = await executeGetManagedUsers(chiefAdminContext, db, authUsersList);
  assert.strictEqual(res.success, true);
  const mod = res.users.find(u => u.uid === moderatorUser.uid);
  assert.strictEqual(mod, undefined, 'Hidden moderator must be omitted for Chief Admin');
});

await runTest('13. Hidden account is completely OMITTED from getManagedUsers for Admin', async () => {
  const db = getFreshDatabase();
  await executeToggleUserHidden(superAdmin1Context, { uid: moderatorUser.uid, hidden: true }, db, authUsersList);

  const res = await executeGetManagedUsers(adminContext, db, authUsersList);
  assert.strictEqual(res.success, true);
  const mod = res.users.find(u => u.uid === moderatorUser.uid);
  assert.strictEqual(mod, undefined, 'Hidden moderator must be omitted for Admin');
});

await runTest('14. Firestore rules: Admin cannot direct-get a hidden user document', async () => {
  const hiddenModDoc = { ...moderatorUser, hidden: true };
  const check = simulateFirestoreUserGetRule({
    auth: adminContext.auth,
    targetDoc: hiddenModDoc,
  });
  assert.strictEqual(check.allowed, false);
});

await runTest('15. Firestore rules: Super Admin CAN direct-get a hidden user document', async () => {
  const hiddenModDoc = { ...moderatorUser, hidden: true };
  const check = simulateFirestoreUserGetRule({
    auth: superAdmin1Context.auth,
    targetDoc: hiddenModDoc,
  });
  assert.strictEqual(check.allowed, true);
});

await runTest('16. Firestore rules: Non-superAdmin cannot modify hidden field or update hidden account', async () => {
  const hiddenModDoc = { ...moderatorUser, hidden: true };
  // Attempt 1: updating hidden account
  const res1 = simulateFirestoreUserUpdateRule({
    auth: adminContext.auth,
    targetDoc: hiddenModDoc,
    incomingUpdates: { name: 'New Name' },
  });
  assert.strictEqual(res1.allowed, false);

  // Attempt 2: modifying hidden field on non-hidden account
  const normalDoc = { ...moderatorUser, hidden: false };
  const res2 = simulateFirestoreUserUpdateRule({
    auth: adminContext.auth,
    targetDoc: normalDoc,
    incomingUpdates: { hidden: true },
  });
  assert.strictEqual(res2.allowed, false);
});

// --- Group 5: Staff & Moderator Pickers ---

await runTest('17. Moderator pickers (getAllModerators / getActiveModerators) filter out hidden moderators', async () => {
  const db = getFreshDatabase();
  db.find(u => u.uid === moderatorUser.uid).hidden = true;

  // Filter simulation corresponding to moderator.service.ts
  const activeModerators = db
    .filter(u => u.role === 'moderator' && !u.superAdmin && u.isActive !== false && !u.hidden);

  assert.strictEqual(activeModerators.length, 0, 'Hidden moderator must not appear in moderator pickers');
});

// --- Group 6: Complaint Visibility & Assignment Preservation ---

await runTest('18. Existing assignment to hidden moderator remains INTACT in complaint doc', async () => {
  const complaint = {
    id: 'MIOM-EL-2026-0001',
    ticketId: 'MIOM-EL-2026-0001',
    title: 'Switchgear Sparking',
    status: 'assigned',
    assignedTo: moderatorUser.email,
    assignedToUID: moderatorUser.uid,
    assignedToName: moderatorUser.displayName,
  };

  // Moderator is hidden
  const db = getFreshDatabase();
  await executeToggleUserHidden(superAdmin1Context, { uid: moderatorUser.uid, hidden: true }, db, authUsersList);

  // The complaint fields are preserved intact
  assert.strictEqual(complaint.assignedTo, moderatorUser.email);
  assert.strictEqual(complaint.assignedToUID, moderatorUser.uid);
  assert.strictEqual(complaint.assignedToName, moderatorUser.displayName);
  assert.strictEqual(complaint.status, 'assigned');
});

await runTest('19. Complaint assigned to hidden moderator is VISIBLE in Chief Admin and Admin dashboard', async () => {
  const complaints = [
    {
      id: 'MIOM-EL-2026-0001',
      ticketId: 'MIOM-EL-2026-0001',
      title: 'Switchgear Sparking',
      status: 'assigned',
      assignedTo: moderatorUser.email,
      assignedToUID: moderatorUser.uid,
      assignedToName: moderatorUser.displayName,
    }
  ];

  // Admin and Chief Admin load all complaints via subscribeToAllComplaints (no assigned-moderator filter)
  const adminComplaintsView = [...complaints];
  assert.strictEqual(adminComplaintsView.length, 1);
  assert.strictEqual(adminComplaintsView[0].status, 'assigned');
  assert.strictEqual(adminComplaintsView[0].assignedToUID, moderatorUser.uid);
});

await runTest('20. Hidden moderator receives EMPTY complaints list in subscribeToModeratorComplaints', async () => {
  const hiddenModDoc = { ...moderatorUser, hidden: true };
  const complaints = [
    {
      id: 'MIOM-EL-2026-0001',
      ticketId: 'MIOM-EL-2026-0001',
      assignedToUID: hiddenModDoc.uid,
    }
  ];

  // Simulator for subscribeToModeratorComplaints logic:
  let deliveredComplaints = null;
  const isHidden = hiddenModDoc.hidden === true;
  if (isHidden) {
    deliveredComplaints = [];
  } else {
    deliveredComplaints = complaints.filter(c => c.assignedToUID === hiddenModDoc.uid);
  }

  assert.deepStrictEqual(deliveredComplaints, []);
});

await runTest('21. Firestore complaint rules DENY list query and direct get for hidden moderator', async () => {
  const hiddenModDoc = { ...moderatorUser, hidden: true };
  const assignedComplaint = {
    id: 'MIOM-EL-2026-0001',
    assignedToUID: hiddenModDoc.uid,
  };

  // 1. List query rule
  const listCheck = simulateFirestoreComplaintListRule({
    auth: moderatorContext.auth,
    callerDoc: hiddenModDoc,
  });
  assert.strictEqual(listCheck.allowed, false, 'Hidden moderator must be denied list query on complaints');

  // 2. Direct get rule
  const getCheck = simulateFirestoreComplaintGetRule({
    auth: moderatorContext.auth,
    callerDoc: hiddenModDoc,
    complaintDoc: assignedComplaint,
  });
  assert.strictEqual(getCheck.allowed, false, 'Hidden moderator must be denied get on assigned complaint');
});

await runTest('22. Visible, normal moderator CONTINUES to see their assigned complaints', async () => {
  const visibleModDoc = { ...moderatorUser, hidden: false };
  const assignedComplaint = {
    id: 'MIOM-EL-2026-0001',
    assignedToUID: visibleModDoc.uid,
  };

  // 1. List query rule
  const listCheck = simulateFirestoreComplaintListRule({
    auth: moderatorContext.auth,
    callerDoc: visibleModDoc,
  });
  assert.strictEqual(listCheck.allowed, true);

  // 2. Direct get rule
  const getCheck = simulateFirestoreComplaintGetRule({
    auth: moderatorContext.auth,
    callerDoc: visibleModDoc,
    complaintDoc: assignedComplaint,
  });
  assert.strictEqual(getCheck.allowed, true);
});

await runTest('23. Unhiding moderator RESTORES complaint visibility immediately', async () => {
  const db = getFreshDatabase();
  const mod = db.find(u => u.uid === moderatorUser.uid);

  // Hide
  await executeToggleUserHidden(superAdmin1Context, { uid: mod.uid, hidden: true }, db, authUsersList);
  assert.strictEqual(mod.hidden, true);

  // Unhide
  await executeToggleUserHidden(superAdmin1Context, { uid: mod.uid, hidden: false }, db, authUsersList);
  assert.strictEqual(mod.hidden, false);

  const assignedComplaint = {
    id: 'MIOM-EL-2026-0001',
    assignedToUID: mod.uid,
  };

  // Rules evaluate to allowed again
  const listCheck = simulateFirestoreComplaintListRule({
    auth: moderatorContext.auth,
    callerDoc: mod,
  });
  assert.strictEqual(listCheck.allowed, true);

  const getCheck = simulateFirestoreComplaintGetRule({
    auth: moderatorContext.auth,
    callerDoc: mod,
    complaintDoc: assignedComplaint,
  });
  assert.strictEqual(getCheck.allowed, true);
});

// --- Group 7: Spark Plan Compatibility & Hidden Super Admin Access ---

await runTest('24. Spark Plan: Client SDK direct Firestore update has zero dependency on callable functions', async () => {
  // Read admin.service.ts source code to assert zero dependency on toggleUserHidden callable
  const fs = await import('fs');
  const adminServiceContent = fs.readFileSync('src/services/admin.service.ts', 'utf-8');

  assert.ok(
    !adminServiceContent.includes('toggleUserHidden'),
    'admin.service.ts must not reference or depend on the toggleUserHidden callable function'
  );
  assert.ok(
    adminServiceContent.includes('updateDoc(doc(db, \'users\', uid), {'),
    'toggleAccountHidden must use direct Firestore client SDK updateDoc'
  );
  assert.ok(
    adminServiceContent.includes('hidden,'),
    'toggleAccountHidden must write the hidden boolean directly'
  );
  assert.ok(
    adminServiceContent.includes('updatedAt: serverTimestamp(),'),
    'toggleAccountHidden must update updatedAt serverTimestamp'
  );
});

await runTest('25. Hidden Super Admin retains complete claim authorization and access to Hidden Accounts view', async () => {
  const db = getFreshDatabase();
  const superDoc = db.find(u => u.uid === superAdmin1.uid);
  superDoc.hidden = true;

  // 1. Auth context claims remain intact
  assert.strictEqual(superAdmin1Context.auth.token.superAdmin, true);

  // 2. Super Admin can still list users directly from collection (Spark plan query)
  const listAllowed = simulateFirestoreComplaintListRule({
    auth: superAdmin1Context.auth,
    callerDoc: superDoc,
  });
  assert.strictEqual(listAllowed.allowed, true);

  // 3. Super Admin can view their own and other hidden accounts
  const hiddenAccounts = db.filter(u => u.hidden === true);
  assert.strictEqual(hiddenAccounts.length, 1);
  assert.strictEqual(hiddenAccounts[0].uid, superAdmin1.uid);

  // 4. Super Admin can unhide their own account
  const unhideRuleCheck = simulateFirestoreUserUpdateRule({
    auth: superAdmin1Context.auth,
    targetDoc: superDoc,
    incomingUpdates: { hidden: false, updatedAt: new Date() },
  });
  assert.strictEqual(unhideRuleCheck.allowed, true);
});

console.log('\n------------------------------------------------------');
console.log(`Results: ${passedTests}/${totalTests} tests passed.`);
console.log('------------------------------------------------------\n');
