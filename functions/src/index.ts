/**
 * SAIL-MIOM – Firebase Cloud Functions (Admin Operations)
 * ============================================================
 * Privileged server-side operations requiring Firebase Admin SDK.
 * All functions verify caller has 'admin' custom claim / role.
 * ============================================================
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Helper function to verify that the caller is an authenticated admin or chief admin.
 */
/**
 * Helper function to verify that the caller is an authenticated admin or chief admin.
 * Enforces account status (must be active and not blocked) before granting access.
 */
const verifyAdmin = async (context: functions.https.CallableContext): Promise<boolean> => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to perform this action'
    );
  }

  // 1. Retrieve the caller's Firestore user document to validate active account status
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User account record not found'
    );
  }

  const userData = userDoc.data();
  // 2. Reject blocked or deactivated accounts unconditionally
  if (userData?.blocked === true || userData?.isActive === false) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Account has been blocked or deactivated'
    );
  }

  // 3. Check custom claims first
  const claimRole = (context.auth.token?.role || '').toLowerCase();
  const isSuperAdminClaim = context.auth.token?.superAdmin === true;
  if (
    isSuperAdminClaim ||
    claimRole === 'admin' ||
    claimRole === 'chief_admin'
  ) {
    return true;
  }

  // 4. Check Firestore user document as fallback for legitimate administrator role
  const docRole = (userData?.role || '').toLowerCase();
  if (docRole === 'admin' || docRole === 'chief_admin') {
    return true;
  }

  throw new functions.https.HttpsError(
    'permission-denied',
    'Administrator privileges required to perform this action'
  );
};

/**
 * Helper function to verify that the caller is an authenticated Chief Admin or Super Admin.
 * Enforces account status (must be active and not blocked) before granting access.
 */
const verifyChiefAdmin = async (context: functions.https.CallableContext): Promise<boolean> => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to perform this action'
    );
  }

  // 1. Retrieve the caller's Firestore user document to validate active account status
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User account record not found'
    );
  }

  const userData = userDoc.data();
  // 2. Reject blocked or deactivated accounts unconditionally
  if (userData?.blocked === true || userData?.isActive === false) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Account has been blocked or deactivated'
    );
  }

  // 3. Check custom claims first
  const claimRole = (context.auth.token?.role || '').toLowerCase();
  const isSuperAdminClaim = context.auth.token?.superAdmin === true;
  if (isSuperAdminClaim || claimRole === 'chief_admin') {
    return true;
  }

  // 4. Check Firestore user document as fallback for Chief Admin role
  const docRole = (userData?.role || '').toLowerCase();
  if (docRole === 'chief_admin') {
    return true;
  }

  throw new functions.https.HttpsError(
    'permission-denied',
    'Chief Admin privileges required to perform this action'
  );
};

/**
 * Helper function to determine if a target user is an authoritative Super Admin.
 * Checks Firestore document superAdmin flag and Auth custom claims.
 */
const isTargetUserSuperAdmin = async (uid: string): Promise<boolean> => {
  if (!uid) return false;
  try {
    const docSnap = await admin.firestore().collection('users').doc(uid).get();
    if (docSnap.exists && docSnap.data()?.superAdmin === true) {
      return true;
    }
  } catch {
    // Ignore error
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    if (userRecord.customClaims?.superAdmin === true) {
      return true;
    }
  } catch {
    // Ignore error
  }

  return false;
};

/**
 * Cloud Function: Create Privileged Account (Chief Admin Exclusive)
 * Creates user in Firebase Auth, assigns role custom claim, and creates Firestore profile.
 * Allowed roles: admin, chief_admin, moderator
 */
