/**
 * SAIL-MIOM – Trusted Super Admin & System Bootstrap Script (Firebase Admin SDK)
 * ==============================================================================
 * Runs in trusted Node.js CLI environment to:
 * 1. Locate and validate Firebase Service Account credentials for 'sail-miom-elect'.
 * 2. Authenticate with Firebase Admin SDK using modern ESM modular imports.
 * 3. Create or update the Super Admin user in Firebase Authentication.
 * 4. Authoritatively assign custom user claims: { role: 'admin', superAdmin: true }.
 * 5. Provision / update Firestore users/{uid} document.
 * 6. Initialize single source of truth: systemSettings/serviceLicense (if missing).
 * 7. Safely initialize counters/tickets and counters/stats without overwriting existing data.
 *
 * Security:
 * - Accepts Windows paths with or without surrounding single/double quotes.
 * - Supports absolute paths and paths relative to project root or cwd.
 * - Automatically discovers service account keys in the project root.
 * - Verifies project_id matches 'sail-miom-elect'.
 * - NEVER prints or logs private_key or full credential contents.
 * ==============================================================================
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

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
 * Normalizes and strips leading/trailing whitespace and matching quotes from a file path.
 * Supports Windows quoted paths like "C:\path\to\key.json" or 'C:\path\to\key.json'.
 */
function cleanFilePath(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim();

  // Strip matching surrounding double quotes or single quotes
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
 * Returns the verified absolute path or null if file does not exist.
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
 * Verifies that the service account belongs to the target project.
 * Does NOT expose or print secrets.
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

  // 1. Check environment variable
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const p = resolveExistingFilePath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (p) found.add(p);
  }

  // 2. Scan root directory for known patterns
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
  } catch (e) {
    // Ignore scan errors
  }

  return Array.from(found);
}

/**
 * Locates credentials automatically or prompts the user with robust path handling.
 */
