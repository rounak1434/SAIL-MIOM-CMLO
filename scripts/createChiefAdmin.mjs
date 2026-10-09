/**
 * SAIL-MIOM – Trusted Chief Admin Creation Script (Firebase Admin SDK)
 * =====================================================================
 * Runs in trusted Node.js CLI environment to:
 * 1. Locate and validate Firebase Service Account credentials for 'sail-miom-elect'.
 * 2. Authenticate with Firebase Admin SDK using modern ESM modular imports.
 * 3. Create or update a Chief Admin user in Firebase Authentication.
 * 4. Assign custom claims: { role: 'chief_admin' }.
 * 5. Provision or update Firestore users/{uid} document with role: 'chief_admin'.
 *
 * Security:
 * - Local/trusted tooling only.
 * - Authoritative bootstrap mechanism.
 * - NEVER prints or logs passwords or private keys.
 * - Enforces role: 'chief_admin'.
 * =====================================================================
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Target Firebase Project
const TARGET_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'sail-miom-elect';

// Load environment variables from .env if present
const envPath = path.resolve(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const key = k.trim();
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Normalizes and strips leading/trailing whitespace and quotes from a file path.
 */
function cleanFilePath(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim();

  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

/**
 * Resolves a file path whether given as absolute, relative to rootDir, or relative to cwd.
 */
function resolveExistingFilePath(inputPath) {
  const cleaned = cleanFilePath(inputPath);
  if (!cleaned) return null;

  const candidatePaths = [
    cleaned,
    path.resolve(process.cwd(), cleaned),
    path.resolve(rootDir, cleaned),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return path.resolve(p);
      }
    } catch {
      // Ignore filesystem errors during check
    }
  }

  return null;
}

/**
 * Loads, parses, and securely validates a service account JSON file.
 */
function validateAndLoadServiceAccount(resolvedPath) {
  try {
    const fileContent = fs.readFileSync(resolvedPath, 'utf8');
    const parsed = JSON.parse(fileContent);

    if (parsed.type !== 'service_account') {
      throw new Error(`JSON file is not a Google service account key (type is "${parsed.type}")`);
    }

    if (!parsed.project_id || parsed.project_id !== TARGET_PROJECT_ID) {
      throw new Error(
        `Service account project mismatch: File belongs to project "${parsed.project_id}", but target is "${TARGET_PROJECT_ID}".`
      );
    }

    if (!parsed.private_key || !parsed.client_email) {
      throw new Error('Service account JSON is missing private_key or client_email');
    }

    return {
      credential: cert(parsed),
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
    };
  } catch (err) {
    throw new Error(`Invalid service account file: ${err.message}`);
  }
}

/**
 * Discovers candidate service account files in the workspace.
 */
function discoverCandidateFiles() {
  const found = new Set();

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const p = resolveExistingFilePath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (p) found.add(p);
  }

  try {
    const files = fs.readdirSync(rootDir);
    for (const file of files) {
      const lower = file.toLowerCase();
      if (
        lower.endsWith('.json') &&
        (lower.includes('adminsdk') ||
          lower.includes('serviceaccount') ||
          lower.includes('service-account') ||
          lower === 'credentials.json')
      ) {
        const full = path.resolve(rootDir, file);
        if (fs.statSync(full).isFile()) {
          found.add(full);
        }
      }
    }
  } catch {
    // Ignore discovery errors
  }

  return Array.from(found);
}

async function obtainServiceAccount() {
  const candidates = discoverCandidateFiles();

  for (const candidate of candidates) {
    try {
      const loaded = validateAndLoadServiceAccount(candidate);
      console.log(`🔍 Discovered valid Service Account key for "${loaded.projectId}":`);
      console.log(`   Path: ${candidate}`);
      console.log(`   Client: ${loaded.clientEmail}\n`);
      return loaded;
    } catch {
      // Continue to next candidate
    }
  }

  console.log('⚠️  No valid service account file was automatically discovered.');
  const manualPath = await ask('Enter the path to your service account key JSON file: ');
  const resolved = resolveExistingFilePath(manualPath);

  if (!resolved) {
    throw new Error(`File does not exist at specified path: "${manualPath}"`);
  }

  return validateAndLoadServiceAccount(resolved);
}

