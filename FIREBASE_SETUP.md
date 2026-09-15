# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "SAIL-MIOM Complaint System"
4. Follow the setup wizard

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get Started"
3. Enable **Email/Password** authentication method

## Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select your region

## Step 4: Configure Firebase in Your App

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" and click the **Web** icon (</>)
3. Register your app with a nickname
4. Copy the `firebaseConfig` object
5. Replace the configuration in `src/services/firebase.ts`

Example:
```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Create Admin User

### Option 1: Using Firebase Console
1. Go to **Authentication** > **Users**
2. Click "Add user"
3. Email: `admin123@gmail.com`
4. Password: `admin123`
5. Click "Add user"

### Option 2: Programmatically (Recommended)
Run this script once to create the admin user:

```javascript
// Create admin user script
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './src/services/firebase';

async function createAdmin() {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'admin123@gmail.com', 
      'admin123'
    );
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: 'admin123@gmail.com',
      role: 'admin',
      displayName: 'Administrator',
      createdAt: new Date().toISOString()
    });
    
    console.log('Admin user created successfully!');
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();
```

## Step 6: Firestore Security Rules

Update your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - only authenticated users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Complaints collection
    match /complaints/{complaintId} {
      allow read: if request.auth != null;
      allow create: if true; // Anyone can create a complaint
      allow update: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'moderator'];
      allow delete: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if request.auth != null && 
                    resource.data.userEmail == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.email;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
  }
}
```

## Step 7: Test the Setup

1. Run `npm run dev`
2. Navigate to `/login`
3. Login with:
   - Email: `admin123@gmail.com`
   - Password: `admin123`
4. You should be redirected to the dashboard

## Collections Structure

### users
```json
{
  "email": "admin123@gmail.com",
  "role": "admin" | "moderator",
  "displayName": "Administrator",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### complaints
```json
{
  "title": "Computer not starting",
  "description": "Detailed description...",
  "status": "pending" | "active" | "resolved" | "rejected",
  "priority": "low" | "medium" | "high" | "critical",
  "category": "Hardware Issue",
  "assignedTo": "moderator@example.com",
  "trackingId": "SAIL-12345678",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### notifications
```json
{
  "message": "New complaint filed",
  "type": "new_complaint" | "assignment" | "status_update" | "info",
  "userEmail": "admin123@gmail.com",
  "read": false,
  "complaintId": "complaint_doc_id",
  "createdAt": "Timestamp"
}
```

## Troubleshooting

### Issue: "Firebase: Error (auth/invalid-credential)"
- Make sure you've created the admin user in Firebase Authentication
- Verify the email and password are correct

### Issue: "Missing or insufficient permissions"
- Update your Firestore security rules as shown above
- Make sure the user document exists in the `users` collection

### Issue: "Firebase config not found"
- Double-check your `firebaseConfig` in `src/services/firebase.ts`
- Make sure all keys are correctly copied from Firebase Console

## Environment Variables (Optional)

For production, use environment variables:

1. Create `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

2. Update `src/services/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```
