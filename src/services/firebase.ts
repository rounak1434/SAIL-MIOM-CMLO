import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration for project: sail-miom-elect
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCWQvRs6OIGQz-m7Noq9jl2BEEuZrc_qEQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sail-miom-elect.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sail-miom-elect",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sail-miom-elect.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "558124779284",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:558124779284:web:2c2bdb37952c6aad14e401"
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
