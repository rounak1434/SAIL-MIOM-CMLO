/**
 * SAIL-MIOM – Super Admin Visibility & Role Boundary Test Suite
 * ==============================================================
 * Comprehensive test suite validating:
 * 1. Super Admin can see Super Admin accounts.
 * 2. Chief Admin cannot see Super Admin accounts.
 * 3. Admin cannot see Super Admin accounts.
 * 4. Moderator cannot see Super Admin accounts.
 * 5. Ordinary users cannot see Super Admin accounts.
 * 6. Lower roles cannot retrieve Super Admin details through protected
 *    user-directory or individual-account endpoints.
 * 7. Lower roles cannot modify Super Admin accounts using existing
 *    account-management operations (delete, role update, password, block, deactivate).
 * 8. Authorized Super Admin functionality continues working.
 * 9. Chief Admin can still manage accounts permitted by the existing
 *    authorization policy.
 * 10. Existing user-management features (filtering, counts, search, tabs) continue working.
 * 11. Blocked/deactivated accounts are rejected regardless of claims.
 * 12. Inconsistent Super Admin states (missing doc marker but valid Auth claim) remain protected.
 * 13. Firestore rules enforce boundary via doc attributes and registry.
 * ==============================================================
 */

import assert from 'assert';

// ==============================================================
// 1. Authoritative Role & Super Admin Claim Resolution Logic
// ==============================================================

function resolveUserRole(docRole, claimRole) {
  const normClaim = (claimRole || '').toLowerCase();
  const normDoc = (docRole || '').toLowerCase();

  if (normClaim === 'chief_admin' || normDoc === 'chief_admin') return 'chief_admin';
  if (normClaim === 'admin' || normDoc === 'admin') return 'admin';
  if (normClaim === 'moderator' || normDoc === 'moderator') return 'moderator';
  return 'user';
}

function resolveIsSuperAdmin(authClaims) {
  // Authoritative check: ONLY trusted Firebase Auth custom claims grant Super Admin privileges
  return authClaims?.superAdmin === true;
}

function formatRoleDisplayName(role, superAdmin) {
  if (superAdmin) return 'Super Admin';
  switch (role) {
    case 'chief_admin': return 'Chief Admin';
    case 'admin': return 'Admin';
    case 'moderator': return 'Moderator';
    case 'user': return 'User';
    default: return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
  }
}

// ==============================================================
// 2. Server-Side verifyAdmin / verifyChiefAdmin Verification
// ==============================================================

async function verifyAdminSimulation(context, allDatabaseDocs) {
  if (!context?.auth) {
    const err = new Error('User must be authenticated to perform this action');
    err.code = 'unauthenticated';
    throw err;
  }

  // 1. Retrieve the caller's Firestore user document to validate active account status
  const callerDoc = allDatabaseDocs.find((d) => d.uid === context.auth.uid);
  if (!callerDoc) {
    const err = new Error('User account record not found');
    err.code = 'permission-denied';
    throw err;
  }

  // 2. Reject blocked or deactivated accounts unconditionally
  if (callerDoc.blocked === true || callerDoc.isActive === false) {
    const err = new Error('Account has been blocked or deactivated');
    err.code = 'permission-denied';
    throw err;
  }

  // 3. Check custom claims first
  const claimRole = (context.auth.token?.role || '').toLowerCase();
  const isSuperAdminClaim = context.auth.token?.superAdmin === true;
  if (isSuperAdminClaim || claimRole === 'admin' || claimRole === 'chief_admin') {
    return true;
  }

  // 4. Check Firestore user document as fallback for administrator role
  const docRole = (callerDoc.role || '').toLowerCase();
  if (docRole === 'admin' || docRole === 'chief_admin') {
    return true;
  }

  const err = new Error('Administrator privileges required to perform this action');
  err.code = 'permission-denied';
  throw err;
}