export const createPrivilegedUser = functions.https.onCall(async (data, context) => {
  await verifyChiefAdmin(context);

  const { email, password, name, role, businessName, designation, phone } = data;

  const validRoles = ['admin', 'chief_admin', 'CHIEF_ADMIN', 'moderator'];
  const normalizedRole = (role || 'admin').toLowerCase();

  if (!email || !password || !name) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email, password, and name are required'
    );
  }

  if (!validRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Role must be admin, chief_admin, or moderator'
    );
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      displayName: name.trim(),
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: normalizedRole,
    });

    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      displayName: name.trim(),
      role: normalizedRole,
      designation: designation || businessName || '',
      businessName: businessName || designation || (normalizedRole === 'moderator' ? 'Electrical Department' : ''),
      phone: phone || '',
      blocked: false,
      isActive: true,
      commentCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      uid: userRecord.uid,
      role: normalizedRole,
      message: `${normalizedRole === 'chief_admin' ? 'Chief Admin' : normalizedRole === 'admin' ? 'Admin' : 'Moderator'} ${email} created successfully`,
    };
  } catch (error: any) {
    console.error('Error creating privileged user:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create privileged user');
  }
});

/**
 * Cloud Function: Create Moderator Account
 * Creates user in Firebase Auth, assigns 'moderator' custom claim, and creates Firestore profile.
 */
export const createModerator = functions.https.onCall(async (data, context) => {
  await verifyAdmin(context);

  const { email, password, name, businessName, phone } = data;

  if (!email || !password || !name) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email, password, and name are required to create a moderator'
    );
  }

  try {
    // 1. Create User in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      displayName: name.trim(),
    });

    // 2. Assign 'moderator' custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'moderator',
    });

    // 3. Create User Document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      displayName: name.trim(),
      businessName: businessName || 'Electrical Department',
      phone: phone || '',
      role: 'moderator',
      blocked: false,
      isActive: true,
      commentCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      uid: userRecord.uid,
      message: `Moderator ${email} created successfully`,
    };
  } catch (error: any) {
    console.error('Error creating moderator:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create moderator');
  }
});

/**
 * Cloud Function: Set User Role & Custom Claims
 */
export const setUserRole = functions.https.onCall(async (data, context) => {
  const { uid, role } = data;
  const allowedRoles = ['chief_admin', 'CHIEF_ADMIN', 'admin', 'moderator', 'user'];

  if (!uid || !allowedRoles.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid UID and role are required');
  }

  // Granting chief_admin or admin requires Chief Admin permissions
  if (['chief_admin', 'CHIEF_ADMIN', 'admin'].includes(role)) {
    await verifyChiefAdmin(context);
  } else {
    await verifyAdmin(context);
  }

  const normalizedRole = role.toLowerCase();

  try {
    // Check if target is a Super Admin
    if (await isTargetUserSuperAdmin(uid) && context.auth?.token?.superAdmin !== true) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Cannot modify the role of a Super Admin account without Super Admin authorization'
      );
    }

    // Preserve existing custom claims (like superAdmin)
    const userRecord = await admin.auth().getUser(uid).catch(() => null);
    const existingClaims = userRecord?.customClaims || {};

    // Set custom claim in Firebase Auth
    await admin.auth().setCustomUserClaims(uid, {
      ...existingClaims,
      role: normalizedRole,
    });

    // Sync Firestore document
    await admin.firestore().collection('users').doc(uid).update({
      role: normalizedRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: `Role updated to ${normalizedRole}` };
  } catch (error: any) {
    console.error('Error setting user role:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to update user role');
  }
});

/**
 * Cloud Function: Delete User (Moderator / Employee)
 */
export const deleteUser = functions.https.onCall(async (data, context) => {
  await verifyAdmin(context);

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'User UID is required');
  }

  // Prevent lower roles from deleting Super Admin accounts
  if (await isTargetUserSuperAdmin(uid) && context.auth?.token?.superAdmin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Cannot delete a Super Admin account without Super Admin authorization'
    );
  }

  try {
    // 1. Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(uid);
    } catch (authErr: any) {
      if (authErr.code !== 'auth/user-not-found') throw authErr;
    }

    // 2. Delete Firestore Document
    await admin.firestore().collection('users').doc(uid).delete();

    // 3. Reassign active complaints assigned to this user back to 'pending'
    const assignedComplaints = await admin
      .firestore()
      .collection('complaints')
      .where('assignedToUID', '==', uid)
      .get();

    if (!assignedComplaints.empty) {
      const batch = admin.firestore().batch();
      assignedComplaints.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          assignedTo: null,
          assignedToUID: null,
          assignedToName: null,
          status: 'pending',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    return { success: true, message: `User ${uid} deleted successfully` };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to delete user');
  }
});

