# ⚡ Quick Start Guide - 5 Minutes to Running

## 🎯 Get Started in 5 Steps

### Step 1: Install Dependencies (30 seconds)
```bash
npm install
```

### Step 2: Firebase Setup (2 minutes)

1. **Create Firebase Project**
   - Go to [https://console.firebase.google.com](https://console.firebase.google.com)
   - Click "Add Project"
   - Name it "SAIL-MIOM" (or any name)
   - Disable Google Analytics (optional)
   - Click "Create Project"

2. **Enable Authentication**
   - Click "Authentication" in sidebar
   - Click "Get Started"
   - Click "Email/Password"
   - Enable it
   - Click "Save"

3. **Create Firestore Database**
   - Click "Firestore Database" in sidebar
   - Click "Create Database"
   - Select "Production mode"
   - Choose location (nearest to you)
   - Click "Enable"

4. **Get Firebase Config**
   - Click Settings icon ⚙️ → Project Settings
   - Scroll to "Your apps" section
   - Click web icon `</>`
   - Register app name: "SAIL-MIOM Web"
   - Copy the config object

### Step 3: Environment Setup (30 seconds)

Create `.env` file in project root:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

**Replace** the values with your Firebase config.

### Step 4: Create Admin User (1 minute)

**In Firebase Console:**

1. **Authentication → Users → Add User**
   ```
   Email: admin123@gmail.com
   Password: admin123
   ```
   Click "Add User"

2. **Copy the User ID (UID)** that was just created

3. **Firestore Database → Start Collection**
   ```
   Collection ID: users
   Document ID: [paste the UID you copied]
   
   Fields:
   email (string): admin123@gmail.com
   role (string): admin
   displayName (string): Admin
   createdAt (string): 2024-01-01T00:00:00.000Z
   ```
   Click "Save"

### Step 5: Run! (10 seconds)
```bash
npm run dev
```

Open browser: `http://localhost:5173`

---

## 🎉 You're Done! Now Test It:

### Test Admin Login
1. Click "Admin Login"
2. Email: `admin123@gmail.com`
3. Password: `admin123`
4. You should see the dashboard!

### Test File Complaint
1. Click "File Complaint"
2. Fill the form
3. Submit
4. Check dashboard to see it!

---

## 🔧 If Something Goes Wrong

### Error: "Invalid email or password"
- Check that you created the user in Firebase Auth
- Check that password is exactly `admin123`
- Try logging out and back in

### Error: "User not authorized"
- Check that you created the user document in Firestore
- Verify the document ID matches the UID from Authentication
- Verify the role field is set to "admin"

### Error: "Firebase not configured"
- Check that `.env` file exists
- Verify all environment variables are set
- Restart the dev server (`npm run dev`)

### Dashboard is empty
- File a complaint first from the homepage
- Check Firestore console to see if data is saving
- Check browser console for errors

---

## 📱 Quick Feature Test

After setup, test these features:

- [ ] Admin login works
- [ ] Dashboard loads
- [ ] File a complaint
- [ ] See complaint in dashboard
- [ ] Create a moderator (in dashboard)
- [ ] Logout
- [ ] Login as moderator
- [ ] See moderator dashboard

---

## 🚀 Next Steps

- Read `SETUP_GUIDE.md` for detailed setup
- Read `README.md` for full documentation
- Check `AUTHENTICATION_FIXES.md` for all features
- See `FINAL_SUMMARY.md` for complete overview

---

## 💡 Pro Tips

1. **Keep Firebase Console open** - Helpful for debugging
2. **Check browser console** - Shows helpful error messages
3. **Use incognito mode** - For testing login/logout
4. **Clear localStorage** - If auth seems stuck
5. **Check Network tab** - See Firebase requests

---

## 🎯 Default Credentials

**Admin:**
- Email: `admin123@gmail.com`
- Password: `admin123`
- Access: `/dashboard` (full control)

**Moderator:**
- Create via admin dashboard
- Access: `/moderator-dashboard` (limited)

---

## 📊 URLs Quick Reference

| Page | URL | Access |
|------|-----|--------|
| Home | `/` | Public |
| File Complaint | `/file-complaint` | Public |
| Track Complaint | `/track-complaint` | Public |
| Admin Login | `/login` | Public |
| Moderator Login | `/moderator-login` | Public |
| Admin Dashboard | `/dashboard` | Admin Only |
| Moderator Dashboard | `/moderator-dashboard` | Moderator Only |
| Manage Moderators | `/moderators` | Admin Only |

---

## 🎨 Browser Support

- ✅ Chrome (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

---

## ⚡ Performance

- **Load Time**: < 2 seconds
- **Build Size**: 1,218 kB
- **Gzipped**: 357 kB
- **Real-time**: Instant updates

---

## 🆘 Quick Help

**Can't login?**
→ Check Firebase Console → Authentication

**No complaints showing?**
→ Check Firestore Database → complaints collection

**Environment errors?**
→ Verify `.env` file has correct values

**Build errors?**
→ Run `npm install` again

**Still stuck?**
→ Check browser console for error messages

---

## ✅ Checklist Before Going Live

- [ ] Firebase project created
- [ ] Authentication enabled
- [ ] Firestore database created
- [ ] Admin user created in Auth
- [ ] Admin user role added in Firestore
- [ ] Environment variables set
- [ ] App runs without errors
- [ ] Can login as admin
- [ ] Can file complaint
- [ ] Dashboard shows data

---

**That's it! You're ready to go! 🚀**

**Time taken: ~5 minutes**
**Result: Fully functional complaint management system!**

---

For detailed documentation, see:
- `README.md` - Full documentation
- `SETUP_GUIDE.md` - Detailed setup
- `FINAL_SUMMARY.md` - Complete features list

**Happy coding! 🎉**
