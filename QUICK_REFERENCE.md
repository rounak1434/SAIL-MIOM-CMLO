# 🚀 SAIL-MIOM - Quick Reference Card

## 📋 ADMINISTRATOR QUICK ACTIONS

### Login
- **URL:** `/login`
- **Email:** admin123@gmail.com
- **Password:** admin123

### Create Moderator
1. Dashboard → Moderator Management
2. Click "Create Moderator"
3. Fill: Name, Business Name, Email, Phone, Password
4. Submit

### Assign Complaint
1. Dashboard → View Complaint
2. Select Moderator from Dropdown
3. Click "Assign"

### Add Notes
- **For Moderator:** Use "Admin Notes for Moderator" section
- **For Customer:** Use "Notes for Customer" section

### Manage Moderator
- **Change Password:** Click 🔑 icon
- **Delete Account:** Click 🗑️ icon

---

## 👨‍🔧 MODERATOR QUICK ACTIONS

### Login
- **URL:** `/moderator-login`
- Use credentials provided by admin

### Update Status
1. View assigned complaint
2. Select status: Active/Resolved/Rejected
3. Auto-saves

### Add Notes
- Use "Moderator Notes for Admin" section
- Admin will see your updates

### View Assignments
- Dashboard shows only YOUR assigned complaints
- Cannot see other moderators' work

---

## 📝 CUSTOMER QUICK ACTIONS

### File Complaint
1. **URL:** `/file-complaint`
2. **Required Fields:**
   - Name, Email, Phone
   - Employee ID, Department, Designation
   - Category (dropdown)
   - Title, Description
3. **Optional:** Priority, Image
4. **Save the Complaint ID!**

### Track Complaint
1. **URL:** `/track-complaint`
2. Enter Complaint ID
3. View status, timeline, and notes

---

## 📊 STATUS MEANINGS

| Status | Color | Meaning |
|--------|-------|---------|
| **Pending** | 🟧 Orange | Awaiting assignment |
| **Assigned** | 🔵 Blue | Assigned to moderator |
| **Active** | 🟣 Purple | Being worked on |
| **Resolved** | 🟢 Green | Issue fixed |
| **Rejected** | 🔴 Red | Cannot be resolved |

---

## 🗂️ CATEGORY OPTIONS

1. **Computer Complaint** - PC, laptop, hardware issues
2. **CCTV Complaint** - Camera, surveillance issues
3. **Network Complaint** - Internet, connectivity issues
4. **Others** - General IT issues

---

## 🔔 NOTIFICATION TRIGGERS

- 📬 New complaint filed → Admin notified
- 👤 Complaint assigned → Moderator notified
- 🔄 Status updated → Relevant parties notified

---

## 📝 NOTES SYSTEM

| Note Type | Who Adds | Who Sees | Color |
|-----------|----------|----------|-------|
| Admin → Moderator | Admin | Admin + Moderator | Blue |
| Moderator → Admin | Moderator | Admin + Moderator | Purple |
| Admin → Customer | Admin | Everyone | Green |

---

## 🏠 PUBLIC FEATURES (No Login Required)

- ✅ View live statistics on home page
- ✅ File new complaints
- ✅ Track complaints by ID
- ✅ View FAQ and features

---

## 🔐 ROLE PERMISSIONS

### Admin CAN:
- ✅ View ALL complaints
- ✅ Create/delete moderators
- ✅ Assign complaints
- ✅ Update any status
- ✅ Delete complaints
- ✅ Add all types of notes
- ✅ Change moderator passwords

### Moderator CAN:
- ✅ View assigned complaints only
- ✅ Update status (active/resolved/rejected)
- ✅ Add notes for admin
- ✅ View admin notes for them

### Moderator CANNOT:
- ❌ See all complaints
- ❌ Delete complaints
- ❌ Create other moderators
- ❌ Assign complaints
- ❌ Add customer notes

---

## 🎨 UI COLOR CODE

- **Blue** → Primary actions, admin features
- **Purple** → Moderator features
- **Green** → Success, resolved
- **Orange** → Pending, warning
- **Red** → Rejected, delete

---

## 📱 ROUTES CHEAT SHEET

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Home with live stats |
| `/file-complaint` | Public | Submit new complaint |
| `/track-complaint` | Public | Track by ID |
| `/login` | Public | Admin login |
| `/moderator-login` | Public | Moderator login |
| `/dashboard` | Admin | Admin dashboard |
| `/moderators` | Admin | Moderator management |
| `/moderator-dashboard` | Moderator | Moderator dashboard |

---

## 🚨 IMPORTANT REMINDERS

### For Everyone:
- 💾 **Save Complaint ID** after filing
- 🔄 **Page updates in real-time** - no refresh needed
- 📧 **Email must be valid** for notifications

### For Admins:
- 🔑 **Change default admin password** after first login
- 👥 **Assign complaints promptly** for faster resolution
- 📝 **Add customer notes** to keep them informed

### For Moderators:
- 📊 **Update status regularly**
- 💬 **Add detailed notes** for admin
- ✅ **Mark resolved only when fixed**

---

## 🛠️ FIREBASE REQUIREMENTS

### Collections Needed:
1. `users` - User accounts and roles
2. `complaints` - All complaint data
3. `notifications` - Notification system

### Storage:
- Enable Firebase Storage for image uploads
- Path: `/complaint-images/`

### Authentication:
- Enable Email/Password authentication
- Create admin user manually

---

## 📊 STATISTICS LOCATIONS

1. **Home Page** - Public live statistics (all 6 statuses)
2. **Admin Dashboard** - Complete overview + charts
3. **Moderator Dashboard** - Assigned complaints only

---

## ⚡ QUICK TIPS

### Speed Up Resolution:
- 📷 Upload images with complaints
- ✅ Provide detailed descriptions
- 🎯 Select correct category
- 📝 Include employee ID and department

### Better Communication:
- 💬 Use notes frequently
- 🔔 Check notifications regularly
- 📊 Monitor dashboard daily

### System Maintenance:
- 🔄 Regular backups of Firestore
- 🔐 Strong passwords for moderators
- 📋 Regular complaint review

---

## 🎯 ONE-PAGE WORKFLOW

```
CUSTOMER                ADMIN                   MODERATOR
   │                      │                         │
   │ 1. File Complaint    │                         │
   │─────────────────────>│                         │
   │                      │                         │
   │                      │ 2. Assign to Moderator  │
   │                      │────────────────────────>│
   │                      │                         │
   │                      │                         │ 3. Update Status
   │                      │                         │    Add Notes
   │                      │<────────────────────────│
   │                      │                         │
   │                      │ 4. Add Customer Notes   │
   │                      │                         │
   │ 5. Track & View      │                         │
   │<─────────────────────│                         │
   │    Updates           │                         │
```

---

## 📞 EMERGENCY CONTACTS

- **System Admin:** Check Firebase Console
- **Technical Support:** Review logs in browser console
- **Firestore Issues:** Check Firebase status page

---

**Print this card for quick reference! 🖨️**
