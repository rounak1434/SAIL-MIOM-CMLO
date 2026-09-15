# Firebase Quick Deployment Reference

## ⚡ Quick Start (3 Steps)

```bash
# 1. Login (only first time)
firebase login

# 2. Deploy Firestore Rules
firebase deploy --only firestore:rules

# 3. Deploy Everything
firebase deploy
```

## 📁 Files Created

| File | Purpose | Status |
|------|---------|--------|
| `firebase.json` | Firebase config | ✅ Created |
| `.firebaserc` | Project ID | ✅ Created |
| `firestore.rules` | Security rules | ✅ Created |
| `firestore.indexes.json` | Database indexes | ✅ Created |

## 🔐 Project Info

- **Project ID:** `complaint-management-sys-1266f`
- **Auth Domain:** `complaint-management-sys-1266f.firebaseapp.com`
- **Project URL:** `https://console.firebase.google.com/project/complaint-management-sys-1266f`

## 🛡️ Security Rules Summary

### Admin
- ✅ Full access to everything
- ✅ Can manage users, complaints, moderators
- ✅ Can read/write all collections

### Moderator
- ✅ Can read assigned complaints only
- ✅ Can update status and notes on assigned complaints
- ❌ Cannot access admin dashboard
- ❌ Cannot manage users

### User
- ✅ Can create complaints
- ✅ Can read own complaints
- ❌ Cannot access dashboards
- ❌ Cannot modify other users' data

## 🚀 Deployment Commands

### Deploy Rules Only
```bash
firebase deploy --only firestore:rules
```

### Deploy Indexes Only
```bash
firebase deploy --only firestore:indexes
```

### Deploy Hosting Only
```bash
npm run build
firebase deploy --only hosting
```

### Deploy Everything
```bash
npm run build
firebase deploy
```

## ✅ Pre-Deployment Checklist

- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged in (`firebase login`)
- [ ] Project ID correct in `.firebaserc`
- [ ] Firestore rules tested locally
- [ ] App builds successfully (`npm run build`)
- [ ] User roles set correctly in Firestore

## 🔍 Verify Deployment

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `complaint-management-sys-1266f`
3. Navigate to **Firestore Database** → **Rules**
4. Verify rules are updated
5. Test with different user roles

## 🐛 Troubleshooting

### Permission Denied Errors
```bash
# Re-deploy rules
firebase deploy --only firestore:rules
```

### Wrong Project
```bash
# Set correct project
firebase use complaint-management-sys-1266f
```

### Not Logged In
```bash
firebase login
```

### Build Fails
```bash
npm install
npm run build
```

## 📊 Testing Matrix

| User Role | Login | Dashboard | Create Complaint | View All |
|-----------|-------|-----------|------------------|----------|
| **Admin** | ✅ | ✅ Full | ✅ | ✅ All |
| **Moderator** | ✅ | ✅ Limited | ✅ | ❌ Assigned only |
| **User** | ✅ | ❌ No | ✅ | ❌ Own only |

## 🔑 Key Points

⚠️ **ALWAYS deploy rules after updating**
✅ **3-layer security: UI → Service → Firestore**
✅ **Roles cannot be spoofed**
✅ **Permission errors handled gracefully**
✅ **No infinite loading issues**

## 📞 Need Help?

1. Check `FIREBASE_SETUP_GUIDE.md` for detailed instructions
2. Check Firebase Console for error logs
3. Review browser console for client-side errors
4. Verify user roles in Firestore database
