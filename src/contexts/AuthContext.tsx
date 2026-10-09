/**
 * SAIL-MIOM – AuthContext
 * ============================================================
 * Manages user authentication state connected to Firebase Auth & Cloud Firestore.
 * Subscribes to onAuthStateChanged and real-time Firestore user profile doc.
 * ============================================================
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signOut, getIdTokenResult, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

import { AppRole } from '../services/auth.service';

export interface UserData {
  email: string;
  role: AppRole;
  superAdmin?: boolean;
  name?: string;
  displayName?: string;
  businessName?: string | null;
  phone?: string | null;
  blocked?: boolean;
  commentCount?: number;
  lastReset?: any;
  createdAt?: any;
  isActive?: boolean;
  profilePhotoUrl?: string | null;
}

interface AuthContextType {
  currentUser: { uid: string; email: string | null; displayName: string | null } | null;
  userRole: AppRole | null;
  isSuperAdmin: boolean;
  isChiefAdmin: boolean;
  isAdmin: boolean;
  userName: string;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  isBlocked: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userRole: null,
  isSuperAdmin: false,
  isChiefAdmin: false,
  isAdmin: false,
  userName: '',
  userData: null,
  loading: true,
  error: null,
  isBlocked: false,
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthContextType['currentUser']>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isChiefAdmin, setIsChiefAdmin] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const applyUserData = useCallback((fbUser: FirebaseUser | null, docData: any | null, claimsRole?: string, claimsSuperAdmin?: boolean) => {
    if (!fbUser || !docData) {
      setCurrentUser(null);
      setUserRole(null);
      setIsSuperAdmin(false);
      setIsChiefAdmin(false);
      setIsAdmin(false);
      setUserName('');
      setUserData(null);
      setIsBlocked(false);
      return;
    }

    // Role resolution: Authoritative resolution between Custom Claims and Firestore user document
    const normClaim = (claimsRole || '').toLowerCase();
    const normDoc = (docData.role || '').toLowerCase();

    // If either custom claims or verified Firestore document has chief_admin, resolve as chief_admin
    const resolvedRole: AppRole =
      normClaim === 'chief_admin' || normDoc === 'chief_admin'
        ? 'chief_admin'
        : normClaim === 'admin' || normDoc === 'admin'
        ? 'admin'
        : normClaim === 'moderator' || normDoc === 'moderator'
        ? 'moderator'
        : 'user';

    const blocked = docData.blocked === true;
    const isActive = docData.isActive !== false;

    // Enforce immediate sign-out for blocked or deactivated accounts
    if (blocked || !isActive) {
      setIsBlocked(true);
      setError('Your account has been blocked or deactivated.');
      signOut(auth);
      setCurrentUser(null);
      setUserRole(null);
      setIsSuperAdmin(false);
      setIsChiefAdmin(false);
      setIsAdmin(false);
      setUserName('');
      setUserData(null);
      return;
    }

    // Authoritative check: ONLY the Firebase Auth custom claim grants Super Admin privileges.
    // Firestore user document fields must NEVER grant Super Admin privileges.
    const isSuperAdminAuthorized = claimsSuperAdmin === true;
    const isChiefAdminAuthorized = resolvedRole === 'chief_admin' || isSuperAdminAuthorized;
    const isAdminAuthorized = resolvedRole === 'admin' || resolvedRole === 'chief_admin' || isSuperAdminAuthorized;

    const displayName = docData.displayName || docData.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'User';

    setCurrentUser({
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: displayName,
    });
    setUserRole(resolvedRole);
    setIsSuperAdmin(isSuperAdminAuthorized);
    setIsChiefAdmin(isChiefAdminAuthorized);
    setIsAdmin(isAdminAuthorized);
    setUserName(displayName);
    setUserData({
      email: fbUser.email || docData.email || '',
      role: resolvedRole,
      superAdmin: isSuperAdminAuthorized,
      name: docData.name || displayName,
      displayName: displayName,
      businessName: docData.businessName || null,
      phone: docData.phone || null,
      blocked: false,
      commentCount: docData.commentCount || 0,
      createdAt: docData.createdAt,
      isActive: true,
      profilePhotoUrl: docData.profilePhotoUrl || null,
    });
    setIsBlocked(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      applyUserData(null, null);
      setLoading(false);
      return;
    }

    try {
      const tokenResult = await getIdTokenResult(fbUser, true);
      const claimsRole = tokenResult.claims.role as string | undefined;
      const claimsSuperAdmin = tokenResult.claims.superAdmin === true;

      const userDocSnap = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDocSnap.exists()) {
        applyUserData(fbUser, userDocSnap.data(), claimsRole, claimsSuperAdmin);
      }
    } catch (err: any) {
      console.error('Error refreshing user:', err);
    } finally {
      setLoading(false);
    }
  }, [applyUserData]);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (!fbUser) {
        applyUserData(null, null);
        setLoading(false);
        return;
      }

      try {
        // Fetch latest custom claims with forced refresh
        const tokenResult = await getIdTokenResult(fbUser, true);
        const claimsRole = tokenResult.claims.role as string | undefined;
        const claimsSuperAdmin = tokenResult.claims.superAdmin === true;

        // Realtime listener on user profile document in Firestore
        const userDocRef = doc(db, 'users', fbUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            applyUserData(fbUser, docSnap.data(), claimsRole, claimsSuperAdmin);
          } else {
            // User doc missing - apply fallback user role
            applyUserData(fbUser, { email: fbUser.email, role: 'user', isActive: true, blocked: false }, claimsRole, claimsSuperAdmin);
          }
          setLoading(false);
        }, (err) => {
          console.warn('User document listener error:', err);
          setLoading(false);
        });
      } catch (err: any) {
        console.error('Auth state initialization error:', err);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, [applyUserData]);

  const value: AuthContextType = {
    currentUser,
    userRole,
    isSuperAdmin,
    isChiefAdmin,
    isAdmin,
    userName,
    userData,
    loading,
    error,
    isBlocked,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
