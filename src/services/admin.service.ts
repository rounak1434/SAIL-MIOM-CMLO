/**
 * SAIL-MIOM – Admin Operations Service (Cloud Firestore + Cloud Functions)
 * ============================================================
 */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db, auth, firebaseConfig } from './firebase';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { AppRole } from './auth.service';

export interface UserData {
  uid: string;
  id?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: AppRole;
  superAdmin?: boolean;
  businessName?: string;
  phone?: string;
  blocked?: boolean;
  isActive?: boolean;
  hidden?: boolean;
  commentCount?: number;
  createdAt?: any;
  updatedAt?: any;
  profilePhotoUrl?: string | null;
}

export interface FunctionResponse {
  success: boolean;
  message: string;
  [key: string]: any;
}

/**
 * Delete a user account
 * Note: Deleting another user's Firebase Auth identity requires Firebase Admin SDK.
 * On the Spark plan (without Cloud Functions), administrators should Block or Deactivate the account.
 */
export const deleteUser = async (
  _uid: string,
  _deleteFirestore: boolean = true
): Promise<FunctionResponse> => {
  throw new Error(
    'Deleting a user’s underlying Firebase Auth account requires trusted server functions (available on the Blaze plan) or the local bootstrap CLI tool (npm run setup-admin). To restrict access immediately on Spark, please use the Block or Deactivate account action.'
  );
};

/**
 * Send password reset email to user (Client-side Firebase Auth)
 * Works 100% on Spark plan without Cloud Functions.
 */
export const sendUserPasswordReset = async (
  email: string,
  isSuperAdminCaller: boolean = false
): Promise<FunctionResponse> => {
  if (!email || !email.includes('@')) {
    throw new Error('Valid email address is required to send password reset');
  }

  // Prevent lower roles from resetting passwords for Super Admin accounts
  if (!isSuperAdminCaller) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs.some((d) => d.data().superAdmin === true)) {
        throw new Error('Cannot dispatch password reset for a Super Admin account without Super Admin authorization');
      }
    } catch (err: any) {
      if (err.message?.includes('Super Admin')) throw err;
      // If query fails, continue to auth reset or rule enforcement
    }
  }

  await sendPasswordResetEmail(auth, email);
  return {
    success: true,
    message: `Password reset email sent to ${email}`,
  };
};

/**
 * Update a user's password directly (requires Admin SDK / Cloud Functions)
 */
export const updateUserPassword = async (
  _uid: string,
  _newPassword: string
): Promise<FunctionResponse> => {
  throw new Error(
    'Direct administrative password overwrites require trusted server functions. Please use the Send Password Reset Email feature.'
  );
};

/**
 * Update user profile & role data (Admin only via direct Firestore update)
 * Strictly authorized by firestore.rules: match /users/{userId} { allow update: if isAdmin(); }
 */
