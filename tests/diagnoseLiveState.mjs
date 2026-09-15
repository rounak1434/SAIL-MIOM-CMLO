import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const key = JSON.parse(fs.readFileSync('sail-miom-elect-firebase-adminsdk-fbsvc-2a05a57e91.json', 'utf8'));
const app = initializeApp({ credential: cert(key), projectId: 'sail-miom-elect' });
const auth = getAuth(app);
const db = getFirestore(app);

async function diagnose() {
  console.log('=== DIAGNOSTIC START ===');
  
  // 1. Check User in Firebase Auth
  const uid = 'zzhD9WTMsOW8EixFXFl50ro4TT83'; // user prompt UID
  try {
    const user = await auth.getUser(uid);
    console.log('Auth User Found by UID:');
    console.log('  email:', user.email);
    console.log('  disabled:', user.disabled);
    console.log('  customClaims:', user.customClaims);
  } catch (err) {
    console.log('Failed fetching user by UID:', err.message);
    try {
      const userByEmail = await auth.getUserByEmail('rs750421@gmail.com');
      console.log('Auth User Found by Email:');
      console.log('  uid:', userByEmail.uid);
      console.log('  email:', userByEmail.email);
      console.log('  disabled:', userByEmail.disabled);
      console.log('  customClaims:', userByEmail.customClaims);
    } catch (err2) {
      console.log('Failed fetching user by email:', err2.message);
    }
  }

  // 2. Check users/{uid} Document in Firestore
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    console.log(`Firestore doc users/${uid} exists:`, userDoc.exists);
    if (userDoc.exists) {
      const d = userDoc.data();
      console.log('  role:', d.role);
      console.log('  blocked:', d.blocked);
      console.log('  isActive:', d.isActive);
      console.log('  superAdmin:', d.superAdmin);
    }
  } catch (err) {
    console.log('Error reading users doc:', err.message);
  }

  // 3. Check systemSettings/serviceLicense Document in Firestore
  try {
    const licenseDoc = await db.collection('systemSettings').doc('serviceLicense').get();
    console.log('Firestore doc systemSettings/serviceLicense exists:', licenseDoc.exists);
    if (licenseDoc.exists) {
      const d = licenseDoc.data();
      console.log('  enabled:', d.enabled);
      console.log('  expiresAt:', d.expiresAt ? d.expiresAt.toDate().toISOString() : null);
      console.log('  updatedBy:', d.updatedBy);
    }
  } catch (err) {
    console.log('Error reading systemSettings/serviceLicense doc:', err.message);
  }

  // 4. Check system/license Document in Firestore (old path)
  try {
    const oldLicenseDoc = await db.collection('system').doc('license').get();
    console.log('Firestore doc system/license (old path) exists:', oldLicenseDoc.exists);
  } catch (err) {
    console.log('Error reading system/license doc:', err.message);
  }

  console.log('=== DIAGNOSTIC END ===');
  process.exit(0);
}

diagnose();
