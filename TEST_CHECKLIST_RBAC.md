# Role-Based Access Control - Test Checklist

## Quick Test Guide

### Test 1: Admin Login Flow
```
1. Navigate to /login
2. Enter admin credentials
3. Expected: Redirected to /dashboard
4. Check: URL shows /dashboard
5. Check: Can see admin dashboard content
```

### Test 2: Moderator Login Flow
```
1. Navigate to /moderator-login
2. Enter moderator credentials
3. Expected: Redirected to /moderator-dashboard
4. Check: URL shows /moderator-dashboard
5. Check: Can see moderator dashboard content
```

### Test 3: Cross-Role Access Prevention
```
Admin trying moderator routes:
1. Login as admin
2. Manually navigate to /moderator-dashboard
3. Expected: Redirected to /dashboard
4. Check: Cannot access moderator dashboard

Moderator trying admin routes:
1. Login as moderator
2. Manually navigate to /dashboard
3. Expected: Redirected to /moderator-dashboard
4. Check: Cannot access admin dashboard
```

### Test 4: Wrong Login Page Prevention
```
Moderator on admin login:
1. Navigate to /login (admin login)
2. Enter moderator credentials
3. Expected: Error "Access denied. Admin credentials required."
4. Check: User is signed out automatically
5. Check: Cannot proceed to dashboard

Admin on moderator login:
1. Navigate to /moderator-login
2. Enter admin credentials
3. Expected: Auto-redirected to /dashboard
4. Check: Cannot stay on moderator login page
```

### Test 5: Regular User Access
```
1. Create a user with role='user' in Firestore
2. Try to login via /login
3. Expected: Error "Access denied. Admin credentials required."
4. Try to login via /moderator-login
5. Expected: Error "Access denied. Moderator credentials required."
6. Manually navigate to /dashboard
7. Expected: Redirected to /
8. Manually navigate to /moderator-dashboard
9. Expected: Redirected to /
```

### Test 6: Blocked User Access
```
1. Set user.blocked = true in Firestore
2. Try to access /dashboard
3. Expected: Redirected to /login
4. Try to access /moderator-dashboard
5. Expected: Redirected to /login
```

### Test 7: Navigation Links
```
Admin user:
1. Login as admin
2. Check navbar dashboard link
3. Expected: Links to /dashboard
4. Check mobile menu
5. Expected: Dashboard link goes to /dashboard

Moderator user:
1. Login as moderator
2. Check navbar dashboard link
3. Expected: Links to /moderator-dashboard
4. Check mobile menu
5. Expected: Dashboard link goes to /moderator-dashboard
```

### Test 8: Browser Back Button
```
1. Login as admin
2. Navigate to /dashboard
3. Press browser back button
4. Expected: Should NOT go back to /login
5. Expected: Should stay on /dashboard or go to previous public page
```

### Test 9: Manual URL Access
```
Unauthenticated user:
1. Not logged in
2. Navigate to /dashboard
3. Expected: Redirected to /login
4. Navigate to /moderator-dashboard
5. Expected: Redirected to /login

Authenticated user (wrong role):
1. Login as moderator
2. Navigate to /dashboard
3. Expected: Redirected to /moderator-dashboard
```

### Test 10: Session Persistence
```
1. Login as admin
2. Close browser tab
3. Reopen and navigate to site
4. Expected: Still logged in as admin
5. Expected: Can access /dashboard
6. Check: Role is correctly loaded from Firestore
```

## Console Logs to Verify

### ProtectedRoute Logs
```
Look for these in browser console:
- "ProtectedRoute: Access denied. Required: admin, User has: moderator"
- "ProtectedRoute: User is blocked"
- "ProtectedRoute: No user role found"
```

### Login Flow Logs
```
Look for these in browser console:
- Login errors when wrong role tries to access
- Successful role validation
- Auto signout messages
```

## Firestore Data Structure

### User Document
```javascript
users/{userId} {
  email: "user@example.com",
  role: "admin" | "moderator" | "user",
  name: "User Name",
  displayName: "Display Name",
  blocked: false | true,
  createdAt: timestamp
}
```

## Expected Behaviors Summary

| User Role | Login Page | Result | Dashboard Access |
|-----------|-----------|--------|------------------|
| Admin | /login | ✅ Success | /dashboard only |
| Admin | /moderator-login | ⚠️ Redirect to /dashboard | /dashboard only |
| Moderator | /moderator-login | ✅ Success | /moderator-dashboard only |
| Moderator | /login | ❌ Error + Signout | /moderator-dashboard only |
| User | /login | ❌ Error + Signout | No access |
| User | /moderator-login | ❌ Error + Signout | No access |
| Blocked | Any | ❌ Redirect to /login | No access |

## Success Criteria
✅ All 10 tests pass
✅ No console errors (only expected warnings)
✅ Build completes successfully
✅ No TypeScript errors
✅ Navigation works correctly on desktop and mobile
✅ Back button cannot bypass protection
✅ Manual URL access is blocked
✅ Role-based redirection works in all scenarios
