# ⚡ SAIL-MIOM Electrical Maintenance System

> **Enterprise Complaint Management & Electrical Maintenance Tracking System**  
> Developed for **Steel Authority of India Limited (SAIL) – Meghahatuburu Iron Ore Mine (MIOM)**  
> Electrical Maintenance Department (CMLO)

[![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.17-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12.12.0-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4.1-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Express](https://img.shields.io/badge/Express-4.21.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0.5-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

---

## 📌 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Feature Overview](#2-feature-overview)
3. [Application Roles and Permissions (RBAC)](#3-application-roles-and-permissions-rbac)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Repository Structure](#6-repository-structure)
7. [Prerequisites](#7-prerequisites)
8. [Local Development Setup](#8-local-development-setup)
9. [Environment Variables & Configuration](#9-environment-variables--configuration)
10. [Firebase Configuration](#10-firebase-configuration)
11. [Database & Data Models](#11-database--data-models)
12. [Authentication & Security Architecture](#12-authentication--security-architecture)
13. [Testing](#13-testing)
14. [Deployment Workflows](#14-deployment-workflows)
15. [Troubleshooting Guide](#15-troubleshooting-guide)
16. [Current Status & System Limitations](#16-current-status--system-limitations)
17. [Contribution & Development Guidelines](#17-contribution--development-guidelines)
18. [License & Project Ownership](#18-license--project-ownership)

---

## 1. Project Overview

The **SAIL-MIOM Electrical Maintenance System** is an enterprise-grade web application designed to digitize, streamline, and govern electrical fault reporting and maintenance operations at the **Meghahatuburu Iron Ore Mine (MIOM)**, operated by the **Steel Authority of India Limited (SAIL)**.

### The Problem It Solves
Historically, electrical maintenance requests across plant sites, mining quarters, and administrative offices were handled via manual registers, telephone calls, or ad-hoc communications. This resulted in delayed response times, lack of SLA traceability, missing escalation paths, and poor visibility into recurring equipment failures.

### Target Users
- **Plant & Township Employees / Complainants**: Log electrical faults with site specifications, monitor resolution progress in real time via public ticket IDs, and receive administrative remarks.
- **Electrical Technicians / Moderators**: Access a focused mobile-ready portal to view assigned work orders, update task progress (`Pending` → `Active` → `Resolved` / `Rejected`), and submit audit notes.
- **Maintenance Administrators**: Supervise the entire lifecycle of complaints, triage priorities, assign technicians, monitor SLA metrics via visual analytics, export compliance reports, and manage field staff.
- **Chief Administrator (`chief_admin`)**: Oversee departmental operations with exclusive authority to provision and elevate privileged accounts (Admins, Chief Admins, and Technicians).
- **Super Administrator (`superAdmin`)**: System custodian with root privileges over licensing, emergency system locks, and cryptographic custom claim delegation.

---

## 2. Feature Overview

### 📝 Public Complaint Submission & Validation
- **Dynamic Location Partitioning**:
  - **Plant Infrastructure**: Selection of specific plant units, substations, control rooms, or custom specified sections.
  - **Township Infrastructure**: Selection of residential sectors, quarters (`Qtr No.`), street lights, and township zones.
- **Categorization**: 4 standardized electrical categories:
  1. `Electrical Complaint`
  2. `Power Supply / Wiring`
  3. `Lighting / Fan / Appliance`
  4. `Others` (with mandatory dynamic specification)
- **Granular Fault Selection**: Includes wiring issues, switchboards/sockets/3-pin/5-pin, mains supplies (MCB/KitKat fuse), energy meters, street lights, earthing, fans, short circuits, light holders, house wiring, and office AC units.
- **Anti-Spam & Rate Limiting**:
  - Integrated 24-hour client and Firestore rate-limiting lock based on submitter phone number and email address (`checkSubmissionRateLimit`).
  - Strict 200-word limit enforced on complaint descriptions.
- **Image Attachments**: Integrated photographic proof upload powered by the ImgBB REST API.
- **Standardized Ticket Format**: Auto-increments tickets using the standardized yearly schema:
  $$\text{MIOM-EL-YYYY-XXXX} \quad (\text{e.g., } \texttt{MIOM-EL-2026-0001})$$
  *(Maintains full backward compatibility with legacy `MIOM-XXXX` format).*

### 🔍 Real-Time Ticket Tracking
- Publicly accessible tracking portal at `/track-complaint` requiring only the Ticket ID.
- Real-time Firestore snapshot listener rendering:
  - Visual status progress bar (`Pending` → `Assigned` → `In Progress / Active` → `Resolved`).
  - Allocated technician details (`assignedToName`).
  - Priority badge, submission timestamp, and department details.
  - Transparent administrative remarks (`adminToUser` notes subcollection).

### 📊 Real-Time Operations Dashboard (`/dashboard`)
- **Live Metrics**: Total complaints, pending triage, active work orders, completed repairs, and rejection metrics.
- **Data Visualization**: Recharts bar charts and status distribution pie charts with dynamic theme support (Dark/Light mode).
- **Tabbed Filtering**: Real-time filtering by Status, Category, Priority, and Assignment state.
- **Work Order Assignment Modal**: Instant assignment of pending complaints to registered, active electrical moderators.
- **Audit Logging**: Internal immutable notes system (`complaints/{id}/notes/{noteId}`):
  - `adminToModerator`: Dispatch instructions.
  - `moderatorToAdmin`: Field status updates and technical diagnostics.
  - `adminToUser`: Public feedback visible to complainants.
- **Reporting & Compliance**:
  - One-click export to formatted Excel workbooks (`.xlsx`) via SheetJS.
  - Generation of printable departmental PDF summary reports via jsPDF.

### 👥 Staff & User Management (`/dashboard` → Staff Tab)
- Real-time directory of all registered personnel with status indicators.
- Instant toggle for account **Deactivation** (`isActive`) and **Security Blocking** (`blocked`).
- Session revocation: Blocked users are immediately signed out via `AuthContext`.
- Administrative password reset dispatch via Firebase Authentication.
- Profile and designation updating.

### 🛡️ Privileged Account Creation (`+ Create Account`)
- In-app modal accessible exclusively to **Chief Admin** and **Super Admin**.
- Provisions **Admin**, **Chief Admin**, and **Moderator** accounts directly from the dashboard.
- Uses an isolated secondary Firebase App instance (`SecondaryCreatorApp_${Date.now()}`) to create authentication credentials without terminating the active Chief Admin session.
- Synchronizes Firebase Authentication and Cloud Firestore records simultaneously.

### 🔒 Enterprise Service Licensing & Lock Overlay
- Continuous subscription to `/systemSettings/serviceLicense`.
- When license expiration occurs, the application renders a non-dismissible Glassmorphic **Lock Overlay**, preventing write operations.
- Super Admin emergency bypass and 24-hour emergency renewal mechanisms.

---

## 3. Application Roles and Permissions (RBAC)

The system enforces a multi-tier Role-Based Access Control model synchronized across client routing, Firestore security rules, Firebase Cloud Functions, and the secondary Express backend.

### Role Hierarchy & Capabilities Matrix

| Feature / Action | Public / User (`user`) | Moderator (`moderator`) | Admin (`admin`) | Chief Admin (`chief_admin`) | Super Admin (`superAdmin: true`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Submit Electrical Complaint | ✅ | ✅ | ✅ | ✅ | ✅ |
| Track Complaint by Ticket ID | ✅ | ✅ | ✅ | ✅ | ✅ |
| Access Moderator Dashboard (`/moderator-dashboard`) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Update Work Order Status (`active`, `resolved`) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Add Moderator Audit Notes | ❌ | ✅ | ✅ | ✅ | ✅ |
| Access Main Dashboard (`/dashboard`) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Assign Complaints to Technicians | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete Complaints | ❌ | ❌ | ✅ | ✅ | ✅ |
| Export Excel (`.xlsx`) and PDF Reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| View Staff Directory & Filter Status | ❌ | ❌ | ✅ | ✅ | ✅ |
| Toggle Staff Block / Active Status | ❌ | ❌ | ✅ | ✅ | ✅ |
| Trigger Password Reset Emails | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create Moderator Accounts | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Create Admin Accounts** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Create Chief Admin Accounts** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Promote Existing Users to Admin / Chief Admin** | ❌ | ❌ | ❌ | ✅ | ✅ |
| Configure System License & Emergency Unlock | ❌ | ❌ | ❌ | ❌ | ✅ |
| Grant Super Admin Claims (`assignSuperAdmin`) | ❌ | ❌ | ❌ | ❌ | ✅ |

### Key Authorization Principles
1. **Privilege Escalation Protection**: Ordinary Admins cannot create Admin or Chief Admin accounts, nor can they update user documents with `role: 'admin'` or `role: 'chief_admin'`. This is strictly blocked by `firestore.rules`, `functions/src/index.ts`, and `backend/src/routes/admin.routes.ts`.
2. **Authoritative Super Admin Claims**: Super Admin status is granted **exclusively** via the Firebase Auth custom claim `superAdmin: true`. Editing a Firestore document alone will **never** grant Super Admin permissions.
3. **Chief Admin Dual Resolution**: The Chief Admin status is recognized if either the Firebase Auth token custom claim (`request.auth.token.role == 'chief_admin'`) or the verified Firestore profile document (`/users/{uid}.role == 'chief_admin'`) contains the role, provided the account is active and not blocked.

---

## 4. Technology Stack

### Frontend Client (`/`)
- **Framework**: [React 19.2.3](https://react.dev/)
- **Build Tool**: [Vite 7.2.4](https://vitejs.dev/) with `@vitejs/plugin-react` 5.1.1
- **Language**: [TypeScript 5.9.3](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4.1.17](https://tailwindcss.com/) with `@tailwindcss/vite`
- **Routing**: [React Router DOM 7.14.1](https://reactrouter.com/)
- **Animation**: [Framer Motion 12.38.0](https://www.framer.com/motion/)
- **Visual Analytics**: [Recharts 3.8.1](https://recharts.org/)
- **Iconography**: [Lucide React 1.8.0](https://lucide.dev/)
- **Document Export**: [SheetJS (xlsx) 0.18.5](https://sheetjs.com/) and [jsPDF 4.2.1](https://github.com/parallax/jsPDF)
- **HTML Sanitization**: [DOMPurify](https://github.com/cure53/DOMPurify)

### Primary Production Backend: Firebase Cloud Infrastructure
- **Firebase Authentication**: Identity management with custom claims (`role`, `superAdmin`).
- **Cloud Firestore**: Real-time NoSQL document database with strict security rules (`firestore.rules`) and compound query indexes (`firestore.indexes.json`).
- **Firebase Hosting**: Fast global CDN serving production assets from `dist/` with security headers and SPA rewrite rules.
- **Firebase Cloud Functions (`functions/`)**: Server-side administrative operations using `firebase-admin` 11.11.0 on Node.js 18 runtime.
- **Image Storage Service**: External REST API integration with ImgBB.

### Secondary Standalone Backend (`backend/`)
*(Note: A standalone REST API designed for local testing, internal networking, or independent server deployment).*
- **Runtime & Server**: Node.js (ESM), [Express 4.21.2](https://expressjs.com/)
- **Database ORM**: [Prisma ORM 6.4.1](https://www.prisma.io/)
- **Database Engine**: SQLite (`sail_kiom.db`)
- **Authentication**: JWT (`jsonwebtoken` 9.0.2), `bcryptjs` 3.0.2
- **Validation**: [Zod 3.24.2](https://zod.dev/)
- **File Upload**: [Multer 1.4.5](https://github.com/expressjs/multer)
- **Testing**: [Vitest 3.0.5](https://vitest.dev/), Supertest 7.0.0

---

## 5. System Architecture

The following diagram illustrates how clients and administrators interact with both the primary Firebase cloud infrastructure and the optional secondary backend:

```mermaid
flowchart TB
    subgraph Clients["Clients & Users"]
        Complainant["Complainant (Public/Employee)"]
        Technician["Technician / Moderator"]
        AdminUser["Admin / Chief Admin / Super Admin"]
    end

    subgraph SPA["Vite + React 19 Frontend (sail-miom-elect.web.app)"]
        PublicRoutes["Public Views (/file-complaint, /track-complaint)"]
        ModPortal["Moderator Portal (/moderator-dashboard)"]
        AdminDashboard["Admin Operations Portal (/dashboard)"]
        AuthCtx["AuthContext & RBAC State Guard"]
    end

    subgraph FirebaseInfra["Primary Production Backend (Firebase Cloud)"]
        FirebaseAuth["Firebase Authentication\n(Identity & Custom Claims)"]
        FirestoreDB["Cloud Firestore\n(/complaints, /users, /systemSettings)"]
        CloudFuncs["Firebase Cloud Functions\n(createPrivilegedUser, setUserRole)"]
        ImgBB["ImgBB Image Storage API"]
    end

    subgraph StandaloneAPI["Secondary Backend API (Optional / Local)"]
        ExpressServer["Express 4 REST Server\n(http://localhost:8000)"]
        PrismaORM["Prisma 6 ORM"]
        SQLiteDB["SQLite Database\n(sail_kiom.db)"]
    end

    %% Client routing
    Complainant --> PublicRoutes
    Technician --> ModPortal
    AdminUser --> AdminDashboard

    %% Frontend to Services
    PublicRoutes -->|Submit complaint & upload| ImgBB
    PublicRoutes -->|Store complaint & Rate-limit| FirestoreDB
    PublicRoutes -->|Track ticket by ID| FirestoreDB

    ModPortal -->|Read assigned & log notes| FirestoreDB
    ModPortal -->|Verify session| AuthCtx

    AdminDashboard -->|Manage complaints & staff| FirestoreDB
    AdminDashboard -->|Secondary App user creation| FirebaseAuth
    AdminDashboard -->|Verify role & permissions| AuthCtx

    AuthCtx -->|Sync identity & token claims| FirebaseAuth
    AuthCtx -->|Listen to user profile doc| FirestoreDB

    AdminDashboard -.->|Optional Admin SDK operations| CloudFuncs
    CloudFuncs -->|Admin SDK execution| FirebaseAuth
    CloudFuncs -->|Admin SDK execution| FirestoreDB

    %% Secondary Backend optional connection
    SPA -.->|Optional REST client (api.ts)| ExpressServer
    ExpressServer --> PrismaORM
    PrismaORM --> SQLiteDB
```

---

## 6. Repository Structure

```
SAIL-MIOM-CMLO/
├── .firebaserc                     # Active Firebase project configuration (sail-miom-elect)
├── firebase.json                   # Hosting headers, rewrites, and Cloud Functions configuration
├── firestore.rules                 # Authoritative security rules for Cloud Firestore
├── firestore.indexes.json          # Firestore composite indexes definition
├── package.json                    # Root dependencies, scripts, and build tooling
├── tsconfig.json                   # TypeScript configuration for Vite SPA
├── vite.config.ts                  # Vite build configuration (manual chunks, tailwind, terser)
│
├── src/                            # Frontend Source Code
│   ├── main.tsx                    # Application entry point
│   ├── App.tsx                     # Top-level routing, license listener, and layout
│   ├── index.css                   # Tailwind CSS 4 theme imports and glassmorphic styles
│   ├── components/                 # Reusable UI & Modal Components
│   │   ├── CreateAdminModal.tsx    # Chief Admin privileged account creation modal
│   │   ├── DashboardSkeleton.tsx   # Dashboard loading skeleton
│   │   ├── LoadingSpinner.tsx      # Global loading indicator
│   │   ├── LockOverlay.tsx         # System license expiration lock screen
│   │   ├── Navbar.tsx              # Top navigation bar with role badges and theme toggle
│   │   ├── ProtectedRoute.tsx      # Client-side RBAC route guard
│   │   ├── SuperAdminLicenseModal.tsx # Super Admin license governance modal
│   │   └── UserManagement.tsx      # Staff directory, status toggling, and role editing
│   ├── contexts/                   # React Context Providers
│   │   ├── AuthContext.tsx         # Firebase Auth, custom claims, and Firestore role state
│   │   └── ThemeContext.tsx        # Dark/Light mode theme state management
│   ├── hooks/                      # Custom React Hooks
│   │   ├── useAntiSpam.ts          # Anti-spam form validation hook
│   │   └── useRateLimit.ts         # Client rate limiting utility
│   ├── pages/                      # Page Components
│   │   ├── Home.tsx                # Public landing page
│   │   ├── Login.tsx               # Staff & Admin login page
│   │   ├── FileComplaint.tsx       # Public/Employee complaint filing form
│   │   ├── TrackComplaint.tsx      # Public complaint tracking portal
│   │   ├── Dashboard.tsx           # Admin & Chief Admin operational dashboard
│   │   ├── ModeratorDashboard.tsx  # Technician work order portal
│   │   └── Profile.tsx             # User profile details and password update
│   ├── services/                   # Application Services
│   │   ├── admin.service.ts        # Admin user operations and secondary app account creation
│   │   ├── api.ts                  # HTTP client for optional Express backend
│   │   ├── auth.service.ts         # Firebase Authentication service and role helpers
│   │   ├── complaint.service.ts    # Firestore complaint CRUD, ticket generator, and rate limits
│   │   ├── firebase.ts             # Firebase client SDK initialization
│   │   ├── imgbb.service.ts        # ImgBB image upload integration
│   │   ├── license.service.ts      # Service license listener and evaluation
│   │   └── moderator.service.ts    # Moderator assignment queries and status toggles
│   └── utils/                      # Helper Utilities
│       ├── cn.ts                   # Tailwind class merge utility
│       └── complaintExport.ts      # Excel (.xlsx) and PDF report generator
│
├── functions/                      # Firebase Cloud Functions (Admin Operations)
│   ├── package.json                # Cloud Functions dependencies (firebase-admin, functions)
│   ├── tsconfig.json               # Cloud Functions TypeScript configuration
│   └── src/
│       └── index.ts                # Callable functions (createPrivilegedUser, setUserRole, etc.)
│
├── backend/                        # Secondary Standalone REST API (Express + Prisma)
│   ├── Dockerfile                  # Containerization setup
│   ├── package.json                # Backend dependencies and scripts
│   ├── tsconfig.json               # Backend TypeScript configuration
│   ├── vitest.config.ts            # Vitest unit & integration test configuration
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma schema definition (User, Complaint, Notes, Counters)
│   │   └── seed.ts                 # Database seeding script
│   ├── src/
│   │   ├── app.ts                  # Express application setup, CORS, and route registration
│   │   ├── server.ts               # HTTP server entry point
│   │   ├── middleware/             # Auth, role check, validation, and error middleware
│   │   ├── routes/                 # REST endpoints (admin, auth, complaint, moderator, upload)
│   │   └── services/               # Database services wrapping Prisma ORM
│   └── tests/                      # Automated Vitest test suite (33 passing tests)
│
├── scripts/                        # Trusted Node CLI Bootstrap Utilities
│   ├── createChiefAdmin.mjs        # Script to create/elevate Chief Admin using Service Account
│   ├── createAdmin.mjs             # Script to create Admin user
│   └── setupInitialAdmin.mjs       # Script to bootstrap Super Admin and system license
│
└── tests/                          # Root Test Suites
    ├── licenseSystem.test.mjs      # License expiration & RBAC bypass test suite
    └── testNewFeatures.mjs         # Ticket ID generation, Excel, and PDF export tests
```

---

## 7. Prerequisites

Before installing and running the project, verify that your environment meets the following requirements:

- **Node.js**: `v18.x` or `v20.x` LTS recommended (Cloud Functions target Node 18 runtime).
- **npm**: `v9.x` or higher.
- **Firebase CLI**: `firebase-tools` `v13.x` or higher (`npm install -g firebase-tools`).
- **Firebase Project Access**: Viewer/Editor credentials to the `sail-miom-elect` project on the [Firebase Console](https://console.firebase.google.com).
- **Web Browser**: Any modern browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).

---

## 8. Local Development Setup

### 1. Repository Setup
```bash
# Clone the repository
git clone https://github.com/rounak1434/SAIL-MIOM-CMLO.git
cd SAIL-MIOM-CMLO
```

### 2. Frontend SPA Setup
```bash
# Install root dependencies
npm install

# Configure environment variables (see Section 9)
cp .env.example .env

# Start the Vite development server
npm run dev
```
The frontend will be available at `http://localhost:5173`.

### 3. Firebase Cloud Functions Setup (Optional / Server-Side)
```bash
# Navigate to the functions directory
cd functions

# Install functions dependencies
npm install

# Build TypeScript to lib/
npm run build

# (Optional) Run functions emulator
npm run serve
```

### 4. Secondary Standalone Backend Setup (Optional)
```bash
# Navigate to the backend directory
cd backend

# Install backend dependencies
npm install

# Setup backend environment file
cp .env.example .env

# Generate Prisma client and initialize SQLite database
npm run prisma:generate
npm run prisma:push

# (Optional) Seed the local database with default users
npm run seed

# Start the backend development server with hot-reload
npm run dev
```
The secondary backend API will be available at `http://localhost:8000`.

---

## 9. Environment Variables & Configuration

### Root Frontend Environment (`.env`)
Create a `.env` file in the root directory:

| Variable Name | Required | Component | Description / Safe Example |
| :--- | :---: | :---: | :--- |
| `VITE_FIREBASE_API_KEY` | **Yes** | Client SPA | Firebase Web API key (`AIzaSy...`) |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes** | Client SPA | Firebase Auth domain (`sail-miom-elect.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | **Yes** | Client SPA | Firebase project identifier (`sail-miom-elect`) |
| `VITE_FIREBASE_STORAGE_BUCKET`| **Yes** | Client SPA | Storage bucket (`sail-miom-elect.firebasestorage.app`) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Yes** | Client SPA | Firebase messaging sender ID (`558124779284`) |
| `VITE_FIREBASE_APP_ID` | **Yes** | Client SPA | Firebase Web Application ID (`1:558...:web:...`) |
| `VITE_IMGBB_API_KEY` | Optional | ImgBB Service | API key for complaint photo attachments |
| `VITE_API_BASE_URL` | Optional | Client SPA | URL for the optional Express backend (`http://localhost:8000`) |

### Secondary Express Backend Environment (`backend/.env`)
Create a `.env` file in the `backend/` directory:

| Variable Name | Required | Component | Description / Safe Example |
| :--- | :---: | :---: | :--- |
| `PORT` | **Yes** | Express Server | Server listening port (`8000`) |
| `BASE_URL` | **Yes** | Express Server | Server base URL (`http://localhost:8000`) |
| `CORS_ORIGIN` | **Yes** | Express Server | Allowed CORS origins (`http://localhost:5173,https://sail-miom-elect.web.app`) |
| `DATABASE_URL` | **Yes** | Prisma ORM | SQLite database connection string (`"file:./sail_kiom.db"`) |
| `JWT_SECRET` | **Yes** | Auth Middleware | Secret key for JWT signing (`your-secure-random-jwt-secret`) |
| `JWT_EXPIRES_IN` | **Yes** | Auth Middleware | Token expiration period (`7d`) |
| `NODE_ENV` | **Yes** | Express Server | Runtime environment (`development` or `production`) |

---

## 10. Firebase Configuration

### Security Credentials Convention
> [!CAUTION]
> Never commit Firebase Service Account Private Key files (`*serviceAccountKey*.json`, `*adminsdk*.json`) to GitHub. These files are strictly excluded in `.gitignore`.

### Firebase CLI Authentication & Project Linking
```bash
# Log in to Firebase CLI
firebase login

# Verify active project
firebase use sail-miom-elect
```

### Firestore Security Rules Deployment
The rules in `firestore.rules` protect documents against privilege escalation, enforce rate-limiting, and validate required ticket fields.
```bash
# Deploy Firestore security rules only
firebase deploy --only firestore:rules

# Deploy Firestore composite indexes only
firebase deploy --only firestore:indexes
```

### Firebase Cloud Functions Deployment
```bash
# Build functions and deploy to production
cd functions
npm run build
cd ..
firebase deploy --only functions
```

---

## 11. Database & Data Models

### Primary NoSQL Database: Cloud Firestore

#### 1. Collection: `/users/{uid}`
Represents authenticated personnel (Employees, Moderators, Admins, Chief Admins).
```typescript
{
  uid: string;
  email: string;
  name: string;
  displayName: string;
  role: 'chief_admin' | 'admin' | 'moderator' | 'user';
  businessName?: string;     // e.g., "Electrical Department"
  designation?: string;      // e.g., "Assistant Manager"
  phone?: string;
  blocked: boolean;          // If true, AuthContext revokes session
  isActive: boolean;         // If false, account cannot sign in
  commentCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 2. Collection: `/complaints/{ticketId}`
Represents filed electrical maintenance complaints. Document ID equals `ticketId`.
```typescript
{
  ticketId: string;          // e.g., "MIOM-EL-2026-0001"
  name: string;              // Complainant name
  email: string;             // Complainant email
  phone: string;             // Contact number
  employeeId: string;        // Employee / Personal number
  department: string;        // Department name
  designation: string;       // Designation or employment type
  category: string;          // One of the 4 valid electrical categories
  title: string;             // Nature of complaint
  description: string;       // Detailed description (max 200 words)
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'active' | 'resolved' | 'rejected';
  assignedTo?: string;       // Assigned moderator email
  assignedToUID?: string;    // Assigned moderator UID
  assignedToName?: string;   // Assigned moderator display name
  locationType: 'Plant' | 'Township';
  selectedLocation: string;  // Section or township quarter
  specifiedLocation?: string;// Extra location details
  imageUrl?: string;         // ImgBB uploaded photo URL
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 3. Subcollection: `/complaints/{ticketId}/notes/{noteId}`
Immutable audit trail entries attached to a complaint.
```typescript
{
  noteType: 'adminToModerator' | 'moderatorToAdmin' | 'adminToUser';
  content: string;
  authorEmail: string;
  authorName: string;
  createdAt: Timestamp;
}
```

#### 4. System Documents:
- `/counters/tickets`: Manages yearly increment state (`currentYear`, `currentNumber`, `yearly`).
- `/rateLimits/{email_or_phone}`: Locks subsequent submissions for 24 hours.
- `/systemSettings/serviceLicense`: Stores `enabled`, `expiresAt`, and `reason`.

---

### Secondary Relational Database: SQLite (Prisma Schema)

The secondary backend uses Prisma with SQLite (`backend/prisma/schema.prisma`) mirroring the same entities:
- `User`: Stored in table `users` with hashed passwords (`bcryptjs`).
- `Complaint`: Stored in table `complaints` with foreign-key relation to assigned moderator.
- `ComplaintNote`: Stored in table `complaint_notes` with cascade deletion.
- `Notification`: In-app notification queue.
- `TicketCounter`: Atomic integer sequence tracker.

---

## 12. Authentication & Security Architecture

### Role Verification & Resolution
The client applications resolve user roles through an authoritative multi-step strategy:
1. **Firebase Auth Custom Claims**: The client inspects `tokenResult.claims.role`.
2. **Firestore Profile Document**: The client simultaneously reads `/users/{uid}` in Firestore.
3. **Chief Admin Promotion**: If **either** the Auth custom claim or the Firestore document has `chief_admin`, the session is resolved as `chief_admin`.
4. **Super Admin Isolation**: Super Admin privileges **strictly require** the `superAdmin: true` custom claim on the Firebase Auth token. Firestore document fields cannot grant Super Admin rights.

### Bootstrapping the Initial Chief Admin
To provision or promote the first Chief Admin without relying on existing dashboard privileges, execute the trusted local Admin SDK script:

```bash
# Ensure you have your Firebase Service Account JSON file in the project directory
node scripts/createChiefAdmin.mjs
```
The script will prompt interactively for:
1. Path to your Service Account JSON file.
2. Chief Admin Email address.
3. Password (minimum 6 characters).
4. Full Name and Designation.

The script creates the account in Firebase Authentication, sets `{ role: 'chief_admin' }` custom claims, and provisions the Firestore profile document.

### Bootstrapping the Super Admin
To initialize the Super Admin account and seed the `/systemSettings/serviceLicense` document:
```bash
node scripts/setupInitialAdmin.mjs
```

---

## 13. Testing

The repository contains automated unit and integration tests across both the root Vite project and the secondary Express backend.

### 1. Root License System Tests
Validates the licensing logic, time offset calculations, and Super Admin bypass:
```bash
npm test
# Executes: node tests/licenseSystem.test.mjs (14 test cases)
```

### 2. Root Feature & Report Tests
Validates ticket numbering format (`MIOM-EL-YYYY-XXXX`), Excel generation, and PDF generation:
```bash
node tests/testNewFeatures.mjs
```

### 3. Frontend Production Build Validation
```bash
npm run build
# Compiles TypeScript and runs Vite production bundling
```

### 4. Cloud Functions Build Validation
```bash
cd functions
npm run build
# Compiles TypeScript via tsc
```

### 5. Secondary Express Backend Test Suite
The Express backend includes 33 unit and integration tests executing against an in-memory or local test database using Vitest and Supertest:
```bash
cd backend
npm test
# Executes: vitest run (33 tests across 5 test suites)
```
**Test Coverage Breakdown**:
- `tests/auth.test.ts`: Login, registration, token generation, and password validation (7 tests).
- `tests/admin.test.ts`: Privilege checks, user management, and Chief Admin creation guard (12 tests).
- `tests/complaint.test.ts`: Ticket filing, assignment, status transitions, and notes (8 tests).
- `tests/notification.test.ts`: User notifications and mark-as-read (3 tests).
- `tests/upload.test.ts`: File upload and MIME-type validation (3 tests).

---

## 14. Deployment Workflows

> [!IMPORTANT]
> Git commits and pushes to `origin/main` **do not automatically deploy** changes to Firebase Hosting, Cloud Functions, or Firestore Security Rules. Production deployments must be executed explicitly using the Firebase CLI.

### 1. Firebase Hosting (Production Web App)
```bash
# 1. Build the production bundle
npm run build

# 2. Deploy to Firebase Hosting
firebase deploy --only hosting
```
The production site is served at: **https://sail-miom-elect.web.app**

### 2. Cloud Firestore Security Rules
```bash
# Deploy updated security rules and indexes
firebase deploy --only firestore:rules,firestore:indexes
```

### 3. Firebase Cloud Functions
```bash
# Deploy cloud functions (requires Blaze Pay-As-You-Go plan)
firebase deploy --only functions
```

### 4. Secondary Express Backend (If Deployed Separately)
The Express backend can be containerized using its included `backend/Dockerfile` or run on an internal server:
```bash
cd backend
npm run build
npm run start
```

---

## 15. Troubleshooting Guide

### 1. "+ Create Account" Button Does Not Open Modal
- **Cause**: User is logged in as an ordinary Admin (`admin`) rather than a Chief Admin (`chief_admin`) or Super Admin.
- **Solution**: Verify your role badge in the upper right profile menu. If you need Chief Admin privileges, have an existing Chief Admin promote your account or run `node scripts/createChiefAdmin.mjs`.

### 2. "Permission Denied" Error in Firestore
- **Cause**: The user's account may be marked `blocked: true` or `isActive: false` in Firestore, or the Auth token lacks the required custom claim.
- **Solution**: Sign out and log back in to force an ID token refresh (`getIdTokenResult(true)`).

### 3. 24-Hour Submission Rate Limit Lock
- **Cause**: A complaint was already filed with the same phone number or email within the last 24 hours.
- **Solution**: Wait for the 24-hour window to lapse, or delete the lock record under `/rateLimits/` in the Firestore console.

### 4. Service License Lock Engaged
- **Cause**: The timestamp in `/systemSettings/serviceLicense` has passed `expiresAt` with `enabled: true`.
- **Solution**: Sign in with an account holding the `superAdmin: true` custom claim to trigger the 24-hour Emergency Unlock or update the license validity.

---

## 16. Current Status & System Limitations

| Component | Status | Production Deployment State |
| :--- | :---: | :--- |
| **Frontend UI & Pages** | Fully Implemented | Deployed at `sail-miom-elect.web.app` |
| **Chief Admin Role & Modal** | Fully Implemented & Tested | Code committed on `main`; requires Hosting deploy if updating live site |
| **Complaint Categories** | 4 Electrical Categories | Active in codebase |
| **Firestore Security Rules** | Fully Implemented | Configured in `firestore.rules`; deploy via `firebase deploy --only firestore:rules` |
| **Cloud Functions** | Fully Implemented | Configured in `functions/`; requires Firebase Blaze plan for deployment |
| **Secondary Express API** | Fully Implemented (33/33 Tests) | Standalone local/optional server; not required for Firebase Hosting |

---

## 17. Contribution & Development Guidelines

1. **Branching Strategy**:
   - `main`: Production-ready branch. All commits must pass `npm test`, `npm run build`, and `backend` tests.
   - Feature branches: `feature/<feature-name>` for substantial enhancements.
2. **Pre-Commit Checklist**:
   - Run `npm test` in root.
   - Run `npm run build` in root.
   - Run `cd backend && npm test` if backend files were modified.
   - Verify that no credentials, tokens, or private key files are staged (`git status`).
3. **Commit Messages**: Follow standard conventional commit format (`docs:`, `fix:`, `feat:`, `refactor:`).

---

## 18. License & Project Ownership

**Copyright © 2026 Steel Authority of India Limited (SAIL). All rights reserved.**

This application and its associated source code are proprietary to the **Electrical Maintenance Department (CMLO), Meghahatuburu Iron Ore Mine (MIOM), SAIL**. Unauthorized reproduction, copying, distribution, or commercial exploitation is strictly prohibited without written authorization from the SAIL-MIOM Administration.