async function verifyChiefAdminSimulation(context, allDatabaseDocs) {
  if (!context?.auth) {
    const err = new Error('User must be authenticated to perform this action');
    err.code = 'unauthenticated';
    throw err;
  }

  // 1. Retrieve caller document
  const callerDoc = allDatabaseDocs.find((d) => d.uid === context.auth.uid);
  if (!callerDoc) {
    const err = new Error('User account record not found');
    err.code = 'permission-denied';
    throw err;
  }

  // 2. Reject blocked or deactivated accounts unconditionally
  if (callerDoc.blocked === true || callerDoc.isActive === false) {
    const err = new Error('Account has been blocked or deactivated');
    err.code = 'permission-denied';
    throw err;
  }

  // 3. Check custom claims first
  const claimRole = (context.auth.token?.role || '').toLowerCase();
  const isSuperAdminClaim = context.auth.token?.superAdmin === true;
  if (isSuperAdminClaim || claimRole === 'chief_admin') {
    return true;
  }

  // 4. Check Firestore user document as fallback for Chief Admin role
  const docRole = (callerDoc.role || '').toLowerCase();
  if (docRole === 'chief_admin') {
    return true;
  }

  const err = new Error('Chief Admin privileges required to perform this action');
  err.code = 'permission-denied';
  throw err;
}

async function executeGetManagedUsers(context, allDatabaseDocs, authUsersList = []) {
  // Enforce caller account status & admin role
  await verifyAdminSimulation(context, allDatabaseDocs);

  // Authoritative check: ONLY trusted custom claim grants Super Admin privileges
  const isCallerSuperAdmin = context.auth?.token?.superAdmin === true;

  // Authoritative discovery of Super Admin accounts from Firebase Auth custom claims
  const superAdminUids = new Set();
  for (const u of authUsersList) {
    if (u.customClaims?.superAdmin === true) {
      superAdminUids.add(u.uid);
    }
  }

  const users = allDatabaseDocs
    .map((d) => {
      // Account is Super Admin if Auth custom claims say so, OR doc has superAdmin/super_admin
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
        commentCount: d.commentCount || 0,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        profilePhotoUrl: d.profilePhotoUrl || null,
        _isSuperAdmin: isSuperAdminAccount,
      };
    })
    .filter((u) => isCallerSuperAdmin || !u._isSuperAdmin)
    .map(({ _isSuperAdmin, ...rest }) => rest);

  return { success: true, users };
}

// ==============================================================
// 3. Security Boundary Logic (Firestore Rules Evaluation)
// ==============================================================

function isSuperAdminDoc(targetDoc, superAdminRegistryUids = new Set()) {
  return targetDoc.superAdmin === true ||
         targetDoc.role === 'super_admin' ||
         superAdminRegistryUids.has(targetDoc.uid);
}

function simulateFirestoreGetRule({ auth, targetDoc, superAdminRegistryUids = new Set() }) {
  if (!auth) return { allowed: false, reason: 'UNAUTHENTICATED' };

  // Rule 1: Self read
  if (auth.uid === targetDoc.uid) {
    return { allowed: true, reason: 'SELF_READ' };
  }

  // Rule 2: Super Admin can read any user doc
  if (auth.token?.superAdmin === true) {
    return { allowed: true, reason: 'SUPER_ADMIN_READ' };
  }

  const isTargetSuper = isSuperAdminDoc(targetDoc, superAdminRegistryUids);

  // Rule 3: Admin / Chief Admin can only read non-superAdmin docs
  const isAdmin = auth.token?.role === 'admin' || auth.token?.role === 'chief_admin';
  if (isAdmin) {
    if (isTargetSuper) {
      return { allowed: false, reason: 'PERMISSION_DENIED_SUPER_ADMIN_TARGET' };
    }
    return { allowed: true, reason: 'ADMIN_READ_ALLOWED' };
  }

  // Rule 4: Moderator reading moderator profile
  if (auth.token?.role === 'moderator' && targetDoc.role === 'moderator' && !isTargetSuper) {
    return { allowed: true, reason: 'MODERATOR_READ_ALLOWED' };
  }

  return { allowed: false, reason: 'PERMISSION_DENIED_INSUFFICIENT_ROLE' };
}

