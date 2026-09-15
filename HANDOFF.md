# 📋 SAIL-MIOM – Complete Project Handoff & Developer Guide

**Project Name:** SAIL-MIOM IT Complaint Management System (SAIL KIOM)  
**Target Firebase Project:** `SAIL-MIOM-ELECT` (Project ID: `sail-miom-elect`)  
**Architecture:** Serverless React 19 + Vite 7 + Firebase (Auth, Firestore, Cloud Functions, Hosting) + ImgBB  
**Version:** 2.0.0 (Migrated to Cloud Firestore & Firebase Serverless Stack with Discreet Super Admin & License Lock System)  
**Date Generated:** September 2026  
**Target Audience:** Incoming Developers, DevOps Engineers, System Administrators, Project Maintainers  

---

## 1. Executive Summary

The **SAIL-MIOM IT Complaint Management System** is a full-stack, enterprise-grade, serverless web application designed for steel plant and administrative electrical/IT infrastructure ticketing and complaint resolution.

The application has been migrated to a **Firebase serverless architecture**:
- **Frontend:** React 19, TypeScript 5, Vite 7, Tailwind CSS 4, Framer Motion, Lucide React, and Recharts.
- **Authentication:** Firebase Authentication (Email/Password) with Authoritative Custom Claims (`role`, `superAdmin`).
- **Database:** Cloud Firestore (NoSQL) with real-time snapshot listeners (`onSnapshot`), atomic ticket transactions, and subcollection-based notes.
- **Backend Automation:** Firebase Cloud Functions (Node.js 18 with Firebase Admin SDK).
- **Hosting:** Firebase Hosting with custom security headers and single-page application (SPA) rewrites.
- **Media Hosting:** ImgBB API (Direct client uploads; **Firebase Storage is strictly NOT used**).
- **System Security:** Enterprise-grade Discreet Super Admin and System License Lock System with zero-polling real-time automatic expiration.

> [!NOTE]
> **Rollback Baseline Context**: The previous Express / Prisma / SQLite implementation located in `backend/` and `src/services/api.ts` is retained strictly as an offline rollback and reference baseline. It is **not** the active production architecture.

---

## 2. Current Architecture & Service Responsibilities

```
                                      User / Browser
                                            │
                                            ▼
                                     Firebase Hosting
                           (Static Assets, SPA Rewrites, Headers)
                                            │
                                            ▼
                                  React 19 / Vite App
                                            │
         ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
         │                  │                               │                  │
         ▼                  ▼                               ▼                  ▼
   Firebase Auth      Cloud Firestore             Firebase Cloud Functions    ImgBB API
  • Email/Password   • Realtime Listeners         • Privileged Admin Ops    • Direct Image
  • Custom Claims:   • complaints/{id}            • createModerator           Uploads
    - role             - notes/{noteId} subcoll   • setUserRole             • Firestore
    - superAdmin     • users/{uid}                • deleteUser                stores URL
  • Token Refresh    • notifications/{id}         • updateUserPassword      • Zero Firebase
                     • systemSettings/serviceLicense • updateLicenseStatus    Storage
                     • counters/tickets & stats   • assignSuperAdmin
                     • rateLimits/{lockId}
```

### Service Responsibilities:
1. **Firebase Hosting:** Delivers pre-rendered Vite production bundles with optimized caching headers (`max-age=31536000` for hashed assets, `no-cache` for HTML), frame options (`SAMEORIGIN`), and SPA fallback rewrites (`**` ➔ `/index.html`).
2. **React 19 / Vite Application:** Client interface providing dark glassmorphism styling, live ticket tracking visualizers, analytics dashboards, and reactive license lock overlays.
3. **Firebase Authentication:** Issues secure ID tokens with custom claims (`role`, `superAdmin`). Manages session persistence and triggers real-time auth state updates via `onAuthStateChanged`.
4. **Cloud Firestore:** Document database providing millisecond-latency real-time synchronization (`onSnapshot`), atomic transaction counters for sequential tickets (`MIOM-XXXX`), 24-hour submission rate-limiting locks, and audit-logged complaint notes.
5. **Firebase Cloud Functions (Admin SDK):** Privileged server environment executing callable functions for account creation, role assignment, password modification, and custom-claim provisioning.
6. **ImgBB API:** External cloud host for complaint issue attachments. Stores only sanitized public URLs in Firestore documents.

---

