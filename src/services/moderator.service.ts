/**
 * SAIL-MIOM – Moderator & User Management Service (Cloud Firestore + Cloud Functions)
 * ============================================================
 */

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { getAllUsers } from './admin.service';

export interface Moderator {
  id?: string;
  uid?: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  role: 'moderator' | 'user' | 'admin' | 'chief_admin';
  superAdmin?: boolean;
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

  return snapshot.docs
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
        superAdmin: data.superAdmin === true,
        isActive: data.isActive !== false,
        blocked: data.blocked === true,
        createdAt: data.createdAt,
      };
    })
    .filter((m) => !m.superAdmin);
};

/**
 * Get only active moderators from Firestore (Admin only)
 */
export const getActiveModerators = async (): Promise<Moderator[]> => {
  const allMods = await getAllModerators();
  return allMods.filter((m) => m.isActive !== false && !m.superAdmin);
};

/**
 * Subscribe to real-time active moderators from Firestore (Admin only)
 * Filters out moderators where isActive === false or superAdmin === true.
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
            superAdmin: data.superAdmin === true,
            isActive: data.isActive !== false,
            blocked: data.blocked === true,
            createdAt: data.createdAt,
          };
        })
        .filter((mod) => mod.isActive !== false && !mod.superAdmin);

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
  isActive: boolean,
  isSuperAdminCaller: boolean = false
): Promise<void> => {
  if (!isSuperAdminCaller) {
    try {
      const docSnap = await getDoc(doc(db, 'users', id));
      if (docSnap.exists() && docSnap.data().superAdmin === true) {
        throw new Error('Cannot deactivate a Super Admin account without Super Admin authorization');
      }
    } catch (err: any) {
      if (err.message?.includes('Super Admin')) throw err;
    }
  }

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
  blocked: boolean,
  isSuperAdminCaller: boolean = false
): Promise<void> => {
  if (!isSuperAdminCaller) {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists() && docSnap.data().superAdmin === true) {
        throw new Error('Cannot block or modify a Super Admin account without Super Admin authorization');
      }
    } catch (err: any) {
      if (err.message?.includes('Super Admin')) throw err;
    }
  }

  await updateDoc(doc(db, 'users', uid), {
    blocked,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Get all blocked users (Admin only)
 * Utilizes the protected server-side directory function to prevent Super Admin leakage.
 */
export const getBlockedUsers = async (isSuperAdminCaller: boolean = false): Promise<Moderator[]> => {
  const users = await getAllUsers(isSuperAdminCaller);
  return users
    .filter((u) => u.blocked === true)
    .map((u) => ({
      id: u.uid || u.id,
      uid: u.uid || u.id,
      name: u.name || u.displayName || '',
      businessName: u.businessName || '',
      email: u.email || '',
      phone: u.phone || '',
      role: (u.role as any) || 'user',
      superAdmin: u.superAdmin === true,
      isActive: u.isActive !== false,
      blocked: true,
      createdAt: u.createdAt,
    }));
};