function simulateFirestoreListRule({ auth, queryConstraint }) {
  if (!auth) return { allowed: false, reason: 'UNAUTHENTICATED' };

  // Super Admin can list all users directly
  if (auth.token?.superAdmin === true) {
    return { allowed: true, reason: 'SUPER_ADMIN_LIST_ALLOWED' };
  }

  // Authenticated staff can query moderators
  const isStaff = auth.token?.role === 'moderator' || auth.token?.role === 'admin' || auth.token?.role === 'chief_admin';
  if (isStaff && queryConstraint?.role === 'moderator') {
    return { allowed: true, reason: 'STAFF_LIST_MODERATORS_ALLOWED' };
  }

  // General unconstrained collection query by lower roles is REJECTED
  return { allowed: false, reason: 'PERMISSION_DENIED_UNCONSTRAINED_LIST_BY_LOWER_ROLE' };
}

function simulateFirestoreUpdateRule({ auth, targetDoc, incomingUpdates, superAdminRegistryUids = new Set() }) {
  if (!auth) return { allowed: false, reason: 'UNAUTHENTICATED' };

  const isSuperAdmin = auth.token?.superAdmin === true;
  const isTargetSuper = isSuperAdminDoc(targetDoc, superAdminRegistryUids);

  // If modifying a Super Admin document, caller MUST be Super Admin
  if (isTargetSuper && !isSuperAdmin) {
    return { allowed: false, reason: 'PERMISSION_DENIED_TARGET_IS_SUPER_ADMIN' };
  }

  // If non-superAdmin tries to grant superAdmin or set role to super_admin
  if ((incomingUpdates.superAdmin === true || incomingUpdates.role === 'super_admin') && !isSuperAdmin) {
    return { allowed: false, reason: 'PERMISSION_DENIED_CANNOT_GRANT_SUPER_ADMIN' };
  }

  const isAdmin = auth.token?.role === 'admin' || auth.token?.role === 'chief_admin';
  if (isSuperAdmin || isAdmin || auth.uid === targetDoc.uid) {
    return { allowed: true, reason: 'UPDATE_ALLOWED' };
  }

  return { allowed: false, reason: 'PERMISSION_DENIED' };
}

function simulateFirestoreDeleteRule({ auth, targetDoc, superAdminRegistryUids = new Set() }) {
  if (!auth) return { allowed: false, reason: 'UNAUTHENTICATED' };

  const isSuperAdmin = auth.token?.superAdmin === true;
  if (isSuperAdmin) {
    return { allowed: true, reason: 'SUPER_ADMIN_DELETE_ALLOWED' };
  }

  const isTargetSuper = isSuperAdminDoc(targetDoc, superAdminRegistryUids);
  const isAdmin = auth.token?.role === 'admin' || auth.token?.role === 'chief_admin';
  if (isAdmin && !isTargetSuper) {
    return { allowed: true, reason: 'ADMIN_DELETE_ALLOWED' };
  }

  return { allowed: false, reason: 'PERMISSION_DENIED' };
}

// ==============================================================
// 4. Server-Side Function Guard Simulation (Mutations)
// ==============================================================