## 3. Technology Stack & Versions

All versions correspond directly to the canonical project configurations in [`package.json`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/package.json) and [`functions/package.json`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/functions/package.json):

### Frontend (`package.json`)
- **React:** `19.2.3`
- **React DOM:** `19.2.3`
- **React Router DOM:** `^7.14.1`
- **TypeScript:** `5.9.3`
- **Vite:** `7.2.4`
- **Tailwind CSS:** `4.1.17` (`@tailwindcss/vite: 4.1.17`)
- **Framer Motion:** `^12.38.0`
- **Lucide React:** `^1.8.0`
- **Recharts:** `^3.8.1`
- **Firebase Web SDK:** `^12.12.0`
- **Firebase Admin SDK (CLI Tooling):** `^13.7.0`
- **EmailJS Browser:** `^4.4.1`

### Firebase Cloud Functions (`functions/package.json`)
- **Node Engine:** `18`
- **Firebase Functions SDK:** `^4.5.0`
- **Firebase Admin SDK:** `^11.11.0`
- **TypeScript:** `^4.9.5`

### Image Services
- **ImgBB API:** Direct REST API (`https://api.imgbb.com/1/upload`)
- **Firebase Storage:** **REMOVED / NOT USED**

---

## 4. Project Directory Structure

```
C:\Rounak\Web\MMIOM HOME\FINAL\
├── .env                                  # Local environment configuration
├── .env.example                          # Sample environment configuration
├── .firebaserc                           # Active Firebase project configuration (sail-miom-elect)
├── .gitignore                            # Excludes node_modules, keys, credentials, dist
├── firebase.json                         # Firebase deployment configuration (Firestore, Functions, Hosting)
├── firestore.indexes.json                # Firestore composite query index definitions
├── firestore.rules                       # Firestore Security Rules (Authoritative RBAC & Lock Logic)
├── index.html                            # HTML entry point with meta tags & Google fonts
├── package.json                          # Canonical dependencies, build & test scripts
├── tsconfig.json                         # TypeScript root compiler configuration
├── vite.config.ts                        # Vite configuration with root directory pinning
├── HANDOFF.md                            # THIS DOCUMENT
│
├── src/                                  # Frontend Application Source Code
│   ├── main.tsx                          # React DOM initialization
│   ├── App.tsx                           # Master Router, Real-time License listener, LockOverlay mount
│   ├── index.css                         # Tailwind CSS v4, glassmorphism design tokens & scrollbars
│   │
│   ├── components/                       # Shared UI Components
│   │   ├── DashboardSkeleton.tsx         # Skeleton loader for dashboards
│   │   ├── LoadingSpinner.tsx            # Animated spinner
│   │   ├── LockOverlay.tsx               # Full-screen license lock screen with discreet Super Admin access
│   │   ├── Navbar.tsx                    # Glassmorphism navbar with live notification badges
│   │   ├── ProtectedRoute.tsx            # RBAC route guard component
│   │   ├── SuperAdminLicenseModal.tsx    # Discreet Super Admin License & Security Controls Modal
│   │   └── UserManagement.tsx            # Admin user administration panel
│   │
│   ├── contexts/                         # React Contexts
│   │   └── AuthContext.tsx               # Global Auth Provider (Auth state, token claims, isSuperAdmin)
│   │
│   ├── hooks/                            # Custom React Hooks
│   │   ├── useAntiSpam.ts                # Client submission debounce hook
│   │   └── useRateLimit.ts               # Action cooldown timer hook
│   │
│   ├── pages/                            # Application Page Routes
│   │   ├── Dashboard.tsx                 # Admin Master Dashboard (Analytics, delegation, Super Admin control)
│   │   ├── FileComplaint.tsx             # Public complaint submission form with 24h limit & ImgBB upload
│   │   ├── Home.tsx                      # Landing page with live statistics and feature highlights
│   │   ├── Login.tsx                     # Unified Admin & Moderator authentication portal (/admin-login)
│   │   ├── ModeratorDashboard.tsx        # Moderator Task Dashboard (Assigned tickets, note threads)
│   │   ├── Profile.tsx                   # User profile view
│   │   └── TrackComplaint.tsx            # Public ticket tracker by Ticket ID
│   │
│   ├── services/                         # Data Layer & Cloud Service Connectors
│   │   ├── admin.service.ts              # User administration calls (Cloud Functions & Firestore)
│   │   ├── api.ts                        # [ROLLBACK ONLY] Legacy Axios client for Express backend
│   │   ├── auth.service.ts               # Firebase Auth login, signup, logout, and password reset
│   │   ├── complaint.service.ts          # Firestore complaint CRUD, transactions, and notes subcollections
│   │   ├── firebase.ts                   # Firebase Web SDK initialization (sail-miom-elect)
│   │   ├── imgbb.service.ts              # ImgBB image upload client
│   │   ├── license.service.ts            # System license listener and state management
│   │   └── moderator.service.ts          # Moderator provisioning and status management
│   │
│   ├── utils/
│   │   └── cn.ts                         # Classnames & Tailwind merge utility
│   │
│   └── scripts/
│       └── createAdmin.ts                # Legacy admin creation script
│
├── functions/                            # Firebase Cloud Functions (Serverless Backend)
│   ├── package.json                      # Functions dependencies
│   ├── tsconfig.json                     # Functions TypeScript configuration
│   └── src/
│       └── index.ts                      # Privileged Admin SDK callable functions
│
├── scripts/
│   └── setupInitialAdmin.mjs             # Interactive CLI bootstrap script using Firebase Admin SDK
│
├── tests/
│   └── licenseSystem.test.mjs            # Unit test suite for license expiration, claims, and actions
│
└── backend/                              # [ROLLBACK ONLY] Legacy Express + Prisma + SQLite backend
    ├── package.json
    ├── prisma/
    └── src/
```

