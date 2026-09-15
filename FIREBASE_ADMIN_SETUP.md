# 🔐 Firebase Admin User Setup Guide

## CRITICAL: Create Admin User First!

Before you can login to the SAIL-MIOM system, you need to manually create the admin user in Firebase.

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### Step 1: Go to Firebase Console

1. Visit: https://console.firebase.google.com/
2. Select your project: **complaint-management-sys-1266f**

---

### Step 2: Enable Email/Password Authentication

1. Click on **Authentication** in the left sidebar
2. Click on **Sign-in method** tab
3. Find **Email/Password** provider
4. Click **Enable**
5. Save changes

---

### Step 3: Create Admin User

1. Still in **Authentication**, click on **Users** tab
2. Click **Add User** button
3. Enter details:
   - **Email:** `admin123@gmail.com`
   - **Password:** `admin123`
4. Click **Add User**
5. **Copy the User UID** (you'll need it in the next step)

Example UID: `a1b2c3d4e5f6g7h8i9j0k1l2`

---

### Step 4: Create Firestore Database

1. Click on **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in production mode** (we'll set rules later)
4. Select your preferred region (closest to you)
5. Click **Enable**

---

### Step 5: Add Admin Role to Firestore

1. In Firestore Database, click **Start collection**
2. Collection ID: `users`
3. Click **Next**
4. Document ID: **Paste the User UID from Step 3**
5. Add fields:

| Field | Type | Value |
|-------|------|-------|
| email | string | admin123@gmail.com |
| role | string | admin |
| name | string | Administrator |
| displayName | string | Administrator |

6. Click **Save**

---

### Step 6: Set Firestore Security Rules

1. In Firestore Database, click on **Rules** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - only authenticated users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Complaints collection
    match /complaints/{complaintId} {
      // Anyone can create complaints
      allow create: if true;
      
      // Only authenticated users can read
      allow read: if request.auth != null;
      
      // Only admin and moderators can update
      allow update: if request.auth != null && 
                       exists(/databases/$(database)/documents/users/$(request.auth.uid));
      
      // Only admin can delete
      allow delete: if request.auth != null && 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

---

## ✅ VERIFICATION

### Test Admin Login:

1. Open your SAIL-MIOM app
2. Click **Admin Login**
3. Enter:
   - Email: `admin123@gmail.com`
   - Password: `admin123`
4. Click **Login**
5. You should be redirected to the Admin Dashboard

---

## 🔧 TROUBLESHOOTING

### "User not authorized" Error

**Problem:** User exists in Authentication but not in Firestore `users` collection

**Solution:**
1. Check Firestore Database
2. Verify `users` collection exists
3. Verify document with user's UID exists
4. Verify `role` field is set to `"admin"`

---

### "Invalid email or password" Error

**Problem:** Credentials don't match or user doesn't exist

**Solution:**
1. Go to Authentication → Users
2. Verify user exists with email `admin123@gmail.com`
3. Try resetting the password in Firebase Console
4. Make sure you're typing the password correctly (no extra spaces)

---

### "auth/user-not-found" Error

**Problem:** User doesn't exist in Firebase Authentication

**Solution:**
1. Go to Authentication → Users
2. Click **Add User**
3. Create user with email `admin123@gmail.com`
4. Then add to Firestore `users` collection

---

## 🎯 QUICK REFERENCE

### Admin Credentials:
```
Email: admin123@gmail.com
Password: admin123
Role: admin
```

### Firebase Project Details:
```
Project ID: complaint-management-sys-1266f
API Key: AIzaSyAQ_tlIUBBWhG4aNt5UR5rseZe1A9S3RuU
Auth Domain: complaint-management-sys-1266f.firebaseapp.com
```

### Firestore Collections:
- `users` - User roles and information
- `complaints` - All complaint data
- `notifications` - System notifications

---

## 🚀 NEXT STEPS

After creating the admin user:

1. ✅ Login to the system
2. ✅ Create moderator accounts through the UI
3. ✅ Test complaint submission
4. ✅ Verify real-time updates work

**Your Firebase backend is now ready to use!** 🎉