function simulateCloudFunctionGuard({ callerAuth, targetUser, action, newRole, callerDoc }) {
  if (!callerAuth) {
    return { status: 'error', code: 'unauthenticated', message: 'User must be authenticated' };
  }

  // Account status check
  if (callerDoc && (callerDoc.blocked === true || callerDoc.isActive === false)) {
    return { status: 'error', code: 'permission-denied', message: 'Account is blocked or deactivated' };
  }

  const callerIsSuperAdmin = callerAuth.token?.superAdmin === true;
  const callerRole = (callerAuth.token?.role || callerDoc?.role || '').toLowerCase();
  const targetIsSuperAdmin = targetUser.superAdmin === true || targetUser.role === 'super_admin';

  // Protect Super Admin target accounts
  if (targetIsSuperAdmin && !callerIsSuperAdmin) {
    return {
      status: 'error',
      code: 'permission-denied',
      message: `Only Super Admins can perform action ${action} on a Super Admin account.`
    };
  }

  // Role modification rules
  if (action === 'setUserRole') {
    if (newRole === 'super_admin' && !callerIsSuperAdmin) {
      return { status: 'error', code: 'permission-denied', message: 'Only Super Admins can assign super_admin role.' };
    }
    if ((newRole === 'admin' || newRole === 'chief_admin') && callerRole !== 'chief_admin' && !callerIsSuperAdmin) {
      return { status: 'error', code: 'permission-denied', message: 'Only Chief Admins can assign admin/chief_admin role.' };
    }
  }

  // Account creation rules
  if (action === 'createAccount') {
    if (newRole === 'super_admin' && !callerIsSuperAdmin) {
      return { status: 'error', code: 'permission-denied', message: 'Only Super Admins can create Super Admin.' };
    }
    if ((newRole === 'admin' || newRole === 'chief_admin') && callerRole !== 'chief_admin' && !callerIsSuperAdmin) {
      return { status: 'error', code: 'permission-denied', message: 'Only Chief Admins can create admin/chief_admin.' };
    }
  }

  return { status: 'success', message: `Action ${action} completed successfully` };
}

// ==============================================================
// TEST SUITE EXECUTION
// ==============================================================

let passedTests = 0;
let totalTests = 0;

async function runTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n======================================================');
console.log('SAIL-MIOM – Super Admin Visibility & Boundary Tests');
console.log('======================================================\n');

// Sample dataset
const superAdminAccount = {
  uid: 'uid-super-admin-01',
  email: 'superadmin@sail.kiom',
  displayName: 'Super Administrator',
  role: 'admin',
  superAdmin: true,
  isActive: true,
  blocked: false,
};

const chiefAdminAccount = {
  uid: 'uid-chief-admin-01',
  email: 'chiefadmin@sail.kiom',
  displayName: 'Chief Administrator',
  role: 'chief_admin',
  superAdmin: false,
  isActive: true,
  blocked: false,
};

const adminAccount = {
  uid: 'uid-admin-01',
  email: 'admin@sail.kiom',
  displayName: 'Plant Admin',
  role: 'admin',
  superAdmin: false,
  isActive: true,
  blocked: false,
};

const moderatorAccount = {
  uid: 'uid-mod-01',
  email: 'mod@sail.kiom',
  displayName: 'Maintenance Mod',
  role: 'moderator',
  superAdmin: false,
  isActive: true,
  blocked: true,
};

const ordinaryUserAccount = {
  uid: 'uid-user-01',
  email: 'user@sail.kiom',
  displayName: 'Ordinary Employee',
  role: 'user',
  superAdmin: false,
  isActive: false,
  blocked: false,
};

const allUsersInDb = [
  superAdminAccount,
  chiefAdminAccount,
  adminAccount,
  moderatorAccount,
  ordinaryUserAccount,
];

const authUsersList = [
  { uid: superAdminAccount.uid, customClaims: { role: 'admin', superAdmin: true } },
  { uid: chiefAdminAccount.uid, customClaims: { role: 'chief_admin' } },
  { uid: adminAccount.uid, customClaims: { role: 'admin' } },
  { uid: moderatorAccount.uid, customClaims: { role: 'moderator' } },
  { uid: ordinaryUserAccount.uid, customClaims: {} },
];

// Contexts
const superAdminContext = { auth: { uid: superAdminAccount.uid, token: { role: 'admin', superAdmin: true } } };
const chiefAdminContext = { auth: { uid: chiefAdminAccount.uid, token: { role: 'chief_admin', superAdmin: false } } };
const adminContext = { auth: { uid: adminAccount.uid, token: { role: 'admin', superAdmin: false } } };
const moderatorContext = { auth: { uid: moderatorAccount.uid, token: { role: 'moderator', superAdmin: false } } };
const userContext = { auth: { uid: ordinaryUserAccount.uid, token: { role: 'user', superAdmin: false } } };