---

## 5. Authentication Architecture

The application uses **Firebase Authentication** as its active, authoritative authentication provider:

- **Authentication Method:** Email and Password authentication.
- **Session Lifecycle:** Managed automatically via Firebase Auth session tokens and the `onAuthStateChanged` listener in [`AuthContext.tsx`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/src/contexts/AuthContext.tsx).
- **Token Claims Resolution:** On every auth state transition and profile refresh, `getIdTokenResult(user, true)` decodes server-verified claims (`token.claims.role`, `token.claims.superAdmin`).
- **Core Operations:**
  - **Login:** `signInWithEmailAndPassword(auth, email, password)` via [`auth.service.ts`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/src/services/auth.service.ts).
  - **Sign Up:** `createUserWithEmailAndPassword(auth, email, password)` creates the user; a default Firestore document in `users/{uid}` is created strictly with `role: "user"`.
  - **Logout:** `signOut(auth)` clears client sessions and invalidates tokens.
  - **Password Reset:** `sendPasswordResetEmail(auth, email)` sends automated password recovery emails via Firebase.
  - **Blocked / Inactive Account Enforcement:** When a user logs in, `AuthContext` listens to `users/{uid}` in real time. If `blocked === true` or `isActive === false`, the client triggers immediate `signOut(auth)`, wipes state, and displays an account deactivation notice.

---

## 6. Roles & Role-Based Access Control (RBAC)

The application enforces a 4-tier role hierarchy:

| Role | Target Portal | Privileges & Responsibilities |
|---|---|---|
| **`user`** | `/file-complaint`, `/track-complaint`, `/profile` | General plant employees. Can submit complaints (subject to 24h rate limits), track complaints publicly, and view self notifications. |
| **`moderator`** | `/moderator-dashboard`, `/profile` | Field engineers / technicians. Can view assigned complaints, update ticket statuses, and write notes in `adminToModerator` / `moderatorToAdmin` channels. |
| **`admin`** | `/dashboard`, `/profile` | IT supervisors. Can view all complaints, assign tickets, create/deactivate moderators, delete tickets/users, and post resolution notes. |
| **`superAdmin`** | `/admin-login` ➔ `/dashboard` | System owners. Possesses all Admin capabilities plus **exclusive license management, emergency unlock, and system lock controls**. |

### Authoritative Super Admin Security Model
> [!IMPORTANT]
> **Super Admin authorization is based SOLELY on the Firebase Auth custom claim:**
> ```javascript
> token.claims.superAdmin === true
> ```
> A Firestore document field (`users/{uid}.superAdmin`) alone **NEVER** grants Super Admin privileges.
> - Client UI, Cloud Functions, and Firestore Security Rules verify the custom claim exclusively.
> - Custom claims can **only** be modified via the Firebase Admin SDK in trusted environments (CLI bootstrap or Cloud Functions).
> - Client-side tampering via `localStorage`, React state, or document editing is rejected at the security boundary.

