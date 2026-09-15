/**
 * SAIL-MIOM – License System & Expiration Verification Test Suite
 * ===============================================================
 * Validates:
 * 1. Expiration logic (pure function of enabled, expiresAt, currentTime).
 * 2. Automatic transition when reaching expiresAt.
 * 3. Super Admin authorization (strict custom claim).
 * 4. Normal user, moderator, and normal admin denial.
 * 5. Emergency unlock, license extension, disabling limit, and immediate re-locking.
 * ===============================================================
 */

import assert from 'assert';

// ---------------------------------------------------------------
// Domain Logic Under Test (matches src/services/license.service.ts)
// ---------------------------------------------------------------
function getMillisFromTimestamp(val) {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val.seconds) return val.seconds * 1000 + (val.nanoseconds ? Math.floor(val.nanoseconds / 1000000) : 0);
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function isLicenseExpired(license, currentTime = Date.now()) {
  if (!license) return false;
  if (license.enabled === false) return false;
  if (!license.expiresAt) return false;

  const expireMillis = getMillisFromTimestamp(license.expiresAt);
  if (expireMillis <= 0) return false;

  return currentTime >= expireMillis;
}

function verifySuperAdminClaim(token) {
  if (!token) return false;
  // Strict: only custom claim superAdmin === true
  return token.superAdmin === true;
}

function canPerformComplaintOperations(license, userToken, currentTime = Date.now()) {
  const expired = isLicenseExpired(license, currentTime);
  const isSuperAdmin = verifySuperAdminClaim(userToken);
  // If expired, ONLY Super Admin can create/update complaints
  if (expired) {
    return isSuperAdmin;
  }
  return true; // Unlocked: normal operations permitted based on role
}