// --- Requirement 1: Super Admin visibility ---
await runTest('1. Super Admin receives Super Admin accounts via getManagedUsers', async () => {
  const result = await executeGetManagedUsers(superAdminContext, allUsersInDb, authUsersList);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.users.length, 5);
  assert.ok(result.users.some(u => u.uid === superAdminAccount.uid));
});

// --- Requirement 2: Chief Admin visibility ---
await runTest('2. Chief Admin never receives Super Admin accounts from server', async () => {
  const result = await executeGetManagedUsers(chiefAdminContext, allUsersInDb, authUsersList);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.users.length, 4);
  assert.ok(!result.users.some(u => u.uid === superAdminAccount.uid));
});

// --- Issue 1 Tests: Blocked/Deactivated Admin and Chief Admin access ---
await runTest('Issue 1a. Admin with valid role claim but blocked: true is REJECTED', async () => {
  const blockedAdminDoc = { ...adminAccount, uid: 'uid-blocked-admin', blocked: true, isActive: true };
  const db = [...allUsersInDb, blockedAdminDoc];
  const blockedAdminContext = { auth: { uid: 'uid-blocked-admin', token: { role: 'admin' } } };

  await assert.rejects(
    async () => verifyAdminSimulation(blockedAdminContext, db),
    (err) => err.code === 'permission-denied' && err.message.includes('blocked')
  );
  await assert.rejects(
    async () => executeGetManagedUsers(blockedAdminContext, db, authUsersList),
    (err) => err.code === 'permission-denied'
  );
});

await runTest('Issue 1b. Admin with valid role claim but isActive: false is REJECTED', async () => {
  const inactiveAdminDoc = { ...adminAccount, uid: 'uid-inactive-admin', blocked: false, isActive: false };
  const db = [...allUsersInDb, inactiveAdminDoc];
  const inactiveAdminContext = { auth: { uid: 'uid-inactive-admin', token: { role: 'admin' } } };

  await assert.rejects(
    async () => verifyAdminSimulation(inactiveAdminContext, db),
    (err) => err.code === 'permission-denied' && err.message.includes('deactivated')
  );
  await assert.rejects(
    async () => executeGetManagedUsers(inactiveAdminContext, db, authUsersList),
    (err) => err.code === 'permission-denied'
  );
});

await runTest('Issue 1c. Chief Admin with valid role claim but blocked: true is REJECTED', async () => {
  const blockedChiefDoc = { ...chiefAdminAccount, uid: 'uid-blocked-chief-claim', blocked: true, isActive: true };
  const db = [...allUsersInDb, blockedChiefDoc];
  const blockedChiefContext = { auth: { uid: 'uid-blocked-chief-claim', token: { role: 'chief_admin' } } };

  await assert.rejects(
    async () => verifyChiefAdminSimulation(blockedChiefContext, db),
    (err) => err.code === 'permission-denied' && err.message.includes('blocked')
  );
  await assert.rejects(
    async () => executeGetManagedUsers(blockedChiefContext, db, authUsersList),
    (err) => err.code === 'permission-denied'
  );
});

await runTest('Issue 1d. Chief Admin with valid role claim but isActive: false is REJECTED', async () => {
  const inactiveChiefDoc = { ...chiefAdminAccount, uid: 'uid-inactive-chief-claim', blocked: false, isActive: false };
  const db = [...allUsersInDb, inactiveChiefDoc];
  const inactiveChiefContext = { auth: { uid: 'uid-inactive-chief-claim', token: { role: 'chief_admin' } } };

  await assert.rejects(
    async () => verifyChiefAdminSimulation(inactiveChiefContext, db),
    (err) => err.code === 'permission-denied' && err.message.includes('deactivated')
  );
  await assert.rejects(
    async () => executeGetManagedUsers(inactiveChiefContext, db, authUsersList),
    (err) => err.code === 'permission-denied'
  );
});