async function main() {
  console.log('======================================================');
  console.log('🛡️  SAIL-MIOM CHIEF ADMIN BOOTSTRAP TOOL');
  console.log('   (Firebase Admin SDK CLI Environment)');
  console.log('======================================================\n');

  try {
    const sa = await obtainServiceAccount();

    const appName = `chief-admin-setup-${Date.now()}`;
    const app = initializeApp(
      {
        credential: sa.credential,
        projectId: sa.projectId,
      },
      appName
    );

    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log(`✅ Authenticated with Firebase Admin SDK for project: ${sa.projectId}\n`);

    const emailInput = (
      process.env.ADMIN_EMAIL ||
      (await ask('Enter Chief Admin Email: '))
    ).trim();

    if (!emailInput || !emailInput.includes('@')) {
      throw new Error('A valid email address is required.');
    }

    const nameInput = (
      process.env.ADMIN_NAME ||
      (await ask('Enter Chief Admin Full Name: '))
    ).trim();

    if (!nameInput) {
      throw new Error('Full Name is required.');
    }

    const passwordInput = (
      process.env.ADMIN_PASSWORD ||
      (await ask('Enter Chief Admin Password (min 6 chars): '))
    ).trim();

    if (!passwordInput || passwordInput.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const designationInput = (
      process.env.ADMIN_DESIGNATION ||
      (await ask('Enter Designation (default: Chief Administrator): '))
    ).trim() || 'Chief Administrator';

    const phoneInput = (
      process.env.ADMIN_PHONE ||
      (await ask('Enter Phone Number (optional): '))
    ).trim();

    let uid = '';

    // 1. Check if user already exists in Firebase Auth
    try {
      const existingUser = await auth.getUserByEmail(emailInput.toLowerCase());
      uid = existingUser.uid;

      console.log(`\n⚠️  Notice: An account with email "${emailInput.toLowerCase()}" already exists (UID: ${uid}).`);

      const confirm = (
        process.env.ADMIN_CONFIRM_UPDATE ||
        (await ask('Do you want to promote/update this existing account to Chief Admin? (y/N): '))
      ).trim().toLowerCase();

      if (confirm !== 'y' && confirm !== 'yes') {
        console.log('\n❌ Operation cancelled. No changes were made to existing account.');
        rl.close();
        process.exit(0);
      }

      await auth.updateUser(uid, {
        displayName: nameInput,
        password: passwordInput,
      });
      console.log('✅ Updated credentials and display name for existing account.');
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        const newUser = await auth.createUser({
          email: emailInput.toLowerCase(),
          password: passwordInput,
          displayName: nameInput,
        });
        uid = newUser.uid;
        console.log('✅ Firebase Auth account created');
      } else {
        throw authErr;
      }
    }

    // 2. Set Custom Claims: { role: "chief_admin" }
    const userRecord = await auth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    const updatedClaims = { ...existingClaims, role: 'chief_admin' };

    await auth.setCustomUserClaims(uid, updatedClaims);
    console.log('✅ Chief Admin custom claim assigned:');
    console.log(JSON.stringify({ role: 'chief_admin' }, null, 2));

    // 3. Create or update Firestore profile: users/{uid}
    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();

    const profileData = {
      uid: uid,
      email: emailInput.toLowerCase(),
      name: nameInput,
      displayName: nameInput,
      role: 'chief_admin',
      designation: designationInput,
      businessName: designationInput,
      phone: phoneInput || '',
      blocked: false,
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (userDocSnap.exists) {
      await userDocRef.set(profileData, { merge: true });
      console.log('✅ Firestore profile updated with role: chief_admin');
    } else {
      await userDocRef.set({
        ...profileData,
        commentCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log('✅ Firestore profile created with role: chief_admin');
    }

    console.log('\n======================================================');
    console.log('🎉 CHIEF ADMIN ACCOUNT CONFIGURED SUCCESSFULLY');
    console.log(`   UID:         ${uid}`);
    console.log(`   Email:       ${emailInput.toLowerCase()}`);
    console.log(`   Name:        ${nameInput}`);
    console.log(`   Role:        chief_admin`);
    console.log(`   Designation: ${designationInput}`);
    console.log('======================================================\n');

    rl.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Chief Admin Creation Failed:', err.message);
    rl.close();
    process.exit(1);
  }
}

main();
