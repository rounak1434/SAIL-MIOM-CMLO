/**
 * Script to create the initial admin user & initialize counters
 * Run this once after setting up Firebase Authentication & Firestore.
 * 
 * Usage:
 * Set VITE_SEED_ADMIN_EMAIL and VITE_SEED_ADMIN_PASSWORD in .env
 */

import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

async function createAdminUser() {
  const adminEmail =
    import.meta.env.VITE_SEED_ADMIN_EMAIL ||
    import.meta.env.VITE_ADMIN_EMAIL ||
    'admin@sail.kiom';
  const adminPassword =
    import.meta.env.VITE_SEED_ADMIN_PASSWORD || 'admin123';

  console.log(`Setting up initial Admin user for: ${adminEmail}`);

  try {
    let uid = '';

    // 1. Try to create user
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        adminEmail,
        adminPassword
      );
      uid = userCredential.user.uid;
      console.log('✅ Admin user created in Firebase Auth. UID:', uid);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Admin user already exists in Auth. Signing in to retrieve UID...');
        const userCredential = await signInWithEmailAndPassword(
          auth,
          adminEmail,
          adminPassword
        );
        uid = userCredential.user.uid;
        console.log('✅ Signed in as existing Admin. UID:', uid);
      } else {
        throw authErr;
      }
    }

    // 2. Create/Update Admin document in Firestore
    await setDoc(
      doc(db, 'users', uid),
      {
        uid: uid,
        email: adminEmail,
        name: 'Administrator',
        displayName: 'Administrator',
        role: 'admin',
        blocked: false,
        isActive: true,
        commentCount: 0,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('✅ Admin document created/verified in Firestore collection "users"');

    // 3. Initialize Ticket Counter if missing
    const ticketCounterRef = doc(db, 'counters', 'tickets');
    const ticketDoc = await getDoc(ticketCounterRef);
    if (!ticketDoc.exists()) {
      await setDoc(ticketCounterRef, { currentNumber: 0 });
      console.log('✅ Initialized counters/tickets document (currentNumber: 0)');
    }

    // 4. Initialize Stats Counter if missing
    const statsCounterRef = doc(db, 'counters', 'stats');
    const statsDoc = await getDoc(statsCounterRef);
    if (!statsDoc.exists()) {
      await setDoc(statsCounterRef, {
        total: 0,
        pending: 0,
        assigned: 0,
        active: 0,
        resolved: 0,
        rejected: 0,
      });
      console.log('✅ Initialized counters/stats document');
    }

    console.log('🎉 Initial setup completed successfully!');
  } catch (error: any) {
    console.error('❌ Error during setup:', error.message);
  }
}

createAdminUser();
