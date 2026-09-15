/**
 * SAIL-MIOM – Firebase Authentication Service
 * ============================================================
 * Uses Firebase Authentication SDK for secure identity management
 * and Cloud Firestore for user profile data and RBAC status.
 * ============================================================
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserRole {
  email: string;
  role: 'admin' | 'moderator' | 'user';
  displayName?: string;
  name?: string;
  createdAt?: any;
}

export interface UserProfileResponse {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'moderator' | 'user';
  name: string;
  businessName?: string | null;
  phone?: string | null;
  blocked: boolean;
  isActive: boolean;
  commentCount: number;
  createdAt: any;
  profilePhotoUrl?: string | null;
}

/**
 * Login with email and password using Firebase Authentication
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<{
  user: { uid: string; email: string | null; displayName: string | null };
  role: UserRole;
}> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  // 1. Authenticate with Firebase Auth
  const userCredential = await signInWithEmailAndPassword(
    auth,
    cleanEmail,
    cleanPassword
  );
  const fbUser = userCredential.user;

  // 2. Force token refresh to fetch latest custom claims immediately
  const tokenResult = await fbUser.getIdTokenResult(true);
  const claimsRole = tokenResult.claims.role as 'admin' | 'moderator' | 'user' | undefined;

  // 3. Fetch User Profile Document from Firestore
  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  let role: 'admin' | 'moderator' | 'user' = claimsRole || 'user';
  let displayName = fbUser.displayName || cleanEmail.split('@')[0];
  let name = displayName;
  let blocked = false;
  let isActive = true;

  if (userDocSnap.exists()) {
    const data = userDocSnap.data();
    role = claimsRole || (data.role as 'admin' | 'moderator' | 'user') || 'user';
    displayName = data.displayName || data.name || displayName;
    name = data.name || displayName;
    blocked = data.blocked === true;
    isActive = data.isActive !== false;
  } else {
    // If user document is missing in Firestore, create basic profile
    await setDoc(userDocRef, {
      uid: fbUser.uid,
      email: cleanEmail,
      name: displayName,
      displayName: displayName,
      role: claimsRole || 'user',
      blocked: false,
      isActive: true,
      commentCount: 0,
      createdAt: serverTimestamp(),
    });
  }

  // 4. Prevent blocked or deactivated users from logging in
  if (blocked || !isActive) {
    await signOut(auth);
    throw new Error(
      blocked
        ? 'Your account has been blocked. Please contact an administrator.'
        : 'Your account is deactivated.'
    );
  }

  return {
    user: {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: displayName,
    },
    role: {
      email: cleanEmail,
      role: role,
      displayName: displayName,
      name: name,
    },
  };
};

/**
 * Sign up a new general employee user
 * Enforces role = 'user' strictly
 */
export const signupUser = async (
  email: string,
  password: string,
  displayName?: string
): Promise<{
  user: { uid: string; email: string | null; displayName: string | null };
  role: 'user';
  message: string;
}> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  const resolvedDisplayName = (
    displayName?.trim() || cleanEmail.split('@')[0]
  );

  // 1. Create Auth User in Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    cleanEmail,
    cleanPassword
  );
  const fbUser = userCredential.user;

  // 2. Set display name in Auth profile
  await updateProfile(fbUser, {
    displayName: resolvedDisplayName,
  });

  // 3. Create User Document in Firestore with default 'user' role
  await setDoc(doc(db, 'users', fbUser.uid), {
    uid: fbUser.uid,
    email: cleanEmail,
    name: resolvedDisplayName,
    displayName: resolvedDisplayName,
    role: 'user',
    blocked: false,
    isActive: true,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });

  return {
    user: {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: resolvedDisplayName,
    },
    role: 'user',
    message: 'User registered successfully',
  };
};

/**
 * Log out the current user
 */
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

/**
 * Get current authenticated user profile from Firestore
 */
export const getCurrentProfile = async (): Promise<UserProfileResponse | null> => {
  const fbUser = auth.currentUser;
  if (!fbUser) return null;

  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) return null;

  const data = userDocSnap.data();
  return {
    uid: fbUser.uid,
    email: fbUser.email || data.email,
    displayName: data.displayName || data.name || fbUser.displayName || '',
    role: data.role || 'user',
    name: data.name || data.displayName || '',
    businessName: data.businessName || null,
    phone: data.phone || null,
    blocked: data.blocked || false,
    isActive: data.isActive !== false,
    commentCount: data.commentCount || 0,
    createdAt: data.createdAt,
    profilePhotoUrl: data.profilePhotoUrl || null,
  };
};

/**
 * Update or remove profile photo for the authenticated user in Firestore
 */
export const updateUserProfilePhoto = async (
  uid: string,
  photoUrl: string | null
): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  if (photoUrl) {
    await updateDoc(userDocRef, {
      profilePhotoUrl: photoUrl,
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(userDocRef, {
      profilePhotoUrl: deleteField(),
      updatedAt: serverTimestamp(),
    });
  }
};

/**
 * Send password reset email via Firebase Auth
 */
export const resetUserPassword = async (email: string): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  await sendPasswordResetEmail(auth, cleanEmail);
};
