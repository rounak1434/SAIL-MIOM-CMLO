import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, getIdTokenResult } from 'firebase/auth';
import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCWQvRs6OIGQz-m7Noq9jl2BEEuZrc_qEQ",
  authDomain: "sail-miom-elect.firebaseapp.com",
  projectId: "sail-miom-elect",
  storageBucket: "sail-miom-elect.firebasestorage.app",
  messagingSenderId: "558124779284",
  appId: "1:558124779284:web:2c2bdb37952c6aad14e401"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testClient() {
  console.log('--- TEST 1: Unauthenticated read of systemSettings/serviceLicense ---');
  try {
    const snap = await getDoc(doc(db, 'systemSettings', 'serviceLicense'));
    console.log('Unauthenticated getDoc(systemSettings/serviceLicense) success! exists:', snap.exists());
  } catch (err) {
    console.log('Unauthenticated getDoc(systemSettings/serviceLicense) FAILED:', err.code, err.message);
  }

  console.log('--- TEST 2: Unauthenticated onSnapshot of systemSettings/serviceLicense ---');
  await new Promise((resolve) => {
    const unsub = onSnapshot(doc(db, 'systemSettings', 'serviceLicense'), 
      (snap) => {
        console.log('Unauthenticated onSnapshot success! exists:', snap.exists());
        unsub();
        resolve();
      },
      (err) => {
        console.log('Unauthenticated onSnapshot FAILED:', err.code, err.message);
        unsub();
        resolve();
      }
    );
  });

  process.exit(0);
}

testClient();