---

## 7. Initial Super Admin Account

The initial Super Admin bootstrap was provisioned on the production project:

- **Email:** `rs750421@gmail.com`
- **Firebase Auth UID:** `zzhD9WTMsOW8EixFXl50ro4TT83`
- **Assigned Custom Claims:** `{ role: "admin", superAdmin: true }`
- **Firestore Document:** `users/zzhD9WTMsOW8EixFXl50ro4TT83` (`role: "admin"`, `superAdmin: true`, `isActive: true`, `blocked: false`)
- **Status:** **VERIFIED**

*(Passwords and private key files are strictly excluded from this documentation).*

---

## 8. Cloud Firestore Data Model

The Firestore database (`(default)`) schema comprises the following collections:

### 8.1 `users/{uid}`
Stores employee and staff profile records.
```typescript
{
  uid: string;                 // Matches Firebase Auth UID
  email: string;
  name: string;
  displayName: string;
  businessName?: string;       // Department or vendor name
  phone?: string;
  role: 'admin' | 'moderator' | 'user';
  superAdmin?: boolean;        // Informational reflection; actual authority is the Auth claim
  blocked: boolean;            // true if account access is suspended
  isActive: boolean;           // false if account is deactivated
  commentCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 8.2 `complaints/{ticketId}`
Primary complaints collection. The document ID equals the human-readable Ticket ID (e.g. `MIOM-0001`).
```typescript
{
  ticketId: string;            // Formatted ticket ID e.g. "MIOM-0001"
  name: string;                // Complainant name
  email: string;               // Complainant email
  phone: string;               // Complainant contact number
  employeeId: string;
  department: string;
  designation: string;
  category: string;            // "Computer Complaint" | "CCTV Complaint" | "Network Complaint" | "Others"
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'active' | 'resolved' | 'rejected';
  imageUrl?: string;           // ImgBB hosted image URL
  uid?: string;                // Complainant UID if logged in
  assignedTo?: string;         // Moderator email
  assignedToUID?: string;      // Moderator UID
  assignedToName?: string;     // Moderator display name
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 8.3 `complaints/{ticketId}/notes/{noteId}` (SUBCOLLECTION)
Threaded communications for complaints. Notes are stored as an independent subcollection:
```typescript
{
  id: string;
  noteType: 'adminToModerator' | 'moderatorToAdmin' | 'adminToUser';
  content: string;
  authorEmail: string;
  authorName: string;
  createdAt: Timestamp;
}
```
*Note: Firestore rules enforce that notes are immutable audit records (`allow update: if false;`).*

### 8.4 `notifications/{notificationId}`
In-app notifications for staff and users.
```typescript
{
  id: string;
  userEmail: string;           // Recipient email address
  message: string;
  type: string;                // e.g. "assigned", "status_changed"
  read: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 8.5 `counters/tickets`
Atomic sequence counter for ticket generation.
```typescript
{
  currentNumber: number;       // e.g. 1, 2, 3...
}
```

### 8.6 `counters/stats`
Aggregated complaint metrics displayed in dashboards.
```typescript
{
  total: number;
  pending: number;
  assigned: number;
  active: number;
  resolved: number;
  rejected: number;
}
```

### 8.7 `rateLimits/{lockId}`
Enforces the 24-hour rate limit on public submissions.
- `lockId`: Formatted as `email_<hash>` or `phone_<normalizedDigits>`.
```typescript
{
  lastSubmittedAt: Timestamp;  // Must match request.time in Firestore rules
}
```

### 8.8 `systemSettings/serviceLicense`
Single source of truth for the system license and lock state.
```typescript
{
  enabled: boolean;            // true: license limit enforced; false: unlimited mode
  expiresAt: Timestamp;        // Timestamp when license expiration occurs
  updatedAt: Timestamp;        // Last administrative update
  updatedBy: string;           // Super Admin email or UID
  reason?: string;             // Administrative log or maintenance note
}
```

---

## 9. Ticket Generation & Concurrency Safety

- **Ticket Format:** `MIOM-XXXX` (e.g. `MIOM-0001`, `MIOM-0002`).
- **Atomic Concurrency Guarantee:** Located in [`src/services/complaint.service.ts`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/src/services/complaint.service.ts), `createComplaint` uses Firestore's atomic transaction (`runTransaction`):
  1. Transaction reads `counters/tickets`.
  2. Increments `currentNumber = current + 1`.
  3. Formats `ticketId = "MIOM-" + String(currentNumber).padStart(4, '0')`.
  4. Writes both the counter increment and the new `complaints/{ticketId}` document in the same atomic commit.
  5. Guarantees zero sequence gaps or duplicate ticket IDs under concurrent user submissions.

---

## 10. Rate Limiting & Anti-Spam Architecture

- **24-Hour Restriction:** A user may not file multiple complaints within 24 hours using the same email address or phone number.
- **Validation Layers:**
  1. **Client Pre-Check:** Checks `rateLimits/{email_key}` and `rateLimits/{phone_key}` in Firestore.
  2. **Atomic Write:** Upon submission, the rate limit lock documents are updated with `serverTimestamp()`.
  3. **Firestore Security Rule Verification:** Rules verify that `lastSubmittedAt == request.time`.
- **Note Cooldown:** A 10-second cooldown hook (`useRateLimit`) prevents rapid multi-click submission of notes in dashboards.

---

## 11. Real-Time Architecture

The application uses **Cloud Firestore Real-Time Snapshot Listeners (`onSnapshot`)** across all modules. Legacy Server-Sent Events (SSE) have been completely replaced:

- `subscribeToAllComplaints`: Real-time updates for Admin Dashboard complaint tables.
- `subscribeToModeratorComplaints`: Real-time updates for assigned tickets on Moderator Dashboard.
- `subscribeToComplaintStats`: Real-time counters on Landing Page and Dashboard stats cards.
- `subscribeToComplaintNotes`: Real-time threaded communication inside ticket modals.
- `subscribeToLicense`: Real-time synchronization of system license and lock state.
- `Navbar.tsx`: Real-time listener for unread user notifications.
- `AuthContext.tsx`: Real-time listener on `users/{uid}` for immediate deactivation enforcement.

---

## 12. ImgBB Image Handling

- **Integration:** Implemented in [`src/services/imgbb.service.ts`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/src/services/imgbb.service.ts).
- **Flow:**
  1. User selects an issue photo (PNG, JPG, WEBP, max 5MB) in `FileComplaint.tsx`.
  2. Uploaded directly via FormData to `https://api.imgbb.com/1/upload?key={VITE_IMGBB_API_KEY}`.
  3. ImgBB returns the hosted image URL (`data.url`).
  4. The URL is saved into the Firestore complaint document's `imageUrl` field.
- **Environment Variable:** `VITE_IMGBB_API_KEY` (configured in `.env`).
- **Security Note:** The API key is client-exposed in the frontend bundle (standard for client-direct uploads). For elevated security environments, uploads can be proxied through a Firebase Cloud Function.
- **Firebase Storage Status:** **Completely omitted from dependencies and rules.**

---

## 13. Firebase Cloud Functions Reference

Located in [`functions/src/index.ts`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/functions/src/index.ts):

| Function Name | Type | Authorization Required | Purpose |
|---|---|---|---|
| `createModerator` | `https.onCall` | Caller must have `role === 'admin'` | Creates user in Firebase Auth, assigns `role: 'moderator'` claim, and creates Firestore `users/{uid}` doc. |
| `setUserRole` | `https.onCall` | Caller must have `role === 'admin'` | Updates user role in Firebase Auth claims and updates Firestore user document. |
| `deleteUser` | `https.onCall` | Caller must have `role === 'admin'` | Deletes user from Firebase Authentication and removes Firestore document. |
| `updateUserPassword`| `https.onCall` | Caller must have `role === 'admin'` | Administratively updates user password in Firebase Auth. |
| `toggleUserBlock` | `https.onCall` | Caller must have `role === 'admin'` | Sets `blocked: boolean` on Firestore user document. |
| `toggleUserActive`| `https.onCall` | Caller must have `role === 'admin'` | Sets `isActive: boolean` on Firestore user document. |
| `updateUserData` | `https.onCall` | Caller must have `role === 'admin'` | Updates profile fields and synchronizes Auth role claim if changed. |
| `updateLicenseStatus`| `https.onCall` | Caller MUST have `superAdmin === true` claim | Updates `systemSettings/serviceLicense` (enabled, expiresAt, reason). |
| `assignSuperAdmin` | `https.onCall` | Caller MUST have `superAdmin === true` claim | Sets or revokes the authoritative `superAdmin` custom claim via Admin SDK. |

*Security Enforcement: All privileged functions verify `context.auth` and inspect token custom claims directly. Client-provided role parameters are rejected.*

---

## 14. Firestore Security Rules Summary

Defined in [`firestore.rules`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/firestore.rules):

- **Helper Functions:**
  - `isSuperAdmin()`: Evaluates `request.auth != null && request.auth.token.superAdmin == true`.
  - `isAdmin()`: Evaluates `request.auth.token.role == 'admin' || isSuperAdmin()`.
  - `isModerator()`: Evaluates `request.auth.token.role in ['moderator', 'admin'] || isSuperAdmin()`.
  - `isLicenseExpired()`: Evaluates whether `systemSettings/serviceLicense` has `enabled == true && request.time >= expiresAt`.
- **RBAC Protections:**
  - `users/{uid}`: Users cannot self-promote to `admin`, `moderator`, or `superAdmin`. Modifications to `role`, `blocked`, and `isActive` are blocked on client writes.
  - `systemSettings/serviceLicense`: Publicly readable (so clients can evaluate lock status), but **writable strictly by `isSuperAdmin()`**.
  - `complaints/{complaintId}`: Creating or updating complaints requires `!isLicenseExpired() || isSuperAdmin()`.
  - `complaints/{ticketId}/notes/{noteId}`: Staff only; immutable audit log (`allow update: if false;`).
  - `notifications/{id}`: Users can only read notifications matching `request.auth.token.email`.

---

## 15. Service License & Super Admin Lock System

The application features a tamper-proof licensing and emergency lock system:

### 15.1 Single Source of Truth (`systemSettings/serviceLicense`)
```typescript
{
  enabled: boolean,          // true: expiration limit enforced; false: unlimited mode
  expiresAt: Timestamp,      // expiration cutoff timestamp
  updatedAt: Timestamp,      // server timestamp of last update
  updatedBy: string,         // Super Admin email or UID
  reason?: string            // administrative note
}
```

### 15.2 Lock Condition
```
isLocked = (enabled === true) && (currentTime >= expiresAt)
```
- When `enabled === false`: The portal is in **Unlimited Mode** and never locks.
- When `enabled === true`: The portal automatically locks the exact millisecond `currentTime >= expiresAt`.

### 15.3 Zero-Polling Automatic Expiration
In [`src/components/LockOverlay.tsx`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/src/components/LockOverlay.tsx), when a valid license is received, the client calculates `delay = expiresAt - now` and schedules a single precision `setTimeout`. The exact moment expiration arrives, the lock overlay engages automatically without polling loops or page reloads.

### 15.4 The Lock Screen Experience
When the license is expired:
- **Normal Users:** Locked out.
- **Moderators:** Locked out.
- **Normal Admins:** Locked out.
- **Super Admin:** Can authenticate via discreet interaction and manage the license.
- **Mandatory Display Message:**
  > **`Please renew the firebase subscription to unlock the service`**
  *(The application behind the overlay is un-interactive).*

### 15.5 Discreet Access Triggers
To prevent advertising administrative interfaces to standard users:
1. Clicking the lock emblem **5 times within 3 seconds**, OR
2. Pressing keyboard shortcut **`Ctrl + Shift + L`**.

> [!CAUTION]
> These triggers provide **UI concealment only**. The true security boundary is the backend verification of the `superAdmin === true` custom claim. A user with valid normal admin credentials who triggers the modal is immediately rejected, signed out, and denied access.

### 15.6 Unlocked Site Experience
- When the site is unlocked, Super Admins log in through the **standard `/admin-login` panel**.
- There is **NO public "Super Admin Login" page or link**.
- Inside `/dashboard`, accounts with verified `superAdmin === true` receive a discreet **"System Security"** header button opening [`SuperAdminLicenseModal.tsx`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/src/components/SuperAdminLicenseModal.tsx). Normal admins do not see this button.

---

## 16. Super Admin License Controls

Available inside [`SuperAdminLicenseModal.tsx`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/src/components/SuperAdminLicenseModal.tsx) and [`LockOverlay.tsx`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/src/components/LockOverlay.tsx):

1. **Quick Renew / Extension:** Preset extensions for `+7 Days`, `+30 Days`, `+90 Days`, and `+1 Year`.
2. **Custom Expiration:** Datetime-local picker allowing exact setting, extension, or shortening of the expiration date and time.
3. **Emergency Unlock:** Instantly grants a temporary `+24 Hour` operational window.
4. **Immediate Lock Service:** Sets `expiresAt` to a past timestamp, immediately engaging the lock screen across all connected clients.
5. **Toggle License Limit Enforcement:** Switch between `Enabled` (enforcing `expiresAt`) and `Disabled` (unlimited mode).

---

## 17. Time Security & Clock Trust

- **Client UI vs. Server Boundary:**
  - **Client-Side:** The browser calculates `delay = expiresAt - (Date.now() + serverOffsetMs)` to trigger UI transitions. Client timers are a convenience for UI responsiveness and are **not** claimed to be tamper-proof against local clock manipulation.
  - **Authoritative Server Security:** In Cloud Firestore, security rules evaluate `request.time`, which is strictly set by Google Cloud server infrastructure:
    ```javascript
    request.time >= get(/databases/$(database)/documents/systemSettings/serviceLicense).data.expiresAt
    ```
    Even if a malicious user alters their local Windows clock, any attempted complaint creation or update will be rejected by Cloud Firestore.

---

## 18. Initial Firebase Setup

- **Firebase Project Name:** `SAIL-MIOM-ELECT`
- **Firebase Project ID:** `sail-miom-elect`
- **Active Configurations:**
  - **Firebase Hosting:** Configured in `firebase.json` (Public: `dist/`).
  - **Cloud Firestore:** Database `(default)` initialized and active.
  - **Firestore Rules:** Deployed and verified on `sail-miom-elect`.
  - **Firestore Indexes:** Deployed and verified on `sail-miom-elect`.
  - **Firebase Authentication:** Email/Password provider enabled.

---

## 19. Current Deployment Status

| Component / Layer | Environment | Status | Verification Detail |
|---|---|---|---|
| **Frontend Production Build** | Local | **VERIFIED** | `npm run build` succeeds with Exit Code `0` (`dist/` created). |
| **Cloud Functions Compilation** | Local | **VERIFIED** | `npm run build` in `functions/` succeeds with Exit Code `0` (`tsc`). |
| **License Unit Test Suite** | Local | **VERIFIED** | `npm test` runs 14 tests: **14 Passed, 0 Failed**. |
| **Initial Super Admin Bootstrap** | Cloud / Remote | **VERIFIED** | Auth user `rs750421@gmail.com` active with `superAdmin: true`. |
| **Firestore Security Rules** | Cloud / Remote | **VERIFIED** | Rules compiled and deployed to `sail-miom-elect`. |
| **Firestore Composite Indexes** | Cloud / Remote | **VERIFIED** | Indexes deployed to `sail-miom-elect`. |
| **Firebase Cloud Functions** | Cloud / Remote | **NOT YET DEPLOYED** | Source ready in `functions/src/index.ts`. Deployment held. |
| **Firebase Hosting** | Cloud / Remote | **NOT YET DEPLOYED** | Bundle ready in `dist/`. Deployment held. |
| **Live Production Website** | Cloud / Remote | **NOT YET TESTED LIVE** | Held pending Hosting & Functions deployment. |
| **Google Cloud Run / SQL** | Cloud / Remote | **NOT REQUIRED** | Application is fully serverless on Firebase. |

---

## 20. Environment Variables

### Frontend Variables (`.env`)
```env
VITE_FIREBASE_API_KEY           # Firebase Web API Key
VITE_FIREBASE_AUTH_DOMAIN       # sail-miom-elect.firebaseapp.com
VITE_FIREBASE_PROJECT_ID        # sail-miom-elect
VITE_FIREBASE_STORAGE_BUCKET    # sail-miom-elect.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID # Project Messaging Sender ID
VITE_FIREBASE_APP_ID            # Firebase Web App ID
VITE_IMGBB_API_KEY              # ImgBB API Key for complaint images
```

### CLI Tooling Variables (Optional for Bootstrap)
```env
GOOGLE_APPLICATION_CREDENTIALS  # Path to Firebase Admin SDK service account key
ADMIN_EMAIL                     # Pre-filled Super Admin email for setup script
ADMIN_PASSWORD                  # Pre-filled Super Admin password for setup script
```
*(Never place raw private keys or credentials in source control or documentation).*

---

## 21. Initial Admin Bootstrap Script

Located at [`scripts/setupInitialAdmin.mjs`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/scripts/setupInitialAdmin.mjs):
- **Runtime:** Node.js ESM.
- **Functionality:**
  1. Auto-discovers service account JSON files in the workspace matching `*firebase-adminsdk*.json` or prompts for path.
  2. Strips matching Windows quotes (`"` or `'`) and handles relative/absolute paths.
  3. Verifies `parsed.project_id === 'sail-miom-elect'`.
  4. Authenticates with the Firebase Admin SDK.
  5. Creates or updates the Firebase Auth user and sets `{ role: "admin", superAdmin: true }`.
  6. Upserts `users/{uid}` in Firestore.
  7. Safely initializes `systemSettings/serviceLicense` (1 year initial validity) and counters **only if missing**, preventing overwrite of existing counters.
- **Command:** `npm run setup-admin`

---

## 22. Testing & Verification

### Executed Tests
1. **License & Security Test Suite:**
   - Command: `npm test` (`node tests/licenseSystem.test.mjs`)
   - Result: **14 Passed, 0 Failed**.
   - Validates:
     - Unlocked when `enabled: false` (unlimited mode).
     - Unlocked before `expiresAt`.
     - Locked at and after `expiresAt`.
     - Timestamp format normalization.
     - Automatic transition from unlocked to locked upon reaching expiration.
     - Blocking of normal users (`role: "user"`).
     - Blocking of moderators (`role: "moderator"`).
     - Blocking of normal admins (`role: "admin"` without `superAdmin` claim).
     - Authorization of Super Admin (`superAdmin: true`).
     - Rejection of spoofed document profiles (`docData.superAdmin`).
     - Emergency unlock (+24h) state mutation.
     - License extension (+30d) state mutation.
     - Disabling license limit (`enabled: false`) state mutation.
     - Immediate manual lock state mutation.
2. **Frontend Build Verification:**
   - Command: `npm run build`
   - Result: **Exit Code 0** (`dist/` built in ~9s).
3. **Cloud Functions Compilation:**
   - Command: `npm run build` in `functions/`
   - Result: **Exit Code 0** (`tsc` clean compilation).

### Remaining Tests Pending Deployment
- Live end-to-end browser testing against deployed Cloud Functions.
- Live verification of Firebase Hosting custom response headers.

---

## 23. Rollback Strategy

Should an emergency rollback to the Express / SQLite baseline be required:
1. The rollback codebase is preserved intact in `backend/` and [`src/services/api.ts`](file:///c:/Rounak/Web/MMIOM%20HOME/FINAL/src/services/api.ts).
2. Restore `backend/.env` with `DATABASE_URL="file:./sail_kiom.db"`.
3. In `backend/`, run `npm install && npx prisma db push && npm run dev` to serve the Express API on port `8000`.
4. In `src/services/`, redirect data service calls back through `api.ts`.
5. Start Vite frontend pointing `VITE_API_BASE_URL=http://localhost:8000`.

---

## 24. Security & Credential Handling Guidelines

1. **Private Keys & Service Accounts:**
   - Service account JSON files (`*firebase-adminsdk*.json`, `*serviceAccountKey*.json`) are strictly git-ignored via `.gitignore`.
   - Never copy service account keys into `dist/`, `public/`, or client-accessible directories.
2. **Authoritative Claims:**
   - Client code must never self-assign roles. All role promotions must be handled through trusted Cloud Functions or CLI scripts with Admin SDK privileges.
3. **No Hardcoded Passwords:**
   - Passwords and private keys must never be committed or documented in plain text.

---

## 25. Development & Deployment Commands

### Development Commands
```bash
# Start frontend Vite development server (http://localhost:5173)
npm run dev

# Run license system unit test suite
npm test

# Build frontend production bundle (outputs to dist/)
npm run build

# Preview local production build
npm run preview

# Run Super Admin & License Bootstrap CLI
npm run setup-admin
```

### Cloud Functions Commands (in `functions/`)
```bash
# Navigate to functions
cd functions

# Compile TypeScript functions
npm run build

# Run local Firebase Functions emulator
npm run serve
```

### Firebase Deployment Commands (Run when authorized)
```bash
# Deploy Firestore security rules and composite indexes
firebase deploy --only firestore:rules,firestore:indexes

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Frontend Hosting
firebase deploy --only hosting

# Full Deployment
firebase deploy
```

---

*Handoff document maintained for the SAIL-MIOM-ELECT engineering team.*