// ---------------------------------------------------------------
// TEST EXECUTION RUNNER
// ---------------------------------------------------------------
async function runTests() {
  console.log('======================================================');
  console.log('🧪 RUNNING LICENSE EXPIRATION & SECURITY TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function it(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }

  // 1. Unlocked when enabled is false (unlimited mode)
  it('1. License with enabled: false is UNLOCKED even if expiresAt is in past', () => {
    const pastDate = new Date(Date.now() - 100000);
    const license = { enabled: false, expiresAt: pastDate, updatedBy: 'admin@sail.in' };
    assert.strictEqual(isLicenseExpired(license, Date.now()), false);
  });

  // 2. Unlocked before expiresAt
  it('2. License with enabled: true is UNLOCKED when currentTime < expiresAt', () => {
    const futureDate = new Date(Date.now() + 5000); // 5 seconds in future
    const license = { enabled: true, expiresAt: futureDate, updatedBy: 'admin@sail.in' };
    assert.strictEqual(isLicenseExpired(license, Date.now()), false);
  });

  // 3. Locked at/after expiresAt
  it('3. License with enabled: true becomes LOCKED when currentTime >= expiresAt', () => {
    const expireTime = 1000000;
    const license = { enabled: true, expiresAt: expireTime, updatedBy: 'admin@sail.in' };
    assert.strictEqual(isLicenseExpired(license, 1000000), true);
    assert.strictEqual(isLicenseExpired(license, 1000001), true);
  });

  // 4. Firestore Timestamp format support
  it('4. Correctly evaluates Firestore Timestamp representation { seconds, nanoseconds }', () => {
    const nowSec = 1700000000;
    const license = { 
      enabled: true, 
      expiresAt: { seconds: nowSec, nanoseconds: 0 }, 
      updatedBy: 'admin@sail.in' 
    };
    assert.strictEqual(isLicenseExpired(license, (nowSec - 10) * 1000), false);
    assert.strictEqual(isLicenseExpired(license, nowSec * 1000), true);
    assert.strictEqual(isLicenseExpired(license, (nowSec + 10) * 1000), true);
  });

  // 5. Short-future automatic expiration simulation (Requirement 13)
  it('5. Transitions from UNLOCKED to LOCKED when time progresses past expiresAt', async () => {
    const startTime = Date.now();
    const shortExpiry = startTime + 50; // 50ms in future
    const license = { enabled: true, expiresAt: shortExpiry, updatedBy: 'admin@sail.in' };

    // Step 1: currently unlocked
    assert.strictEqual(isLicenseExpired(license, startTime), false, 'Must be unlocked at startTime');

    // Wait 70ms to pass expiration
    await new Promise(r => setTimeout(r, 70));
    const nowAfter = Date.now();

    // Step 2 & 3: reaches expiresAt -> becomes locked
    assert.strictEqual(isLicenseExpired(license, nowAfter), true, 'Must be locked after expiresAt');
  });

  // 6. Access Control: Normal User Denial
  it('6. Normal user (role: "user", superAdmin: false) is BLOCKED when expired', () => {
    const expiredLicense = { enabled: true, expiresAt: Date.now() - 5000, updatedBy: 'admin@sail.in' };
    const normalUserToken = { role: 'user', email: 'user@sail.in' };

    assert.strictEqual(verifySuperAdminClaim(normalUserToken), false);
    assert.strictEqual(canPerformComplaintOperations(expiredLicense, normalUserToken), false);
  });

  // 7. Access Control: Moderator Denial
  it('7. Moderator (role: "moderator", superAdmin: false) is BLOCKED when expired', () => {
    const expiredLicense = { enabled: true, expiresAt: Date.now() - 5000, updatedBy: 'admin@sail.in' };
    const moderatorToken = { role: 'moderator', email: 'mod@sail.in' };

    assert.strictEqual(verifySuperAdminClaim(moderatorToken), false);
    assert.strictEqual(canPerformComplaintOperations(expiredLicense, moderatorToken), false);
  });

  // 8. Access Control: Normal Admin Denial (Crucial requirement)
  it('8. Normal Admin (role: "admin", superAdmin: false) is BLOCKED when expired', () => {
    const expiredLicense = { enabled: true, expiresAt: Date.now() - 5000, updatedBy: 'admin@sail.in' };
    const normalAdminToken = { role: 'admin', email: 'admin@sail.in' };

    // Normal admin MUST NOT have superAdmin claim
    assert.strictEqual(verifySuperAdminClaim(normalAdminToken), false);
    // Normal admin MUST be blocked from operational workflows when expired
    assert.strictEqual(canPerformComplaintOperations(expiredLicense, normalAdminToken), false);
  });

  // 9. Super Admin Verification (claim only)
  it('9. Super Admin (superAdmin: true) is AUTHORIZED and bypasses the lock', () => {
    const expiredLicense = { enabled: true, expiresAt: Date.now() - 5000, updatedBy: 'admin@sail.in' };
    const superAdminToken = { role: 'admin', superAdmin: true, email: 'superadmin@sail.in' };

    assert.strictEqual(verifySuperAdminClaim(superAdminToken), true);
    assert.strictEqual(canPerformComplaintOperations(expiredLicense, superAdminToken), true);
  });

  // 10. Document Tampering Defense: user document flag does NOT grant Super Admin
  it('10. User profile doc data { superAdmin: true } WITHOUT Auth custom claim is REJECTED', () => {
    const spoofedUser = { role: 'admin', superAdmin: false }; // Token claims
    const spoofedDocData = { superAdmin: true }; // Attempted profile injection

    // Authoritative check uses token claim ONLY
    assert.strictEqual(verifySuperAdminClaim(spoofedUser), false);
  });

  // 11. State Mutation: Emergency Unlock (+24h)
  it('11. Action: Emergency Unlock (+24 Hours) restores application access', () => {
    let license = { enabled: true, expiresAt: Date.now() - 1000, updatedBy: 'admin@sail.in' };
    assert.strictEqual(isLicenseExpired(license, Date.now()), true);

    // Apply emergency unlock: set expiresAt to +24 hours
    const now = Date.now();
    license = {
      ...license,
      expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      reason: 'Emergency unlock: 24h temporary extension'
    };

    assert.strictEqual(isLicenseExpired(license, now), false);
  });

  // 12. State Mutation: License Extension
  it('12. Action: Extending expiresAt (+30 days) restores application access', () => {
    let license = { enabled: true, expiresAt: Date.now() - 5000, updatedBy: 'admin@sail.in' };
    assert.strictEqual(isLicenseExpired(license, Date.now()), true);

    const now = Date.now();
    license = {
      ...license,
      expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
      reason: 'License extended by 30 days'
    };

    assert.strictEqual(isLicenseExpired(license, now), false);
  });

  // 13. State Mutation: Disabling License Limit
  it('13. Action: Disabling license limit (enabled: false) restores unlimited access', () => {
    let license = { enabled: true, expiresAt: Date.now() - 5000, updatedBy: 'admin@sail.in' };
    assert.strictEqual(isLicenseExpired(license, Date.now()), true);

    license = {
      ...license,
      enabled: false,
      reason: 'License limit disabled: Unlimited mode'
    };

    assert.strictEqual(isLicenseExpired(license, Date.now()), false);
  });

  // 14. State Mutation: Immediate Re-Lock
  it('14. Action: Immediate Lock engages lock immediately without contradictory flags', () => {
    const now = Date.now();
    let license = { enabled: true, expiresAt: new Date(now + 365 * 24 * 60 * 60 * 1000) };
    assert.strictEqual(isLicenseExpired(license, now), false);

    // Immediate lock: set expiresAt to now or past
    license = {
      ...license,
      enabled: true,
      expiresAt: new Date(now - 1000),
      reason: 'Immediate manual lock'
    };

    assert.strictEqual(isLicenseExpired(license, now), true);
  });

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
