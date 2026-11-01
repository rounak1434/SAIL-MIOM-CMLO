/**
 * SAIL-MIOM – Cloud Firestore Complaint Service
 * ============================================================
 * Handles complaints, atomic ticket numbering (MIOM-XXXX),
 * notes subcollections (complaints/{id}/notes/{noteId}),
 * 24-hour rate limiting, and real-time Firestore onSnapshot listeners.
 * ============================================================
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { uploadToImgBB } from './imgbb.service';

export interface ComplaintNote {
  id: string;
  noteType: 'adminToModerator' | 'moderatorToAdmin' | 'adminToUser';
  content: string;
  authorEmail: string;
  authorName: string;
  createdAt: any;
}

export interface ComplaintNotes {
  adminToModerator: ComplaintNote[];
  moderatorToAdmin: ComplaintNote[];
  adminToUser: ComplaintNote[];
}

export const COMPLAINT_CATEGORIES = [
  'Electrical Complaint',
  'Power Supply / Wiring',
  'Lighting / Fan / Appliance',
  'Others',
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number] | string;

export interface Complaint {
  id?: string;
  ticketId?: string;
  trackingSecret?: string;
  trackingKey?: string;
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  department: string;
  designation: string;
  category?: ComplaintCategory;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  imageUrl?: string;
  uid?: string;
  userEmail?: string;
  status: 'pending' | 'assigned' | 'active' | 'resolved' | 'rejected';
  assignedTo?: string;
  assignedToUID?: string;
  assignedToName?: string;
  notes: ComplaintNotes;
  lastCommentAt?: any;
  createdAt: any;
  updatedAt?: any;
  locationType?: 'Plant' | 'Township' | string;
  selectedLocation?: string;
  specifiedLocation?: string;
  plantLocation?: string;
  townshipLocation?: string;
  qtrNo?: string;
  employmentType?: string;
  personalNo?: string;
  complaintLocation?: string;
  siteLocation?: string;
  plantLocationDetails?: string;
}

export interface PublicComplaintTracking {
  ticketId: string;
  trackingSecret?: string;
  status: 'pending' | 'assigned' | 'active' | 'resolved' | 'rejected';
  category?: string;
  department?: string;
  locationType?: string;
  selectedLocation?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: any;
  updatedAt: any;
  isMinimalTracking: true;
}

/**
 * Generates a cryptographically strong, non-guessable tracking secret
 */
export const generateTrackingSecret = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

export interface ComplaintStats {
  total: number;
  pending: number;
  assigned: number;
  active: number;
  resolved: number;
  rejected: number;
}

/**
 * Normalizes Indian phone number to 10 digits
 */
export const normalizePhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
};

/**
 * Upload complaint image to ImgBB
 */
export const uploadComplaintImage = async (file: File): Promise<string> => {
  return await uploadToImgBB(file);
};

/**
 * Check 24-hour rate limit before submitting
 */
export const checkSubmissionRateLimit = async (
  email: string,
  phone: string
): Promise<{ limited: boolean; remainingHours?: number }> => {
  try {
    const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cleanPhone = normalizePhoneNumber(phone);

    const emailLockRef = doc(db, 'rateLimits', `email_${cleanEmail}`);
    const phoneLockRef = doc(db, 'rateLimits', `phone_${cleanPhone}`);

    const [emailDoc, phoneDoc] = await Promise.all([
      getDoc(emailLockRef),
      getDoc(phoneLockRef),
    ]);

    const now = Date.now();
    const COOLDOWN_MS = 24 * 60 * 60 * 1000;

    let mostRecentTime = 0;

    if (emailDoc.exists()) {
      const data = emailDoc.data();
      const t = data.lastSubmittedAt?.toMillis?.() || new Date(data.lastSubmittedAt).getTime() || 0;
      if (t > mostRecentTime) mostRecentTime = t;
    }

    if (phoneDoc.exists()) {
      const data = phoneDoc.data();
      const t = data.lastSubmittedAt?.toMillis?.() || new Date(data.lastSubmittedAt).getTime() || 0;
      if (t > mostRecentTime) mostRecentTime = t;
    }

    if (mostRecentTime > 0 && now - mostRecentTime < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - (now - mostRecentTime);
      const remainingHours = Number((remainingMs / (1000 * 60 * 60)).toFixed(1));
      return { limited: true, remainingHours };
    }

    return { limited: false };
  } catch (error) {
    console.warn('Error checking rate limit:', error);
    return { limited: false };
  }
};

