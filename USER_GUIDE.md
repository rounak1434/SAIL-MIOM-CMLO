# 📘 SAIL-MIOM IT Complaint Management System - User Guide

## 🚀 Quick Start Guide

---

## 1️⃣ **SETUP & INSTALLATION**

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Firebase
Create `.env` file in root directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Step 3: Create Admin Account in Firebase

1. Go to Firebase Console → Authentication
2. Add user manually:
   - Email: `admin123@gmail.com`
   - Password: `admin123`
3. Go to Firestore Database
4. Create collection `users`
5. Add document with ID matching the user UID:
```javascript
{
  email: "admin123@gmail.com",
  role: "admin",
  name: "System Administrator",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

### Step 4: Run the Application
```bash
npm run dev
```

Visit: `http://localhost:5173`

---

## 2️⃣ **FOR CUSTOMERS (Public Users)**

### 📝 Filing a Complaint

1. Go to the **Home Page** (`/`)
2. Click **"File a Complaint"** button
3. Fill in ALL required fields:
   - **Name:** Your full name
   - **Email:** Your email address
   - **Phone Number:** Contact number
   - **Employee ID / Staff ID:** Your employee/staff ID
   - **Department:** Your department
   - **Designation:** Your job title/designation
   - **Category:** Select from dropdown (Computer/CCTV/Network/Others)
   - **Complaint Title:** Brief title of the issue
   - **Description:** Detailed description of the problem
   - **Priority:** (Optional) Low/Medium/High
   - **Image:** (Optional) Upload screenshot or photo of the issue

4. Click **"Submit Complaint"**
5. You'll receive a **Complaint ID** - **SAVE THIS!**

### 🔍 Tracking Your Complaint

1. Go to **"Track Complaint"** (`/track-complaint`)
2. Enter your **Complaint ID**
3. Click **"Track Complaint"**
4. View:
   - Current status
   - Timeline of updates
   - Admin notes (if any)
   - Resolution details

---

## 3️⃣ **FOR ADMINISTRATORS**

### 🔐 Admin Login

1. Click **"Admin Login"** in navbar
2. Enter credentials:
   - Email: `admin123@gmail.com`
   - Password: `admin123`
3. You'll be redirected to **Admin Dashboard**

### 📊 Admin Dashboard Overview

**Statistics Cards:**
- Total Complaints
- Pending
- Assigned
- Active
- Resolved
- Rejected

**Charts:**
- Bar Chart showing status distribution
- Pie Chart showing percentage breakdown

### 👥 Creating Moderator Accounts

1. Go to **"Moderator Management"** (in sidebar or `/moderators`)
2. Click **"Create Moderator"** button
3. Fill in the form:
   - **Name:** Moderator's full name
   - **Business Name:** Department or business unit
   - **Email:** Moderator's email (must be unique)
   - **Phone Number:** Contact number
   - **Password:** Login password (minimum 6 characters)
4. Click **"Create Moderator Account"**
5. Success message will appear

### 🔑 Managing Moderator Passwords

1. In Moderator Management, find the moderator
2. Click the **🔑 Change Password** icon
3. Enter new password (min 6 characters)
4. Click **"Change Password"**
5. Moderator will be notified

### 🗑️ Deleting Moderator Accounts

1. Find the moderator in the list
2. Click the **🗑️ Delete** icon
3. Confirm deletion
4. Account will be permanently removed

### 📋 Managing Complaints

#### Viewing All Complaints
- Admin can see **ALL complaints** in the system
- Filter by status using tabs

#### Assigning Complaints to Moderators
1. Find the complaint in the list
2. Click on the complaint to view details
3. In the "Assign to Moderator" dropdown:
   - Select a moderator from the list
   - Shows moderator name and email
4. Click **"Assign"**
5. Status automatically changes to "assigned"
6. Moderator receives notification

#### Updating Complaint Status
1. Open complaint details
2. Select new status from dropdown:
   - Pending
   - Assigned
   - Active
   - Resolved
   - Rejected
3. Status updates immediately

#### Adding Notes

**For Moderators (Internal):**
1. Scroll to "Admin Notes for Moderator" section
2. Type your note
3. Click **"Add Note"**
4. Only admin and assigned moderator can see these

**For Customers (Public):**
1. Scroll to "Notes for Customer" section
2. Type your note
3. Click **"Add Note"**
4. Customers can see these when tracking

#### Deleting Complaints
1. Open complaint details
2. Click **"Delete Complaint"** button
3. Confirm deletion
4. Complaint is permanently removed

---

## 4️⃣ **FOR MODERATORS**

### 🔐 Moderator Login

1. Click **"Moderator Login"** in navbar
2. Enter your credentials (provided by admin)
3. You'll be redirected to **Moderator Dashboard**

### 📊 Moderator Dashboard Overview

**Statistics (Your Assigned Complaints Only):**
- Total Assigned
- Active
- Resolved
- Rejected

**Limitations:**
- ❌ Cannot see ALL complaints (only assigned to you)
- ❌ Cannot delete complaints
- ❌ Cannot assign complaints to others
- ❌ Cannot access moderator management

### ✅ What Moderators CAN Do

#### View Assigned Complaints
- See only complaints assigned by admin
- View all details and history
- Search within your assigned complaints

#### Update Complaint Status
1. Open assigned complaint
2. Change status to:
   - **Active** - You're working on it
   - **Resolved** - Issue fixed
   - **Rejected** - Cannot be resolved
3. Status updates immediately

