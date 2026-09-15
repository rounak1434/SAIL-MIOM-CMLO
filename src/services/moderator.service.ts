/**
 * SAIL-MIOM – Moderator & User Management Service (Cloud Firestore + Cloud Functions)
 * ============================================================
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Moderator {
  id?: string;
  uid?: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  role: 'moderator' | 'user' | 'admin';
  isActive?: boolean;
  blocked?: boolean;
  createdAt: any;
}

/**
 * Create a new moderator account
 * Note: Authoritatively assigning custom claims requires Firebase Admin SDK.
 * On Spark plan, use the local bootstrap CLI tool: npm run setup-admin
 */
export const createModeratorAccount = async (
  _name: string,
  _businessName: string,
  _email: string,
  _phone: string,
  _password: string
): Promise<string> => {
  throw new Error(
    'Creating privileged moderator accounts with custom claims requires trusted server functions (Blaze plan) or the local CLI tool (npm run setup-admin). Client-side code cannot securely assign custom claims.'
  );
};

/**
 * Get all moderators from Firestore (Admin only)
 */
export const getAllModerators = async (): Promise<Moderator[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'moderator'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      uid: docSnap.id,
      name: data.name || data.displayName || '',
      businessName: data.businessName || 'Electrical Department',
      email: data.email || '',
      phone: data.phone || '',
      role: 'moderator',
      isActive: data.isActive !== false,
      blocked: data.blocked === true,
      createdAt: data.createdAt,
    };
  });
};

/**
 * Get only active moderators from Firestore (Admin only)
 */
export const getActiveModerators = async (): Promise<Moderator[]> => {
  const allMods = await getAllModerators();
  return allMods.filter((m) => m.isActive !== false);
};

/**
 * Subscribe to real-time active moderators from Firestore (Admin only)
 * Filters out moderators where isActive === false.
 */
export const subscribeToActiveModerators = (
  callback: (moderators: Moderator[]) => void
): (() => void) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'moderator'));
  return onSnapshot(
    q,
    (snapshot) => {
      const activeMods = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: docSnap.id,
            name: data.name || data.displayName || '',
            businessName: data.businessName || 'Electrical Department',
            email: data.email || '',
            phone: data.phone || '',
            role: 'moderator' as const,
            isActive: data.isActive !== false,
            blocked: data.blocked === true,
            createdAt: data.createdAt,
          };
        })
        .filter((mod) => mod.isActive !== false);

      callback(activeMods);
    },
    (error) => {
      console.error('Error listening to active moderators:', error);
    }
  );
};

/**
 * Toggle moderator active status (Admin only via direct Firestore update)
 */
export const toggleModeratorStatus = async (
  id: string,
  isActive: boolean
): Promise<void> => {
  await updateDoc(doc(db, 'users', id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete moderator account
 */
export const deleteModerator = async (_id: string): Promise<void> => {
  throw new Error(
    'Deleting a moderator’s underlying Firebase Auth account requires trusted server functions or the CLI tool. To revoke access immediately on Spark, please use the Deactivate status toggle.'
  );
};

/**
 * Toggle user blocked status (Admin only via direct Firestore update)
 */
export const toggleUserBlock = async (
  uid: string,
  blocked: boolean
): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), {
    blocked,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Get all blocked users (Admin only)
 */
export const getBlockedUsers = async (): Promise<Moderator[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('blocked', '==', true));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      uid: docSnap.id,
      name: data.name || data.displayName || '',
      businessName: data.businessName || '',
      email: data.email || '',
      phone: data.phone || '',
      role: data.role || 'user',
      isActive: data.isActive !== false,
      blocked: true,
      createdAt: data.createdAt,
    };
  });
};