export const updateUserData = async (
  uid: string,
  updates: {
    name?: string;
    displayName?: string;
    businessName?: string;
    email?: string;
    phone?: string;
    role?: AppRole;
    blocked?: boolean;
    isActive?: boolean;
    hidden?: boolean;
  },
  isSuperAdminCaller: boolean = false
): Promise<{ success: boolean; message: string }> => {
  // Pre-check target in client before writing: prevent lower roles from updating Super Admin accounts
  if (!isSuperAdminCaller) {
    if (updates.hidden !== undefined) {
      throw new Error('Cannot modify hidden status of an account without Super Admin authorization');
    }
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists() && docSnap.data().superAdmin === true) {
        throw new Error('Cannot modify a Super Admin account without Super Admin authorization');
      }
    } catch (err: any) {
      if (err.message?.includes('Super Admin')) throw err;
    }
  }

  await updateDoc(doc(db, 'users', uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  return { success: true, message: 'User data updated successfully' };
};

/**
 * Toggle account hidden status (Super Admin only)
 * Completely Spark-plan compatible: uses existing Firebase Auth session,
 * Firestore client SDK, and authoritative Firestore Security Rules.
 * Zero dependency on callable Cloud Functions.
 * Allows hiding or unhiding any account, including Super Admin accounts
 * and the currently signed-in Super Admin account.
 */
export const toggleAccountHidden = async (
  uid: string,
  hidden: boolean
): Promise<{ success: boolean; message: string }> => {
  if (!uid || typeof hidden !== 'boolean') {
    throw new Error('Valid UID and hidden boolean required');
  }

  const currentFbUser = auth.currentUser;
  if (!currentFbUser) {
    throw new Error('User must be authenticated to perform this action');
  }

  // Authoritative check on client (token custom claim) before write
  const tokenResult = await currentFbUser.getIdTokenResult(true);
  if (tokenResult.claims.superAdmin !== true) {
    throw new Error('Super Admin authorization is strictly required to hide or unhide accounts');
  }

  // Direct Firestore client SDK update (Spark plan compatible, zero Cloud Function dependency)
  // Strictly authorized by firestore.rules: requires request.auth.token.superAdmin == true
  // Restricted strictly to the visibility field ('hidden' and 'updatedAt')
  await updateDoc(doc(db, 'users', uid), {
    hidden,
    updatedAt: serverTimestamp(),
  });

  return { success: true, message: `Account ${hidden ? 'hidden' : 'unhidden'} successfully` };
};

/**
 * Get managed users from server or Firestore
 * Completely Spark-plan compatible: directly queries Firestore user documents without
 * requiring callable Cloud Functions.
 * - Super Admin receives all accounts (including other Super Admins and hidden accounts).
 * - Chief Admin receives other Chief Admin, Admin, and Moderator accounts (omitting Super Admin & hidden).
 * - Admin receives Admin and Moderator accounts (omitting Super Admin & hidden).
 */
export const getAllUsers = async (
  isSuperAdminCaller: boolean = false,
  isChiefAdminCaller: boolean = false
): Promise<UserData[]> => {
  let isSuper = isSuperAdminCaller;
  let isChief = isChiefAdminCaller;

  const currentFbUser = auth.currentUser;
  if (currentFbUser && (!isSuper || !isChief)) {
    try {
      const token = await currentFbUser.getIdTokenResult();
      if (token.claims.superAdmin === true) isSuper = true;
      if (token.claims.role === 'chief_admin' || token.claims.role === 'CHIEF_ADMIN') isChief = true;
    } catch {}
  }

  // On Spark plan (without Cloud Functions) or when caller is Super Admin:
  // Direct Firestore collection query is immediately available, compliant with firestore.rules,
  // and has zero Cloud Function dependency.
  if (isSuper) {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          id: docSnap.id,
          email: data.email || '',
          name: data.name || data.displayName || '',
          displayName: data.displayName || data.name || '',
          role: data.role || 'user',
          superAdmin: data.superAdmin === true || data.role === 'super_admin',
          businessName: data.businessName,
          phone: data.phone,
          blocked: data.blocked === true,
          isActive: data.isActive !== false,
          hidden: data.hidden === true,
          commentCount: data.commentCount || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          profilePhotoUrl: data.profilePhotoUrl || null,
        };
      });
    } catch (err: any) {
      console.warn('Super Admin direct Firestore collection query error:', err);
    }
  }

  // For non-super admins (Chief Admin, Admin), try getManagedUsers Cloud Function if available
  try {
    const functionsInstance = getFunctions(app);
    const getManagedUsersFn = httpsCallable<void, { success: boolean; users: UserData[] }>(
      functionsInstance,
      'getManagedUsers'
    );
    const response = await getManagedUsersFn();
    if (response.data && response.data.success && Array.isArray(response.data.users)) {
      return response.data.users;
    }
  } catch (fnErr: any) {
    console.warn('getManagedUsers Cloud Function call failed, evaluating fallback:', fnErr);
    // On Spark plan fallback:
    // Chief Admin can query other Chief Admins, Admins, and Moderators
    // Admin can query Admins and Moderators
    try {
      const usersRef = collection(db, 'users');
      const rolesToQuery = isChief
        ? ['chief_admin', 'CHIEF_ADMIN', 'admin', 'moderator']
        : ['admin', 'moderator'];

      const q = query(usersRef, where('role', 'in', rolesToQuery));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            uid: docSnap.id,
            id: docSnap.id,
            email: data.email || '',
            name: data.name || data.displayName || '',
            displayName: data.displayName || data.name || '',
            role: (data.role || 'user') as any,
            superAdmin: data.superAdmin === true || data.role === 'super_admin',
            businessName: data.businessName,
            phone: data.phone,
            blocked: data.blocked === true,
            isActive: data.isActive !== false,
            hidden: data.hidden === true,
            commentCount: data.commentCount || 0,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            profilePhotoUrl: data.profilePhotoUrl || null,
          };
        })
        .filter((u) => !u.hidden && !u.superAdmin);
    } catch (fallbackErr: any) {
      console.warn('Fallback query error:', fallbackErr);
      throw new Error(fnErr?.message || 'Failed to fetch user directory from server');
    }
  }
  return [];
};

export interface CreateAccountParams {
  name: string;
  email: string;
  password: string;
  role: AppRole;
  designation?: string;
  businessName?: string;
  phone?: string;
}

/**
 * Create a privileged account (Admin, Chief Admin, or Moderator)
 * Uses secondary Firebase Auth instance to avoid disrupting active session
 */
export const createPrivilegedAccount = async (
  params: CreateAccountParams
): Promise<{ uid: string; email: string; name: string; role: AppRole }> => {
  const cleanName = params.name.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPassword = params.password.trim();
  const cleanDesignation = params.designation?.trim() || '';
  const cleanPhone = params.phone?.trim() || '';
  const role = params.role || 'admin';

  if (!cleanName || !cleanEmail || !cleanPassword) {
    throw new Error('Name, email, and password are required');
  }
  if (cleanPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const secondaryAppName = `SecondaryCreatorApp_${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      cleanEmail,
      cleanPassword
    );
    const newUid = userCredential.user.uid;

    await updateProfile(userCredential.user, {
      displayName: cleanName,
    });

    await signOut(secondaryAuth);

    await setDoc(doc(db, 'users', newUid), {
      uid: newUid,
      email: cleanEmail,
      name: cleanName,
      displayName: cleanName,
      role: role,
      designation: cleanDesignation,
      businessName:
        params.businessName?.trim() ||
        cleanDesignation ||
        (role === 'moderator' ? 'Electrical Department' : ''),
      phone: cleanPhone,
      blocked: false,
      isActive: true,
      commentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      uid: newUid,
      email: cleanEmail,
      name: cleanName,
      role,
    };
  } finally {
    try {
      const { deleteApp } = await import('firebase/app');
      await deleteApp(secondaryApp);
    } catch {
      // Ignore cleanup error
    }
  }
};