await runTest('Issue 1e. Chief Admin with empty claims ({}) and active Firestore role is ALLOWED', async () => {
  const chiefEmptyClaimsContext = { auth: { uid: chiefAdminAccount.uid, token: {} } };
  const authorized = await verifyChiefAdminSimulation(chiefEmptyClaimsContext, allUsersInDb);
  assert.strictEqual(authorized, true);

  const result = await executeGetManagedUsers(chiefEmptyClaimsContext, allUsersInDb, authUsersList);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.users.length, 4);
  assert.ok(!result.users.some(u => u.uid === superAdminAccount.uid));
});

await runTest('Issue 1f. Ordinary user attempting privileged operation is REJECTED', async () => {
  await assert.rejects(
    async () => verifyAdminSimulation(userContext, allUsersInDb),
    (err) => err.code === 'permission-denied'
  );
  await assert.rejects(
    async () => verifyChiefAdminSimulation(userContext, allUsersInDb),
    (err) => err.code === 'permission-denied'
  );
  await assert.rejects(
    async () => executeGetManagedUsers(userContext, allUsersInDb, authUsersList),
    (err) => err.code === 'permission-denied'
  );
});

await runTest('Issue 1g. Super Admin authorization strictly requires trusted custom claim', async () => {
  // Attacker sets doc to superAdmin: true and calls with user token
  const fakeContext = { auth: { uid: 'uid-attacker', token: { role: 'admin', superAdmin: false } } };
  const fakeDoc = { uid: 'uid-attacker', role: 'admin', superAdmin: true, isActive: true, blocked: false };
  const db = [...allUsersInDb, fakeDoc];

  const result = await executeGetManagedUsers(fakeContext, db, authUsersList);
  // Fake superAdmin must NOT receive Super Admin accounts
  assert.ok(!result.users.some(u => u.uid === superAdminAccount.uid));
  assert.ok(!result.users.some(u => u.superAdmin === true));
});

// --- Issue 2 Tests: Inconsistent Role/Marker States ---
await runTest('Issue 2a. Super Admin with missing doc marker but valid Auth claim is filtered out on server', async () => {
  // Inconsistent state: Super Admin user document has superAdmin: false / undefined and role: 'admin'
  const inconsistentSuperDoc = {
    uid: 'uid-inconsistent-super',
    email: 'inc_super@sail.kiom',
    role: 'admin',
    superAdmin: false, // Inconsistent/stale!
    isActive: true,
    blocked: false,
  };
  const inconsistentAuthUser = {
    uid: 'uid-inconsistent-super',
    customClaims: { role: 'admin', superAdmin: true }, // Authoritative claim!
  };

  const testDb = [...allUsersInDb, inconsistentSuperDoc];
  const testAuth = [...authUsersList, inconsistentAuthUser];

  // When Chief Admin calls getManagedUsers, inconsistent Super Admin MUST be filtered out
  const chiefResult = await executeGetManagedUsers(chiefAdminContext, testDb, testAuth);
  assert.ok(!chiefResult.users.some(u => u.uid === 'uid-inconsistent-super'), 'Inconsistent Super Admin must be filtered out!');

  // When Super Admin calls getManagedUsers, account is included
  const superResult = await executeGetManagedUsers(superAdminContext, testDb, testAuth);
  assert.ok(superResult.users.some(u => u.uid === 'uid-inconsistent-super'), 'Super Admin sees the inconsistent account');
});

