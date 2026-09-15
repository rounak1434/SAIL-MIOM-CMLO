# Firebase Setup & Deployment Guide

## Project Configuration
- **Project ID:** complaint-management-sys-1266f
- **Authentication:** Firebase Auth
- **Database:** Firestore
- **Storage:** ImgBB (not Firebase Storage)

## Files Created/Fixed

### 1. firebase.json
✅ Firestore rules configuration
✅ Hosting configuration for SPA
✅ Proper file paths

### 2. .firebaserc
✅ Project ID configured
✅ Default project set

### 3. firestore.rules
✅ Role-based access control (admin, moderator, user)
✅ Secure helper functions
✅ Proper read/write restrictions
✅ No permission spoofing possible

### 4. firestore.indexes.json
✅ Empty default structure
✅ Ready for custom indexes if needed

### 5. AuthContext.tsx
✅ Enhanced error handling for permission denied
✅ Prevents infinite loading
✅ Proper role validation

## Deployment Steps

### Step 1: Install Firebase CLI (if not installed)
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Step 4: Deploy Firestore Indexes (if needed)
```bash
firebase deploy --only firestore:indexes
```

### Step 5: Build Your App
```bash
npm run build
```

### Step 6: Deploy Hosting (Optional)
```bash
firebase deploy --only hosting
```

### Deploy Everything at Once
```bash
firebase deploy
```

## Firestore Rules Summary

### Users Collection (`/users/{userId}`)
| Operation | Admin | Moderator | User |
|-----------|-------|-----------|------|
| Read all users | ✅ | ❌ | ❌ |
| Read own user | ✅ | ✅ | ✅ |
| Create own user | ✅ | ✅ | ✅ |
| Update any user | ✅ | ❌ | ❌ |
| Update own user | ✅ | ✅ | ✅ (no role change) |
| Delete user | ✅ | ❌ | ❌ |

### Complaints Collection (`/complaints/{complaintId}`)
| Operation | Admin | Moderator | User |
|-----------|-------|-----------|------|
| Read all complaints | ✅ | ❌ | ❌ |
| Read assigned complaints | ✅ | ✅ | ❌ |
| Read own complaints | ✅ | ✅ | ✅ |
| Create complaint | ✅ | ✅ | ✅ |
| Update any complaint | ✅ | ❌ | ❌ |
| Update assigned complaint | ✅ | ✅ (limited fields) | ❌ |
| Delete complaint | ✅ | ❌ | ❌ |

### Notifications Collection (`/notifications/{notificationId}`)
| Operation | Admin | Moderator | User |
|-----------|-------|-----------|------|
| Read own notifications | ✅ | ✅ | ✅ |
| Create notification | ✅ | ✅ | ✅ |
| Update own notification | ✅ | ✅ | ✅ (mark as read only) |
| Delete own notification | ✅ | ✅ | ✅ |

## Security Features

### 1. Role Validation
- Roles stored in Firestore `/users/{uid}`
- Cannot be changed by non-admin users
- Validated on every request

### 2. Helper Functions
```javascript
getUserRole() - Fetches user role
isAdmin() - Checks if admin
isModerator() - Checks if moderator
isUserBlocked() - Checks if blocked
isAuthenticated() - Checks authentication
```

### 3. Field-Level Security
- Moderators can only update specific fields
- Users cannot change their role
- Blocked users cannot create complaints

### 4. Default Deny
- All other collections denied by default
- Explicit allow rules only

## Testing Your Setup

### Test 1: Admin Access
```bash
1. Login as admin
2. Navigate to /dashboard
3. Expected: Full access to all features
4. Check console: No permission errors
```

### Test 2: Moderator Access
```bash
1. Login as moderator
2. Navigate to /moderator-dashboard
3. Expected: Can see assigned complaints only
4. Try /dashboard: Redirected to /moderator-dashboard
```

### Test 3: User Access
```bash
1. Login as user
2. Navigate to /file-complaint
3. Expected: Can create complaints
4. Try /dashboard: Redirected to /
```

### Test 4: Permission Denied Handling
```bash
1. Login as non-admin
2. Try to access admin features
3. Expected: Proper error messages
4. Expected: No infinite loading
```

## Common Issues & Fixes

### Issue 1: Permission Denied Errors
**Cause:** Firestore rules not deployed
**Fix:** 
```bash
firebase deploy --only firestore:rules
```

### Issue 2: Infinite Loading
**Cause:** Error not caught in finally block
**Fix:** Already fixed in AuthContext.tsx

### Issue 3: Role Not Loading
**Cause:** User document doesn't exist
**Fix:** Auto-created in AuthContext

### Issue 4: Cannot Deploy
**Cause:** Not logged in or wrong project
**Fix:**
```bash
firebase login
firebase use complaint-management-sys-1266f
```

## Firestore Indexes

Currently no custom indexes are required. If you add complex queries, update `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "complaints",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy:
```bash
firebase deploy --only firestore:indexes
```

## Security Best Practices

✅ **Always validate roles server-side (Firestore rules)**
✅ **Never trust client-side role checks alone**
✅ **Use helper functions for cleaner rules**
✅ **Deny by default, allow explicitly**
✅ **Prevent role spoofing with field restrictions**
✅ **Handle permission errors gracefully in UI**
✅ **Log security events for debugging**

## Next Steps

1. Deploy Firestore rules immediately
2. Test all user roles
3. Monitor Firestore console for permission errors
4. Add custom indexes if needed for complex queries
5. Set up Firestore security rules monitoring

## Support

If you encounter issues:
1. Check Firebase Console → Firestore → Rules
2. Check Firebase Console → Firestore → Indexes
3. Review browser console for errors
4. Verify user roles in Firestore database
5. Re-deploy rules if needed
