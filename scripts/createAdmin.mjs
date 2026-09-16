/**
 * SAIL-MIOM – Trusted Normal Admin Creation Script (Firebase Admin SDK)
 * =====================================================================
 * Runs in trusted Node.js CLI environment to:
 * 1. Locate and validate Firebase Service Account credentials for 'sail-miom-elect'.
 * 2. Authenticate with Firebase Admin SDK using modern ESM modular imports.
 * 3. Create or update a Normal Admin user in Firebase Authentication.
 * 4. Assign custom claims: { role: 'admin' } (strictly NO superAdmin claim).
 * 5. Provision or update Firestore users/{uid} document without overwriting unrelated fields.
 *
 * Security:
 * - Local/trusted tooling only.
 * - NEVER prints or logs passwords or private keys.
 * - Enforces role: 'admin' without superAdmin privilege.
 * =====================================================================
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
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
    // Ignore scan errors
  }

  return Array.from(found);
}

/**
 * Locates credentials automatically or prompts the user.
 */
async function acquireAdminCredentials() {
  const candidates = discoverCandidateFiles();
  for (const candidate of candidates) {
    try {
      const validated = validateAndLoadServiceAccount(candidate);
      console.log(`🔑 Discovered and verified Service Account Key:`);
      console.log(`   File:    ${path.basename(candidate)}`);
      console.log(`   Project: ${validated.projectId}`);
      return validated;
    } catch {
      // Skip invalid candidate
    }
  }

  try {
    const adc = applicationDefault();
    return { credential: adc, projectId: TARGET_PROJECT_ID };
  } catch {
    // ADC not available
  }

  console.log('\n======================================================');
  console.log('  ⚠️  FIREBASE ADMIN SDK CREDENTIALS REQUIRED');
  console.log('======================================================');
  console.log(`To create admin accounts in [${TARGET_PROJECT_ID}],`);
  console.log('the Firebase Admin SDK requires service account credentials.');
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
  console.log('  SAIL-MIOM: Normal Administrator Account Creation');
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
  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: adminConfig.credential,
          projectId: adminConfig.projectId,
        });

  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log('✅ Firebase Admin SDK initialized successfully.\n');

  // 1. Admin Name
  let nameInput = (
    process.env.ADMIN_NAME ||
    (await ask('Enter Admin Name: '))
  ).trim();
  while (!nameInput) {
    console.error('❌ Error: Admin Name cannot be empty.');
    nameInput = (await ask('Enter Admin Name: ')).trim();
  }

  // 2. Admin Email
  let emailInput = (
    process.env.ADMIN_EMAIL ||
    (await ask('Enter Admin Email: '))
  ).trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  while (!emailInput || !emailRegex.test(emailInput)) {
    console.error('❌ Error: A valid email address is required (e.g. admin@example.com).');
    emailInput = (await ask('Enter Admin Email: ')).trim();
  }

  // 3. Admin Password
  let passwordInput = (
    process.env.ADMIN_PASSWORD ||
    (await ask('Enter Admin Password (min 6 characters): '))
  ).trim();
  while (!passwordInput || passwordInput.length < 6) {
    console.error('❌ Error: Password must be at least 6 characters.');
    passwordInput = (await ask('Enter Admin Password (min 6 characters): ')).trim();
  }

  // 4. Designation (optional)
  let designationInput = (
    process.env.ADMIN_DESIGNATION ||
    process.env.ADMIN_BUSINESS_NAME ||
    (await ask('Enter Designation (optional, press Enter to skip): '))
  ).trim();

  // 5. Phone (optional)
  let phoneInput = (
    process.env.ADMIN_PHONE ||
    (await ask('Enter Phone Number (optional, press Enter to skip): '))
  ).trim();

  console.log(`\n⏳ Processing Admin account for [${emailInput.toLowerCase()}]...`);

  try {
    let uid = '';
    let isExistingAccount = false;

    // 1. Check if user already exists in Firebase Auth
    try {
      const existingUser = await auth.getUserByEmail(emailInput.toLowerCase());
      uid = existingUser.uid;
      isExistingAccount = true;

      console.log(`\n⚠️  Notice: An account with email "${emailInput.toLowerCase()}" already exists (UID: ${uid}).`);
      
      const confirm = (
        process.env.ADMIN_CONFIRM_UPDATE ||
        (await ask('Do you want to update this existing account to a Normal Admin? (y/N): '))
      ).trim().toLowerCase();

      if (confirm !== 'y' && confirm !== 'yes') {
        console.log('\n❌ Operation cancelled. No changes were made to existing account.');
        rl.close();
        process.exit(0);
      }

      // Update password & display name
      await auth.updateUser(uid, {
        displayName: nameInput,
        password: passwordInput,
      });
      console.log('✅ Updated credentials and display name for existing account.');
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        // Create new user in Firebase Auth
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

    // 2. Set Custom Claims: Strictly { role: "admin" }, NO superAdmin: true
    const userRecord = await auth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    const updatedClaims = { ...existingClaims, role: 'admin' };
    delete updatedClaims.superAdmin; // Strictly ensure superAdmin is not present

    await auth.setCustomUserClaims(uid, updatedClaims);
    console.log('✅ Admin custom claim assigned:');
    console.log(JSON.stringify({ role: 'admin' }, null, 2));

    // 3. Create or update Firestore profile: users/{uid}
    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();

    if (userDocSnap.exists) {
      const existingData = userDocSnap.data() || {};
      const updateData = {
        uid: uid,
        email: emailInput.toLowerCase(),
        name: nameInput,
        displayName: nameInput,
        role: 'admin',
        blocked: existingData.blocked !== undefined ? existingData.blocked : false,
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (designationInput) {
        updateData.designation = designationInput;
        updateData.businessName = designationInput;
      }
      if (phoneInput) {
        updateData.phone = phoneInput;
      }

      // If existing user had superAdmin in Firestore doc, remove it
      if (existingData.superAdmin !== undefined) {
        updateData.superAdmin = FieldValue.delete();
      }

      await userDocRef.set(updateData, { merge: true });
      console.log('✅ Firestore profile updated');
    } else {
      await userDocRef.set({
        uid: uid,
        email: emailInput.toLowerCase(),
        name: nameInput,
        displayName: nameInput,
        role: 'admin',
        designation: designationInput || '',
        businessName: designationInput || '',
        phone: phoneInput || '',
        blocked: false,
        isActive: true,
        commentCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log('✅ Firestore profile created');
    }

    console.log('✅ Normal Admin setup complete');

    console.log('\n======================================================');
    console.log('🎉 NORMAL ADMIN ACCOUNT CONFIGURED SUCCESSFULLY');
    console.log(`   UID:   ${uid}`);
    console.log(`   Email: ${emailInput.toLowerCase()}`);
    console.log(`   Name:  ${nameInput}`);
    if (businessNameInput) {
      console.log(`   Business: ${businessNameInput}`);
    }
    if (phoneInput) {
      console.log(`   Phone:    ${phoneInput}`);
    }
    console.log('======================================================\n');

    rl.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Admin Creation Failed:', err.message);
    rl.close();
    process.exit(1);
  }
}

main();