/**
 * Cloud Function: Update User Password
 */
export const updateUserPassword = functions.https.onCall(async (data, context) => {
  await verifyAdmin(context);

  const { uid, newPassword } = data;
  if (!uid || !newPassword || newPassword.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'UID and valid new password (min 6 characters) are required'
    );
  }

  // Prevent lower roles from modifying Super Admin passwords
  if (await isTargetUserSuperAdmin(uid) && context.auth?.token?.superAdmin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Cannot update password for a Super Admin account without Super Admin authorization'
    );
  }

  try {
    await admin.auth().updateUser(uid, { password: newPassword });
    return { success: true, message: 'Password updated successfully' };
  } catch (error: any) {
    console.error('Error updating user password:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to update password');
  }
});

/**
 * Cloud Function: Toggle User Blocked Status
 */
export const toggleUserBlock = functions.https.onCall(async (data, context) => {
  await verifyAdmin(context);

  const { uid, blocked } = data;
  if (!uid || typeof blocked !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'UID and blocked boolean required');
  }

  // Prevent lower roles from blocking Super Admin accounts
  if (await isTargetUserSuperAdmin(uid) && context.auth?.token?.superAdmin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Cannot block or modify a Super Admin account without Super Admin authorization'
    );
  }

  try {
    await admin.firestore().collection('users').doc(uid).update({
      blocked,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (blocked) {
      // Revoke all existing tokens for blocked user
      await admin.auth().revokeRefreshTokens(uid);
    }

    return { success: true, message: `User block status set to ${blocked}` };
  } catch (error: any) {
    console.error('Error toggling block status:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to toggle block status');
  }
});

/**
 * Cloud Function: Toggle User Active Status
 */
export const toggleUserActive = functions.https.onCall(async (data, context) => {
  await verifyAdmin(context);

  const { uid, isActive } = data;
  if (!uid || typeof isActive !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'UID and isActive boolean required');
  }

  // Prevent lower roles from deactivating Super Admin accounts
  if (await isTargetUserSuperAdmin(uid) && context.auth?.token?.superAdmin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Cannot deactivate a Super Admin account without Super Admin authorization'
    );
  }

  try {
    await admin.firestore().collection('users').doc(uid).update({
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: `User active status set to ${isActive}` };
  } catch (error: any) {
    console.error('Error toggling active status:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to toggle active status');
  }
});

/**
 * Cloud Function: Update User Profile Data
 */
export const updateUserData = functions.https.onCall(async (data, context) => {
  await verifyAdmin(context);

  const { uid, updates } = data;
  if (!uid || !updates) {
    throw new functions.https.HttpsError('invalid-argument', 'UID and updates are required');
  }

  // Prevent lower roles from updating Super Admin accounts
  if (await isTargetUserSuperAdmin(uid) && context.auth?.token?.superAdmin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Cannot modify a Super Admin account without Super Admin authorization'
    );
  }

  // Prevent non-super admins from modifying or setting superAdmin
  if ('superAdmin' in updates && context.auth?.token?.superAdmin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Super Admin authorization required to modify superAdmin status'
    );
  }

  // Escalating role to admin or chief_admin strictly requires Chief Admin permissions
  if (updates.role && ['chief_admin', 'CHIEF_ADMIN', 'admin'].includes(updates.role)) {
    await verifyChiefAdmin(context);
  }

  try {
    // If role changed, update Auth custom claim too
    if (updates.role) {
      const userRecord = await admin.auth().getUser(uid).catch(() => null);
      const existingClaims = userRecord?.customClaims || {};
      await admin.auth().setCustomUserClaims(uid, {
        ...existingClaims,
        role: updates.role.toLowerCase(),
      });
    }

    await admin.firestore().collection('users').doc(uid).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'User data updated successfully' };
  } catch (error: any) {
    console.error('Error updating user data:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to update user data');
  }
});