async function acquireAdminCredentials() {
  // 1. Check discovered candidate files in project
  const candidates = discoverCandidateFiles();
  for (const candidate of candidates) {
    try {
      const validated = validateAndLoadServiceAccount(candidate);
      console.log(`🔑 Automatically discovered and verified Service Account Key:`);
      console.log(`   File:    ${path.basename(candidate)}`);
      console.log(`   Project: ${validated.projectId}`);
      return validated;
    } catch (err) {
      // If a file is invalid or for another project, skip it silently
    }
  }

  // 2. Check Application Default Credentials (ADC)
  try {
    const adc = applicationDefault();
    return { credential: adc, projectId: TARGET_PROJECT_ID };
  } catch {
    // ADC not available
  }

  // 3. Prompt user for file path
  console.log('\n======================================================');
  console.log('  ⚠️  FIREBASE ADMIN SDK CREDENTIALS REQUIRED');
  console.log('======================================================');
  console.log(`To authoritatively assign custom claims in [${TARGET_PROJECT_ID}],`);
  console.log('the Firebase Admin SDK requires service account credentials.');
  console.log('\nYou may enter a full Windows path (with or without quotes),');
  console.log('or a relative path from the project root.');
  console.log('======================================================\n');

  while (true) {
    const input = await ask('Enter path to Service Account JSON (or press Enter to exit): ');
    const cleaned = cleanFilePath(input);

    if (!cleaned) {
      throw new Error('Admin credentials not provided. Operation cancelled.');
    }

    const resolved = resolveExistingFilePath(cleaned);
    if (!resolved) {
      console.error(`❌ File does not exist at: ${cleaned}`);
      console.log('Please verify the path and try again.\n');
      continue;
    }

    try {
      const validated = validateAndLoadServiceAccount(resolved);
      console.log(`✅ Verified Service Account for project [${validated.projectId}]`);
      return validated;
    } catch (valErr) {
      console.error(`❌ ${valErr.message}\n`);
    }
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('  SAIL-MIOM: Super Admin & System License Bootstrap');
  console.log(`  Target Firebase Project: ${TARGET_PROJECT_ID}`);
  console.log('======================================================\n');

  let adminConfig;
  try {
    adminConfig = await acquireAdminCredentials();
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    rl.close();
    process.exit(1);
  }

  // Initialize Firebase Admin SDK singleton
  const app = getApps().length > 0 
    ? getApps()[0] 
    : initializeApp({
        credential: adminConfig.credential,
        projectId: adminConfig.projectId,
      });

  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log('✅ Firebase Admin SDK initialized successfully.');

  // Prompt for Super Admin email
  let emailInput = (
    process.env.ADMIN_EMAIL ||
    (await ask('\nEnter Super Admin Email: '))
  ).trim();

  if (!emailInput || !emailInput.includes('@')) {
    console.error('❌ Error: Valid email address is required.');
    rl.close();
    process.exit(1);
  }

  // Prompt for Super Admin password
  let passwordInput = (
    process.env.ADMIN_PASSWORD ||
    (await ask('Enter Password (min 6 characters): '))
  ).trim();

  if (!passwordInput || passwordInput.length < 6) {
    console.error('❌ Error: Password must be at least 6 characters.');
    rl.close();
    process.exit(1);
  }

  rl.close();

  console.log(`\n⏳ Bootstrapping Super Admin in project [${adminConfig.projectId}]...`);

  try {
    let uid = '';

    // 1. Create or Retrieve Firebase Auth User
    try {
      const userRecord = await auth.getUserByEmail(emailInput.toLowerCase());
      uid = userRecord.uid;
      console.log(`ℹ️  User already exists in Firebase Auth (UID: ${uid}). Updating credentials...`);
      await auth.updateUser(uid, {
        password: passwordInput,
        displayName: 'Super Administrator',
      });
      console.log('✅ Updated password and display name in Firebase Auth.');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        const newUser = await auth.createUser({
          email: emailInput.toLowerCase(),
          password: passwordInput,
          displayName: 'Super Administrator',
        });
        uid = newUser.uid;
        console.log(`✅ Created User in Firebase Auth (UID: ${uid}).`);
      } else {
        throw err;
      }
    }

    // 2. Authoritatively Assign Custom Claims via Firebase Admin SDK
    await auth.setCustomUserClaims(uid, {
      role: 'admin',
      superAdmin: true,
    });
    console.log('✅ Authoritatively set Firebase Auth Custom Claims: { role: "admin", superAdmin: true }');

    // 3. Upsert Firestore User Document
    await db.collection('users').doc(uid).set(
      {
        uid: uid,
        email: emailInput.toLowerCase(),
        name: 'Super Administrator',
        displayName: 'Super Administrator',
        role: 'admin',
        superAdmin: true,
        blocked: false,
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`✅ Upserted Firestore profile: users/${uid}`);

    // 4. Initialize Single Source of Truth: systemSettings/serviceLicense (Safe: only if missing)
    const licenseDocRef = db.collection('systemSettings').doc('serviceLicense');
    const licenseSnap = await licenseDocRef.get();
    if (!licenseSnap.exists) {
      const oneYearFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await licenseDocRef.set({
        enabled: true,
        expiresAt: Timestamp.fromDate(oneYearFuture),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: emailInput.toLowerCase(),
        reason: 'Initial system provisioning (1 year validity)',
      });
      console.log(`✅ Initialized single source of truth: systemSettings/serviceLicense (Expires: ${oneYearFuture.toISOString()})`);
    } else {
      console.log('ℹ️  Document systemSettings/serviceLicense already exists. Retaining existing configuration.');
    }

    // 5. Initialize Counters Safely (NEVER overwrite existing counters)
    const ticketDocRef = db.collection('counters').doc('tickets');
    const ticketSnap = await ticketDocRef.get();
    if (!ticketSnap.exists) {
      await ticketDocRef.set({ currentNumber: 0 });
      console.log('✅ Initialized document: counters/tickets (currentNumber: 0)');
    } else {
      console.log(`ℹ️  Document counters/tickets already exists (currentNumber: ${ticketSnap.data().currentNumber}). Retained.`);
    }

    const statsDocRef = db.collection('counters').doc('stats');
    const statsSnap = await statsDocRef.get();
    if (!statsSnap.exists) {
      await statsDocRef.set({
        total: 0,
        pending: 0,
        assigned: 0,
        active: 0,
        resolved: 0,
        rejected: 0,
      });
      console.log('✅ Initialized document: counters/stats');
    } else {
      console.log('ℹ️  Document counters/stats already exists. Retained.');
    }

    console.log('\n======================================================');
    console.log('🎉 SUPER ADMIN & SYSTEM SETUP COMPLETED SUCCESSFULLY!');
    console.log(`   Account Email:  ${emailInput}`);
    console.log(`   Firebase UID:   ${uid}`);
    console.log(`   Custom Claims:  { role: "admin", superAdmin: true }`);
    console.log(`   Target Project: ${adminConfig.projectId}`);
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Bootstrap Failed:', err.message);
    process.exit(1);
  }
}

main();
