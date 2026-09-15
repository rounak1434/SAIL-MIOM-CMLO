import { 
  doc, 
  getDoc, 
  onSnapshot, 
  setDoc, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Single source of truth for application licensing.
 * Stored at: systemSettings/serviceLicense
 */
export interface ServiceLicense {
  enabled: boolean;          // true: license limit is active; false: license limit is disabled
  expiresAt: any;            // Firestore Timestamp or Date or string representing expiration time
  updatedAt?: any;           // Firestore server timestamp of last update
  updatedBy?: string;        // Email or UID of the Super Admin who updated it
  reason?: string;           // Optional administrative note
}

export const LICENSE_DOC_PATH = 'systemSettings/serviceLicense';
const LICENSE_DOC_REF = doc(db, 'systemSettings', 'serviceLicense');

/**
 * Parses any Firestore Timestamp, Date, string, or number into milliseconds.
 */
export function getMillisFromTimestamp(val: any): number {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') {
    return val.toMillis();
  }
  if (typeof val.toDate === 'function') {
    return val.toDate().getTime();
  }
  if (val.seconds) {
    return val.seconds * 1000 + (val.nanoseconds ? Math.floor(val.nanoseconds / 1000000) : 0);
  }
  if (val instanceof Date) {
    return val.getTime();
  }
  if (typeof val === 'number') {
    return val;
  }
  if (typeof val === 'string') {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Determines whether the license is currently expired.
 * Pure function of (license, currentTime).
 * 
 * Rules:
 * 1. If no license document exists -> NOT expired (fails open during initial setup).
 * 2. If enabled === false -> NOT expired (license limit disabled / bypass).
 * 3. If enabled === true:
 *    - if currentTime >= expiresAt -> EXPIRED (Locked).
 *    - if currentTime < expiresAt -> VALID (Unlocked).
 */
export function isLicenseExpired(
  license: ServiceLicense | null, 
  currentTime: number = Date.now()
): boolean {
  if (!license) return false;
  if (license.enabled === false) return false;
  if (!license.expiresAt) return false;

  const expireMillis = getMillisFromTimestamp(license.expiresAt);
  if (expireMillis <= 0) return false;

  return currentTime >= expireMillis;
}

/**
 * Subscribes to real-time updates of the system license configuration.
 * Also computes approximate server clock skew from doc snapshot readTime/updateTime.
 */
export function subscribeToLicense(
  callback: (license: ServiceLicense | null, serverOffsetMs: number) => void
): () => void {
  return onSnapshot(
    LICENSE_DOC_REF,
    (snapshot) => {
      let serverOffsetMs = 0;
      if (snapshot.exists()) {
        const data = snapshot.data() as ServiceLicense;
        
        // Estimate clock offset between client local clock and server timestamp
        if (data.updatedAt) {
          const serverUpdateMillis = getMillisFromTimestamp(data.updatedAt);
          // If the update was very recent or we have snapshot metadata
          if (serverUpdateMillis > 0) {
            // Skew is capped to avoid wild jumps from old docs
            const clientNow = Date.now();
            const diff = serverUpdateMillis - clientNow;
            // Only consider reasonable skews within +/- 24 hours
            if (Math.abs(diff) < 86400000) {
              serverOffsetMs = diff;
            }
          }
        }
        
        callback(data, serverOffsetMs);
      } else {
        // Default unlocked license configuration if document does not exist yet
        callback({
          enabled: false,
          expiresAt: null,
          updatedAt: null,
          updatedBy: 'system'
        }, 0);
      }
    },
    (error) => {
      console.error('Error listening to system license:', error);
      // Fallback to unlocked on listener error to maintain client availability
      callback(null, 0);
    }
  );
}

/**
 * Fetch current license configuration once.
 */
export async function getLicense(): Promise<ServiceLicense | null> {
  try {
    const snapshot = await getDoc(LICENSE_DOC_REF);
    if (snapshot.exists()) {
      return snapshot.data() as ServiceLicense;
    }
    return null;
  } catch (error) {
    console.error('Failed to get service license:', error);
    return null;
  }
}

/**
 * Updates the service license configuration.
 * Strictly enforced by Firestore rules: caller MUST possess request.auth.token.superAdmin == true.
 */
export async function updateServiceLicense(params: {
  enabled: boolean;
  expiresAt: Date | Timestamp | number;
  adminEmail: string;
  reason?: string;
}): Promise<void> {
  const { enabled, expiresAt, adminEmail, reason } = params;

  let firestoreTimestamp: any;
  if (expiresAt instanceof Timestamp) {
    firestoreTimestamp = expiresAt;
  } else if (expiresAt instanceof Date) {
    firestoreTimestamp = Timestamp.fromDate(expiresAt);
  } else if (typeof expiresAt === 'number') {
    firestoreTimestamp = Timestamp.fromMillis(expiresAt);
  } else {
    firestoreTimestamp = serverTimestamp();
  }

  const payload: ServiceLicense = {
    enabled,
    expiresAt: firestoreTimestamp,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail || 'Super Admin',
    reason: reason || ''
  };

  // Direct Firestore write — strictly enforced and authorized by firestore.rules:
  // match /systemSettings/{configDoc} { allow write: if isSuperAdmin(); }
  await setDoc(LICENSE_DOC_REF, payload, { merge: true });
}
