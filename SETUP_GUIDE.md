# IT Complaint Management System - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Configuration

Create a `.env` file in the root directory with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Firebase Console Setup

#### Enable Authentication:
1. Go to Firebase Console → Authentication
2. Enable "Email/Password" sign-in method

#### Create Firestore Database:
1. Go to Firebase Console → Firestore Database
2. Create database in production mode
3. Set up security rules (see below)

#### Create Collections:
The following collections will be created automatically:
- `users` - User profiles with roles
- `complaints` - Complaint submissions
- `notifications` - User notifications

### 4. Create Admin User

**IMPORTANT:** You must manually create the admin user in Firebase Console first:

#### Step 1: Create Admin in Firebase Authentication
1. Go to Firebase Console → Authentication → Users
2. Click "Add User"
3. Email: `admin123@gmail.com`
4. Password: `admin123`
5. Click "Add User"

#### Step 2: Add Admin Role in Firestore
1. Go to Firebase Console → Firestore Database
2. Click "Start Collection"
3. Collection ID: `users`
4. Document ID: Copy the UID from the user you just created in Authentication
5. Add fields:
   ```
   email: admin123@gmail.com (string)
   role: admin (string)
   displayName: Admin (string)
   createdAt: [current timestamp] (string)
   ```
6. Save the document

### 5. Firestore Security Rules

Replace your Firestore security rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user is moderator
    function isModerator() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'moderator';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin() || request.auth.uid == userId;
      allow delete: if isAdmin();
    }
    
    // Complaints collection
    match /complaints/{complaintId} {
      allow read: if isAuthenticated();
      allow create: if true; // Anyone can file a complaint
      allow update: if isAdmin() || isModerator();
      allow delete: if isAdmin();
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && 
                     resource.data.userEmail == request.auth.token.email;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
                       resource.data.userEmail == request.auth.token.email;
      allow delete: if isAdmin();
    }
  }
}
```

### 6. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 👥 User Roles & Access

### Admin Account
- **Email:** admin123@gmail.com
- **Password:** admin123
- **Access:**
  - View all complaints
  - Manage moderators
  - Assign complaints
  - Update complaint status
  - Delete complaints
  - View analytics

### Moderator Account
- Created by admin through the dashboard
- **Access:**
  - View assigned complaints only
  - Update status of assigned complaints
  - Cannot manage other moderators
  - Cannot delete complaints

## 🔐 Login Pages

- **Admin Login:** `/login`
- **Moderator Login:** `/moderator-login`

Both use the same login component but redirect to different dashboards based on role.

## 📋 Features

### Public Access (No Login Required):
- Home page
- File a complaint
- Track complaint (with complaint ID)

### Admin Dashboard (`/dashboard`):
- Real-time statistics
- Complaint management
- Moderator management
- Analytics with charts
- Notification system

### Moderator Dashboard (`/moderator-dashboard`):
- View assigned complaints
- Update complaint status
- Real-time updates
- Notification system

## 🔔 Notification System

Notifications are automatically created when:
- New complaint is filed → Admin receives notification
- Complaint is assigned → Moderator receives notification

## 🎨 Design Features

- **Glassmorphism UI** - Beautiful frosted glass effects
- **Dark Theme** - Eye-friendly dark mode
- **Responsive Design** - Works on all devices
- **Real-time Updates** - Live data with Firebase onSnapshot
- **Smooth Animations** - Framer Motion animations
- **Interactive Charts** - Recharts visualizations

## 🛠️ Troubleshooting

### Cannot Login
1. Verify admin user exists in Firebase Authentication
2. Verify user role exists in Firestore `users` collection
3. Check Firebase security rules are properly configured
4. Check browser console for errors

### Complaints Not Showing
1. Verify Firestore security rules allow read access
2. Check Firebase connection in browser network tab
3. Ensure user is authenticated

### Moderator Cannot See Complaints
1. Verify complaint is assigned to moderator's email
2. Check moderator role in Firestore
3. Verify security rules allow moderator read access

## 📦 Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Backend:** Firebase (Authentication + Firestore)
- **Routing:** React Router

## 🔄 Building for Production

```bash
npm run build
```

Deploy the `dist` folder to Firebase Hosting or any static hosting service.

## 📝 Notes

- All data is stored in Firestore
- Real-time updates using onSnapshot
- No backend server required
- Secure with Firebase security rules
- Mobile-responsive design

## 🆘 Support

If you encounter any issues:
1. Check Firebase Console for errors
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Check browser console for error messages

---

**Enjoy your IT Complaint Management System! 🎉**