/**
 * Fetch notes subcollection and format into standard 3-bucket ComplaintNotes
 */
export const fetchComplaintNotes = async (ticketId: string): Promise<ComplaintNotes> => {
  const notesRef = collection(db, 'complaints', ticketId, 'notes');
  const q = query(notesRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);

  const notesMap: ComplaintNotes = {
    adminToModerator: [],
    moderatorToAdmin: [],
    adminToUser: [],
  };

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const noteObj: ComplaintNote = {
      id: docSnap.id,
      noteType: data.noteType,
      content: data.content,
      authorEmail: data.authorEmail,
      authorName: data.authorName,
      createdAt: data.createdAt,
    };

    if (data.noteType === 'adminToModerator') notesMap.adminToModerator.push(noteObj);
    else if (data.noteType === 'moderatorToAdmin') notesMap.moderatorToAdmin.push(noteObj);
    else if (data.noteType === 'adminToUser') notesMap.adminToUser.push(noteObj);
  });

  return notesMap;
};

/**
 * Create a new complaint using an atomic Firestore transaction
 * Generates official ticket ID: MIOM-EL-YYYY-XXXX and secure public tracking key.
 */
export const createComplaint = async (
  complaintData: Omit<Complaint, 'id' | 'ticketId' | 'status' | 'notes' | 'createdAt'>
): Promise<{ success: boolean; ticketId: string; trackingSecret: string; trackingKey: string }> => {
  const cleanEmail = complaintData.email.trim().toLowerCase();
  const cleanPhone = normalizePhoneNumber(complaintData.phone);
  const sanitizedEmail = cleanEmail.replace(/[^a-z0-9]/g, '_');

  const counterRef = doc(db, 'counters', 'tickets');
  const statsRef = doc(db, 'counters', 'stats');
  const emailLockRef = doc(db, 'rateLimits', `email_${sanitizedEmail}`);
  const phoneLockRef = doc(db, 'rateLimits', `phone_${cleanPhone}`);

  const result = await runTransaction(db, async (transaction) => {
    // 1. Check rate limits inside transaction
    const emailLockDoc = await transaction.get(emailLockRef);
    const phoneLockDoc = await transaction.get(phoneLockRef);

    const now = Date.now();
    const COOLDOWN_MS = 24 * 60 * 60 * 1000;

    if (emailLockDoc.exists()) {
      const t = emailLockDoc.data().lastSubmittedAt?.toMillis?.() || 0;
      if (t > 0 && now - t < COOLDOWN_MS) {
        throw new Error('You can only submit one complaint every 24 hours per email address.');
      }
    }

    if (phoneLockDoc.exists()) {
      const t = phoneLockDoc.data().lastSubmittedAt?.toMillis?.() || 0;
      if (t > 0 && now - t < COOLDOWN_MS) {
        throw new Error('You can only submit one complaint every 24 hours per phone number.');
      }
    }

    // 2. Atomic counter increment by year
    const currentYear = new Date().getFullYear();
    const counterDoc = await transaction.get(counterRef);
    let nextNum = 1;
    let yearlyHistory: Record<string, number> = {};

    if (counterDoc.exists()) {
      const counterData = counterDoc.data();
      const docYear = counterData.currentYear;
      yearlyHistory = counterData.yearly || {};

      if (docYear === currentYear) {
        nextNum = (counterData.currentNumber || 0) + 1;
      } else {
        if (docYear) {
          yearlyHistory[String(docYear)] = counterData.currentNumber || 0;
        }
        nextNum = (yearlyHistory[String(currentYear)] || 0) + 1;
      }
    }

    yearlyHistory[String(currentYear)] = nextNum;

    const sequenceStr = String(nextNum).padStart(4, '0');
    const generatedTicketId = `MIOM-EL-${currentYear}-${sequenceStr}`;
    const trackingSecret = generateTrackingSecret();
    const trackingKey = `${generatedTicketId}_${trackingSecret}`;

    const complaintRef = doc(db, 'complaints', generatedTicketId);
    const publicTrackingRef = doc(db, 'publicTracking', trackingKey);

    // 3. Set Ticket Counter
    transaction.set(
      counterRef,
      {
        currentYear,
        currentNumber: nextNum,
        yearly: yearlyHistory,
      },
      { merge: true }
    );

    // 4. Create Complaint Document
    transaction.set(complaintRef, {
      id: generatedTicketId,
      ticketId: generatedTicketId,
      trackingSecret,
      trackingKey,
      name: complaintData.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      employeeId: complaintData.employeeId ? complaintData.employeeId.trim() : '',
      department: complaintData.department.trim(),
      designation: complaintData.designation.trim(),
      category: complaintData.category || null,
      title: complaintData.title.trim(),
      description: complaintData.description.trim(),
      priority: complaintData.priority || 'medium',
      imageUrl: complaintData.imageUrl || null,
      uid: complaintData.uid || auth.currentUser?.uid || null,
      userEmail: complaintData.userEmail || cleanEmail,
      status: 'pending',
      assignedTo: null,
      assignedToUID: null,
      assignedToName: null,
      ...(complaintData.locationType ? { locationType: complaintData.locationType } : {}),
      ...(complaintData.selectedLocation ? { selectedLocation: complaintData.selectedLocation } : {}),
      ...(complaintData.specifiedLocation ? { specifiedLocation: complaintData.specifiedLocation } : {}),
      ...(complaintData.plantLocation ? { plantLocation: complaintData.plantLocation } : {}),
      ...(complaintData.townshipLocation ? { townshipLocation: complaintData.townshipLocation } : {}),
      ...(complaintData.qtrNo ? { qtrNo: complaintData.qtrNo } : {}),
      ...(complaintData.employmentType ? { employmentType: complaintData.employmentType } : {}),
      ...(complaintData.personalNo ? { personalNo: complaintData.personalNo } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 4b. Create Public Tracking Document (Strict whitelist, NO PII, NO description, NO contact info)
    transaction.set(publicTrackingRef, {
      ticketId: generatedTicketId,
      trackingSecret,
      status: 'pending',
      category: complaintData.category || null,
      department: complaintData.department.trim(),
      locationType: complaintData.locationType || null,
      selectedLocation: complaintData.selectedLocation || null,
      priority: complaintData.priority || 'medium',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 5. Update Rate Limit locks
    transaction.set(emailLockRef, { lastSubmittedAt: serverTimestamp() });
    transaction.set(phoneLockRef, { lastSubmittedAt: serverTimestamp() });

    // 6. Increment Stats
    transaction.set(
      statsRef,
      {
        total: increment(1),
        pending: increment(1),
      },
      { merge: true }
    );

    return { ticketId: generatedTicketId, trackingSecret, trackingKey };
  });

  return { success: true, ...result };
};

/**
 * Fetch a single complaint by Ticket ID (e.g. MIOM-0001) for public tracking
 */
export const getComplaintByTicketId = async (ticketId: string): Promise<Complaint> => {
  const cleanId = ticketId.trim().toUpperCase();
  const docRef = doc(db, 'complaints', cleanId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Ticket "${cleanId}" not found`);
  }

  const data = docSnap.data();

  // If the logged-in user is a hidden moderator assigned to this ticket,
  // omit this complaint from their direct view
  const currentUid = auth.currentUser?.uid;
  if (currentUid && data.assignedToUID === currentUid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUid));
      if (userDoc.exists() && userDoc.data().hidden === true) {
        throw new Error(`Ticket "${cleanId}" not found`);
      }
    } catch (userErr: any) {
      if (userErr.message?.includes('not found')) throw userErr;
    }
  }

  const notes = await fetchComplaintNotes(cleanId);

  return {
    id: cleanId,
    ticketId: cleanId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    employeeId: data.employeeId,
    department: data.department,
    designation: data.designation,
    category: data.category,
    title: data.title,
    description: data.description,
    priority: data.priority || 'medium',
    imageUrl: data.imageUrl,
    uid: data.uid,
    userEmail: data.userEmail,
    status: data.status,
    assignedTo: data.assignedTo,
    assignedToUID: data.assignedToUID,
    assignedToName: data.assignedToName,
    notes,
    lastCommentAt: data.lastCommentAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

/**
 * Real-time subscription to all complaints (Admin Dashboard)
 */
export const subscribeToAllComplaints = (
  callback: (complaints: Complaint[]) => void
): (() => void) => {
  const complaintsRef = collection(db, 'complaints');
  const q = query(complaintsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Complaint[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ticketId: data.ticketId || docSnap.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          employeeId: data.employeeId,
          department: data.department,
          designation: data.designation,
          category: data.category,
          title: data.title,
          description: data.description,
          priority: data.priority || 'medium',
          imageUrl: data.imageUrl,
          uid: data.uid,
          userEmail: data.userEmail,
          status: data.status || 'pending',
          assignedTo: data.assignedTo,
          assignedToUID: data.assignedToUID,
          assignedToName: data.assignedToName,
          notes: {
            adminToModerator: [],
            moderatorToAdmin: [],
            adminToUser: [],
          },
          lastCommentAt: data.lastCommentAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      callback(list);
    },
    (error) => {
      console.warn('subscribeToAllComplaints error:', error);
    }
  );
};

/**
 * Real-time subscription to complaints assigned to a specific moderator (Moderator Dashboard)
 * Enforces account hidden status: if the moderator account is hidden, no complaints
 * appear in the dashboard or lists. If unhidden, assignments remain intact and become visible again.
 */
export const subscribeToModeratorComplaints = (
  moderatorUID: string,
  callback: (complaints: Complaint[]) => void
): (() => void) => {
  let unsubscribeComplaints: (() => void) | null = null;
  let isHidden = false;

  const startComplaintsListener = () => {
    if (unsubscribeComplaints) {
      unsubscribeComplaints();
      unsubscribeComplaints = null;
    }

    const complaintsRef = collection(db, 'complaints');

    const handleSnapshot = async (snapshot: any) => {
      if (isHidden) {
        callback([]);
        return;
      }

      const list: Complaint[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const notes = await fetchComplaintNotes(docSnap.id).catch((err) => {
          console.warn(`Could not load notes for complaint ${docSnap.id}:`, err);
          return {
            adminToModerator: [],
            moderatorToAdmin: [],
            adminToUser: [],
          };
        });

        list.push({
          id: docSnap.id,
          ticketId: data.ticketId || docSnap.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          employeeId: data.employeeId,
          department: data.department,
          designation: data.designation,
          category: data.category,
          title: data.title,
          description: data.description,
          priority: data.priority || 'medium',
          imageUrl: data.imageUrl,
          uid: data.uid,
          userEmail: data.userEmail,
          status: data.status || 'pending',
          assignedTo: data.assignedTo,
          assignedToUID: data.assignedToUID,
          assignedToName: data.assignedToName,
          notes,
          lastCommentAt: data.lastCommentAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }

      // Guarantee descending order by creation date client-side
      list.sort((a, b) => {
        const getMillis = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.toMillis === 'function') return ts.toMillis();
          if (ts.seconds) return ts.seconds * 1000;
          const d = new Date(ts).getTime();
          return isNaN(d) ? 0 : d;
        };
        return getMillis(b.createdAt) - getMillis(a.createdAt);
      });

      callback(list);
    };

    const attachListener = (withOrderBy: boolean) => {
      const q = withOrderBy
        ? query(complaintsRef, where('assignedToUID', '==', moderatorUID), orderBy('createdAt', 'desc'))
        : query(complaintsRef, where('assignedToUID', '==', moderatorUID));

      return onSnapshot(
        q,
        handleSnapshot,
        (error) => {
          if (withOrderBy && error.code === 'failed-precondition') {
            console.warn('Composite index building or missing, falling back to simple query without orderBy:', error);
            if (unsubscribeComplaints) {
              unsubscribeComplaints();
            }
            unsubscribeComplaints = attachListener(false);
            return;
          }

          // If Firestore rules reject query because moderator is hidden, emit empty list
          if (isHidden || error.code === 'permission-denied') {
            console.warn('subscribeToModeratorComplaints access denied or account hidden:', error?.message || error?.code);
            callback([]);
          } else {
            console.warn('subscribeToModeratorComplaints error:', error);
          }
        }
      );
    };

    unsubscribeComplaints = attachListener(true);
  };

  // Start the complaints listener immediately so complaints stream in on initial load/reload
  startComplaintsListener();

  // Real-time listener on the moderator's profile to react immediately when hidden / unhidden
  const userDocRef = doc(db, 'users', moderatorUID);
  const unsubscribeUser = onSnapshot(
    userDocRef,
    (userSnap) => {
      const userData = userSnap.data();
      const nowHidden = userData?.hidden === true;

      if (nowHidden !== isHidden) {
        isHidden = nowHidden;
        if (nowHidden) {
          if (unsubscribeComplaints) {
            unsubscribeComplaints();
            unsubscribeComplaints = null;
          }
          callback([]);
        } else {
          startComplaintsListener();
        }
      } else if (!nowHidden && !unsubscribeComplaints) {
        startComplaintsListener();
      }
    },
    (err) => {
      console.warn('Error listening to moderator user profile in subscribeToModeratorComplaints:', err);
      if (!unsubscribeComplaints && !isHidden) {
        startComplaintsListener();
      }
    }
  );

  return () => {
    if (unsubscribeUser) unsubscribeUser();
    if (unsubscribeComplaints) unsubscribeComplaints();
  };
};

/**
 * Real-time subscription to complaint statistics
 */
export const subscribeToComplaintStats = (
  callback: (stats: ComplaintStats) => void
): (() => void) => {
  const statsRef = doc(db, 'counters', 'stats');

  return onSnapshot(statsRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        total: data.total || 0,
        pending: data.pending || 0,
        assigned: data.assigned || 0,
        active: data.active || 0,
        resolved: data.resolved || 0,
        rejected: data.rejected || 0,
      });
    } else {
      callback({
        total: 0,
        pending: 0,
        assigned: 0,
        active: 0,
        resolved: 0,
        rejected: 0,
      });
    }
  }, (error) => {
    console.warn('subscribeToComplaintStats error:', error);
  });
};

/**
 * Real-time subscription to notes for a specific complaint
 */
export const subscribeToComplaintNotes = (
  ticketId: string,
  callback: (notes: ComplaintNotes) => void
): (() => void) => {
  const notesRef = collection(db, 'complaints', ticketId, 'notes');
  const q = query(notesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const notesMap: ComplaintNotes = {
      adminToModerator: [],
      moderatorToAdmin: [],
      adminToUser: [],
    };

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const noteObj: ComplaintNote = {
        id: docSnap.id,
        noteType: data.noteType,
        content: data.content,
        authorEmail: data.authorEmail,
        authorName: data.authorName,
        createdAt: data.createdAt,
      };

      if (data.noteType === 'adminToModerator') notesMap.adminToModerator.push(noteObj);
      else if (data.noteType === 'moderatorToAdmin') notesMap.moderatorToAdmin.push(noteObj);
      else if (data.noteType === 'adminToUser') notesMap.adminToUser.push(noteObj);
    });

    callback(notesMap);
  });
};

/**
 * Update complaint status with stats recount
 */
export const updateComplaintStatus = async (
  id: string,
  status: Complaint['status']
): Promise<void> => {
  const complaintRef = doc(db, 'complaints', id);
  const statsRef = doc(db, 'counters', 'stats');

  await runTransaction(db, async (transaction) => {
    const complaintDoc = await transaction.get(complaintRef);
    if (!complaintDoc.exists()) {
      throw new Error(`Complaint ${id} not found`);
    }

    const prevStatus = complaintDoc.data().status;
    const trackingKey = complaintDoc.data().trackingKey;
    if (prevStatus === status) return;

    transaction.update(complaintRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    // Sync status to public tracking document if exists
    if (trackingKey) {
      const publicTrackingRef = doc(db, 'publicTracking', trackingKey);
      transaction.update(publicTrackingRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    }

    // Adjust counters
    if (prevStatus && status) {
      transaction.set(
        statsRef,
        {
          [prevStatus]: increment(-1),
          [status]: increment(1),
        },
        { merge: true }
      );
    }
  });
};

/**
 * Assign complaint to a moderator
 */
export const assignComplaint = async (
  id: string,
  moderatorEmail: string,
  moderatorUID: string,
  moderatorName: string
): Promise<void> => {
  const complaintRef = doc(db, 'complaints', id);
  const statsRef = doc(db, 'counters', 'stats');

  await runTransaction(db, async (transaction) => {
    const complaintDoc = await transaction.get(complaintRef);
    if (!complaintDoc.exists()) {
      throw new Error(`Complaint ${id} not found`);
    }

    const prevStatus = complaintDoc.data().status;
    const trackingKey = complaintDoc.data().trackingKey;

    transaction.update(complaintRef, {
      assignedTo: moderatorEmail,
      assignedToUID: moderatorUID,
      assignedToName: moderatorName,
      status: 'assigned',
      updatedAt: serverTimestamp(),
    });

    // Sync status to public tracking document if exists
    if (trackingKey) {
      const publicTrackingRef = doc(db, 'publicTracking', trackingKey);
      transaction.update(publicTrackingRef, {
        status: 'assigned',
        updatedAt: serverTimestamp(),
      });
    }

    if (prevStatus !== 'assigned') {
      transaction.set(
        statsRef,
        {
          [prevStatus]: increment(-1),
          assigned: increment(1),
        },
        { merge: true }
      );
    }
  });

  // Notify moderator
  try {
    await addDoc(collection(db, 'notifications'), {
      userEmail: moderatorEmail,
      message: `You have been assigned ticket ${id}`,
      type: 'assignment',
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not dispatch assignment notification:', err);
  }
};

/**
 * Add a note to the complaint notes subcollection
 */
export const addNote = async (
  complaintId: string,
  noteType: 'adminToModerator' | 'moderatorToAdmin' | 'adminToUser',
  content: string,
  authorEmail: string,
  authorName: string
): Promise<void> => {
  const notesSubcollection = collection(db, 'complaints', complaintId, 'notes');
  const complaintRef = doc(db, 'complaints', complaintId);

  await addDoc(notesSubcollection, {
    noteType,
    content: content.trim(),
    authorEmail,
    authorName,
    createdAt: serverTimestamp(),
  });

  await updateDoc(complaintRef, {
    lastCommentAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete complaint and all its notes subcollection documents
 */
export const deleteComplaint = async (id: string): Promise<void> => {
  const complaintRef = doc(db, 'complaints', id);
  const statsRef = doc(db, 'counters', 'stats');

  // 1. Delete all notes in subcollection
  const notesRef = collection(db, 'complaints', id, 'notes');
  const notesSnap = await getDocs(notesRef);
  const deletePromises = notesSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);

  // 2. Delete complaint and update stats
  await runTransaction(db, async (transaction) => {
    const complaintDoc = await transaction.get(complaintRef);
    if (!complaintDoc.exists()) return;

    const status = complaintDoc.data().status;
    const trackingKey = complaintDoc.data().trackingKey;

    transaction.delete(complaintRef);
    if (trackingKey) {
      transaction.delete(doc(db, 'publicTracking', trackingKey));
    }

    transaction.set(
      statsRef,
      {
        total: increment(-1),
        [status]: increment(-1),
      },
      { merge: true }
    );
  });
};

/**
 * Fetch minimal public tracking information via non-guessable tracking key.
 * Never returns complainant name, phone, email, employee ID, or description.
 */
export const getPublicComplaintStatus = async (
  ticketId: string,
  secret?: string
): Promise<PublicComplaintTracking> => {
  const cleanTicket = ticketId.trim().toUpperCase();
  const cleanSecret = secret ? secret.trim() : '';

  let trackingKey = '';
  if (cleanTicket.includes('_')) {
    trackingKey = cleanTicket;
  } else {
    if (!cleanSecret) {
      throw new Error('A non-guessable Security Key is required for public tracking.');
    }
    trackingKey = `${cleanTicket}_${cleanSecret}`;
  }

  const docRef = doc(db, 'publicTracking', trackingKey);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Tracking record not found for Ticket "${cleanTicket}". Please verify the Ticket ID and Security Key.`);
  }

  const data = docSnap.data();

  return {
    ticketId: data.ticketId || cleanTicket,
    trackingSecret: data.trackingSecret,
    status: data.status || 'pending',
    category: data.category,
    department: data.department,
    locationType: data.locationType,
    selectedLocation: data.selectedLocation,
    priority: data.priority || 'medium',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    isMinimalTracking: true,
  };
};
