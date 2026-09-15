# Role-Based Access Control - Quick Reference

## Dashboard Button Visibility

| Role | Sees Dashboard Button? | Links To |
|------|----------------------|----------|
| **admin** | ✅ Yes | `/dashboard` |
| **moderator** | ✅ Yes | `/moderator-dashboard` |
| **user** | ❌ **NO** | N/A |

## Route Access Summary

| Route | admin | moderator | user |
|-------|-------|-----------|------|
| `/dashboard` | ✅ Access | ⚠️ Redirect to `/moderator-dashboard` | ❌ Redirect to `/` |
| `/moderator-dashboard` | ⚠️ Redirect to `/dashboard` | ✅ Access | ❌ Redirect to `/` |
| `/login` | ✅ Can login | ❌ Error + Signout | ❌ Error + Signout |
| `/moderator-login` | ⚠️ Redirect to `/dashboard` | ✅ Can login | ❌ Error + Signout |

## Quick Test Commands

### Test as Regular User
```
1. Login with user credentials (role='user')
2. Expected: 
   - ❌ NO dashboard button in navbar
   - ❌ Cannot access /dashboard
   - ❌ Cannot access /moderator-dashboard
   - ❌ Cannot login via /login or /moderator-login
```

### Test as Admin
```
1. Login via /login with admin credentials
2. Expected:
   - ✅ Dashboard button visible
   - ✅ Can access /dashboard
   - ❌ Cannot access /moderator-dashboard (redirected)
```

### Test as Moderator
```
1. Login via /moderator-login with moderator credentials
2. Expected:
   - ✅ Dashboard button visible
   - ✅ Can access /moderator-dashboard
   - ❌ Cannot access /dashboard (redirected)
```

## Error Messages

| Scenario | Error Message |
|----------|--------------|
| User tries admin login | "Access denied. Admin credentials required." |
| User tries moderator login | "Access denied. Moderator credentials required." |
| Moderator tries admin login | "Access denied. Admin credentials required." |
| Admin tries moderator login | Auto-redirected to /dashboard |
| User accesses /dashboard | Redirected to / |
| User accesses /moderator-dashboard | Redirected to / |

## Key Files

- **UI Control:** `src/components/Navbar.tsx` (lines 168-180, 355-368)
- **Login Protection:** `src/pages/Login.tsx` (lines 19-47, 54-95)
- **Route Protection:** `src/components/ProtectedRoute.tsx` (lines 38-51)
- **Route Config:** `src/App.tsx` (lines 34-49)

## Important Notes

⚠️ **Never show dashboard button to role='user'**
✅ **Always validate role on login submission**
✅ **Always protect routes with ProtectedRoute**
✅ **Use `{ replace: true }` to prevent back navigation**
