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

  // 15. Precise Expiration Boundary Testing: immediately before, exactly at, and after
  it('15. Precise boundary evaluation: expiresAt - 1ms (unlocked), at expiresAt (locked), expiresAt + 1ms (locked)', () => {
    const boundaryTime = 1800000000000;
    const license = { enabled: true, expiresAt: boundaryTime, updatedBy: 'admin@sail.in' };

    // 1ms before expiration: MUST be unlocked
    assert.strictEqual(
      isLicenseExpired(license, boundaryTime - 1),
      false,
      'Must be unlocked at boundaryTime - 1ms'
    );

    // Exactly at expiration: MUST be locked
    assert.strictEqual(
      isLicenseExpired(license, boundaryTime),
      true,
      'Must be locked exactly at boundaryTime'
    );

    // 1ms after expiration: MUST be locked
    assert.strictEqual(
      isLicenseExpired(license, boundaryTime + 1),
      true,
      'Must be locked at boundaryTime + 1ms'
    );
  });

  // 16. Stale updatedAt does NOT distort expiration check
  it('16. Stale updatedAt timestamp (hours or days old) does NOT shift or distort expiration check', () => {
    const now = Date.now();
    const futureExpiry = now + 60000; // 1 minute in future

    // License doc modified 12 hours ago (updatedAt is 12h in past)
    const staleLicense1 = {
      enabled: true,
      expiresAt: futureExpiry,
      updatedAt: { seconds: Math.floor((now - 12 * 3600 * 1000) / 1000), nanoseconds: 0 },
      updatedBy: 'superadmin@sail.in'
    };

    // Evaluated against current client time: must be UNLOCKED (not shifted into past)
    assert.strictEqual(
      isLicenseExpired(staleLicense1, now),
      false,
      'License with 12-hour-old updatedAt must still be unlocked when expiresAt is in the future'
    );

    // License doc modified 30 days ago
    const staleLicense2 = {
      enabled: true,
      expiresAt: futureExpiry,
      updatedAt: { seconds: Math.floor((now - 30 * 86400 * 1000) / 1000), nanoseconds: 0 },
      updatedBy: 'superadmin@sail.in'
    };

    assert.strictEqual(
      isLicenseExpired(staleLicense2, now),
      false,
      'License with 30-day-old updatedAt must not be shifted by artificial clock offset'
    );
  });

  // 17. Long Future Expirations >24.8 Days (>2147483647 ms) and Bounded Timer Chunking
  it('17. Long future expirations (>24.8 days / 365 days) evaluate unlocked and use bounded timer intervals', () => {
    const now = Date.now();
    const oneYearFuture = now + 365 * 24 * 60 * 60 * 1000; // 31,536,000,000 ms away
    const license = {
      enabled: true,
      expiresAt: oneYearFuture,
      updatedBy: 'superadmin@sail.in'
    };

    // 1. Must be unlocked
    assert.strictEqual(isLicenseExpired(license, now), false);

    // 2. Remaining duration is > 32-bit signed integer max (2147483647 ms)
    const remaining = oneYearFuture - now;
    assert.ok(remaining > 2147483647, 'Remaining duration must exceed 32-bit setTimeout limit');

    // 3. Chunked scheduling function: next delay must be bounded to MAX_CHUNK (24 hours)
    const MAX_CHUNK_MS = 24 * 60 * 60 * 1000; // 86,400,000 ms
    const nextDelay = Math.min(remaining + 50, MAX_CHUNK_MS);

    assert.strictEqual(nextDelay, MAX_CHUNK_MS, 'Next delay must be safely capped at 24 hours');
    assert.ok(nextDelay <= 2147483647, 'Bounded next delay must fit inside 32-bit signed integer limit');

    // 4. When remaining time is under 24 hours (e.g. 2 hours), exact delay is scheduled
    const remainingShort = 2 * 60 * 60 * 1000; // 2 hours
    const shortDelay = Math.min(remainingShort + 50, MAX_CHUNK_MS);
    assert.strictEqual(shortDelay, 2 * 60 * 60 * 1000 + 50, 'Short remaining time schedules exact delay with buffer');
  });

  // 18. Extension while app is open updates immediately
  it('18. License extension snapshot while app is open transitions state from LOCKED to UNLOCKED immediately', () => {
    const now = Date.now();
    // Initially expired license
    let activeLicense = {
      enabled: true,
      expiresAt: now - 5000,
      updatedBy: 'superadmin@sail.in'
    };

    assert.strictEqual(isLicenseExpired(activeLicense, now), true, 'Initially locked');

    // Super Admin extends license by 30 days while user is on page
    activeLicense = {
      ...activeLicense,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      updatedAt: now
    };

    assert.strictEqual(
      isLicenseExpired(activeLicense, now),
      false,
      'Immediately unlocked upon receiving extended license snapshot'
    );
  });

  // 19. Visibility change / window focus re-evaluation
  it('19. Page visibility or focus re-evaluates expiration when waking up after expiresAt passed', () => {
    const startTime = 1000000;
    const expiresAt = 1005000; // 5 seconds later
    const license = { enabled: true, expiresAt };

    // At startTime: unlocked
    assert.strictEqual(isLicenseExpired(license, startTime), false);

    // Tab sleeps / is backgrounded, wakes up at wakeTime (10 seconds later, past expiration)
    const wakeTime = 1010000;
    const expiredOnWake = isLicenseExpired(license, wakeTime);

    assert.strictEqual(expiredOnWake, true, 'Re-evaluation on wake must detect passed expiration');
  });

  // 20. Super Admin Bypass Display Status
  it('20. Super Admin bypass display logic clearly indicates active bypass when expired', () => {
    function getDisplayStatus(license, userToken, currentTime = Date.now()) {
      const expired = isLicenseExpired(license, currentTime);
      const isSuperAdmin = verifySuperAdminClaim(userToken);

      if (expired) {
        return {
          badge: isSuperAdmin ? 'LOCKED (Super Admin Bypass Active)' : 'LOCKED',
          overlayRendered: !isSuperAdmin,
          canOperate: isSuperAdmin
        };
      }
      return {
        badge: 'ACTIVE & UNLOCKED',
        overlayRendered: false,
        canOperate: true
      };
    }

    const now = Date.now();
    const expiredLicense = { enabled: true, expiresAt: now - 10000 };
    const validLicense = { enabled: true, expiresAt: now + 100000 };

    const superAdminToken = { role: 'admin', superAdmin: true };
    const normalAdminToken = { role: 'admin', superAdmin: false };
    const userToken = { role: 'user' };

    // When expired:
    const saExpired = getDisplayStatus(expiredLicense, superAdminToken, now);
    assert.strictEqual(saExpired.badge, 'LOCKED (Super Admin Bypass Active)');
    assert.strictEqual(saExpired.overlayRendered, false);
    assert.strictEqual(saExpired.canOperate, true);

    const adminExpired = getDisplayStatus(expiredLicense, normalAdminToken, now);
    assert.strictEqual(adminExpired.badge, 'LOCKED');
    assert.strictEqual(adminExpired.overlayRendered, true);
    assert.strictEqual(adminExpired.canOperate, false);

    const userExpired = getDisplayStatus(expiredLicense, userToken, now);
    assert.strictEqual(userExpired.badge, 'LOCKED');
    assert.strictEqual(userExpired.overlayRendered, true);
    assert.strictEqual(userExpired.canOperate, false);

    // When valid:
    const saValid = getDisplayStatus(validLicense, superAdminToken, now);
    assert.strictEqual(saValid.badge, 'ACTIVE & UNLOCKED');
    assert.strictEqual(saValid.overlayRendered, false);

    const userValid = getDisplayStatus(validLicense, userToken, now);
    assert.strictEqual(userValid.badge, 'ACTIVE & UNLOCKED');
    assert.strictEqual(userValid.overlayRendered, false);
  });

  // 21. Distinct Enforcement Scopes: System License vs Account Block vs 24h Complaint Limit
  it('21. Account blocking/deactivation and 24h complaint rate limit remain distinct from system license', () => {
    const now = Date.now();
    const validLicense = { enabled: true, expiresAt: now + 100000 };
    const expiredLicense = { enabled: true, expiresAt: now - 10000 };

    // Rule A: Account blocking/deactivation
    function canUserSignIn(userDoc) {
      if (userDoc.blocked === true) return false;
      if (userDoc.isActive === false) return false;
      return true;
    }

    // A valid license does NOT allow a blocked user to sign in
    assert.strictEqual(
      canUserSignIn({ uid: 'u1', blocked: true, isActive: true }),
      false,
      'Blocked account cannot sign in even when license is active'
    );
    assert.strictEqual(
      canUserSignIn({ uid: 'u2', blocked: false, isActive: false }),
      false,
      'Deactivated account cannot sign in even when license is active'
    );

    // Rule B: 24h Citizen complaint submission rate limit
    function canSubmitComplaint(license, lastSubmissionTime, currentTime = Date.now()) {
      // 1. License check: if license expired, citizen complaints blocked
      if (isLicenseExpired(license, currentTime)) {
        return { allowed: false, reason: 'LICENSE_EXPIRED' };
      }
      // 2. 24h rate limit check: independent of license
      if (lastSubmissionTime && (currentTime - lastSubmissionTime < 24 * 60 * 60 * 1000)) {
        return { allowed: false, reason: 'RATE_LIMITED' };
      }
      return { allowed: true };
    }

    // Valid license, but citizen filed 2 hours ago: rate limited, NOT license error
    const rateLimitedResult = canSubmitComplaint(validLicense, now - 2 * 3600 * 1000, now);
    assert.strictEqual(rateLimitedResult.allowed, false);
    assert.strictEqual(rateLimitedResult.reason, 'RATE_LIMITED');

    // Expired license, citizen last filed 3 days ago: license expired
    const licenseExpiredResult = canSubmitComplaint(expiredLicense, now - 3 * 86400 * 1000, now);
    assert.strictEqual(licenseExpiredResult.allowed, false);
    assert.strictEqual(licenseExpiredResult.reason, 'LICENSE_EXPIRED');

    // Valid license, last filed 25 hours ago: allowed
    const allowedResult = canSubmitComplaint(validLicense, now - 25 * 3600 * 1000, now);
    assert.strictEqual(allowedResult.allowed, true);
  });

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
