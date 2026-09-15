# 🎯 QUICK REFERENCE CARD

## 🔑 DEFAULT LOGIN CREDENTIALS

### Admin Login
- **URL:** `/login`
- **Email:** admin123@gmail.com
- **Password:** admin123

### Moderator Login
- **URL:** `/moderator-login`
- **Email:** (Created by admin)
- **Password:** (Set by admin)

---

## 📊 THREE NOTE TYPES

| Note Type | Color | Who Adds | Who Sees | Public? |
|-----------|-------|----------|----------|---------|
| **Admin → Moderator** | 🔵 Blue | Admin | Admin + Assigned Moderator | ❌ No |
| **Moderator → Admin** | 🟣 Purple | Moderator | Admin + That Moderator | ❌ No |
| **For Customers** | 🟢 Green | Admin | Everyone + Track Page | ✅ Yes |

---

## 🔐 ACCESS CONTROL

### Admin Can:
- ✅ Create moderators (Name, Business, Email, Phone, Password)
- ✅ Delete moderators
- ✅ Change moderator passwords
- ✅ See ALL complaints
- ✅ Assign complaints to moderators
- ✅ Add all three types of notes
- ✅ Update any status
- ✅ Delete any complaint

### Moderator Can:
- ✅ See ONLY assigned complaints
- ✅ Update status (Active/Resolved/Rejected)
- ✅ Add notes for admin
- ✅ View admin notes
- ❌ Cannot delete complaints
- ❌ Cannot see unassigned work
- ❌ Cannot assign to others

### Public Can:
- ✅ File complaints
- ✅ Track by ID
- ✅ View live statistics
- ✅ See customer notes

---

## 📱 MAIN ROUTES

| Route | Access | Page |
|-------|--------|------|
| `/` | Public | Home with live stats |
| `/file-complaint` | Public | Submit complaint |
| `/track-complaint` | Public | Track by ID |
| `/login` | Public | Admin login |
| `/moderator-login` | Public | Moderator login |
| `/dashboard` | Admin | Admin dashboard |
| `/moderator-dashboard` | Moderator | Moderator dashboard |
| `/moderators` | Admin | Manage moderators |

---

## 📋 COMPLAINT STATUSES

1. 🟠 **Pending** - Just submitted
2. 🔵 **Assigned** - Given to moderator
3. 🟣 **Active** - Being worked on
4. 🟢 **Resolved** - Issue fixed
5. 🔴 **Rejected** - Not valid/duplicate

---

## 🎨 PASSWORD VISIBILITY

All password fields have show/hide icons:
- 👁️ **Eye icon** = Show password
- 👁️‍🗨️ **Eye-slash icon** = Hide password

Found in:
- Login page
- Create moderator form
- Change password modal

---

## ⚡ QUICK ACTIONS

### To Create a Moderator:
1. Login as admin
2. Go to `/moderators`
3. Click "Create New Moderator"
4. Fill: Name, Business, Email, Phone, Password
5. Click "Create Moderator Account"

### To Assign a Complaint:
1. Login as admin
2. Go to `/dashboard`
3. Click on a complaint
4. Select moderator from dropdown
5. Status auto-changes to "assigned"

### To Add a Note:
1. Open complaint details
2. Scroll to appropriate note section:
   - 🔵 Blue = Internal to moderator
   - 🟣 Purple = From moderator (if you're mod)
   - 🟢 Green = Public for customer
3. Type message and click "Add Note"

### To Change Moderator Password:
1. Go to `/moderators`
2. Find the moderator card
3. Click purple key icon 🔑
4. Enter new password
5. Click "Change Password"

### To Delete Moderator:
1. Go to `/moderators`
2. Find the moderator card
3. Click red delete button 🗑️
4. Confirm deletion

---

## 🔔 NOTIFICATIONS

Bell icon in navbar shows:
- New complaints assigned
- Status updates
- New notes
- System alerts

Click bell to view all notifications.

---

## 📊 LIVE STATISTICS

Home page shows real-time counts:
- Total complaints
- Pending
- Assigned
- Active
- Resolved
- Rejected

Updates automatically without refresh.

---

## 🚀 BUILD COMMANDS

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🎯 KEY FEATURES

1. ✅ Password show/hide toggles
2. ✅ Three separate note systems
3. ✅ Moderator management (create/delete/change password)
4. ✅ Role-based access control
5. ✅ Real-time updates
6. ✅ Live statistics
7. ✅ Manual complaint assignment
8. ✅ Glassmorphism UI
9. ✅ Image uploads
10. ✅ Mobile responsive

---

## 💡 TIPS

- **Moderators** can only see complaints assigned to them
- **Admin** sees everything in the system
- **Internal notes** (Blue & Purple) are never visible to customers
- **Customer notes** (Green) appear in Track Complaint page
- All updates happen in **real-time** - no refresh needed
- Password must be **minimum 6 characters**
- Images are uploaded to **Firebase Storage**
- Statistics update **instantly** on the home page

---

## 📞 SUPPORT

For help, check these documents:
- `README.md` - Full documentation
- `USER_GUIDE.md` - Step-by-step guide
- `NOTES_SYSTEM_GUIDE.md` - Notes explained
- `QUICK_START.md` - Setup instructions

---

## ✅ CHECKLIST

Before going live:
- [ ] Firebase project created
- [ ] Authentication enabled
- [ ] Firestore database created
- [ ] Storage enabled
- [ ] Environment variables configured
- [ ] Admin user created
- [ ] Security rules deployed
- [ ] Project builds successfully
- [ ] All features tested

---

**Your complete IT Complaint Management System is ready to use!** 🎉