#### Leave Notes for Admin
1. Open complaint details
2. Find "Moderator Notes for Admin" section
3. Type your update/question
4. Click **"Add Note"**
5. Only admin can see these notes

#### View Admin Instructions
- Read notes left by admin in "Admin Notes for Moderator"
- Follow instructions and guidelines
- Update progress accordingly

---

## 5️⃣ **LIVE STATISTICS (Public)**

### 🏠 Home Page Statistics

**Real-time complaint statistics visible to everyone:**

1. **Total Complaints** - All complaints in system
2. **Pending** - Awaiting assignment
3. **Assigned** - Assigned to moderators
4. **Active** - Being worked on
5. **Resolved** - Successfully fixed
6. **Rejected** - Cannot be resolved

**Features:**
- ✅ Updates in real-time (no refresh needed)
- ✅ Color-coded for easy identification
- ✅ Animated statistics
- ✅ Glassmorphism design

---

## 6️⃣ **NOTIFICATION SYSTEM**

### 🔔 Bell Icon (Top Right)

**Admin & Moderators can:**
- See notification count (red badge)
- Click bell to view notifications
- Mark notifications as read

**Notifications are sent when:**
- New complaint is filed → Admin notified
- Complaint is assigned → Moderator notified
- Status is updated → Relevant parties notified

---

## 7️⃣ **NOTES SYSTEM EXPLAINED**

### 📝 Three Types of Notes

#### 1. Admin Notes for Moderators (Internal)
- **Who can add:** Admin only
- **Who can see:** Admin + Assigned Moderator
- **Purpose:** Internal instructions, guidelines
- **Example:** "Check network cables first"

#### 2. Moderator Notes for Admin (Internal)
- **Who can add:** Moderators only
- **Who can see:** Admin + That Moderator
- **Purpose:** Progress updates, questions
- **Example:** "Replaced network card, testing now"

#### 3. Notes for Customers (Public)
- **Who can add:** Admin only
- **Who can see:** Everyone (customer can see when tracking)
- **Purpose:** Updates for customer
- **Example:** "Your issue has been resolved. Please check."

### 🎨 Visual Indicators
- **Blue background** - Admin notes
- **Purple background** - Moderator notes
- **Green background** - Customer notes
- **Timestamp** - When note was added
- **Author name** - Who added the note

---

## 8️⃣ **COMPLAINT WORKFLOW**

### 📊 Complete Lifecycle

```
1. CUSTOMER FILES COMPLAINT
   ↓
2. Status: PENDING (visible to admin)
   ↓
3. ADMIN ASSIGNS TO MODERATOR
   ↓
4. Status: ASSIGNED (moderator notified)
   ↓
5. MODERATOR UPDATES TO ACTIVE
   ↓
6. Status: ACTIVE (work in progress)
   ↓
7. MODERATOR ADDS NOTES FOR ADMIN
   ↓
8. ADMIN ADDS NOTES FOR CUSTOMER
   ↓
9. MODERATOR MARKS AS RESOLVED/REJECTED
   ↓
10. Status: RESOLVED or REJECTED
    ↓
11. CUSTOMER SEES RESOLUTION WHEN TRACKING
```

---

## 9️⃣ **TROUBLESHOOTING**

### Cannot Login
- ✅ Check email/password spelling
- ✅ Ensure user exists in Firebase Authentication
- ✅ Verify role is set in Firestore `users` collection
- ✅ Clear browser cache and try again

### Image Upload Fails
- ✅ Check file size (should be reasonable)
- ✅ Ensure file is image format (JPG, PNG)
- ✅ Check Firebase Storage rules
- ✅ Verify storage bucket is configured in `.env`

### Real-time Updates Not Working
- ✅ Check internet connection
- ✅ Verify Firebase Firestore rules allow reads
- ✅ Refresh the page
- ✅ Check browser console for errors

### Moderator Can't See Complaints
- ✅ Ensure admin has assigned complaints to them
- ✅ Check if logged in with correct moderator account
- ✅ Verify moderator role in Firestore

### Statistics Not Updating
- ✅ Check Firebase connection
- ✅ Verify Firestore rules allow reads on `complaints` collection
- ✅ Refresh browser
- ✅ Check Network tab in browser DevTools

---

## 🔟 **BEST PRACTICES**

### For Admins:
1. ✅ Create moderators with clear business names (departments)
2. ✅ Assign complaints based on category/expertise
3. ✅ Add detailed notes for moderators
4. ✅ Keep customers updated with public notes
5. ✅ Regularly check pending complaints
6. ✅ Monitor moderator performance

### For Moderators:
1. ✅ Check dashboard daily for new assignments
2. ✅ Update status promptly (pending → active → resolved)
3. ✅ Add detailed notes about work done
4. ✅ Ask admin if you need clarification
5. ✅ Mark resolved only when truly fixed
6. ✅ Use rejected sparingly with explanation

### For Customers:
1. ✅ Provide detailed descriptions
2. ✅ Upload clear images of the issue
3. ✅ Save your Complaint ID
4. ✅ Track regularly for updates
5. ✅ Include all relevant information (employee ID, department, etc.)
6. ✅ Select correct category for faster resolution

---

## 📞 **SUPPORT**

### Need Help?
- Check FAQ section on home page
- Contact system administrator
- Review this user guide
- Check Firebase Console for data verification

---

## 🎉 **SYSTEM READY TO USE!**

Your SAIL-MIOM IT Complaint Management System is fully configured and ready for production use. All features are working, and the system is optimized for performance.

**Happy Complaint Managing! 🚀**
