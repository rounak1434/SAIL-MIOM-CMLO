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
 * Helper function to verify that the caller is an authenticated admin.
 */
const verifyAdmin = async (context: functions.https.CallableContext): Promise<boolean> => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to perform this action'
    );
  }

  // 1. Check custom claim first
  if (context.auth.token?.role === 'admin') {
    return true;
  }

  // 2. Check Firestore user document as fallback
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin' || userDoc.data()?.blocked === true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only active administrator accounts can perform this action'
    );
  }

  return true;
};

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
      businessName: businessName || 'IT Department',
      phone: phone || '',
      role: 'moderator',
      blocked: false,
      isActive: true,
      commentCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
  await verifyAdmin(context);

  const { uid, role } = data;

  if (!uid || !['admin', 'moderator', 'user'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid UID and role are required');
  }

  try {
    // Set custom claim in Firebase Auth
    await admin.auth().setCustomUserClaims(uid, { role });

    // Sync Firestore document
    await admin.firestore().collection('users').doc(uid).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: `Role updated to ${role}` };
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

  try {
    // If role changed, update Auth custom claim too
    if (updates.role) {
      await admin.auth().setCustomUserClaims(uid, { role: updates.role });
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
 * Helper function to verify that the caller is an authenticated Super Admin.
 * Strictly verifies the Firebase Auth custom claim. NO document fallbacks.
 */
const verifySuperAdmin = (context: functions.https.CallableContext): boolean => {
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

  return true;
};

/**
 * Cloud Function: Update System License Configuration
 * Protected: Super Admin custom claim only.
 */
export const updateLicenseStatus = functions.https.onCall(async (data, context) => {
  verifySuperAdmin(context);

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