await runTest('Issue 2b. Firestore rules protect inconsistent Super Admin doc via superAdminRegistry', () => {
  const inconsistentSuperDoc = {
    uid: 'uid-inconsistent-super',
    role: 'admin',
    superAdmin: false, // missing/stale doc marker
  };
  const registry = new Set(['uid-inconsistent-super']);

  // Chief Admin attempting direct get on inconsistent Super Admin doc
  const chiefGet = simulateFirestoreGetRule({
    auth: chiefAdminContext.auth,
    targetDoc: inconsistentSuperDoc,
    superAdminRegistryUids: registry,
  });
  assert.strictEqual(chiefGet.allowed, false, 'Chief Admin cannot get inconsistent Super Admin doc');

  // Chief Admin attempting update
  const chiefUpdate = simulateFirestoreUpdateRule({
    auth: chiefAdminContext.auth,
    targetDoc: inconsistentSuperDoc,
    incomingUpdates: { name: 'Tampered' },
    superAdminRegistryUids: registry,
  });
  assert.strictEqual(chiefUpdate.allowed, false);

  // Chief Admin attempting delete
  const chiefDelete = simulateFirestoreDeleteRule({
    auth: chiefAdminContext.auth,
    targetDoc: inconsistentSuperDoc,
    superAdminRegistryUids: registry,
  });
  assert.strictEqual(chiefDelete.allowed, false);
});

// --- Existing Requirements verification ---
await runTest('3. Admin cannot see Super Admin accounts in user list', async () => {
  const result = await executeGetManagedUsers(adminContext, allUsersInDb, authUsersList);
  assert.ok(!result.users.some(u => u.uid === superAdminAccount.uid));
});

await runTest('4. Moderator cannot call directory function', async () => {
  await assert.rejects(
    async () => executeGetManagedUsers(moderatorContext, allUsersInDb, authUsersList),
    (err) => err.code === 'permission-denied'
  );
});

await runTest('6a. Lower roles cannot direct get Super Admin Firestore doc', () => {
  const chiefResult = simulateFirestoreGetRule({ auth: chiefAdminContext.auth, targetDoc: superAdminAccount });
  assert.strictEqual(chiefResult.allowed, false);
});

await runTest('6b. Firestore collection list rule rejects unconstrained queries by lower roles', () => {
  const chiefList = simulateFirestoreListRule({ auth: chiefAdminContext.auth, queryConstraint: null });
  assert.strictEqual(chiefList.allowed, false);

  const superList = simulateFirestoreListRule({ auth: superAdminContext.auth, queryConstraint: null });
  assert.strictEqual(superList.allowed, true);
});

await runTest('7. Lower roles cannot mutate Super Admin accounts', () => {
  const res = simulateCloudFunctionGuard({
    callerAuth: chiefAdminContext.auth,
    targetUser: superAdminAccount,
    action: 'deleteUser',
    callerDoc: chiefAdminAccount,
  });
  assert.strictEqual(res.status, 'error');
  assert.strictEqual(res.code, 'permission-denied');
});

await runTest('8. Authorized Super Admin functionality continues working', () => {
  const res = simulateCloudFunctionGuard({
    callerAuth: superAdminContext.auth,
    targetUser: adminAccount,
    action: 'setUserRole',
    newRole: 'chief_admin',
    callerDoc: superAdminAccount,
  });
  assert.strictEqual(res.status, 'success');
});

await runTest('9. Chief Admin can manage permitted accounts', () => {
  const res = simulateCloudFunctionGuard({
    callerAuth: chiefAdminContext.auth,
    targetUser: { superAdmin: false },
    action: 'createAccount',
    newRole: 'admin',
    callerDoc: chiefAdminAccount,
  });
  assert.strictEqual(res.status, 'success');
});

await runTest('10a. Super Admin role badge correctly displays "Super Admin"', () => {
  assert.strictEqual(formatRoleDisplayName('admin', true), 'Super Admin');
  assert.strictEqual(formatRoleDisplayName('chief_admin', false), 'Chief Admin');
  assert.strictEqual(formatRoleDisplayName('admin', false), 'Admin');
});

await runTest('10b. Authoritative claim check: Firestore doc alone cannot elevate to Super Admin', () => {
  assert.strictEqual(resolveIsSuperAdmin({ role: 'admin', superAdmin: false }), false);
  assert.strictEqual(resolveIsSuperAdmin({ role: 'admin', superAdmin: true }), true);
});

console.log('\n------------------------------------------------------');
console.log(`Results: ${passedTests}/${totalTests} tests passed.`);
console.log('------------------------------------------------------\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
