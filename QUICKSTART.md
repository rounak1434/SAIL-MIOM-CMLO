# 🚀 Quick Start Guide

Get up and running with SAIL-MIOM IT Complaint Management System in minutes!

## Prerequisites

- Node.js 18+ installed
- Firebase account (free tier works fine)
- Basic knowledge of React and Firebase

## Step-by-Step Setup

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Name: `SAIL-MIOM` (or any name you prefer)
4. Continue through the wizard (Google Analytics is optional)

### 3️⃣ Enable Firebase Services

**Enable Authentication:**
1. In Firebase Console → **Authentication**
2. Click **"Get Started"**
3. Enable **"Email/Password"** method
4. Click **Save**

**Create Firestore Database:**
1. In Firebase Console → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select your region (closest to you)
5. Click **Enable**

### 4️⃣ Get Firebase Config

1. In Firebase Console → **Project Settings** (gear icon)
2. Scroll to **"Your apps"**
3. Click **Web** icon (`</>`)
4. Register app with nickname: `SAIL-MIOM Web`
5. **Copy the `firebaseConfig` object**

### 5️⃣ Update Firebase Config in Code

Open `src/services/firebase.ts` and replace the config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### 6️⃣ Create Admin User

**Option A: Using Firebase Console (Easiest)**

1. Go to **Authentication** → **Users** tab
2. Click **"Add user"**
3. Email: `admin123@gmail.com`
4. Password: `admin123`
5. Click **"Add user"**

6. Go to **Firestore Database**
7. Click **"Start collection"**
8. Collection ID: `users`
9. Document ID: Copy the UID from Authentication users table
10. Add fields:
   - `email` (string): `admin123@gmail.com`
   - `role` (string): `admin`
   - `displayName` (string): `Administrator`
   - `createdAt` (string): `2024-01-01T00:00:00.000Z`
11. Click **Save**

**Option B: Programmatically (Advanced)**

See `src/scripts/createAdmin.ts` for a script approach.

### 7️⃣ Update Firestore Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Complaints collection
    match /complaints/{complaintId} {
      allow read: if request.auth != null;
      allow create: if true; // Public can create complaints
      allow update: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'moderator'];
      allow delete: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

### 8️⃣ Run the Application

```bash
npm run dev
```

Visit: `http://localhost:5173`

### 9️⃣ Test the Application

1. **Homepage**: You should see the landing page
2. **File Complaint**: Click "File a Complaint" and submit a test complaint
3. **Track Complaint**: Use the tracking ID to track the complaint
4. **Admin Login**: 
   - Click "Admin Login"
   - Email: `admin123@gmail.com`
   - Password: `admin123`
5. **Dashboard**: You should see your test complaint in the dashboard

### 🔟 Create a Moderator (Optional)

1. Login as admin
2. Go to `/moderators` route (or add link in dashboard)
3. Click "Create Moderator"
4. Fill in details:
   - Display Name: `Test Moderator`
   - Email: `moderator1@example.com`
   - Password: `moderator123`
5. Click "Create Moderator"

## ✅ Verification Checklist

- [ ] Firebase project created
- [ ] Authentication enabled
- [ ] Firestore database created
- [ ] Firebase config updated in code
- [ ] Admin user created (both Auth and Firestore)
- [ ] Security rules published
- [ ] Application runs without errors
- [ ] Can file a complaint
- [ ] Can track complaint
- [ ] Can login as admin
- [ ] Dashboard loads with data

## 🎯 Default Login Credentials

**Admin:**
- Email: `admin123@gmail.com`
- Password: `admin123`

## 📋 What You Can Do Now

### As a User (No Login Required)
- ✅ File complaints
- ✅ Track complaints with tracking ID

### As Admin
- ✅ View all complaints in real-time
- ✅ See analytics and charts
- ✅ Update complaint status
- ✅ Assign complaints to moderators
- ✅ Create/delete moderators
- ✅ Delete complaints
- ✅ Receive notifications

### As Moderator
- ✅ View assigned complaints
- ✅ Update complaint status
- ✅ Receive assignment notifications

## 🚨 Common Issues

### Issue: Login shows "Invalid email or password"
**Solution:** Make sure you created the admin user in both:
1. Firebase Authentication (email + password)
2. Firestore `users` collection (with role field)

### Issue: "Missing or insufficient permissions"
**Solution:** Update Firestore security rules as shown in Step 7

### Issue: Complaints not showing in dashboard
**Solution:** 
1. Make sure you're logged in
2. Try filing a test complaint first
3. Check browser console for errors

### Issue: Charts not loading
**Solution:** This is normal if you have no data yet. File some test complaints first.

## 🎨 Customization

### Change Branding
- Logo: Update `SAIL-MIOM` text in `src/components/Navbar.tsx`
- Title: Update in `index.html`
- Colors: Modify `tailwind.config.js`

### Add More Categories
Update categories array in `src/pages/FileComplaint.tsx`:
```typescript
const categories = [
  'Hardware Issue',
  'Software Issue',
  'Network Problem',
  'Your Custom Category', // Add here
];
```

## 📚 Next Steps

1. Read `README.md` for complete documentation
2. Check `FIREBASE_SETUP.md` for detailed Firebase setup
3. Explore the code structure
4. Customize the UI to match your branding
5. Deploy to Firebase Hosting (see Firebase docs)

## 🆘 Need Help?

1. Check the browser console for errors
2. Verify all Firebase services are enabled
3. Make sure Firebase config is correct
4. Review `FIREBASE_SETUP.md` for detailed instructions

## 🎉 You're Ready!

Your IT Complaint Management System is now up and running! Start filing complaints and managing them through the beautiful dashboard.

---

**Tip:** For production use, consider:
- Using environment variables for Firebase config
- Implementing email notifications
- Adding file upload for complaint attachments
- Setting up Firebase Hosting for deployment
- Enabling stricter security rules
