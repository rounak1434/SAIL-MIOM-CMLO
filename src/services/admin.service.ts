/**
 * SAIL-MIOM – Admin Operations Service (Cloud Firestore + Cloud Functions)
 * ============================================================
 */

import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from './firebase';

export interface UserData {
  uid: string;
  id?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: 'admin' | 'moderator' | 'user';
  businessName?: string;
  phone?: string;
  blocked?: boolean;
  isActive?: boolean;
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
  uid: string,
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
export const sendUserPasswordReset = async (email: string): Promise<FunctionResponse> => {
  if (!email || !email.includes('@')) {
    throw new Error('Valid email address is required to send password reset');
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
    role?: 'admin' | 'moderator' | 'user';
    blocked?: boolean;
    isActive?: boolean;
  }
): Promise<{ success: boolean; message: string }> => {
  await updateDoc(doc(db, 'users', uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  return { success: true, message: 'User data updated successfully' };
};

/**
 * Get all users from Firestore
 */
export const getAllUsers = async (): Promise<UserData[]> => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      uid: docSnap.id,
      id: docSnap.id,
      email: data.email,
      name: data.name || data.displayName || '',
      displayName: data.displayName || data.name || '',
      role: data.role || 'user',
      businessName: data.businessName,
      phone: data.phone,
      blocked: data.blocked === true,
      isActive: data.isActive !== false,
      commentCount: data.commentCount || 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      profilePhotoUrl: data.profilePhotoUrl || null,
    };
  });
};