/**
 * Cloud Function: Get Managed Users Directory
 * Returns all users if caller is Super Admin.
 * Excludes Super Admin accounts if caller is Chief Admin or Admin.
 */
export const getManagedUsers = functions.https.onCall(async (_data, context) => {
  await verifyAdmin(context);

  const isCallerSuperAdmin = context.auth?.token?.superAdmin === true;

  try {
    // 1. Authoritative Super Admin discovery from Firebase Auth custom claims
    const superAdminUids = new Set<string>();
    try {
      const authUsers = await admin.auth().listUsers(1000);
      for (const u of authUsers.users) {
        if (u.customClaims?.superAdmin === true) {
          superAdminUids.add(u.uid);
        }
      }
    } catch (authErr) {
      console.warn('Unable to list auth users for superAdmin claims verification:', authErr);
    }

    // 2. Fetch all user documents from Firestore
    const snapshot = await admin.firestore().collection('users').get();
    const users = snapshot.docs
      .map((docSnap) => {
        const d = docSnap.data();
        // An account is an authoritative Super Admin if its Auth custom claim says so,
        // OR its Firestore doc indicates superAdmin === true / role === 'super_admin'
        const isSuperAdminAccount =
          superAdminUids.has(docSnap.id) ||
          d.superAdmin === true ||
          d.role === 'super_admin';

        return {
          uid: docSnap.id,
          id: docSnap.id,
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
  } catch (error: any) {
    console.error('Error fetching managed users:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to fetch users');
  }
});

/**
 * Helper function to verify that the caller is an authenticated Super Admin.
 * Strictly verifies the Firebase Auth custom claim. NO document fallbacks.
 * Validates active account status.
 */
const verifySuperAdmin = async (context: functions.https.CallableContext): Promise<boolean> => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to perform this action'
    );
  }

  // Authoritative: Firebase Auth custom claim only
  if (context.auth.token?.superAdmin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Super Admin custom claim is strictly required'
    );
  }

  // Account status check
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    if (userData?.blocked === true || userData?.isActive === false) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Account has been blocked or deactivated'
      );
    }
  }

  return true;
};

/**
 * Cloud Function: Update System License Configuration
 * Protected: Super Admin custom claim only.
 */
export const updateLicenseStatus = functions.https.onCall(async (data, context) => {
  await verifySuperAdmin(context);

  const { enabled, expiresAt, reason } = data;
  if (typeof enabled !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'enabled boolean is required');
  }

  try {
    const updateData: any = {
      enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth?.token?.email || 'Super Admin',
      reason: reason || ''
    };

    if (expiresAt) {
      if (typeof expiresAt === 'number') {
        updateData.expiresAt = admin.firestore.Timestamp.fromMillis(expiresAt);
      } else {
        updateData.expiresAt = admin.firestore.Timestamp.fromDate(new Date(expiresAt));
      }
    }

    await admin.firestore().collection('systemSettings').doc('serviceLicense').set(updateData, { merge: true });

    return {
      success: true,
      enabled,
      message: 'Service license configuration updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating system license status:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to update system license status');
  }
});

/**
 * Cloud Function: Assign Super Admin Role
 * Protected: Super Admin only.
 */
export const assignSuperAdmin = functions.https.onCall(async (data, context) => {
  await verifySuperAdmin(context);

  const { targetUid, enable } = data;
  if (!targetUid || typeof enable !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'targetUid and enable boolean are required');
  }

  try {
    const userRecord = await admin.auth().getUser(targetUid);
    const existingClaims = userRecord.customClaims || {};

    await admin.auth().setCustomUserClaims(targetUid, {
      ...existingClaims,
      superAdmin: enable,
    });

    await admin.firestore().collection('users').doc(targetUid).update({
      superAdmin: enable,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: `Super Admin status ${enable ? 'granted to' : 'revoked from'} ${userRecord.email}`
    };
  } catch (error: any) {
    console.error('Error assigning super admin:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to assign super admin');
  }
});
